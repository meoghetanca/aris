#!/usr/bin/env node
/**
 * aris-lint: does every artifact present have a shape the gates can read?
 *
 * Written after a run where six assumptions and seven cuts were stored correctly in
 * the wrong envelope, and the status gate answered
 *
 *     assumptions  0
 *     cuts         0
 *
 * while a blocked-source list sat under an invented top-level key and `/aris-evidence`
 * replied "Nothing was recorded as unreadable." Three real pieces of work, written to
 * disk, invisible, and no error anywhere. Parsing was never the bar.
 *
 *   node aris-lint.mjs            every artifact present
 *   node aris-lint.mjs --json     the same as data
 *
 * Errors fail (exit 1): the envelope is missing or the wrong type, so the artifact
 * cannot be read. Warnings do not: an unknown top-level key is usually a note, and
 * occasionally it is data nothing will ever read, which is worth saying either way.
 */
import fs from "node:fs";
import path from "node:path";
import { requireRoot, check, advisory, report, help } from "./lib/aris.mjs";
import { SHAPES, validate } from "./lib/shapes.mjs";

help(`
aris-lint — validate the shape of every .aris artifact that exists.

Reads each artifact raw rather than through readJson, so it can report every problem
at once instead of stopping at the first.`);

const root = requireRoot();
const checks = [];
let present = 0;

for (const rel of Object.keys(SHAPES)) {
  const p = path.join(root, ".aris", rel);
  if (!fs.existsSync(p)) continue;
  present++;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    checks.push(check(`shape:${rel}`, `${rel} is valid JSON`, false, [`${rel} is not valid JSON: ${e.message}`]));
    continue;
  }

  const { errors, warnings } = validate(rel, data);
  checks.push(check(`shape:${rel}`, `${rel} has a shape the gates can read`, errors.length === 0, errors));
  if (warnings.length)
    checks.push(advisory(`keys:${rel}`, `${rel} has only keys something reads`, false, warnings));
}

if (!present) {
  process.stdout.write(
    "No artifacts yet, so there is nothing to validate. That is not a problem.\n" +
    'Run /aris "<your product>" to start one.\n'
  );
  process.exit(0);
}

report(`aris-lint: ${present} artifact(s) present`, checks);
