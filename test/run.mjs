#!/usr/bin/env node
/**
 * The gate harness. Proves both directions, which is the only thing worth proving:
 *
 *   1. a clean package passes every gate
 *   2. each gate REFUSES when its own defect is planted
 *   3. the specific false positives that used to block correct packages do not
 *
 * Reading a gate tells you what it intends. Only planting its defect tells you what it
 * does, and every case in part 3 is a real failure this suite was written after.
 *
 *   node test/run.mjs            everything
 *   node test/run.mjs pricing    only cases whose name matches
 *
 * Exit 0 when every case behaved as stated.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import url from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "./fixture.mjs";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const CORE = path.join(REPO, "packages/core/scripts");
const HOOKS = path.join(REPO, "packages/core/hooks");
const ASSETS = path.join(REPO, "packages/assets/scripts");
const filter = process.argv[2] ?? "";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "aris-test-"));
const J = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, ".aris", rel), "utf8"));
const W = (dir, rel, obj) => fs.writeFileSync(path.join(dir, ".aris", rel), JSON.stringify(obj, null, 2) + "\n");
const asset = (dir, rel) => path.join(dir, ".aris", "assets", rel);
const append = (dir, rel, text) => fs.appendFileSync(asset(dir, rel), text);

/** Run a script and return { code, out }. A failing gate still prints its JSON. */
function run(script, args, cwd) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [script, ...args], { encoding: "utf8", cwd, maxBuffer: 64 * 1024 * 1024 }) };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? ""), err: String(e.stderr ?? "") };
  }
}

/** Every check verify-all produced, by name. */
function verify(dir, args = ["--no-write"]) {
  const r = run(path.join(CORE, "verify-all.mjs"), [...args, "--json"], dir);
  let doc;
  try { doc = JSON.parse(r.out); } catch { throw new Error(`verify-all produced no JSON (exit ${r.code}):\n${r.out}\n${r.err ?? ""}`); }
  return { doc, byName: new Map(doc.checks.map((c) => [c.check, c])) };
}

function closeCheck(dir) {
  const r = run(path.join(CORE, "close-check.mjs"), ["--json"], dir);
  const doc = JSON.parse(r.out);
  return new Map(doc.checks.map((c) => [c.check, c]));
}

/** Ask the publish hook for a decision. Returns "allow" or the deny reason. */
function gate(payload, cwd) {
  const r = execFileSync(process.execPath, [path.join(HOOKS, "gate-publish")], {
    encoding: "utf8",
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd },
  });
  if (!r.trim()) return "allow";
  return JSON.parse(r).hookSpecificOutput.permissionDecisionReason;
}

/* ------------------------------------------------------------------- cases */

