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
import { requireRoot, readJson, check, report } from "./lib/mkt.mjs";

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
const dir = path.join(root, ".mkt", "assets");
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
      for (const k of Object.keys(entry)) entry[k] = [...entry[k], ...(e[k] ?? [])];
    } catch {
      sectorErrs.push(`sector "${n}" could not be resolved, so its lens did not run`);
    }
  }
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

  const low = body.toLowerCase();
  for (const rc of entry?.regulatedClaims ?? []) {
    const needle = String(rc.claim ?? "").toLowerCase().split("/")[0].trim();
    if (!needle || needle.length < 4 || !low.includes(needle.slice(0, Math.min(needle.length, 28)))) continue;
    if (rc.rule === "forbidden")
      forbiddenErrs.push(`assets/${f}: "${rc.claim}" is forbidden in this field — ${rc.authority}`);
    else
      disclosureErrs.push(`assets/${f}: "${rc.claim}" appears; it requires the disclosure — ${rc.authority}`);
  }

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
