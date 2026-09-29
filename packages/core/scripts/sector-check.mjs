#!/usr/bin/env node
/**
 * Resolve a sector entry from the knowledge base, or fail closed.
 *
 *   sector-check.mjs --list
 *   sector-check.mjs --show <sector>
 *
 * Exit codes: 0 resolved, 3 not covered (the caller must stop or bootstrap), 2 usage.
 *
 * The three fields that do real work: reviewPlatforms + communities tell the
 * miner WHERE to look (without them the mining is a guess, and a guess is where
 * fabrication starts); regulatedClaims is a verify lens; priceBands anchors the
 * pricing recommendation to something other than the model's prior.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILTIN = path.join(HERE, "..", "data", "sectors");

function load(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return { file: path.join(dir, f), ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) };
      } catch (e) {
        process.stderr.write(`skipping ${f}: ${e.message}\n`);
        return null;
      }
    })
    .filter(Boolean);
}

/** Project-local sectors override built-ins, so /mkt-sector can add a field without touching the plugin. */
function projectDir() {
  let d = process.cwd();
  for (;;) {
    const c = path.join(d, ".mkt", "sectors");
    if (fs.existsSync(c)) return c;
    const p = path.dirname(d);
    if (p === d) return null;
    d = p;
  }
}

const entries = [...load(BUILTIN), ...load(projectDir() || "")];
const args = process.argv.slice(2);
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

if (args.includes("--list") || args.length === 0) {
  process.stdout.write("Covered sectors\n---------------\n");
  for (const e of entries) {
    const flag = e.status === "provisional" ? "  [provisional]" : "";
    process.stdout.write(`${e.sector}${flag}\n`);
    if (e.aliases?.length) process.stdout.write(`    aliases: ${e.aliases.join(", ")}\n`);
  }
  process.stdout.write(`\n${entries.length} entr${entries.length === 1 ? "y" : "ies"}.\n`);
  process.exit(0);
}

const i = args.indexOf("--show");
if (i === -1 || !args[i + 1]) {
  process.stderr.write("usage: sector-check.mjs --list | --show <sector>\n");
  process.exit(2);
}
const want = norm(args[i + 1]);
const hit =
  entries.find((e) => norm(e.sector) === want) ||
  entries.find((e) => (e.aliases || []).some((a) => norm(a) === want)) ||
  entries.find((e) => norm(e.sector).includes(want) || want.includes(norm(e.sector)));

if (!hit) {
  process.stderr.write(
    `SECTOR NOT COVERED: ${args[i + 1]}\n\n` +
      `The knowledge base has no entry for this field, so the miner does not know\n` +
      `which review platforms and communities carry its public voice, which claims\n` +
      `it regulates, or what it charges. Mining blind is how fabrication starts.\n\n` +
      `Covered: ${entries.map((e) => e.sector).join(", ") || "(none)"}\n\n` +
      `Run /mkt-sector ${args[i + 1]} to research and write a provisional entry.\n`
  );
  process.exit(3);
}

if (args.includes("--json")) {
  process.stdout.write(JSON.stringify(hit, null, 2) + "\n");
  process.exit(0);
}

const L = (label, v) => {
  if (v == null || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)) return;
  process.stdout.write(`\n${label}\n`);
  if (Array.isArray(v)) for (const x of v) process.stdout.write(`  - ${typeof x === "string" ? x : JSON.stringify(x)}\n`);
  else process.stdout.write(`  ${JSON.stringify(v)}\n`);
};

process.stdout.write(`${hit.sector}${hit.status === "provisional" ? "  [PROVISIONAL]" : ""}\n`);
if (hit.status === "provisional")
  process.stdout.write(
    `\n  This entry was bootstrapped, not curated. Every artifact derived from it\n` +
      `  is stamped sectorStatus: provisional and the HTML says so.\n`
  );
L("Review platforms (where to mine)", hit.reviewPlatforms);
L("Communities (where to mine)", hit.communities);
L("Buying committee", hit.buyingCommittee);
L("Channel norms", hit.channelNorms);
L("Price bands", hit.priceBands);
L("CAC benchmarks", hit.cacBenchmarks);
L("Sales cycle (days)", hit.salesCycleDays);
L("REGULATED CLAIMS (a verify lens)", hit.regulatedClaims);
L("FORBIDDEN (defects this field recognises)", hit.forbidden);
L("Reserved terms", hit.reservedTerms);
L("Required disclosures", hit.requiredDisclosures);
L("Seasonality", hit.seasonality);
process.exit(0);
