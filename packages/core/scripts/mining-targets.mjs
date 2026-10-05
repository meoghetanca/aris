#!/usr/bin/env node
/**
 * mining-targets: which of this sector's platforms can a miner actually read?
 *
 * The sector entry answers how much a platform CARRIES. fetchability.json answers
 * whether a fetch can READ it. Those are different questions and the gap between them
 * is where runs die: on a real run a miner was sent to Reddit and spent 12 of its 14
 * page budget discovering the domain is refused outright, then reported honestly that
 * it could not even confirm whether Reddit is thin for the field.
 *
 * /aris-voc used to resolve that gap by judgement. This computes it instead, so the
 * fan-out is decided by what opens rather than by whoever is reading the entry.
 *
 *   node mining-targets.mjs --sector "live speech translation"
 *   node mining-targets.mjs --sector b2b-saas --json
 *
 * Exit 0 something is readable, 2 usage, 3 nothing is readable. Exit 3 is not "this
 * market is quiet": it means every place this field keeps its voice is behind a wall,
 * which is a finding about access and must be reported as one.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { runScript, help } from "./lib/aris.mjs";
import { hostForPlatform, whyNoHost, hostFromUrl, matchHost } from "./lib/hosts.mjs";

help(`
mining-targets — split a sector's platforms into what a miner can read and what needs a paste.

  --sector <field>   required
  --json             machine-readable`);

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const sector = args[args.indexOf("--sector") + 1];
if (!args.includes("--sector") || !sector || sector.startsWith("--")) {
  process.stderr.write("mining-targets: --sector <field> is required.\n");
  process.exit(2);
}

let resolved;
try {
  resolved = JSON.parse(runScript(path.join(HERE, "sector-check.mjs"), ["--show", sector, "--json"]));
} catch {
  process.stderr.write(
    `mining-targets: "${sector}" did not resolve. Run sector-check --list, or /aris-sector to bootstrap it.\n`
  );
  process.exit(3);
}

const reg = JSON.parse(fs.readFileSync(path.join(HERE, "..", "data", "fetchability.json"), "utf8"));

/** The registry entry for a target, or null to make no claim. */
const statusOf = (t) => {
  const host = t.url ? hostFromUrl(t.url) : hostForPlatform(t.platform);
  if (!host) return null;
  const key = matchHost(reg.hosts, host);
  return key ? { host: key, ...reg.hosts[key] } : { host, status: "unobserved" };
};

const targets = [
  ...(resolved.reviewPlatforms ?? []).map((x) => ({ kind: "review", label: x.name ?? x.url, ...x })),
  ...(resolved.communities ?? []).map((x) => ({ kind: "community", label: x.platform ?? x.handle, ...x })),
];

const open = [];
const walled = [];
const unknown = [];
const noHost = [];
for (const t of targets) {
  const s = statusOf(t);
  const row = { kind: t.kind, label: t.label, handle: t.handle, url: t.url, coverage: t.coverage,
                host: s?.host ?? null, status: s?.status ?? "no-host", reason: s?.reason };
  /**
   * No host is not the same as never observed. A kind with no address cannot be
   * probed, so offering it as "try one" wastes a fetch on a domain that was guessed.
   */
  if (!s) { row.reason = whyNoHost(t.platform) ?? "no hostname could be resolved for this entry"; noHost.push(row); }
  else if (s.status === "open") open.push(row);
  else if (s.status === "unobserved") unknown.push(row);
  else walled.push(row);
}

if (args.includes("--json")) {
  process.stdout.write(JSON.stringify({ sector: resolved.sector, open, walled, unknown, noHost }, null, 2) + "\n");
  process.exit(open.length || unknown.length ? 0 : 3);
}

const line = (r) =>
  `  ${String(r.label ?? "?").padEnd(26)}${(r.handle ? r.handle : (r.url ?? "")).slice(0, 28).padEnd(30)}` +
  `${r.coverage ? `coverage ${r.coverage}` : ""}\n`;

process.stdout.write(`${resolved.sector}: where a miner can actually read\n${"-".repeat(48)}\n`);

process.stdout.write(`\nCAN BE READ (${open.length}) — dispatch miners here\n`);
if (open.length) for (const r of open) process.stdout.write(line(r));
else process.stdout.write("  nothing\n");

if (unknown.length) {
  process.stdout.write(`\nNOT OBSERVED (${unknown.length}) — try one, then record the result\n`);
  for (const r of unknown) process.stdout.write(line(r));
  process.stdout.write(
    "  Absent from fetchability.json means nobody has tried, NOT that it is open.\n" +
    "  One fetch settles it; add the host with the date so the next run knows.\n"
  );
}

if (walled.length) {
  process.stdout.write(`\nPASTE TASKS (${walled.length}) — a miner cannot read these, a person can\n`);
  for (const r of walled) {
    process.stdout.write(line(r));
    process.stdout.write(`      [${String(r.status).toUpperCase()}] ${r.reason ?? ""}\n`);
  }
  process.stdout.write("\n  Run /aris-evidence to turn these into paste tasks. Do not work around them.\n");
}

if (noHost.length) {
  process.stdout.write(`\nNOT A FETCHABLE SURFACE (${noHost.length}) — nothing to probe here\n`);
  for (const r of noHost) {
    process.stdout.write(line(r));
    process.stdout.write(`      ${r.reason}\n`);
  }
}

if (!open.length && !unknown.length) {
  process.stdout.write(
    `\nEVERY target for this field is behind a wall.\n\n` +
    `Do not mine and do not report a quiet market: this is a finding about ACCESS, not\n` +
    `about demand. Run /aris-evidence to produce the paste list, and say plainly in the\n` +
    `report that a thin result here measures reach rather than the market.\n`
  );
  process.exit(3);
}
process.stdout.write("\n");