/** A planted defect: the named check must FAIL, and must be blocking unless advisory. */
const planted = [
  ["pain below threshold", "validated_pains_meet_threshold", (d) => {
    const p = J(d, "intel/pains.json");
    p.pains[0].quotes = p.pains[0].quotes.slice(0, 3);
    p.pains[0].frequency = { quoteCount: 3, sourceCount: 2 };
    W(d, "intel/pains.json", p);
  }],
  ["frequency disagrees with stored quotes", "stated_frequency_matches_stored_quotes", (d) => {
    const p = J(d, "intel/pains.json");
    p.pains[0].frequency.quoteCount = 40;
    W(d, "intel/pains.json", p);
  }],
  ["one post counted under two pains", "no_quote_counted_twice", (d) => {
    const p = J(d, "intel/pains.json");
    p.pains[1].quotes[0].text = p.pains[0].quotes[0].text;
    W(d, "intel/pains.json", p);
  }],
  ["a quote with no link", "quotes_are_checkable", (d) => {
    const p = J(d, "intel/pains.json");
    delete p.pains[0].quotes[2].url;
    W(d, "intel/pains.json", p);
  }],
  ["an unevidenced persona attribute", "every_attribute_has_evidence", (d) => {
    const p = J(d, "intel/personas.json");
    p.personas[0].attributes.push({ attribute: "Prefers a dark theme", evidence: [] });
    W(d, "intel/personas.json", p);
  }],
  ["a persona attribute citing a quote that does not exist", "evidence_ids_resolve", (d) => {
    const p = J(d, "intel/personas.json");
    p.personas[0].attributes[0].evidence = ["Q-999"];
    W(d, "intel/personas.json", p);
  }],
  ["invented demographics", "no_unevidenced_demographics", (d) => {
    const p = J(d, "intel/personas.json");
    p.personas[0].attributes.push({ attribute: "Aged 35 to 44, household income above average", evidence: ["Q-003"] });
    W(d, "intel/personas.json", p);
  }],
  ["a persona attached to no pain", "every_persona_has_a_pain", (d) => {
    const p = J(d, "intel/personas.json");
    p.personas[0].pains = [];
    W(d, "intel/personas.json", p);
  }],
  // The README's own first-run finding: a sizing file that recomputes nothing used to
  // clear all four arithmetic checks, including sizes_are_ranges_not_points.
  ["a size with no calculations block at all", "formulas_recompute_to_stated_ranges", (d) => {
    W(d, "intel/tam-sam-som.json", { factors: [], tam: { value: 9000000000 }, limitations: ["none recorded"] });
  }],
  ["a range that does not contain the recomputed value", "formulas_recompute_to_stated_ranges", (d) => {
    const s = J(d, "intel/tam-sam-som.json");
    s.calculations.sam.range = [1, 2];
    W(d, "intel/tam-sam-som.json", s);
  }],
  ["a size stated as a point", "sizes_are_ranges_not_points", (d) => {
    const s = J(d, "intel/tam-sam-som.json");
    s.calculations.som = { formula: "F-001 * F-002", value: 75600 };
    W(d, "intel/tam-sam-som.json", s);
  }],
  ["a budget that does not sum to 100", "budget_is_percentages_summing_to_100", (d) => {
    const g = J(d, "strategy/gtm.json");
    g.budgetAllocation = { content: 50, community: 30, paid: 45 };
    W(d, "strategy/gtm.json", g);
  }],
  ["an asset citing a claim id that does not exist", "every_marker_resolves", (d) => {
    append(d, "launch-post.md", "\nIt halves the close [CLAIM-404].\n");
  }],
  ["a claim with no source", "citation_completeness", (d) => {
    const c = J(d, "assets/claims.json");
    c.claims[0].sourceIds = [];
    W(d, "assets/claims.json", c);
  }],
  ["usedIn naming a file that does not carry the marker", "usedIn_is_accurate", (d) => {
    const c = J(d, "assets/claims.json");
    c.claims[1].usedIn = ["security-and-licensing.md"];
    W(d, "assets/claims.json", c);
  }],
  ["a number in an asset with no claim id", "no_uncited_assertions", (d) => {
    append(d, "email-1.md", "\nLedgerline saves finance teams 12 hours every month.\n");
  }],
  ["a testimonial the workflow wrote", "no_fabricated_testimonials", (d) => {
    append(d, "launch-post.md", "\n\"Ledgerline cut our close from four evenings to one afternoon.\" - Dana, finance lead\n");
  }],
  ["a claim nobody read at source", "every_claim_was_read_at_source", (d) => {
    const c = J(d, "assets/claims.json");
    delete c.claims[0].verification;
    W(d, "assets/claims.json", c);
  }],
  ["a source that contradicts its claim", "sources_actually_support_the_claim", (d) => {
    const c = J(d, "assets/claims.json");
    c.claims[0].verification.verdict = "contradicts";
    W(d, "assets/claims.json", c);
  }],
  ["a superlative with no cited claim", "no_unsupported_superlatives", (d) => {
    append(d, "launch-post.md", "\nLedgerline is the best reconciliation tool on the market.\n");
  }],
  // The sector's own forbidden list. This is the gate the README reports as having
  // never fired: an ROI figure with no baseline and no sample size, in b2b-saas.
  ["a claim this field forbids", "no_forbidden_claims", (d) => {
    append(d, "launch-post.md", "\nLedgerline delivers an ROI figure of 300 percent with no baseline and no sample size [CLAIM-001].\n");
  }],
  ["a required disclosure the package never makes", "required_disclosures_present", (d) => {
    for (const f of ["launch-post.md", "email-1.md", "security-and-licensing.md", "social/post-1.md"]) {
      const p = asset(d, f);
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/sub-processor/g, "third party").replace(/stored/g, "kept"));
    }
  }],
  ["a dangling id on the spine", "backward_links_resolve", (d) => {
    const c = J(d, "assets/claims.json");
    c.claims[0].sourceIds = ["SRC-999"];
    W(d, "assets/claims.json", c);
  }],
  ["a message attached to no persona", "messages_reach_a_persona", (d) => {
    const m = J(d, "strategy/messages.json");
    m.unattachedMessages = [{ id: "MSG-009", message: "Cheaper than the incumbent" }];
    W(d, "strategy/messages.json", m);
  }],
  ["two different prices for the same unit", "pricing_consistency", (d) => {
    append(d, "email-1.md", "\nFor a limited period Ledgerline costs $19/mo per seat.\n");
  }],
  ["the recommended price appears in no asset", "pricing_consistency", (d) => {
    const g = J(d, "strategy/gtm.json");
    g.pricing.recommended.amount = 49;
    W(d, "strategy/gtm.json", g);
  }],
  ["two different launch dates", "date_consistency", (d) => {
    const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    append(d, "social/post-1.md", `\nLedgerline opens on ${future}.\n`);
  }],
  ["a placeholder that was never filled in", "no_stray_placeholders", (d) => {
    append(d, "email-1.md", "\n[TODO: write the sign-off]\n");
  }],
  ["a link that goes nowhere", "broken_links", (d) => {
    append(d, "email-1.md", "\n[Pricing](https://example.com/pricing)\n");
  }],
  ["a campaign link missing its utm tags", "utm_consistency", (d) => {
    append(d, "email-1.md", "\n[Start](https://ledgerline.example.net/start?utm_source=x)\n");
  }],
  ["the product name spelled two ways", "product_name_consistency", (d) => {
    const p = asset(d, "social/post-1.md");
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("Ledgerline shows", "LedgerLine shows"));
  }],
  ["no asset mentions tracking", "tracking_present", (d) => {
    for (const f of ["launch-post.md", "email-1.md", "security-and-licensing.md", "social/post-1.md"]) {
      const p = asset(d, f);
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/\?utm_[^)\s]*/g, ""));
    }
  }],
  // The hole the recursive walk closed. An asset in a subdirectory was read by nothing.
  ["an uncited number in a SUBDIRECTORY asset", "no_uncited_assertions", (d) => {
    append(d, "social/post-1.md", "\nLedgerline saves 9 hours every month.\n");
  }],
  ["a fabricated testimonial in a SUBDIRECTORY asset", "no_fabricated_testimonials", (d) => {
    append(d, "social/post-1.md", "\n\"Ledgerline paid for itself in the first week of using it.\" - Sam, controller\n");
  }],
];

/**
 * Cases where a CORRECT package used to be refused. Each one is a false positive that
 * blocked a publish, which is worse than a missed defect: it is the failure that makes
 * someone turn the gate off.
 */
const mustStillPass = [
  ["a past date in copy is advisory, not blocking", "date_consistency", (d) => {
    append(d, "launch-post.md", "\nLedgerline has been in private testing since 2024-03-01.\n");
  }],
  ["a market size and a price together", "pricing_consistency", (d) => {
    append(d, "launch-post.md", "\nThe reachable market is about $4.2B, and Ledgerline costs $29/mo per seat.\n");
  }],
  ["the same price written in three assets", "pricing_consistency", () => {}],
  ["an insufficient pain kept rather than promoted", "insufficient_pains_are_marked_not_dropped", () => {}],
  ["a source nobody ended up citing", "orphan_sources", () => {}],
];

