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
 * Severity lives on each check, not in a list kept here. A hand-maintained set of
 * advisory names in this file is how a check that flags the year a company was
 * founded became a hard publish gate.
 *
 * Exit 0 only when nothing blocking failed.
 */
import url from "node:url";
import path from "node:path";
import { requireRoot, readJson, writeJson, exists, help, runScript, assetCorpus } from "./lib/aris.mjs";

help(`verify-all.mjs [--only <gate>] [--no-write] [--json]

Runs every gate plus the cross-asset consistency checks, then writes
.aris/verification/verify.json, which is the file the publish hook reads.

  --only <gate>   one of: pains personas arithmetic claims language trace.
                  Writes nothing: a partial run must not leave a whole-package verdict.
  --no-write      report only
  --json          machine-readable`);

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const root = requireRoot();
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

if (only && !GATES.some((g) => g.key === only)) {
  process.stderr.write(`--only ${only} is not a gate. One of: ${GATES.map((g) => g.key).join(" ")}\n`);
  process.exit(2);
}

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
    const out = runScript(path.join(HERE, g.script), [...(g.args ?? []), "--json"], { cwd: root });
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
  // Recursive. A flat readdir left an asset in a subdirectory invisible to every
  // check below, which is the widest hole the gates had.
  const corpus = assetCorpus(root);
  const files = corpus.map(([f]) => f);
  const state = readJson(root, "state.json") ?? {};
  const gtm = readJson(root, "strategy/gtm.json");
  /** `adv: true` marks a finding as worth reading rather than worth blocking. */
  const push = (name, errors, { status, adv = false } = {}) =>
    checks.push({
      id: id(),
      check: name,
      status: status ?? (errors.length ? "failed" : "passed"),
      errors,
      ...(adv ? { advisory: true } : {}),
    });

  // links: shape only. A 404 sweep needs the network and belongs to the miner.
  const linkErrs = [];
  const parsed = [];
  for (const [f, b] of corpus)
    for (const m of b.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
      const raw = m[1];
      if (raw.includes("example.com") || raw.endsWith("//")) linkErrs.push(`assets/${f}: placeholder or malformed link ${raw}`);
      // A URL the standard parser rejects is malformed, and this is where that is
      // reported. It used to reach new URL() in the UTM check below unguarded, where
      // it threw and took the whole run down without writing verify.json at all.
      try { parsed.push(new URL(raw)); }
      catch { linkErrs.push(`assets/${f}: ${raw} is not a parseable URL`); }
    }
  for (const [f, b] of corpus)
    for (const m of b.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]*)\)/g))
      if (!m[1] || m[1] === "TODO" || m[1] === "#") linkErrs.push(`assets/${f}: empty or TODO link target`);
  push("broken_links", linkErrs);

  // UTM: every campaign link must carry a consistent, complete tag set.
  const utmErrs = [];
  const campaigns = new Set();
  for (const u of parsed) {
    if (!u.href.includes("utm_")) continue;
    for (const k of ["utm_source", "utm_medium", "utm_campaign"])
      if (!u.searchParams.get(k)) utmErrs.push(`${u.href} is missing ${k}`);
    if (u.searchParams.get("utm_campaign")) campaigns.add(u.searchParams.get("utm_campaign"));
  }
  if (campaigns.size > 1) utmErrs.push(`${campaigns.size} different utm_campaign values across the package: ${[...campaigns].join(", ")}`);
  push("utm_consistency", utmErrs);

  // tracking present on anything that is a destination
  const trackErrs = [];
  if (corpus.length && !corpus.some(([, b]) => /utm_|analytics|gtag|pixel|tracking/i.test(b)))
    trackErrs.push("no asset mentions tracking or a UTM tag: the launch will produce traffic nobody can attribute");
  push("tracking_present", trackErrs);

  /**
   * Pricing: one price per unit, everywhere.
   *
   * This used to block on "more than one distinct money figure in the package", which
   * is the normal state of a correct package. A deck quoting a 4.2B market and a 29/mo
   * price is two figures, so the gate closed permanently over copy that was right.
   * Two things separate a price from a number that merely carries a currency symbol:
   *
   *   - a magnitude suffix (4.2B, 500k, 12 million) is a market size, never a price
   *   - a price carries a unit, and two figures conflict only when they claim the
   *     same unit
   *
   * Bare amounts still count towards "does any asset state the recommended price",
   * and a spread of them is reported as advisory, because it is worth a look and is
   * not by itself evidence of a defect.
   */
  const priceErrs = [];
  const priceAdv = [];
  const MONEY = /(?:[$€£]|USD|EUR|GBP|VND)\s?([\d][\d.,]*)\s*(k|m|bn|b|million|billion)?\s*(?:\/\s*|per\s+)?(mo|month|seat|user|yr|year)?/gi;
  const byUnit = new Map(); // unit -> Map(amount -> Set(file))
  const bare = new Map();   // amount -> Set(file)
  for (const [f, b] of corpus)
    for (const m of b.matchAll(MONEY)) {
      if (m[2]) continue; // a magnitude suffix means a market size, not a price
      const amount = m[1].replace(/,/g, "").replace(/\.$/, "");
      const unit = (m[3] || "").toLowerCase().replace(/^month$/, "mo").replace(/^year$/, "yr");
      if (unit && !byUnit.has(unit)) byUnit.set(unit, new Map());
      const target = unit ? byUnit.get(unit) : bare;
      if (!target.has(amount)) target.set(amount, new Set());
      target.get(amount).add(f);
    }
  for (const [unit, amounts] of byUnit)
    if (amounts.size > 1)
      priceErrs.push(
        `${amounts.size} different prices per ${unit} across the package: ` +
          [...amounts].map(([a, fs]) => `${a} (${[...fs].join(", ")})`).join(" vs ") +
          ". One of them is wrong."
      );
  if (bare.size > 1)
    priceAdv.push(
      `${bare.size} money figures carry no unit: ${[...bare.keys()].join(", ")}. ` +
        "Check none of them is meant to be the price."
    );

  const rec = gtm?.pricing?.recommended;
  const recNum = rec && typeof rec === "object"
    ? (rec.amount ?? rec.value ?? Object.values(rec).find((v) => Number.isFinite(Number(v))))
    : rec;
  const stated = [...[...byUnit.values()].flatMap((m) => [...m.keys()]), ...bare.keys()].map((k) => k.replace(/[^\d.]/g, ""));
  if (recNum != null && stated.length) {
    const want = String(recNum).replace(/[^\d.]/g, "");
    if (want && !stated.includes(want)) priceErrs.push(`no asset states the recommended price (${recNum}) from gtm.json`);
  }
  push("pricing_consistency", priceErrs);
  push("money_figures_carry_a_unit", priceAdv, { adv: true });

  // product name: one spelling
  const nameErrs = [];
  const name = state.product?.name;
  if (name) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const variants = new Set();
    // A URL slug, a UTM campaign and a code span legitimately lowercase the product
    // name. Comparing them against the prose spelling reports a defect that is not one.
    const prose = corpus.map(([f, b]) => [f, b
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/\butm_[a-z]+=\S*/gi, " ")]);
    for (const [, b] of prose)
      for (const m of b.matchAll(new RegExp(esc, "gi"))) variants.add(m[0]);
    if (variants.size > 1) nameErrs.push(`the product name is spelled ${variants.size} ways: ${[...variants].join(", ")}`);
    // Escaped here too. It was not, two lines below an escaped copy of itself, so a
    // product called "Notion+" or "Acme (EU)" threw SyntaxError and killed the run.
    const absent = prose.filter(([, b]) => !new RegExp(esc, "i").test(b)).map(([f]) => f);
    if (absent.length) nameErrs.push(`assets that never name the product: ${absent.join(", ")}`);
  }
  push("product_name_consistency", nameErrs);

  /**
   * Dates: one launch date, and nothing silently out of date.
   *
   * The blocking half is what the comment always claimed and the code never did. The
   * set of dates was collected and then never read, so "one launch date" was never
   * tested at all. The half that WAS implemented failed the package for every date in
   * the past, which flags "trusted since 2019-03-01" and the access date on a citation.
   * A stale date is worth reading. It is not worth refusing to publish over.
   */
  const dateErrs = [];
  const pastErrs = [];
  const future = new Set();
  const yesterday = Date.now() - 86400000;
  for (const [f, b] of corpus)
    for (const m of b.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)) {
      const t = Date.parse(m[1]);
      if (!Number.isFinite(t)) { dateErrs.push(`assets/${f}: ${m[1]} is not a real date`); continue; }
      if (t < yesterday) pastErrs.push(`assets/${f}: ${m[1]} is in the past`);
      else future.add(m[1]);
    }
  if (future.size > 1)
    dateErrs.push(`${future.size} different future dates across the package: ${[...future].sort().join(", ")}. A launch has one date.`);
  push("date_consistency", dateErrs);
  push("dates_in_the_past", pastErrs, { adv: true });

  // CTA: one primary action
  const ctaErrs = [];
  const ctas = new Set();
  for (const [, b] of corpus)
    for (const m of b.matchAll(/\*\*\[?([A-Z][^*\]\n]{2,40})\]?\*\*\s*$/gm)) ctas.add(m[1].trim().toLowerCase());
  // Advisory: a twelve-post social set legitimately varies its CTA. Worth a look, not a block.
  if (ctas.size > 6) ctaErrs.push(`${ctas.size} distinct call-to-action phrasings. Check there is still one primary action.`);
  push("cta_consistency", ctaErrs, { adv: true });

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
    const inline = corpus.some(([, b]) => (b.match(/[^ -ɏ]/g) ?? []).length > 40);
    if (!tagged && !inline)
      transErrs.push(`${lang} is a declared market language: no .${tag}.md asset and no substantial ${lang} copy inline`);
  }
  push("translation_complete", transErrs, { adv: true });

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
  push("research_is_current", staleErrs, { adv: true });
}

