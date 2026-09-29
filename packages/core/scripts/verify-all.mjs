#!/usr/bin/env node
/**
 * Run every gate, add the cross-asset consistency checks that belong to no single
 * gate, and write verification/verify.json + verification/issues.json.
 *
 *   verify-all.mjs                run everything
 *   verify-all.mjs --only claims  one gate
 *   verify-all.mjs --no-write     report without touching verify.json
 *
 * The publish hook reads what this writes. That is the whole point: a hook cannot
 * hear a human say "it's fine", so the decision has to be on disk, produced by
 * something that actually measured.
 *
 * Exit 0 only when nothing blocking failed.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execFileSync } from "node:child_process";
import { requireRoot, readJson, writeJson, exists } from "./lib/aris.mjs";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const root = requireRoot();
const assetsDir = path.join(root, ".aris", "assets");
const only = (() => {
  const i = process.argv.indexOf("--only");
  return i === -1 ? null : process.argv[i + 1];
})();

const GATES = [
  { key: "pains", script: "pain-check.mjs", needs: "intel/pains.json" },
  { key: "personas", script: "persona-check.mjs", needs: "intel/personas.json" },
  { key: "arithmetic", script: "arithmetic-check.mjs", needs: "intel/tam-sam-som.json" },
  { key: "claims", script: "claim-check.mjs", needs: "assets/claims.json" },
  { key: "language", script: "superlative-check.mjs", needs: "assets/claims.json" },
  { key: "trace", script: "trace.mjs", needs: "intel/sources.json", args: ["--in-verify"] },
];

const checks = [];
let seq = 0;
const id = () => `VERIFY-${String(++seq).padStart(3, "0")}`;

for (const g of GATES) {
  if (only && only !== g.key) continue;
  if (!exists(root, g.needs)) {
    checks.push({ id: id(), check: `gate:${g.key}`, status: "skipped", errors: [`${g.needs} does not exist yet`] });
    continue;
  }
  try {
    const out = execFileSync("node", [path.join(HERE, g.script), ...(g.args ?? []), "--json"], { encoding: "utf8", cwd: root });
    for (const c of JSON.parse(out).checks ?? []) checks.push({ ...c, id: id(), gate: g.key });
  } catch (e) {
    // A failing gate exits non-zero but still printed its JSON on stdout.
    const raw = e.stdout ? String(e.stdout) : "";
    try {
      for (const c of JSON.parse(raw).checks ?? []) checks.push({ ...c, id: id(), gate: g.key });
    } catch {
      checks.push({ id: id(), check: `gate:${g.key}`, status: "failed", errors: [`${g.script} could not run: ${String(e.message).split("\n")[0]}`] });
    }
  }
}

// ---------- cross-asset consistency: nobody owns these, so they rot ----------
if (!only) {
  const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter((f) => f.endsWith(".md")) : [];
  const corpus = files.map((f) => [f, fs.readFileSync(path.join(assetsDir, f), "utf8")]);
  const state = readJson(root, "state.json") ?? {};
  const gtm = readJson(root, "strategy/gtm.json");
  const push = (name, errors, status) => checks.push({ id: id(), check: name, status: status ?? (errors.length ? "failed" : "passed"), errors });

  // links: shape only. A 404 sweep needs the network and belongs to the miner.
  const linkErrs = [];
  const urls = new Set();
  for (const [f, b] of corpus)
    for (const m of b.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
      urls.add(m[1]);
      if (/\s/.test(m[1]) || m[1].includes("example.com") || m[1].endsWith("//"))
        linkErrs.push(`assets/${f}: placeholder or malformed link ${m[1]}`);
    }
  for (const [f, b] of corpus)
    for (const m of b.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]*)\)/g))
      if (!m[1] || m[1] === "TODO" || m[1] === "#") linkErrs.push(`assets/${f}: empty or TODO link target`);
  push("broken_links", linkErrs);

  // UTM: every campaign link must carry a consistent, complete tag set.
  const utmErrs = [];
  const campaigns = new Set();
  for (const u of urls) {
    if (!u.includes("utm_")) continue;
    const q = new URL(u).searchParams;
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) if (!q.get(k)) utmErrs.push(`${u} is missing ${k}`);
    if (q.get("utm_campaign")) campaigns.add(q.get("utm_campaign"));
  }
  if (campaigns.size > 1) utmErrs.push(`${campaigns.size} different utm_campaign values across the package: ${[...campaigns].join(", ")}`);
  push("utm_consistency", utmErrs);

  // tracking present on anything that is a destination
  const trackErrs = [];
  if (corpus.length && !corpus.some(([, b]) => /utm_|analytics|gtag|pixel|tracking/i.test(b)))
    trackErrs.push("no asset mentions tracking or a UTM tag: the launch will produce traffic nobody can attribute");
  push("tracking_present", trackErrs);

  // pricing: one price, everywhere
  const priceErrs = [];
  const prices = new Map();
  for (const [f, b] of corpus)
    for (const m of b.matchAll(/(?:[$€£]|USD\s?|VND\s?)\s?([\d][\d.,]*)\s*(?:\/\s*(mo|month|seat|user|yr|year))?/gi)) {
      const key = `${m[1]}${m[2] ? "/" + m[2].toLowerCase() : ""}`;
      if (!prices.has(key)) prices.set(key, new Set());
      prices.get(key).add(f);
    }
  const rec = gtm?.pricing?.recommended;
  const recNum = rec && typeof rec === "object" ? Object.values(rec).find((v) => Number.isFinite(Number(v))) : rec;
  if (prices.size > 1)
    priceErrs.push(`${prices.size} distinct price figures across the package: ${[...prices.keys()].join(", ")} — one of them is wrong`);
  if (recNum != null && prices.size) {
    const want = String(recNum).replace(/[^\d.]/g, "");
    if (![...prices.keys()].some((k) => k.replace(/[^\d.]/g, "") === want))
      priceErrs.push(`no asset states the recommended price (${recNum}) from gtm.json`);
  }
  push("pricing_consistency", priceErrs);

  // product name: one spelling
  const nameErrs = [];
  const name = state.product?.name;
  if (name) {
    const variants = new Set();
    for (const [, b] of corpus)
      for (const m of b.matchAll(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"))) variants.add(m[0]);
    if (variants.size > 1) nameErrs.push(`the product name is spelled ${variants.size} ways: ${[...variants].join(", ")}`);
    const absent = corpus.filter(([, b]) => !new RegExp(name, "i").test(b)).map(([f]) => f);
    if (absent.length) nameErrs.push(`assets that never name the product: ${absent.join(", ")}`);
  }
  push("product_name_consistency", nameErrs);

  // dates: nothing in the past, one launch date
  const dateErrs = [];
  const dates = new Set();
  for (const [f, b] of corpus)
    for (const m of b.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)) {
      dates.add(m[1]);
      if (Date.parse(m[1]) < Date.now() - 86400000) dateErrs.push(`assets/${f}: ${m[1]} is in the past`);
    }
  push("date_consistency", dateErrs);

  // CTA: one primary action
  const ctaErrs = [];
  const ctas = new Set();
  for (const [, b] of corpus)
    for (const m of b.matchAll(/\*\*\[?([A-Z][^*\]\n]{2,40})\]?\*\*\s*$/gm)) ctas.add(m[1].trim().toLowerCase());
  // Advisory: a twelve-post social set legitimately varies its CTA. Worth a look, not a block.
  if (ctas.size > 6) ctaErrs.push(`${ctas.size} distinct call-to-action phrasings — check there is still one primary action`);
  push("cta_consistency", ctaErrs);

  // legal
  const legalErrs = [];
  const all = corpus.map(([, b]) => b).join("\n").toLowerCase();
  if (corpus.length) {
    if (!/privacy/.test(all)) legalErrs.push("no asset links or refers to a privacy policy");
    if (/\bsubscri|\bmonthly\b|\/mo\b/.test(all) && !/cancel|terms/.test(all))
      legalErrs.push("the package sells a subscription but states no terms or cancellation");
  }
  push("legal_links_present", legalErrs);

  // translation: declared languages must all be produced
  const transErrs = [];
  for (const lang of state.market?.language ?? []) {
    if (String(lang).toLowerCase().startsWith("en")) continue;
    const tag = String(lang).toLowerCase().slice(0, 2);
    // Either a language-tagged file (copy.vi.md) or substantial non-ASCII copy in place.
    const tagged = files.some((f) => f.includes(`.${tag}.`));
    const inline = corpus.some(([, b]) => (b.match(/[^\u0000-\u024f]/g) ?? []).length > 40);
    if (!tagged && !inline)
      transErrs.push(`${lang} is a declared market language: no .${tag}.md asset and no substantial ${lang} copy inline`);
  }
  push("translation_complete", transErrs);

  // placeholders must still be placeholders, and must still be there
  const phErrs = [];
  for (const [f, b] of corpus) {
    if (/\[(TODO|FIXME|LOREM|XXX)\b/i.test(b)) phErrs.push(`assets/${f} still contains a TODO placeholder`);
    if (/lorem ipsum/i.test(b)) phErrs.push(`assets/${f} contains lorem ipsum`);
  }
  push("no_stray_placeholders", phErrs);

  // stale research
  const staleErrs = [];
  const sources = readJson(root, "intel/sources.json", { sources: [] }).sources ?? [];
  const MAXAGE = 180;
  const old = sources.filter((s) => s.accessedAt && (Date.now() - Date.parse(s.accessedAt)) / 86400000 > MAXAGE);
  if (old.length) staleErrs.push(`${old.length} source(s) were accessed more than ${MAXAGE} days ago; pricing and competitor claims decay fastest`);
  push("research_is_current", staleErrs, staleErrs.length ? "failed" : "passed");
}

// ---------- write ----------
const failed = checks.filter((c) => c.status === "failed");
const ADVISORY = new Set(["research_is_current", "no_orphan_claims", "reserved_terms_used_correctly",
  "orphan_sources", "cta_consistency", "translation_complete"]);
const blocking = failed.filter((c) => !ADVISORY.has(c.check));
const warnings = failed.filter((c) => ADVISORY.has(c.check));

const doc = {
  passed: blocking.length === 0 && checks.some((c) => c.status === "passed"),
  timestamp: new Date().toISOString(),
  researchAge: (() => {
    const s = readJson(root, "intel/sources.json", { sources: [] }).sources ?? [];
    const ages = s.map((x) => (x.accessedAt ? (Date.now() - Date.parse(x.accessedAt)) / 86400000 : null)).filter((n) => n != null);
    return { oldestSourceDays: ages.length ? Math.round(Math.max(...ages)) : null };
  })(),
  checks,
  blockingIssues: blocking.flatMap((c) => (c.errors ?? []).map((e) => `[${c.check}] ${e}`)),
  warnings: warnings.flatMap((c) => (c.errors ?? []).map((e) => `[${c.check}] ${e}`)),
};

if (!process.argv.includes("--no-write") && !only) {
  writeJson(root, "verification/verify.json", doc);
  writeJson(root, "verification/issues.json", {
    generatedAt: doc.timestamp,
    blocking: doc.blockingIssues,
    warnings: doc.warnings,
  });
  const state = readJson(root, "state.json") ?? {};
  state.verify = { lastRun: doc.timestamp, passed: doc.passed };
  if (doc.passed && state.status === "production") state.status = "verified";
  writeJson(root, "state.json", state);
}

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(doc, null, 2) + "\n");
} else {
  const pad = Math.max(...checks.map((c) => c.check.length), 10);
  process.stdout.write(`aris-verify  ${doc.timestamp}\n\n`);
  for (const c of checks) {
    const mark = { passed: "PASS", failed: "FAIL", skipped: "SKIP" }[c.status];
    const cov = c.coverage != null ? `  ${Math.round(c.coverage * 100)}%` : "";
    process.stdout.write(`  ${mark}  ${c.check.padEnd(pad)}${cov}\n`);
    for (const e of (c.errors ?? []).slice(0, 6)) process.stdout.write(`        ${e}\n`);
    if ((c.errors ?? []).length > 6) process.stdout.write(`        ... ${c.errors.length - 6} more\n`);
  }
  process.stdout.write(
    `\n  ${doc.passed ? "PASSED" : "FAILED"} - ${doc.blockingIssues.length} blocking, ${doc.warnings.length} warnings\n`
  );
  if (!doc.passed) process.stdout.write(`  The publish gate stays closed while this fails.\n`);
}
process.exit(doc.passed ? 0 : 1);