/* ----------------------------------------------------------------- the runs */

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; process.stdout.write(`  ok    ${name}\n`); }
  else { fail++; process.stdout.write(`  FAIL  ${name}${detail ? `\n          ${detail}` : ""}\n`); }
};
const want = (name) => !filter || name.toLowerCase().includes(filter.toLowerCase());

process.stdout.write("\nthe clean package\n");
const clean = tmp();
build(clean);
{
  // No --no-write here: close-check and the page build both read verify.json, and the
  // whole point is that the verdict reaches disk.
  const { doc, byName } = verify(clean, []);
  ok("a clean package passes every gate", doc.passed,
     doc.blockingIssues.slice(0, 4).join(" | "));
  ok("a clean package has no blocking issue", doc.blockingIssues.length === 0,
     doc.blockingIssues.slice(0, 4).join(" | "));
  ok("every gate actually ran", [...byName.keys()].length > 40, `${byName.size} checks`);
  const close = closeCheck(clean);
  ok("a clean package is releasable", [...close.values()].every((c) => c.status === "passed"),
     [...close.values()].filter((c) => c.status !== "passed").map((c) => c.check).join(", "));
  // The page must build, and the fragment for publishing must exist.
  const b = run(path.join(ASSETS, "build-html.mjs"), [], clean);
  ok("the HTML page builds", b.code === 0, b.err);
  ok("the publishable fragment is written", fs.existsSync(path.join(clean, ".aris/package/aris-launch.artifact.html")));
  const page = fs.readFileSync(path.join(clean, ".aris/package/aris-launch.html"), "utf8");
  ok("the page embeds the subdirectory asset", page.includes("social/post-1.md"));
  ok("the page is one file with no external script", !/<script[^>]+src=/.test(page));
}

process.stdout.write("\nplanted defects, one per gate\n");
for (const [name, checkName, mutate] of planted) {
  if (!want(name)) continue;
  const d = tmp();
  build(d);
  mutate(d);
  let r;
  try { r = verify(d); } catch (e) { ok(name, false, e.message.split("\n")[0]); continue; }
  const c = r.byName.get(checkName);
  if (!c) { ok(name, false, `${checkName} is not in the result at all`); continue; }
  const failed = c.status === "failed";
  const blocks = failed && !c.advisory && !r.doc.passed;
  ok(name, failed && blocks,
     !failed ? `${checkName} reported ${c.status} on the planted defect`
             : `${checkName} failed but did not block (advisory=${!!c.advisory}, passed=${r.doc.passed})`);
}

process.stdout.write("\ncorrect packages that must not be refused\n");
for (const [name, checkName, mutate] of mustStillPass) {
  if (!want(name)) continue;
  const d = tmp();
  build(d);
  mutate(d);
  let r;
  try { r = verify(d); } catch (e) { ok(name, false, e.message.split("\n")[0]); continue; }
  const c = r.byName.get(checkName);
  const blocking = c && c.status === "failed" && !c.advisory;
  ok(name, r.doc.passed && !blocking,
     `${checkName}=${c?.status}${c?.advisory ? " (advisory)" : ""}; blocking: ${r.doc.blockingIssues.slice(0, 2).join(" | ")}`);
}

process.stdout.write("\nthings that used to crash the run\n");
{
  // verify-all built a RegExp from the product name unescaped, two lines below an
  // escaped copy of itself.
  for (const odd of ["Notion+", "Acme (EU)", "C++ Tools", "a.b*c"]) {
    if (!want(odd)) continue;
    const d = tmp();
    build(d);
    const s = J(d, "state.json");
    s.product.name = odd;
    W(d, "state.json", s);
    let crashed = false;
    try { verify(d); } catch { crashed = true; }
    ok(`a product name containing regex syntax: ${odd}`, !crashed);
  }
  if (want("malformed url")) {
    const d = tmp();
    build(d);
    append(d, "email-1.md", "\n[Docs](https://[not-a-host/docs)\n");
    let r, crashed = false;
    try { r = verify(d); } catch { crashed = true; }
    ok("a malformed URL is reported, not thrown", !crashed && r.byName.get("broken_links").status === "failed");
  }
  if (want("cycle")) {
    // Two sector entries extending each other used to recurse or vanish silently.
    const d = tmp();
    build(d);
    const sdir = path.join(d, ".aris", "sectors");
    fs.mkdirSync(sdir, { recursive: true });
    fs.writeFileSync(path.join(sdir, "loop-a.json"), JSON.stringify({ sector: "loop-a", extends: "loop-b" }));
    fs.writeFileSync(path.join(sdir, "loop-b.json"), JSON.stringify({ sector: "loop-b", extends: "loop-a" }));
    const r = run(path.join(CORE, "sector-check.mjs"), ["--list"], d);
    ok("an extends cycle is named rather than hidden", /NOT REACHABLE/.test(r.out), r.out.slice(-200));
    const r2 = run(path.join(CORE, "sector-check.mjs"), ["--show", "loop-a"], d);
    ok("resolving through a cycle terminates", r2.code === 0 || r2.code === 3);
  }
}