// ---------- write ----------
const failed = checks.filter((c) => c.status === "failed");
const blocking = failed.filter((c) => !c.advisory);
const warnings = failed.filter((c) => c.advisory);

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
    const mark = c.status === "failed" && c.advisory ? "WARN" : { passed: "PASS", failed: "FAIL", skipped: "SKIP" }[c.status];
    const cov = c.coverage != null ? `  ${Math.round(c.coverage * 100)}%` : "";
    process.stdout.write(`  ${mark}  ${c.check.padEnd(pad)}${cov}\n`);
    for (const e of (c.errors ?? []).slice(0, 6)) process.stdout.write(`        ${e}\n`);
    if ((c.errors ?? []).length > 6) process.stdout.write(`        ... ${c.errors.length - 6} more\n`);
  }
  process.stdout.write(
    `\n  ${doc.passed ? "PASSED" : "FAILED"} - ${doc.blockingIssues.length} blocking, ${doc.warnings.length} warnings\n`
  );
  if (!doc.passed) process.stdout.write(`  The publish gate stays closed while this fails.\n`);
  if (only) process.stdout.write(`  --only ${only}: nothing was written. Run the whole gate set to update verify.json.\n`);
  else process.stdout.write(`  Releasable is a separate question: /aris-package runs close-check.mjs for that.\n`);
}
process.exit(doc.passed ? 0 : 1);
