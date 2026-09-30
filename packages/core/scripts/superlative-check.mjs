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
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execFileSync } from "node:child_process";
import { requireRoot, readJson, check, report } from "./lib/aris.mjs";

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
const dir = path.join(root, ".aris", "assets");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
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
      const out = execFileSync("node", [path.join(HERE, "sector-check.mjs"), "--show", n, "--json"], { encoding: "utf8" });
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

/** The sentences of `body` that trip `claim`. */
function claimHits(body, claim) {
  const probes = claimProbes(claim);
  if (!probes.length) return [];
  const out = [];
  for (const sent of String(body).split(/(?<=[.!?])\s+|\n/)) {
    const set = new Set(wordsOf(sent));
    if (!set.size) continue;
    for (const ws of probes) {
      const n = ws.filter((w) => set.has(w)).length;
      // Short entries are literal phrases: all of them, or it is not that claim.
      const need = ws.length <= 2 ? ws.length : Math.max(2, Math.ceil(ws.length / 2));
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

const corpus = files.map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]);
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

  const low = body.toLowerCase();
  for (const rt of entry?.reservedTerms ?? []) {
    const t = String(rt.term ?? "").toLowerCase();
    if (t && low.includes(t)) reservedErrs.push(`assets/${f}: "${rt.term}" is reserved in this field — ${rt.meaning}`);
  }
}

// Required disclosures must appear somewhere in the package.
const missingDisc = (entry?.requiredDisclosures ?? []).filter((d) => {
  // The longest word is the most distinctive: "whether" would false-pass, "evaluative" will not.
  const words = String(d).toLowerCase().split(/[^a-z-]+/).filter((w) => w.length > 4);
  const key = words.sort((a, b) => b.length - a.length)[0] ?? String(d).toLowerCase();
  return !allText.includes(key);
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
  {
    id: "LANG-006",
    check: "reserved_terms_used_correctly",
    status: "passed",
    errors: reservedErrs.map((e) => `${e}  [review, not automatic]`),
  },
]);
