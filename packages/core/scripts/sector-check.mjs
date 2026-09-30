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

/** Project-local entries override built-ins, so /aris-sector adds a field without touching the plugin. */
function projectDir() {
  let d = process.cwd();
  for (;;) {
    const c = path.join(d, ".aris", "sectors");
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

const allEntries = [...load(BUILTIN), ...load(projectDir() || "")];

// An entry can itself be market-bound (hr-payroll-vn is about Vietnamese payroll law and
// is meaningless anywhere else). Drop those when a different market is named, so they do
// not turn up as co-matches for a product that will never touch them.
const marketArg = (() => {
  const i = process.argv.indexOf("--market");
  return i === -1 ? null : String(process.argv[i + 1] || "").toUpperCase();
})();
const entries = marketArg
  ? allEntries.filter((e) => !e.market || String(e.market).toUpperCase() === marketArg)
  : allEntries;
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
  // Recurse: the chain can be deeper than one level (hr-payroll-vn extends b2b-saas-hr),
  // and printing only a root's direct children made those entries invisible in the one
  // listing that is supposed to say what the base covers.
  const printKids = (p, depth) => {
    for (const k of kids(p).sort((a, b) => a.sector.localeCompare(b.sector))) {
      const pad = "    ".repeat(depth);
      process.stdout.write(`${pad}${k.sector}${k.status === "provisional" ? "  [provisional]" : ""}` +
        `${k.market ? `  [${k.market} only]` : ""}\n` +
        (k.aliases?.length ? `${pad}    ${k.aliases.join(", ")}\n` : ""));
      printKids(k, depth + 1);
    }
  };
  for (const r of roots.sort((a, b) => a.sector.localeCompare(b.sector))) {
    process.stdout.write(`${r.sector}  ${"-".repeat(Math.max(2, 34 - r.sector.length))}  [family]\n`);
    printKids(r, 1);
  }
  process.stdout.write(`\nA field not listed still resolves to its family. Nothing at all fails closed.\n`);
  process.exit(0);
}

const flag = args.includes("--why") ? "--why" : "--show";
const i = args.indexOf(flag);
if (i === -1 || !args[i + 1]) {
  process.stderr.write("usage: sector-check.mjs --list | --show <field> [--market XX] | --why <field>\n");
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
 *
 * Tokens are stemmed to a singular, on BOTH sides, because exact-token matching
 * turned one trailing letter into the difference between a researched field and a
 * hard stop: "restaurant" resolved to hospitality-fnb and "restaurants" exited 3
 * as not covered. Stemming is deliberately crude and symmetric - it only has to
 * agree with itself, never to be linguistically right - and "ss"/"us" endings are
 * left alone so "business" and "status" survive.
 */
const stem = (w) => {
  if (w.length < 4) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (/(?:ses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !/(?:ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
};
const tok = (x) => norm(x).split("-").filter(Boolean).map(stem);

// Words that describe almost every product and so identify none. They cannot
// carry a specific match on their own, but they are exactly what a family's
// catchAll is for, so they still count there.
const GENERIC = new Set(["platform", "software", "app", "apps", "tool", "tools", "system",
  "service", "services", "solution", "solutions", "online", "digital", "product", "products",
  "company", "business", "tech", "technology", "management", "mobile", "web", "portal", "cloud",
  "brand", "subscription", "store", "shop", "startup", "software"]);

// English connectives carry no signal about a field.
const STOP = new Set(["and", "for", "the", "with", "of", "in", "to", "a", "an", "or",
  "my", "our", "your", "their", "on", "at", "by", "from"]);

const qTokens = [...new Set(tok(wantRaw))].filter((w) => !STOP.has(w));
const weight = (w) => (w.length >= 5 ? 3 : w.length >= 4 ? 2 : 1);

/**
 * `name` is the entry's own sector slug. A short token that matches it is an acronym,
 * not noise: "hr" is two characters and identifies a field exactly, while length alone
 * would score it below "and". Without this, an HR-plus-project product matched only the
 * project half and dropped every HR constraint silently.
 */
function score(haystack, { allowGeneric = false, name = "" } = {}) {
  const ht = new Set(haystack.flatMap(tok));
  const nameTokens = new Set(tok(name));
  let n = 0;
  for (const w of qTokens) {
    if (!ht.has(w)) continue;
    if (GENERIC.has(w) && !allowGeneric) continue;
    n += nameTokens.has(w) ? Math.max(weight(w), 3) : weight(w);
  }
  return n;
}

let alsoMatched = [];
let hit = entries.find((e) => norm(e.sector) === want)
       || entries.find((e) => (e.aliases || []).some((a) => norm(a) === want));
let quality = hit ? "covered" : null;

if (!hit) {
  // Best specific entry, and only on a substantial word.
  const ranked = entries
    .map((e) => ({ e, s: score([e.sector, ...(e.aliases || [])], { name: e.sector }) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s || a.e.sector.length - b.e.sector.length);
  if (ranked.length) {
    hit = ranked[0].e; quality = "covered";
    // A product can genuinely sit in two fields. Returning only the winner silently
    // drops the runner-up's constraints - including its regulated claims - which is a
    // decision, not something sorting should do on its own.
    alsoMatched = ranked.slice(1).filter((x) => x.s >= ranked[0].s * 0.7).map((x) => x.e.sector);
  }
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
    `  /aris-sector ${wantRaw}${" ".repeat(Math.max(1, 18 - wantRaw.length))}research it and write a provisional entry\n`
  );
  process.exit(3);
}

const r = resolve(hit);
r.resolution = quality;
r.matched = hit.sector;
r.alsoMatched = alsoMatched;

/**
 * Filter mining targets by market.
 *
 * A sector entry describes a FIELD, but where that field's customers talk depends on
 * GEOGRAPHY. The two were conflated in the first draft, so a Slovak product would have
 * been mined in Vietnamese Facebook groups, found nothing, and reported the absence as
 * a finding about the market.
 *
 * Entries with no `market` are market-neutral and always apply. Entries with one apply
 * only to that market. If a market has no local targets at all, say so: that is a gap
 * to research, not a reason to mine somewhere else.
 */
const mkt = (() => {
  const i = args.indexOf("--market");
  return i === -1 ? null : String(args[i + 1] || "").toUpperCase();
})();
r.market = mkt;
r.localGap = false;
if (mkt) {
  for (const key of ["communities", "reviewPlatforms"]) {
    const all = r[key] ?? [];
    const local = all.filter((e) => String(e.market || "").toUpperCase() === mkt);
    r[key] = all.filter((e) => !e.market || String(e.market).toUpperCase() === mkt);
    if (!local.length) r.localGap = true;
  }
}

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
if (r.alsoMatched.length)
  process.stdout.write(
    `\n  ALSO MATCHED: ${r.alsoMatched.join(", ")}\n` +
    `  This product may sit in more than one field. Constraints UNION - the second\n` +
    `  field's regulated claims and forbidden list apply too. Record them in\n` +
    `  state.market.secondarySectors, or state why they do not apply. Dropping one\n` +
    `  must be a decision, not a side effect of sorting.\n`);
if (r.market)
  process.stdout.write(`market filter: ${r.market}${r.localGap ?
    "  — NO LOCAL TARGETS LISTED for this market" : ""}\n`);
if (r.localGap)
  process.stdout.write(
    `\n  The entry lists no community or review platform specific to ${r.market}.\n` +
    `  Market-neutral targets below still apply, but the places this field's ${r.market}\n` +
    `  buyers actually talk are unresearched. Run /aris-sector to establish them before\n` +
    `  treating a thin mining result as evidence that the market is quiet.\n`);
if (quality === "family")
  process.stdout.write(
    `\n  RESOLVED TO A FAMILY, NOT A SPECIFIC FIELD.\n` +
    `  "${wantRaw}" has no researched entry, so this is the generic ${hit.sector} profile.\n` +
    `  It is a real starting point and it is not specific. Set sectorStatus to "family",\n` +
    `  say so in the package, and run /aris-sector ${wantRaw} to research the specifics.\n`);
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