process.stdout.write("\nthe publish gate\n");
if (want("gate")) {
  const d = tmp();
  build(d);
  const cwd = d;
  const bash = (command) => gate({ tool_name: "Bash", tool_input: { command }, cwd }, cwd);
  const artifact = () => gate({ tool_name: "Artifact", tool_input: { action: "publish" }, cwd }, cwd);

  // Nothing verified yet: everything outward is refused.
  ok("gate: refuses a push before verification", bash("git push origin main") !== "allow");
  ok("gate: refuses an Artifact publish before verification", artifact() !== "allow");
  ok("gate: allows a read", bash("git log --oneline -5") === "allow");
  ok("gate: allows a fetch that is not an upload", bash("curl -s https://example.net/pricing") === "allow");

  // The holes: a publish wrapped in something.
  fs.writeFileSync(path.join(d, "deploy.sh"), "#!/bin/sh\ngit push origin main\n");
  ok("gate: refuses a push wrapped in a local script", bash("./deploy.sh") !== "allow");
  ok("gate: refuses a push wrapped in bash <script>", bash("bash deploy.sh") !== "allow");
  fs.writeFileSync(path.join(d, "package.json"), JSON.stringify({ scripts: { deploy: "vercel deploy --prod", test: "node --test" } }));
  ok("gate: refuses npm run deploy", bash("npm run deploy") !== "allow");
  ok("gate: allows npm run test", bash("npm run test") === "allow");
  fs.writeFileSync(path.join(d, "Makefile"), "test:\n\tnode --test\n\nship: build\n\twrangler deploy\n\nbuild:\n\tnode build.mjs\n");
  ok("gate: refuses make ship", bash("make ship") !== "allow");
  ok("gate: allows make test", bash("make test") === "allow");
  ok("gate: refuses an unreadable script whose name says it publishes", bash("./release.sh") !== "allow");

  // Verified and authorised: the gate gets out of the way.
  run(path.join(CORE, "verify-all.mjs"), [], d);
  const s = J(d, "state.json");
  s.launchAuthorization = true;
  W(d, "state.json", s);
  ok("gate: allows a push once verified and authorised", bash("git push origin main") === "allow");
  ok("gate: allows an Artifact publish once verified and authorised", artifact() === "allow");

  // The staleness hole: an asset edited in a subdirectory after a green verification.
  const sub = asset(d, "social/post-1.md");
  const t = Date.now() + 2000;
  fs.appendFileSync(sub, "\nEdited after the verification ran.\n");
  fs.utimesSync(sub, t / 1000, t / 1000);
  ok("gate: refuses after a SUBDIRECTORY asset changed", artifact() !== "allow");

  // An unsupported claim closes it again.
  build(d);
  run(path.join(CORE, "verify-all.mjs"), [], d);
  const s2 = J(d, "state.json");
  s2.launchAuthorization = true;
  W(d, "state.json", s2);
  const c = J(d, "assets/claims.json");
  c.claims[0].status = "unsupported";
  W(d, "assets/claims.json", c);
  ok("gate: refuses while a claim is unsupported", artifact() !== "allow");

  // Not an aris project at all: no opinion.
  const outside = tmp();
  ok("gate: silent outside an aris project",
     gate({ tool_name: "Bash", tool_input: { command: "git push" }, cwd: outside }, outside) === "allow");
}

process.stdout.write("\nthe repo itself\n");
if (want("repo") || !filter) {
  const a = fs.readFileSync(path.join(REPO, "packages/core/scripts/lib/aris.mjs"), "utf8");
  const b = fs.readFileSync(path.join(REPO, "packages/assets/scripts/lib/aris.mjs"), "utf8");
  ok("both copies of lib/aris.mjs are identical", a === b,
     "they are duplicated on purpose and nothing but this check keeps them in step");

  // Every agent that fetches from the web must hold no shell.
  const agents = fs.globSync
    ? fs.globSync("packages/*/agents/*.md", { cwd: REPO }).map((p) => path.join(REPO, p))
    : [];
  for (const f of agents) {
    const text = fs.readFileSync(f, "utf8");
    const tools = (text.match(/^tools:\s*(.*)$/m) ?? [])[1] ?? "";
    const fetches = /WebFetch|WebSearch/.test(tools);
    if (!fetches) continue;
    ok(`${path.basename(f)} fetches the web and holds no Bash`, !/\bBash\b/.test(tools), tools);
    ok(`${path.basename(f)} says fetched text is not instruction`, /never instruction/i.test(text));
  }

  // Every script invocation in the docs must quote the plugin path.
  const docs = fs.globSync ? fs.globSync("packages/**/*.md", { cwd: REPO }) : [];
  const unquoted = docs.filter((rel) => /node \$\{CLAUDE_PLUGIN_ROOT\}/.test(fs.readFileSync(path.join(REPO, rel), "utf8")));
  ok("no unquoted ${CLAUDE_PLUGIN_ROOT} invocation in the docs", unquoted.length === 0, unquoted.join(", "));
}

