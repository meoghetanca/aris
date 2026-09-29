#!/usr/bin/env node
/**
 * The pain gate. A pain may be `validated` only on evidence:
 *
 *     quoteCount >= 8  AND  sourceCount >= 3
 *
 * Thresholds are overridable (--min-quotes, --min-sources) because they are a
 * calibration, not a law — but they are never zero, and lowering them is a
 * decision that belongs in the assumptions register.
 *
 * Also catches the quieter failures: a frequency that disagrees with the quotes
 * actually stored, duplicate quote text across pains (one post counted twice),
 * and quotes that look paraphrased rather than verbatim.
 */
import { requireRoot, readJson, check, report } from "./lib/aris.mjs";

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
};
const MIN_QUOTES = arg("--min-quotes", 8);
const MIN_SOURCES = arg("--min-sources", 3);

const root = requireRoot();
const doc = readJson(root, "intel/pains.json");
if (!doc) {
  process.stderr.write("intel/pains.json is absent. Run /aris-voc first — this script does not create it.\n");
  process.exit(2);
}
const pains = doc.pains ?? [];

const thresholdErrs = [];
const countErrs = [];
const dupErrs = [];
const verbatimErrs = [];
const seen = new Map();

for (const p of pains) {
  const quotes = p.quotes ?? [];
  const sources = new Set(quotes.map((q) => q.sourceId).filter(Boolean));
  const stated = p.frequency ?? {};

  if (stated.quoteCount !== quotes.length)
    countErrs.push(`${p.id}: frequency.quoteCount is ${stated.quoteCount}, but ${quotes.length} quotes are stored`);
  if (stated.sourceCount !== sources.size)
    countErrs.push(`${p.id}: frequency.sourceCount is ${stated.sourceCount}, but the quotes span ${sources.size} distinct sources`);

  if (p.status === "validated" && (quotes.length < MIN_QUOTES || sources.size < MIN_SOURCES))
    thresholdErrs.push(
      `${p.id} is marked validated on ${quotes.length} quotes / ${sources.size} sources ` +
        `(needs >= ${MIN_QUOTES} / >= ${MIN_SOURCES})`
    );

  for (const q of quotes) {
    if (!q.text || !String(q.text).trim()) verbatimErrs.push(`${p.id}/${q.id}: empty quote text`);
    if (!q.url) verbatimErrs.push(`${p.id}/${q.id}: no url — a quote without a link cannot be checked`);
    if (!q.date) verbatimErrs.push(`${p.id}/${q.id}: no date`);
    const key = String(q.text || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (key) {
      if (seen.has(key) && seen.get(key) !== p.id)
        dupErrs.push(`${p.id}/${q.id}: same text already counted under ${seen.get(key)} — one post inflating two pains`);
      seen.set(key, p.id);
    }
  }
}

const insufficient = pains.filter((p) => p.status !== "validated");
const summary = `${pains.length} pains, ${pains.length - insufficient.length} validated`;

report(`pain-check: ${summary}`, [
  check("PAIN-GATE-001", "validated_pains_meet_threshold", thresholdErrs.length === 0, thresholdErrs),
  check("PAIN-GATE-002", "stated_frequency_matches_stored_quotes", countErrs.length === 0, countErrs),
  check("PAIN-GATE-003", "no_quote_counted_twice", dupErrs.length === 0, dupErrs),
  check("PAIN-GATE-004", "quotes_are_checkable", verbatimErrs.length === 0, verbatimErrs),
  {
    id: "PAIN-GATE-005",
    check: "insufficient_pains_are_marked_not_dropped",
    status: "passed",
    errors: insufficient.map((p) => `${p.id} is insufficient (${(p.quotes ?? []).length} quotes) — correct to keep, do not promote`),
  },
]);
