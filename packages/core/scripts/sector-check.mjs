#!/usr/bin/env node
/**
 * Resolve a field from the knowledge base, or fail closed.
 *
 *   sector-check.mjs --list              every entry, by family
 *   sector-check.mjs --show <field>      the resolved profile
 *   sector-check.mjs --show <f> --json   machine-readable, for the gates
 *   sector-check.mjs --why <field>       where each part of the profile came from
 *
 * Exit: 0 resolved, 3 not covered (the caller must stop or bootstrap), 2 usage.
 *
 * FAMILIES. A field inherits from a family root via `extends`, so a leaf only
 * records what actually differs. That is what lets the base cover a long tail
 * without anyone inventing depth for a niche they have not researched: pet
 * insurance inherits every constraint of regulated-finance and adds the two
 * things that are specific to it.
 *
 * Arrays union along the chain (constraints ADD, they never cancel — a leaf must
 * not be able to delete a regulator's rule). Scalars and objects let the leaf win.
 *
 * THREE RESOLUTION QUALITIES, and the caller must tell them apart:
 *   covered   an exact or alias hit on a researched entry
 *   family    only the family root matched. Usable, and disclosed loudly.
 *   absent    nothing matched. Exit 3; the flow stops.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILTIN = path.join(HERE, "..", "data", "sectors");

/** Project-local entries override built-ins, so /mkt-sector adds a field without touching the plugin. */
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

function load(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
    try { return { _file: path.join(dir, f), ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }; }
    catch (e) { process.stderr.write(`skipping ${f}: ${e.message}\n`); return null; }
  }).filter(Boolean);
}

const entries = [...load(BUILTIN), ...load(projectDir() || "")];
const byName = new Map(entries.map((e) => [e.sector, e]));
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ARRAYS = ["aliases", "reviewPlatforms", "communities", "buyingCommittee", "regulatedClaims",
                "forbidden", "reservedTerms", "requiredDisclosures", "seasonality"];

/** Walk the extends chain, root first, and record which entry contributed what. */
function resolve(entry) {
  const chain = [];
  let cur = entry, guard = 0;
  while (cur && guard++ < 12) {
    chain.unshift(cur);
    cur = cur.extends ? byName.get(cur.extends) : null;
  }
  const out = { _chain: chain.map((c) => c.sector), _from: {} };
  for (const e of chain) {
    for (const [k, v] of Object.entries(e)) {
      if (k.startsWith("_") || k === "extends") continue;
      if (ARRAYS.includes(k)) {
        // Constraints add. A leaf must never be able to remove a family's rule.
        const seen = new Set((out[k] ?? []).map((x) => JSON.stringify(x)));
        out[k] = [...(out[k] ?? []), ...(v ?? []).filter((x) => !seen.has(JSON.stringify(x)))];
        for (const x of v ?? []) (out._from[k] ??= {})[JSON.stringify(x).slice(0, 60)] = e.sector;
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = { ...(out[k] ?? {}), ...v };
        out._from[k] = e.sector;
      } else if (v != null && v !== "") {
        out[k] = v;
        out._from[k] = e.sector;
      }
    }
  }
  return out;
}

const args = process.argv.slice(2);

if (args.includes("--list") || args.length === 0) {
  const roots = entries.filter((e) => !e.extends);
  const kids = (p) => entries.filter((e) => e.extends === p.sector);
  process.stdout.write(`Fields covered: ${entries.filter((e) => e.extends).length} specific, ` +
    `${roots.length} families\n\n`);
  for (const r of roots.sort((a, b) => a.sector.localeCompare(b.sector))) {
    process.stdout.write(`${r.sector}  ${"-".repeat(Math.max(2, 34 - r.sector.length))}  [family]\n`);
    for (const k of kids(r).sort((a, b) => a.sector.localeCompare(b.sector)))
      process.stdout.write(`    ${k.sector}${k.status === "provisional" ? "  [provisional]" : ""}\n` +
        (k.aliases?.length ? `        ${k.aliases.join(", ")}\n` : ""));
  }
  process.stdout.write(`\nA field not listed still resolves to its family. Nothing at all fails closed.\n`);
  process.exit(0);
}

const flag = args.includes("--why") ? "--why" : "--show";
const i = args.indexOf(flag);
if (i === -1 || !args[i + 1]) {
  process.stderr.write("usage: sector-check.mjs --list | --show <field> | --why <field>\n");
  process.exit(2);
}
const wantRaw = args[i + 1];
const want = norm(wantRaw);

/**
 * Whole-token scoring, not substring matching.
 *
 * Substrings produced confident nonsense: "car wash" matched regulated-health
 * because "car" sits inside "care", and "podcast hosting platform" matched the
 * BI entry because both contain the word "platform". A wrong field is worse than
 * no field: it sends the miner to the wrong communities and applies the wrong
 * regulator's rules, and nothing downstream can tell.
 */
const tok = (x) => norm(x).split("-").filter(Boolean);

// Words that describe almost every product and so identify none. They cannot
// carry a specific match on their own, but they are exactly what a family's
// catchAll is for, so they still count there.
const GENERIC = new Set(["platform", "software", "app", "apps", "tool", "tools", "system",
  "service", "services", "solution", "solutions", "online", "digital", "product", "products",
  "company", "business", "tech", "technology", "management", "mobile", "web", "portal", "cloud",
  "brand", "subscription", "store", "shop", "startup", "software"]);

