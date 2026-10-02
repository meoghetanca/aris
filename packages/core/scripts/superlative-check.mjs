#!/usr/bin/env node
/**
 * Language the field will not accept, in three layers.
 *
 *   1. Unsupported superlatives. "Best", "#1", "leading" with no evidence is a
 *      legal exposure, not a style choice.
 *   2. The sector's `regulatedClaims`: `forbidden` may not appear at all;
 *      `requires_disclosure` may appear only with the named disclosure present.
 *   3. The sector's `forbidden` and `reservedTerms` — defects and meanings this
 *      field already recognises and a generic check does not.
 *
 * Fails closed on an unresolved sector: with no entry there is no lens, and a
 * pass would mean "we did not look".
 */
import path from "node:path";
import url from "node:url";
import { requireRoot, readJson, check, advisory, report, help, runScript, assetCorpus } from "./lib/aris.mjs";

help(`superlative-check.mjs [--json]

Reads the resolved sector entry and checks the assets against it in three layers:
unsupported superlatives, the field's regulated claims, and its reserved terms.
Fails closed when the sector does not resolve.`);

const HERE = path.dirname(url.fileURLToPath(import.meta.url));

const SUPERLATIVE = new RegExp(
  "\\b(" +
    ["best", "best-in-class", "world-class", "leading", "the leader", "market-leading", "#1", "no\\.? 1",
     "number one", "fastest", "cheapest", "easiest", "most advanced", "most powerful", "unrivalled",
     "unrivaled", "unmatched", "revolutionary", "game-changing", "state of the art", "cutting-edge",
     "seamless", "effortless", "guaranteed", "risk-free", "perfect", "ultimate", "only solution",
     "industry-standard", "military-grade", "bank-grade"].join("|") +
    ")\\b",
  "gi"
);

const root = requireRoot();
const state = readJson(root, "state.json") ?? {};
const sector = state.market?.sector;
// Recursive: an asset in a subdirectory used to get no sector lens at all.
const corpus = assetCorpus(root);
const files = corpus.map(([f]) => f);
const claims = readJson(root, "assets/claims.json", { claims: [] }).claims ?? [];
const cited = new Set(claims.filter((c) => (c.sourceIds ?? []).length).map((c) => c.id));

let entry = null;
const sectorErrs = [];
if (!sector) {
  sectorErrs.push("state.market.sector is unset, so no sector lens ran. A pass here would mean 'we did not look'.");
} else {
  const names = [sector, ...(state.market?.secondarySectors ?? [])];
  entry = { regulatedClaims: [], forbidden: [], reservedTerms: [], requiredDisclosures: [] };
  for (const n of names) {
    try {
      const out = runScript(path.join(HERE, "sector-check.mjs"), ["--show", n, "--json"]);
      const e = JSON.parse(out);
      // Constraints add; they never cancel.
        // Union, then dedupe: a product in two fields shares a family, so the family's
      // rules arrive twice and every finding was reported twice.
      for (const k of Object.keys(entry)) {
        const seen = new Set(entry[k].map((x) => JSON.stringify(x)));
        entry[k] = [...entry[k], ...(e[k] ?? []).filter((x) => !seen.has(JSON.stringify(x)))];
      }
    } catch {
      sectorErrs.push(`sector "${n}" could not be resolved, so its lens did not run`);
    }
  }
}

/**
 * Matching a regulated claim against copy.
 *
 * The previous matcher took the first 28 characters of the claim DESCRIPTION and
 * looked for them literally. Descriptions are not phrases anyone writes - the
 * entry is "any projected, expected or guaranteed return" - so no asset ever
 * contained the needle and `no_forbidden_claims` passed on copy promising a 12%
 * return. The gate the field's regulator is named in never fired.
 *
 * The entries are short (mean 4.2 words) and shaped as a disjunction, with "/"
 * separating whole alternatives: "treats anxiety, depression or any condition".
 * Requiring the last noun fails on exactly the realistic violation - copy names the
 * specific disorder and never writes the catch-all "condition" - so the test is
 * OVERLAP: a sentence trips an alternative when it carries at least two of its
 * content words and at least half of them. A one- or two-word entry ("risk-free",
 * "clinically proven") must appear in full.
 *
 * Sentence scope, not file scope: "returns" in a fee table and "expected" three
 * paragraphs later are not a claim, and matching across a whole file said they were.
 *
 * This is a heuristic and it can be wrong in both directions. It is a lens for a
 * human, which is why every finding names the claim, the authority and the sentence.
 */
const CLAIM_STOP = new Set(["any", "all", "the", "a", "an", "or", "and", "of", "in", "with",
  "to", "by", "for", "on", "every", "no", "not", "is", "are", "that", "this", "it"]);
