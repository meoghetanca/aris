#!/usr/bin/env node
/**
 * The persona gate. A persona is a DERIVED object: no attribute without evidence.
 *
 * Default is to report. With --strip, unsourced attributes are removed from
 * personas.json rather than merely complained about, because an unsourced
 * attribute that survives review becomes a fact three commands later.
 *
 * Also refuses the specific failure this gate exists for: invented demographics.
 * Age, income, seniority and "tech-savviness" almost never appear in publicly
 * mined evidence, so a persona carrying them is usually a persona that was
 * imagined.
 */
import { requireRoot, readJson, writeJson, check, report } from "./lib/aris.mjs";

const STRIP = process.argv.includes("--strip");
const DEMOGRAPHIC = /\b(age|aged|income|salary|years old|gender|male|female|tech-savv|education level|household)\b/i;

const root = requireRoot();
const doc = readJson(root, "intel/personas.json");
if (!doc) {
  process.stderr.write("intel/personas.json is absent. Run /aris-personas first.\n");
  process.exit(2);
}
const pains = readJson(root, "intel/pains.json", { pains: [] }).pains ?? [];
const quoteIds = new Set();
for (const p of pains) for (const q of p.quotes ?? []) quoteIds.add(q.id);
const painIds = new Set(pains.map((p) => p.id));

const unsourced = [];
const dangling = [];
const demographic = [];
const painless = [];
const incomplete = [];
let stripped = 0;

for (const pe of doc.personas ?? []) {
  const keep = [];
  for (const a of pe.attributes ?? []) {
    const ev = a.evidence ?? [];
    if (!ev.length) {
      unsourced.push(`${pe.id}: "${a.attribute}" has no evidence`);
      stripped++;
      continue;
    }
    const bad = ev.filter((e) => !quoteIds.has(e));
    if (bad.length) dangling.push(`${pe.id}: "${a.attribute}" cites ${bad.join(", ")} which no quote provides`);
    if (DEMOGRAPHIC.test(a.attribute))
      demographic.push(
        `${pe.id}: "${a.attribute}" is demographic. Public mining rarely evidences this — ` +
          `confirm the quotes actually state it, or drop it`
      );
    keep.push(a);
  }
  if (STRIP) pe.attributes = keep;

  const ps = (pe.pains ?? []).filter((id) => painIds.has(id));
  if (!ps.length) painless.push(`${pe.id} is attached to no existing pain — a persona with no pain is a demographic sketch`);
  for (const id of pe.pains ?? []) if (!painIds.has(id)) dangling.push(`${pe.id} cites ${id} which is not a pain`);
  // Not an evidence failure: reporting it under every_attribute_has_evidence made a
  // missing field read as an unsourced claim.
  if (!pe.jobToBeDone) incomplete.push(`${pe.id}: no jobToBeDone`);
}

if (STRIP && stripped) {
  writeJson(root, "intel/personas.json", doc);
  process.stdout.write(`stripped ${stripped} unsourced attribute(s) from intel/personas.json\n\n`);
}

report(`persona-check: ${(doc.personas ?? []).length} personas`, [
  check("PERSONA-GATE-001", "every_attribute_has_evidence", unsourced.length === 0, unsourced,
        STRIP ? { note: "--strip removed them" } : {}),
  check("PERSONA-GATE-002", "evidence_ids_resolve", dangling.length === 0, dangling),
  check("PERSONA-GATE-003", "no_unevidenced_demographics", demographic.length === 0, demographic),
  check("PERSONA-GATE-004", "every_persona_has_a_pain", painless.length === 0, painless),
  check("PERSONA-GATE-005", "every_persona_states_a_job", incomplete.length === 0, incomplete),
]);