const qTokens = [...new Set(tok(wantRaw))];
const weight = (w) => (w.length >= 5 ? 3 : w.length >= 4 ? 2 : 1);

function score(haystack, { allowGeneric = false } = {}) {
  const ht = new Set(haystack.flatMap(tok));
  let n = 0;
  for (const w of qTokens) {
    if (!ht.has(w)) continue;
    if (GENERIC.has(w) && !allowGeneric) continue;
    n += weight(w);
  }
  return n;
}

let hit = entries.find((e) => norm(e.sector) === want)
       || entries.find((e) => (e.aliases || []).some((a) => norm(a) === want));
let quality = hit ? "covered" : null;

if (!hit) {
  // Best specific entry, and only on a substantial word.
  const ranked = entries
    .map((e) => ({ e, s: score([e.sector, ...(e.aliases || [])]) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s || a.e.sector.length - b.e.sector.length);
  if (ranked.length) { hit = ranked[0].e; quality = "covered"; }
}

if (!hit) {
  // Family fallback. Generic words count here: that is what catchAll is for.
  const ranked = entries.filter((e) => !e.extends)
    .map((e) => ({ e, s: score(e.catchAll || [], { allowGeneric: true }) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s);
  if (ranked.length) { hit = ranked[0].e; quality = "family"; }
}

if (!hit) {
  process.stderr.write(
    `FIELD NOT COVERED: ${wantRaw}\n\n` +
    `Nothing in the knowledge base matches, and no family claims it. Without an entry\n` +
    `the miner does not know which review sites and communities carry this field's\n` +
    `public voice, which of its claims are regulated, or what it charges. Mining blind\n` +
    `is where fabrication starts, so this stops here.\n\n` +
    `  node sector-check.mjs --list        see what is covered\n` +
    `  /mkt-sector ${wantRaw}${" ".repeat(Math.max(1, 18 - wantRaw.length))}research it and write a provisional entry\n`
  );
  process.exit(3);
}

const r = resolve(hit);
r.resolution = quality;
r.matched = hit.sector;

if (args.includes("--json")) {
  process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  process.exit(0);
}

if (flag === "--why") {
  process.stdout.write(`${wantRaw} -> ${hit.sector}\n`);
  process.stdout.write(`inheritance: ${r._chain.join("  ->  ")}\n\n`);
  for (const k of ARRAYS) {
    if (!r[k]?.length) continue;
    process.stdout.write(`${k}\n`);
    for (const x of r[k]) {
      const src = r._from[k]?.[JSON.stringify(x).slice(0, 60)] ?? "?";
      const label = typeof x === "string" ? x : (x.name ?? x.term ?? x.claim ?? x.role ?? x.handle ?? JSON.stringify(x));
      process.stdout.write(`  ${String(label).slice(0, 72).padEnd(74)} from ${src}\n`);
    }
    process.stdout.write("\n");
  }
  process.exit(0);
}

const L = (label, v) => {
  if (v == null || (Array.isArray(v) && !v.length) ||
      (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)) return;
  process.stdout.write(`\n${label}\n`);
  if (Array.isArray(v))
    for (const x of v) {
      if (typeof x === "string") { process.stdout.write(`  - ${x}\n`); continue; }
      const head = x.name ?? x.term ?? x.claim ?? x.role ?? x.platform ?? "";
      const rest = Object.entries(x).filter(([k]) => !["name","term","claim","role","platform"].includes(k))
        .map(([k, val]) => `${k}: ${val}`).join("  ");
      process.stdout.write(`  - ${head}${rest ? "  (" + rest + ")" : ""}\n`);
    }
  else process.stdout.write(`  ${Object.entries(v).map(([k, val]) =>
    `${k}: ${Array.isArray(val) ? val.join(", ") : val}`).join("\n  ")}\n`);
};

process.stdout.write(`${hit.sector}${hit.status === "provisional" ? "  [PROVISIONAL]" : ""}\n`);
process.stdout.write(`inherits: ${r._chain.join(" -> ")}\n`);
if (quality === "family")
  process.stdout.write(
    `\n  RESOLVED TO A FAMILY, NOT A SPECIFIC FIELD.\n` +
    `  "${wantRaw}" has no researched entry, so this is the generic ${hit.sector} profile.\n` +
    `  It is a real starting point and it is not specific. Set sectorStatus to "family",\n` +
    `  say so in the package, and run /mkt-sector ${wantRaw} to research the specifics.\n`);
if (hit.status === "provisional")
  process.stdout.write(`\n  Bootstrapped, not curated. Everything derived from it is stamped provisional.\n`);
L("Review platforms (where to mine)", r.reviewPlatforms);
L("Communities (where to mine)", r.communities);
L("Buying committee", r.buyingCommittee);
L("Channel norms", r.channelNorms);
L("Price bands", r.priceBands);
L("CAC benchmarks", r.cacBenchmarks);
L("Sales cycle (days)", r.salesCycleDays);
L("REGULATED CLAIMS (a verify lens)", r.regulatedClaims);
L("FORBIDDEN (defects this field recognises)", r.forbidden);
L("Reserved terms", r.reservedTerms);
L("Required disclosures", r.requiredDisclosures);
L("Seasonality", r.seasonality);
process.exit(0);