const stemw = (w) => {
  if (w.length < 4) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (/(?:ses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !/(?:ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
};
const wordsOf = (s) => String(s ?? "").toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean).map(stemw);

/** A claim description -> the content words of each "/" alternative. */
function claimProbes(claim) {
  return String(claim ?? "").split("/")
    .map((alt) => [...new Set(wordsOf(alt).filter((w) => !CLAIM_STOP.has(w)))])
    .filter((ws) => ws.length);
}

/**
 * The sentences of `body` that trip `claim`.
 *
 * `floor` is the smallest overlap that counts. The regulatedClaims entries are short
 * and phrase-shaped, so two words is enough. The `forbidden` list is longer prose
 * describing a defect ("an ROI or time-saved figure with no baseline and no sample
 * size"), where two words apart is a coincidence, so it asks for three.
 */
function claimHits(body, claim, floor = 2) {
  const probes = claimProbes(claim);
  if (!probes.length) return [];
  const out = [];
  for (const sent of String(body).split(/(?<=[.!?])\s+|\n/)) {
    const set = new Set(wordsOf(sent));
    if (!set.size) continue;
    for (const ws of probes) {
      const n = ws.filter((w) => set.has(w)).length;
      // Short entries are literal phrases: all of them, or it is not that claim.
      const need = ws.length <= floor ? ws.length : Math.max(floor, Math.ceil(ws.length / 2));
      if (n < need) continue;
      out.push(sent.trim().replace(/\s+/g, " ").slice(0, 90));
      break;
    }
  }
  return out;
}

const supErrs = [];
const forbiddenErrs = [];
const disclosureErrs = [];
const reservedErrs = [];

const allText = corpus.map(([, b]) => b).join("\n").toLowerCase();

for (const [f, body] of corpus) {
  for (const line of body.split("\n")) {
    const hits = line.match(SUPERLATIVE);
    if (!hits) continue;
    const ids = line.match(/\bCLAIM-\d+\b/g) ?? [];
    const backed = ids.some((id) => cited.has(id));
    if (!backed)
      supErrs.push(`assets/${f}: "${[...new Set(hits.map((h) => h.toLowerCase()))].join(", ")}" with no cited claim — ${line.trim().slice(0, 80)}`);
  }

  for (const rc of entry?.regulatedClaims ?? []) {
    const where = claimHits(body, rc.claim);
    if (!where.length) continue;
    const at = `  \u2014 "${where[0]}"`;
    if (rc.rule === "forbidden")
      forbiddenErrs.push(`assets/${f}: "${rc.claim}" is forbidden in this field \u2014 ${rc.authority}${at}`);
    else
      disclosureErrs.push(`assets/${f}: "${rc.claim}" appears; it requires the disclosure \u2014 ${rc.authority}${at}`);
  }

  /**
   * The sector's own `forbidden` list, which this script collected and never read.
   *
   * The header has always said layer 3 checks "the sector's forbidden and
   * reservedTerms". Only reservedTerms was checked: `entry.forbidden` was unioned along
   * the extends chain and then never looked at, so several hundred entries across the
   * knowledge base could not fire. b2b-saas forbids "an ROI or time-saved figure with
   * no baseline and no sample size", and copy stating exactly that passed.
   *
   * These entries are prose describing a defect rather than a phrase anyone writes, so
   * the overlap floor is three rather than two, and every finding names the entry and
   * the sentence. It is a lens for a human, like the layer above it.
   *
   * Its known false positive is copy that STATES the rule: a security page reading "a
   * benchmark without a reproducible method is a number nobody can check" trips "a
   * benchmark with no reproducible method", because word overlap cannot tell a sentence
   * that breaks a rule from one that quotes it. Run across all 62 fields against neutral
   * copy that discusses benchmarks on purpose, two fields fired and sixty did not. The
   * finding prints the sentence, so a reader sees which kind it is immediately.
   */
  for (const fb of entry?.forbidden ?? []) {
    const text = typeof fb === "string" ? fb : fb?.rule ?? fb?.claim ?? "";
    const where = claimHits(body, text, 3);
    if (!where.length) continue;
    forbiddenErrs.push(`assets/${f}: this field does not permit "${text}"\u2014 "${where[0]}"`);
  }

  const low = body.toLowerCase();
  for (const rt of entry?.reservedTerms ?? []) {
    const t = String(rt.term ?? "").toLowerCase();
    if (t && low.includes(t)) reservedErrs.push(`assets/${f}: "${rt.term}" is reserved in this field — ${rt.meaning}`);
  }
}

/**
 * Required disclosures must appear somewhere in the package.
 *
 * The longest word is the most distinctive: "whether" would false-pass, "evaluative"
 * will not. Two things made that test unable to pass on compliant copy:
 *
 *   - it split on `[^a-z-]+`, which KEEPS hyphens, so the entry "past-performance
 *     warning where any figure appears" keyed on the literal "past-performance" and a
 *     textbook footer reading "Past performance is not a guide to future results"
 *     was reported as missing. Hyphenation is a typographic choice, not a compliance
 *     one, so both sides are flattened now.
 *   - the key was matched with String.includes, so it also hit inside a longer word.
 *     It is matched as a whole word.
 *
 * Near-duplicates are collapsed. A leaf and its family both require the licence and
 * the jurisdiction, the union dedupes by exact text only, and the same requirement was
 * reported twice under two wordings.
 */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const discKey = (d) => {
  const words = flat(d).split(" ").filter((w) => w.length > 4);
  return words.sort((a, b) => b.length - a.length)[0] ?? flat(d);
};
const packageWords = new Set(flat(allText).split(" "));
const seenKey = new Set();
const missingDisc = (entry?.requiredDisclosures ?? []).filter((d) => {
  const key = discKey(d);
  if (seenKey.has(key)) return false;
  seenKey.add(key);
  return !packageWords.has(key);
});

report(`superlative-check: sector ${sector || "(unresolved)"}, ${files.length} assets`, [
  check("LANG-001", "sector_lens_available", sectorErrs.length === 0, sectorErrs),
  check("LANG-002", "no_unsupported_superlatives", supErrs.length === 0, supErrs),
  check("LANG-003", "no_forbidden_claims", forbiddenErrs.length === 0, forbiddenErrs),
  {
    id: "LANG-004",
    check: "regulated_claims_carry_disclosure",
    status: disclosureErrs.length ? "failed" : "passed",
    errors: disclosureErrs,
  },
  {
    id: "LANG-005",
    check: "required_disclosures_present",
    status: missingDisc.length ? "failed" : "passed",
    errors: missingDisc.map((d) => `the package never states: ${d}`),
  },
  advisory("LANG-006", "reserved_terms_used_correctly", reservedErrs.length === 0,
           reservedErrs.map((e) => `${e}  [review, not automatic]`)),
]);