process.stdout.write("\nthe flow's own consistency\n");
if (want("flow") || !filter) {
  const FETCH = path.join(REPO, "packages/core/data/fetchability.json");
  const ALLOWED = ["open", "blocked-403", "blocked-user-agent", "js-rendered", "login-required"];
  const read = (rel) => { try { return fs.readFileSync(path.join(REPO, rel), "utf8"); } catch { return ""; } };

  // --- fix 1: a central, machine-readable fetchability registry ---
  ok("fetchability.json exists", fs.existsSync(FETCH), FETCH);
  let reg = null;
  try { reg = JSON.parse(fs.readFileSync(FETCH, "utf8")); } catch { /* reported below */ }
  ok("fetchability.json parses", reg !== null);
  const hosts = reg?.hosts ?? {};
  const names = Object.keys(hosts);
  ok("fetchability names the three review sites mining.md says return 403",
     ["g2.com", "capterra.com", "trustradius.com"].every((h) => h in hosts), names.join(", "));
  ok("fetchability records reddit.com, blocked at the user-agent level",
     hosts["reddit.com"]?.status === "blocked-user-agent", JSON.stringify(hosts["reddit.com"] ?? null));
  ok("every fetchability host carries a status and a reason",
     names.length > 0 && names.every((h) => hosts[h].status && hosts[h].reason),
     names.filter((h) => !hosts[h].status || !hosts[h].reason).join(", "));
  ok("every fetchability status is from the allowed set",
     names.length > 0 && names.every((h) => ALLOWED.includes(hosts[h].status)),
     names.filter((h) => !ALLOWED.includes(hosts[h].status)).join(", "));

  // sector-check must SURFACE that, so a miner is not sent where it cannot read.
  const shown = run(path.join(CORE, "sector-check.mjs"), ["--show", "b2b-saas"], REPO);
  ok("sector-check annotates a blocked platform", /blocked/i.test(shown.out), shown.out.slice(0, 160));
  ok("sector-check routes a blocked platform to /aris-evidence", /aris-evidence/.test(shown.out));

  // Communities are named by handle, not url. Reddit is the host that actually broke a
  // run, so an annotation that only covers url-bearing entries misses the real case.
  const community = (shown.out.match(/^\s+- reddit\b.*$/im) ?? [""])[0];
  ok("sector-check annotates a blocked community platform, not just url-bearing ones",
     /BLOCKED-USER-AGENT/.test(community), community || "no reddit community line found");
  ok("sector-check leaves an unregistered community quiet rather than implying it is open",
     !/\[/.test((shown.out.match(/^\s+- slack\b.*$/im) ?? [""])[0]),
     (shown.out.match(/^\s+- slack\b.*$/im) ?? [""])[0]);

  // mining.md must stop carrying the host list as prose that drifts from the data.
  const mining = read("packages/intel/rules/mining.md");
  ok("mining.md points at the fetchability registry rather than only naming hosts in prose",
     /fetchability|sector-check --show/.test(mining));

  // Plant the defect: an unrecognised status must be refused, not quietly rendered.
  if (fs.existsSync(FETCH)) {
    const original = fs.readFileSync(FETCH, "utf8");
    try {
      const bad = JSON.parse(original);
      bad.hosts["planted.example"] = { status: "sometimes", reason: "planted by the suite" };
      fs.writeFileSync(FETCH, JSON.stringify(bad, null, 2) + "\n");
      const r = run(path.join(CORE, "sector-check.mjs"), ["--show", "b2b-saas"], REPO);
      ok("sector-check refuses an unknown fetch status", r.code !== 0, `exit ${r.code}`);
    } finally { fs.writeFileSync(FETCH, original); }
  } else {
    ok("sector-check refuses an unknown fetch status", false, "no registry to plant into");
  }

  // --- fix 2: the paste step is a documented stop ---
  const arisflow = read("packages/core/commands/arisflow.md");
  const voc = read("packages/intel/commands/aris-voc.md");
  ok("arisflow names /aris-evidence as a stop", /aris-evidence/.test(arisflow));

  // --- fix 3: concurrency is stated, and next.mjs offers every runnable step ---
  ok("arisflow marks voc, size and demand as one concurrent wave",
     /\bwave\b/i.test(arisflow) && /concurrent/i.test(arisflow));
  const partial = tmp();
  fs.mkdirSync(path.join(partial, ".aris", "intel"), { recursive: true });
  fs.writeFileSync(path.join(partial, ".aris", "state.json"),
    JSON.stringify({ product: { name: "T" }, market: { sector: "b2b-saas" }, status: "researching", decisions: [] }, null, 2));
  fs.writeFileSync(path.join(partial, ".aris", "intel", "category.json"), JSON.stringify({ players: [] }, null, 2));
  const nx = run(path.join(CORE, "next.mjs"), ["--all"], partial);
  const runnable = (nx.out.match(/^Can run now:.*$/im) ?? [""])[0];
  ok("next offers every runnable step rather than a single Next", runnable !== "", nx.out.slice(0, 200));
  ok("next lists voc, size and demand together as runnable",
     ["/aris-voc", "/aris-size", "/aris-demand"].every((c) => runnable.includes(c)), runnable);

  // --- fix 4: the zero-validated-pains case is explicit and the two docs agree ---
  ok("arisflow no longer exempts a 5-quote pain from the stop rule",
     !/pain at 5 quotes/i.test(arisflow));
  ok("arisflow states what happens at zero validated pains", /zero validated/i.test(arisflow));
  ok("aris-voc states what happens at zero validated pains", /zero validated/i.test(voc));
}


process.stdout.write("\nfailing loud, and gates that read substance\n");
if (want("loud") || want("ready") || !filter) {
  const LINT = path.join(CORE, "aris-lint.mjs");
  const STATUS = path.join(CORE, "aris-status.mjs");
  const NEXT = path.join(CORE, "next.mjs");

  // --- item 1: a known artifact that parses but is misshapen must not read as zero ---
  ok("aris-lint.mjs exists", fs.existsSync(LINT), LINT);

  {
    const d = tmp(); build(d);
    const r0 = run(LINT, [], d);
    ok("aris-lint passes on a clean package", r0.code === 0, (r0.out + (r0.err ?? "")).slice(0, 200));
  }

  // The exact mistake made on a real run: the right data, the wrong envelope.
  for (const [rel, key] of [["assumptions.json", "assumptions"], ["cutSteps.json", "cuts"]]) {
    const d = tmp(); build(d);
    const good = J(d, rel);
    fs.writeFileSync(path.join(d, ".aris", rel), JSON.stringify(good[key], null, 2) + "\n");
    const r = run(STATUS, [], d);
    const all = r.out + (r.err ?? "");
    ok(`status refuses ${rel} written as a bare array`, r.code !== 0, `exit ${r.code}`);
    ok(`status does not report ${rel} as zero when it is misshapen`,
       !new RegExp(`${key}\\s+0`, "i").test(r.out), r.out.slice(0, 160));
    ok(`the refusal names ${rel} and the key it wanted`,
       all.includes(rel) && all.includes(key), all.slice(0, 200));
    const rl = run(LINT, [], d);
    const lintOut = rl.out + (rl.err ?? "");
    ok(`aris-lint also fails on a bare-array ${rel}`,
       rl.code !== 0 && lintOut.includes(rel),
       `exit ${rl.code}: ${lintOut.slice(0, 160)}`);
  }

  // The third real mistake: inventing a top-level key, so the data was written and invisible.
  {
    const d = tmp(); build(d);
    const src = J(d, "intel/sources.json");
    src.notOpened = { blockedOrFailed: [{ what: "G2", reason: "403" }] };
    W(d, "intel/sources.json", src);
    const r = run(LINT, [], d);
    const all = r.out + (r.err ?? "");
    ok("aris-lint reports an unknown top-level key rather than ignoring it",
       /notOpened/.test(all), all.slice(0, 220));
    ok("an unknown key is a warning, not a hard failure", r.code === 0, `exit ${r.code}`);
  }

  // A legitimately annotated artifact must still pass: the fixture is a floor, not a ceiling.
  {
    const d = tmp(); build(d);
    const s = J(d, "intel/tam-sam-som.json");
    s.sizedAt = "2026-10-05"; s.headline = "annotated"; s.unknownFactors = [];
    W(d, "intel/tam-sam-som.json", s);
    const r = run(LINT, [], d);
    ok("extra descriptive keys do not fail an artifact", r.code === 0, (r.out + (r.err ?? "")).slice(0, 200));
  }

  ok("shapes.mjs is identical in both script copies", (() => {
    const a = path.join(REPO, "packages/core/scripts/lib/shapes.mjs");
    const b = path.join(REPO, "packages/assets/scripts/lib/shapes.mjs");
    if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
    return fs.readFileSync(a, "utf8") === fs.readFileSync(b, "utf8");
  })(), "duplicated on purpose; only this check keeps them in step");

  // --- item 2: next.mjs must read substance, not just file existence ---
  {
    const d = tmp(); build(d);
    const pains = J(d, "intel/pains.json");
    for (const p of pains.pains) p.status = "insufficient";
    W(d, "intel/pains.json", pains);
    fs.rmSync(path.join(d, ".aris", "intel", "personas.json"), { force: true });
    // positioning must be absent too, otherwise it reads as "done" and the assertion
    // below would pass without a predicate ever being consulted.
    fs.rmSync(path.join(d, ".aris", "strategy", "positioning.json"), { force: true });

    const r = run(NEXT, ["--all"], d);
    const all = r.out + (r.err ?? "");
    const runnable = (all.match(/^Can run now:.*$/im) ?? [""])[0];
    ok("next does not offer personas when no pain is validated",
       !runnable.includes("/aris-personas"), runnable || all.slice(0, 200));
    ok("next says why personas is not ready",
       /validated/i.test(all), all.slice(0, 300));

    ok("a not-ready step still renders a mark, not undefined",
       !/undefined/.test(all), (all.match(/^.*undefined.*$/m) ?? [""])[0]);

    // Withholding personas must not simply promote the next step that also cannot be done:
    // traceability requires every positioning direction to carry painIds and targetPersonaIds.
    ok("next does not offer positioning when there are no personas",
       !runnable.includes("/aris-position"), runnable);

    const rj = run(NEXT, ["--json"], d);
    let j = null; try { j = JSON.parse(rj.out); } catch {}
    ok("--json reports personas as not runnable",
       j !== null && !(j.canRunNow ?? []).includes("/aris-personas"),
       JSON.stringify(j?.canRunNow ?? null));
  }


  // The dangerous case, and the full fixture cannot express it: a project where every
  // remaining step is blocked or not-ready, so "ready" is empty. Before this was handled,
  // next fell through to the completion message and invited a launch on a package stopped
  // at step 4 of 15 with nothing verified.
  {
    const d = tmp();
    fs.mkdirSync(path.join(d, ".aris", "intel"), { recursive: true });
    const w = (rel, obj) => fs.writeFileSync(path.join(d, ".aris", rel), JSON.stringify(obj, null, 2) + "\n");
    w("state.json", { product: { name: "Blocked" }, market: { sector: "b2b-saas" }, status: "researching" });
    w("intel/category.json", { players: [] });
    w("intel/pains.json", { pains: [
      { id: "PAIN-001", statement: "thin", status: "insufficient",
        frequency: { quoteCount: 0, sourceCount: 0 }, quotes: [] } ] });
    w("intel/tam-sam-som.json", {
      factors: [{ id: "F-001", name: "n", value: 10, sourceId: "SRC-001" }],
      tam: { status: "unknown" }, sam: { status: "unknown" }, som: { status: "unknown" },
      limitations: ["penetration is unknown"] });
    w("intel/demand.json", { status: "inferred_not_tested", signals: [], doesNotProve: ["willingness to pay"] });

    const r = run(NEXT, ["--all"], d);
    const all = r.out + (r.err ?? "");
    ok("next does not claim completion when steps remain undone",
       !/Every step has run/i.test(all), all.slice(-260));
    ok("next does not mention launchAuthorization while a step is unfinished",
       !/launchAuthorization/.test(all), all.slice(-260));
    ok("next says plainly that the chain is stopped", /nothing can run|stopped|blocked/i.test(all), all.slice(-260));
  }

  {
    const d = tmp(); build(d);
    fs.rmSync(path.join(d, ".aris", "intel", "personas.json"), { force: true });
    const r = run(NEXT, ["--all"], d);
    const runnable = (r.out.match(/^Can run now:.*$/im) ?? [""])[0];
    ok("next does offer personas once a pain is validated",
       runnable.includes("/aris-personas"), runnable || r.out.slice(0, 200));
  }
}

process.stdout.write("\nmining targets, and a gate that knows which repo it is guarding\n");
if (want("targets") || want("scope") || !filter) {
  const TARGETS = path.join(CORE, "mining-targets.mjs");
  const FETCH = path.join(REPO, "packages/core/data/fetchability.json");
  const reg = fs.existsSync(FETCH) ? JSON.parse(fs.readFileSync(FETCH, "utf8")) : { hosts: {} };

  // --- item 4: the hosts this run proved unreadable ---
  for (const [host, status] of [
    ["web.archive.org", "blocked-user-agent"],
    ["stackoverflow.com", "blocked-user-agent"],
    ["trends.google.com", "js-rendered"],
    ["adstransparency.google.com", "js-rendered"],
    ["ahrefs.com", "js-rendered"],
    ["feedbackportal.microsoft.com", "js-rendered"],
  ])
    ok(`fetchability records ${host} as ${status}`,
       reg.hosts?.[host]?.status === status, JSON.stringify(reg.hosts?.[host] ?? null));

  ok("fetchability warns that the Microsoft Q&A search page is not its permalinks",
     /search/i.test(reg.hosts?.["learn.microsoft.com"]?.reason ?? ""),
     reg.hosts?.["learn.microsoft.com"]?.reason ?? "(absent)");

  // --- item 3: the selection is computed, not judged ---
  ok("mining-targets.mjs exists", fs.existsSync(TARGETS), TARGETS);
  {
    const r = run(TARGETS, ["--sector", "b2b-saas"], REPO);
    const out = r.out + (r.err ?? "");
    ok("mining-targets separates what can be read from what cannot",
       /can be read|open/i.test(out) && /paste|blocked/i.test(out), out.slice(0, 220));
    const openHalf = out.split(/paste|blocked/i)[0] ?? "";
    ok("mining-targets does not offer G2, which returns 403",
       /trustpilot|open/i.test(out) && !/g2\.com/i.test(openHalf),
       openHalf.slice(0, 200));
    const readable = out.split(/NOT OBSERVED|PASTE TASKS/)[0] ?? "";
    const pasteHalf = out.split(/PASTE TASKS/)[1] ?? "";
    ok("mining-targets names Reddit as a paste task, not a target",
       /reddit/i.test(pasteHalf) && !/reddit/i.test(readable),
       `readable half: ${readable.slice(0, 120)}`);
    // b2b-saas names no confirmed-open surface at all, which is itself a finding about the
    // family profile. professional-services does, so the open path is asserted there.
    const ps = run(TARGETS, ["--sector", "professional-services"], REPO);
    const psOpen = (ps.out.split(/NOT OBSERVED|PASTE TASKS/)[0] ?? "");
    ok("mining-targets offers an open surface it confirmed",
       /trustpilot/i.test(psOpen), psOpen.slice(0, 240));
    ok("an unobserved platform is not reported as readable",
       /NOT OBSERVED/.test(ps.out) && !/clutch/i.test(psOpen), psOpen.slice(0, 240));
    ok("mining-targets exits clean when something is readable", r.code === 0, `exit ${r.code}`);
    {
      const d2 = tmp();
      fs.mkdirSync(path.join(d2, ".aris", "sectors"), { recursive: true });
      fs.writeFileSync(path.join(d2, ".aris", "state.json"),
        JSON.stringify({ product: { name: "T" }, market: { sector: "longurl" }, status: "researching" }, null, 2));
      fs.writeFileSync(path.join(d2, ".aris", "sectors", "longurl.json"), JSON.stringify({
        sector: "longurl", aliases: ["longurl"], status: "provisional",
        reviewPlatforms: [{ name: "Trustpilot",
          url: "https://www.trustpilot.com/review/some-very-long-vendor-name", coverage: "medium" }],
      }, null, 2));
      const rl = run(TARGETS, ["--sector", "longurl"], d2);
      ok("mining-targets columns do not run together on a long url",
         !/[^\s]coverage /.test(rl.out), (rl.out.match(/^.*coverage.*$/m) ?? [""])[0]);
    }
  }
  {
    // A sector whose every target is blocked must refuse, not hand back an empty list
    // that reads as "this market is quiet". Expressed as a real project-local sector
    // rather than a test-only flag in the script.
    const d = tmp();
    fs.mkdirSync(path.join(d, ".aris", "sectors"), { recursive: true });
    fs.writeFileSync(path.join(d, ".aris", "state.json"),
      JSON.stringify({ product: { name: "T" }, market: { sector: "allblocked" }, status: "researching" }, null, 2));
    fs.writeFileSync(path.join(d, ".aris", "sectors", "allblocked.json"), JSON.stringify({
      sector: "allblocked", aliases: ["allblocked"], status: "provisional",
      reviewPlatforms: [{ name: "G2", url: "https://www.g2.com", coverage: "high" }],
      communities: [{ platform: "reddit", handle: "r/nowhere" }],
    }, null, 2));
    const r = run(TARGETS, ["--sector", "allblocked"], d);
    ok("mining-targets refuses when nothing is readable",
       r.code !== 0 && /aris-evidence/i.test(r.out + (r.err ?? "")),
       `exit ${r.code}: ${(r.out + (r.err ?? "")).slice(0, 200)}`);
  }
  {
    const voc = fs.readFileSync(path.join(REPO, "packages/intel/commands/aris-voc.md"), "utf8");
    const mining = fs.readFileSync(path.join(REPO, "packages/intel/rules/mining.md"), "utf8");
    ok("aris-voc tells you to compute the targets rather than judge them",
       /mining-targets/.test(voc), "aris-voc.md does not mention mining-targets.mjs");
    ok("mining.md points at the computed targets", /mining-targets/.test(mining));
  }

  // --- the gate defect: it must know which repository it is guarding ---
  {
    const proj = tmp(); build(proj);
    const other = tmp();                       // an unrelated repo, no .aris anywhere above it
    fs.mkdirSync(path.join(other, ".git"), { recursive: true });

    const inProject = gate(
      { tool_name: "Bash", tool_input: { command: "git push origin main" }, cwd: proj }, proj);
    ok("a push from inside the project is still gated", inProject !== "allow", String(inProject).slice(0, 120));

    const atProject = gate(
      { tool_name: "Bash", tool_input: { command: `git -C ${proj} push origin main` }, cwd: proj }, proj);
    ok("git -C pointed AT the project is still gated", atProject !== "allow", String(atProject).slice(0, 120));

    const elsewhere = gate(
      { tool_name: "Bash", tool_input: { command: `git -C ${other} push origin main` }, cwd: proj }, proj);
    ok("git -C pointed at an unrelated repo is allowed",
       elsewhere === "allow",
       `the gate blocked a push to a repo outside the project: ${String(elsewhere).slice(0, 160)}`);
  }
}


process.stdout.write("\nplatform words are not hostnames\n");
if (want("hosts") || want("guards") || !filter) {
  const HOSTS = path.join(REPO, "packages/core/scripts/lib/hosts.mjs");
  ok("lib/hosts.mjs exists", fs.existsSync(HOSTS), HOSTS);
  ok("hosts.mjs is identical in both script copies", (() => {
    const b = path.join(REPO, "packages/assets/scripts/lib/hosts.mjs");
    return fs.existsSync(HOSTS) && fs.existsSync(b) &&
      fs.readFileSync(HOSTS, "utf8") === fs.readFileSync(b, "utf8");
  })(), "duplicated on purpose; only this check keeps them in step");

  // A platform word is a KIND, not a domain. Appending .com invented forum.com for
  // 10 sectors and hackernews.com for one, and both invite a wasted probe.
  const probe = run(path.join(CORE, "host-resolve.mjs"), [
    "forum", "hackernews", "twitch", "reddit", "facebook", "slack", "linkedin",
  ], REPO);
  let map = null;
  try { map = JSON.parse(probe.out); } catch { /* reported below */ }
  ok("host resolution is inspectable", map !== null, (probe.out + (probe.err ?? "")).slice(0, 180));

  ok('"forum" resolves to no host at all', map?.forum === null, JSON.stringify(map?.forum));
  ok('"slack" resolves to no host, since Slack communities are closed', map?.slack === null, JSON.stringify(map?.slack));
  ok('"hackernews" resolves to news.ycombinator.com', map?.hackernews === "news.ycombinator.com", JSON.stringify(map?.hackernews));
  ok('"twitch" resolves to twitch.tv', map?.twitch === "twitch.tv", JSON.stringify(map?.twitch));
  ok('"reddit" still resolves to reddit.com', map?.reddit === "reddit.com", JSON.stringify(map?.reddit));
  ok('"facebook" still resolves to facebook.com', map?.facebook === "facebook.com", JSON.stringify(map?.facebook));
  ok('"linkedin" still resolves to linkedin.com', map?.linkedin === "linkedin.com", JSON.stringify(map?.linkedin));

  // End to end: a sector whose community is a bare "forum" must not produce a target.
  {
    const d = tmp();
    fs.mkdirSync(path.join(d, ".aris", "sectors"), { recursive: true });
    fs.writeFileSync(path.join(d, ".aris", "state.json"),
      JSON.stringify({ product: { name: "T" }, market: { sector: "kinds" }, status: "researching" }, null, 2));
    fs.writeFileSync(path.join(d, ".aris", "sectors", "kinds.json"), JSON.stringify({
      sector: "kinds", aliases: ["kinds"], status: "provisional",
      reviewPlatforms: [{ name: "Trustpilot", url: "https://www.trustpilot.com", coverage: "high" }],
      communities: [{ platform: "forum", handle: "the trade forum" }, { platform: "slack", handle: "a closed workspace" }],
    }, null, 2));
    const r = run(path.join(CORE, "mining-targets.mjs"), ["--sector", "kinds"], d);
    const unobserved = (r.out.split(/NOT OBSERVED/)[1] ?? "").split(/NOT A FETCHABLE|PASTE TASKS/)[0];
    // A kind with no host must not be offered as something to probe: there is nothing to try.
    ok("a bare \"forum\" is not offered as a host to probe",
       !/forum/i.test(unobserved), unobserved.slice(0, 200));
    ok("a closed \"slack\" workspace is not offered as a host to probe",
       !/slack/i.test(unobserved), unobserved.slice(0, 200));
    ok("mining-targets says plainly that those are not fetchable surfaces",
       /NOT A FETCHABLE/i.test(r.out), r.out.slice(0, 300));
    const rj = run(path.join(CORE, "mining-targets.mjs"), ["--sector", "kinds", "--json"], d);
    let jj=null; try { jj = JSON.parse(rj.out); } catch {}
    ok("--json exposes the resolved host so this is debuggable",
       jj !== null && jj.open.some((x) => x.host === "trustpilot.com"),
       JSON.stringify(jj?.open?.[0] ?? null));
  }

  // --- item 2: the five highest-reach hosts, probed and recorded ---
  {
    const reg = JSON.parse(fs.readFileSync(path.join(REPO, "packages/core/data/fetchability.json"), "utf8"));
    const ALLOWED = ["open", "blocked-403", "blocked-user-agent", "js-rendered", "login-required"];
    for (const h of ["linkedin.com", "maps.google.com", "tiktok.com", "discord.com", "instagram.com"]) {
      const e = reg.hosts?.[h];
      ok(`fetchability now carries ${h}, observed and dated`,
         !!e && ALLOWED.includes(e.status) && /^\d{4}-\d{2}-\d{2}$/.test(e.observed ?? ""),
         JSON.stringify(e ?? null));
    }
  }

  // --- items 3 and 5: the two guards exist in CI ---
  {
    const ci = fs.readFileSync(path.join(REPO, ".github/workflows/ci.yml"), "utf8");
    ok("CI checks the README test count against the suite", /README/i.test(ci) && /passed/.test(ci),
       "ci.yml has no README count guard");
    ok("CI fails a packages change that does not move the version",
       /version-bump|version bump/i.test(ci) && /git diff/.test(ci),
       "ci.yml has no step that diffs packages against the base ref");
  }

  // --- item 3: the README number is actually right now ---
  {
    const readme = fs.readFileSync(path.join(REPO, "README.md"), "utf8");
    ok("README no longer claims 88 tests", !/\b88\b/.test(readme),
       (readme.match(/^.*\b88\b.*$/m) ?? [""])[0]);
  }
}


process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
