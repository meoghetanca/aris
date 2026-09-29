#!/usr/bin/env node
/**
 * The claim gate. Every factual claim in every asset resolves to a source.
 *
 * This is the highest-value check in the workflow. It is what stops an invented
 * market figure or a competitor price nobody verified from reaching a published
 * page — the failure mode that makes automated marketing worthless.
 *
 * Four directions:
 *   - marker -> registry: every [CLAIM-014] in an asset exists in claims.json
 *   - registry -> source: every claim has sourceIds, or is explicitly unknown
 *   - registry -> asset: usedIn names files that exist and contain the marker
 *   - asset -> marker: sentences carrying numbers or comparatives that have NO
 *     claim id at all, which is how an uncited claim hides
 */
import fs from "node:fs";
import path from "node:path";
import { requireRoot, readJson, check, report } from "./lib/aris.mjs";

/**
 * An attributed quote the workflow wrote is fabricated evidence.
 *
 * Checked PER OCCURRENCE, not per file: an asset can legitimately hold a real
 * placeholder in one section and a fabricated quote in another, and a per-file
 * test lets the placeholder mask the fabrication. Each quote must carry the
 * marker on its own line or the line above.
 */
function fabricatedQuotes(body) {
  const Q = ["\u201c", "\u201d"];
  const re = new RegExp(
    '^[ \\t]*>?[ \\t]*["' + Q[0] + '][^"' + Q[1] + ']{25,}["' + Q[1] + ']'
    + '\\s*[-\u2013\u2014]\\s*\\w',
    "gm"
  );
  const lines = body.split("\n");
  const out = [];
  for (const m of body.matchAll(re)) {
    const upto = body.slice(0, m.index).split("\n").length - 1;
    const here = lines[upto] ?? "";
    const prev = lines[upto - 1] ?? "";
    if (!/\[TESTIMONIAL/i.test(here) && !/\[TESTIMONIAL/i.test(prev))
      out.push({ line: upto + 1, text: here.trim().slice(0, 90) });
  }
  return out;
}

const root = requireRoot();
const dir = path.join(root, ".aris", "assets");
const doc = readJson(root, "assets/claims.json");
if (!doc) {
  process.stderr.write("assets/claims.json is absent. Run /aris-assets first.\n");
  process.exit(2);
}
const claims = doc.claims ?? [];
const byId = new Map(claims.map((c) => [c.id, c]));

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
const text = new Map(files.map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));

const unknownMarker = [];
const uncited = [];
const usedInWrong = [];
const naked = [];
const placeholdersFilled = [];
const unusedClaims = [];

const markersIn = (s) => [...new Set((s.match(/\bCLAIM-\d+\b/g) ?? []))];

for (const [f, body] of text) {
  for (const id of markersIn(body)) if (!byId.has(id)) unknownMarker.push(`assets/${f} cites ${id}, which is not in claims.json`);

  // Sentences that assert something checkable but carry no claim id.
  const NUM = /\b\d[\d.,]*\s*(%|percent|x|×|million|billion|k\b|users?|customers?|companies|hours?|days?|weeks?|months?|years?)\b/i;
  const COMP = /\b(fastest|cheapest|best|leading|the leader|#1|no\.?\s*1|number one|outperforms?|twice as|\d+x faster)\b/i;
  for (const raw of body.split(/\n|(?<=[.!?])\s+/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("|") || line.startsWith(">")) continue;
    if (/\[CLAIM-\d+\]/.test(line)) continue;
    if (/\[(TESTIMONIAL|PLACEHOLDER|UNASSIGNED)/i.test(line)) continue;
    if (NUM.test(line) || COMP.test(line))
      naked.push(`assets/${f}: no claim id on "${line.slice(0, 96)}${line.length > 96 ? "..." : ""}"`);
  }

  // A placeholder that stopped being a placeholder is a fabricated testimonial.
  for (const h of fabricatedQuotes(body))
    placeholdersFilled.push(
      `assets/${f}:${h.line} reads as an attributed quote with no [TESTIMONIAL - SUPPLY REAL] marker: ` +
      `"${h.text}". A testimonial this workflow wrote is fabricated evidence.`
    );
}

for (const c of claims) {
  const cited = (c.sourceIds ?? []).length > 0;
  if (!cited && c.status !== "unknown")
    uncited.push(`${c.id} has no sourceIds and is marked "${c.status ?? "(none)"}" — cite it, soften it, or mark it unknown`);
  if (c.status === "unsupported") uncited.push(`${c.id} is marked unsupported: "${String(c.text ?? "").slice(0, 80)}"`);

  for (const rel of c.usedIn ?? []) {
    const f = path.basename(rel);
    if (!text.has(f)) usedInWrong.push(`${c.id}.usedIn names ${rel}, which does not exist`);
    else if (!markersIn(text.get(f)).includes(c.id))
      usedInWrong.push(`${c.id}.usedIn names ${rel}, but that file does not carry the marker`);
  }
  const anywhere = [...text.values()].some((b) => markersIn(b).includes(c.id));
  if (!anywhere) unusedClaims.push(`${c.id} appears in no asset — a claim nothing uses is dead weight or a lost marker`);
}

/**
 * Citation completeness says a claim HAS a source. It does not say the source supports
 * it. A claim citing a pricing page for a statement about market size passes every other
 * check in this workflow and lands on the front page under a green badge.
 *
 * `aris-claim-verifier` opens the source and writes a verdict back onto the claim. This
 * gate reads those verdicts. A claim asserting `verified` with nobody having opened its
 * source is the exact failure the workflow exists to prevent, so it blocks.
 */
const unread = [];
const wrong = [];
const stale = [];
const MAX_AGE_DAYS = 90;
for (const c of claims) {
  if (c.status === "unknown") continue;
  const v = c.verification;
  if (!v || !v.verdict) {
    if ((c.sourceIds ?? []).length)
      unread.push(`${c.id}: cites ${(c.sourceIds ?? []).join(", ")} but nobody opened them. ` +
        `"${String(c.text ?? "").slice(0, 70)}"`);
    continue;
  }
  if (v.verdict === "contradicts")
    wrong.push(`${c.id}: the source says otherwise. ${v.note ?? ""} ${v.where ?? ""}`.trim());
  else if (v.verdict === "absent")
    wrong.push(`${c.id}: the source is readable and does not mention this. ${v.note ?? ""}`.trim());
  else if (v.verdict === "partial")
    wrong.push(`${c.id}: the source supports only part of it. ${v.note ?? ""}`.trim());
  else if (v.verdict === "unreachable")
    unread.push(`${c.id}: source could not be read. ${v.note ?? ""}`.trim());
  if (v.checkedAt) {
    const age = (Date.now() - Date.parse(v.checkedAt)) / 86400000;
    if (Number.isFinite(age) && age > MAX_AGE_DAYS)
      stale.push(`${c.id} was verified ${Math.round(age)} days ago; prices and pages move`);
  }
}

const coverage = claims.length ? claims.filter((c) => (c.sourceIds ?? []).length).length / claims.length : 1;
const verified = claims.filter((c) => c.verification?.verdict === "supports").length;

report(`claim-check: ${claims.length} claims across ${files.length} assets, ${verified} read at source`, [
  check("CLAIM-GATE-001", "every_marker_resolves", unknownMarker.length === 0, unknownMarker),
  check("CLAIM-GATE-002", "citation_completeness", uncited.length === 0, uncited, { coverage }),
  check("CLAIM-GATE-003", "usedIn_is_accurate", usedInWrong.length === 0, usedInWrong),
  check("CLAIM-GATE-004", "no_uncited_assertions", naked.length === 0, naked),
  check("CLAIM-GATE-005", "no_fabricated_testimonials", placeholdersFilled.length === 0, placeholdersFilled),
  { id: "CLAIM-GATE-006", check: "no_orphan_claims", status: unusedClaims.length ? "failed" : "passed", errors: unusedClaims },
  check("CLAIM-GATE-007", "sources_actually_support_the_claim", wrong.length === 0, wrong),
  check("CLAIM-GATE-008", "every_claim_was_read_at_source", unread.length === 0, unread,
        { coverage: claims.length ? verified / claims.length : 1 }),
  { id: "CLAIM-GATE-009", check: "verification_is_current", status: stale.length ? "failed" : "passed", errors: stale },
]);
