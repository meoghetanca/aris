#!/usr/bin/env node
/**
 * What the run could not read, and what a person can do about it.
 *
 *   evidence.mjs            what is blocked, and the exact paste list
 *   evidence.mjs --ingest   what has been supplied, and whether it is usable
 *   evidence.mjs --json
 *
 * WHY THIS EXISTS. On the first real run, G2, Capterra, TrustRadius and three help
 * centres all returned 403. Those are named `coverage: high` in most sector entries, so
 * the miner is sent to exactly the pages it cannot read. Without this, the workflow
 * produces a thin result and reports it as a quiet market — which is a finding about the
 * market, and it would be wrong.
 *
 * A blocked source must degrade to "open this and paste it here", never to a silent gap.
 * A human with a browser can read what a fetcher cannot, and that is a two-minute task,
 * not a dead end.
 */
import fs from "node:fs";
import path from "node:path";
import { requireRoot, readJson, exists, help } from "./lib/aris.mjs";

help(`evidence.mjs [--ingest] [--json]

What the run could not read, and what a person can do about it.
  (no flag)  what is blocked, and the exact paste list
  --ingest   what has been supplied, and whether it is usable`);

const root = requireRoot();
const SUPPLIED = path.join(root, ".aris", "evidence", "supplied");
const doc = readJson(root, "intel/sources.json", { sources: [] });
const sources = doc.sources ?? [];
const gaps = doc.gaps ?? [];
const blocked = sources.filter((s) => s.status === "blocked" || s.blockedReason);

const listSupplied = () => (fs.existsSync(SUPPLIED) ? fs.readdirSync(SUPPLIED).filter((f) => !f.startsWith(".")) : []);

if (process.argv.includes("--ingest")) {
  const files = listSupplied();
  if (!files.length) {
    process.stdout.write(
      `Nothing in .aris/evidence/supplied/ yet.\n\n` +
        `Run this without --ingest to see what to fetch by hand.\n`
    );
    process.exit(0);
  }
  const out = [];
  for (const f of files) {
    const p = path.join(SUPPLIED, f);
    const body = fs.readFileSync(p, "utf8");
    const words = body.split(/\s+/).filter(Boolean).length;
    const urls = [...new Set((body.match(/https?:\/\/\S+/g) ?? []).map((u) => u.replace(/[),.]+$/, "")))];
    // A paste that carries no URL cannot be cited, and an uncitable quote is not evidence.
    const usable = words >= 40 && urls.length > 0;
    out.push({ file: f, words, urls: urls.length, usable,
      why: usable ? "" : !urls.length ? "no URL in the file, so nothing here can be cited"
                                      : "too short to contain quotable material" });
  }
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ supplied: out }, null, 2) + "\n");
    process.exit(out.every((o) => o.usable) ? 0 : 1);
  }
  process.stdout.write(`Supplied evidence\n-----------------\n`);
  for (const o of out)
    process.stdout.write(`  ${o.usable ? "ok  " : "SKIP"}  ${o.file}  ${o.words} words, ${o.urls} url(s)` +
      (o.why ? `\n        ${o.why}\n` : "\n"));
  const good = out.filter((o) => o.usable).length;
  process.stdout.write(
    `\n${good} of ${out.length} file(s) usable.\n` +
      (good ? `Re-run /aris-voc to code them into pains. Each quote still needs its own URL and date.\n` : "")
  );
  process.exit(good === out.length ? 0 : 1);
}

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify({ blocked, gaps, supplied: listSupplied() }, null, 2) + "\n");
  process.exit(0);
}

if (!blocked.length && !gaps.length) {
  process.stdout.write(`Nothing was recorded as unreadable.\n\n` +
    `If a run felt thin, check that blocked fetches were written to sources.json with\n` +
    `status "blocked" rather than dropped. A gap nobody wrote down is indistinguishable\n` +
    `from a negative finding.\n`);
  process.exit(0);
}

process.stdout.write(`What this run could not read\n============================\n\n`);
if (blocked.length) {
  process.stdout.write(`${blocked.length} source(s) blocked automated fetching.\n`);
  process.stdout.write(`A browser can open every one of them. Paste each into a file under\n`);
  process.stdout.write(`.aris/evidence/supplied/ and the workflow will use it.\n\n`);
  for (const s of blocked) {
    process.stdout.write(`  ${s.id}  ${s.url}\n`);
    if (s.blockedReason) process.stdout.write(`      ${s.blockedReason}\n`);
    process.stdout.write(`      -> .aris/evidence/supplied/${s.id.toLowerCase()}.md\n\n`);
  }
  process.stdout.write(
    `In each file, keep the URL on the first line and paste the text below it.\n` +
      `Quotes must stay verbatim: do not tidy them, and keep each one's date if the page shows it.\n\n`
  );
}
if (gaps.length) {
  process.stdout.write(`Recorded gaps\n-------------\n`);
  for (const g of gaps) process.stdout.write(`  - ${g}\n`);
  process.stdout.write(`\n`);
}
const have = listSupplied();
process.stdout.write(have.length
  ? `${have.length} file(s) already supplied. Run with --ingest to check them.\n`
  : `Nothing supplied yet. Run with --ingest once you have pasted something.\n`);
