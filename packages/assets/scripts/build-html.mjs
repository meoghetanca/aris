#!/usr/bin/env node
/**
 * Build package/aris-launch.html from the .aris artifact tree.
 *
 * The page is a PRESENTATION LAYER over the JSON, never a replacement. Everything
 * it shows is embedded at build time from the manifest, so the file works offline
 * with no external runtime dependency — requirements 1, 3 and 4 of the HTML
 * contract.
 *
 * The requirements that matter are enforced HERE as well as in the template,
 * because a rule enforced only by intention is a rule that breaks during the one
 * run nobody checked:
 *
 *   12  a fabricated testimonial is refused, not rendered
 *   13  a pre-launch baseline is refused, not rendered
 *   14  demand is stamped inferred_not_tested whatever the artifact says
 *   15  launch-ready is impossible over a failed verification
 *
 *   build-html.mjs [--out <path>] [--force] [--open]
 *
 * --force writes the page over a failed verification. It never writes a
 * launch-ready one; nothing does.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execFileSync } from "node:child_process";
import { requireRoot, readJson } from "./lib/aris.mjs";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const TPL_DIR = path.join(HERE, "template");
const TEMPLATE = path.join(TPL_DIR, "page.html");
const TPL_CSS = path.join(TPL_DIR, "page.css");
const TPL_JS = path.join(TPL_DIR, "page.js");
const PLACEHOLDER = "/*__ARIS_DATA__*/";

// `build-html.mjs | head` closes the pipe mid-write. Without this the process dies
// with an unhandled EPIPE and a stack trace, which reads like the build failed.
process.stdout.on("error", (e) => { if (e.code === "EPIPE") process.exit(0); });

const root = requireRoot();
const argOut = (() => {
  const i = process.argv.indexOf("--out");
  return i === -1 ? null : process.argv[i + 1];
})();
const FORCE = process.argv.includes("--force");
const warn = (m) => process.stderr.write(`  warn  ${m}\n`);
const notes = [];

for (const f of [TEMPLATE, TPL_CSS, TPL_JS]) {
  if (fs.existsSync(f)) continue;
  process.stderr.write(`template part missing at ${f}. The install is broken.\n`);
  process.exit(2);
}

/* ---- read the tree. The manifest is the index; a missing manifest is not fatal. ---- */
const manifest = readJson(root, "package/manifest.json", null);
if (!manifest) notes.push("no package/manifest.json — read the tree directly. /aris-package writes it.");

const DATA = {
  generatedAt: new Date().toISOString(),
  state: readJson(root, "state.json", {}),
  assumptions: readJson(root, "assumptions.json", { assumptions: [] }),
  cutSteps: readJson(root, "cutSteps.json", { cuts: [] }),
  category: readJson(root, "intel/category.json", null),
  sources: readJson(root, "intel/sources.json", { sources: [] }),
  pains: readJson(root, "intel/pains.json", { pains: [] }),
  personas: readJson(root, "intel/personas.json", { personas: [] }),
  sizing: readJson(root, "intel/tam-sam-som.json", null),
  demand: readJson(root, "intel/demand.json", null),
  positioning: readJson(root, "strategy/positioning.json", null),
  messages: readJson(root, "strategy/messages.json", null),
  gtm: readJson(root, "strategy/gtm.json", null),
  claims: readJson(root, "assets/claims.json", { claims: [] }),
  verify: readJson(root, "verification/verify.json", null),
  metrics: readJson(root, "harness/metrics.json", { metrics: [] }),
  dashboard: readJson(root, "harness/dashboard-spec.json", null),
  playbook: readJson(root, "playbook/growth-rules.json", { rules: [] }),
  runway: readJson(root, "playbook/runway.json", { weeks: [] }),
  manifest: manifest ?? { version: "0", artifacts: [] },
  assets: {},
};

/* Asset Markdown, embedded verbatim: requirement 16. */
const assetsDir = path.join(root, ".aris", "assets");
if (fs.existsSync(assetsDir))
  for (const f of fs.readdirSync(assetsDir).filter((x) => x.endsWith(".md")).sort())
    DATA.assets[f] = fs.readFileSync(path.join(assetsDir, f), "utf8");

/* If no manifest listed the artifacts, derive the list so the readiness meter is real. */
if (!manifest) {
  const known = [
    ["intel/category.json", "research"], ["intel/sources.json", "research"], ["intel/pains.json", "research"],
    ["intel/personas.json", "research"], ["intel/tam-sam-som.json", "research"], ["intel/demand.json", "research"],
    ["strategy/positioning.json", "strategy"], ["strategy/messages.json", "strategy"], ["strategy/gtm.json", "strategy"],
    ["assets/claims.json", "asset"], ["verification/verify.json", "verification"],
    ["harness/metrics.json", "harness"], ["harness/dashboard-spec.json", "harness"],
    ["playbook/growth-rules.json", "harness"],
  ];
  DATA.manifest.artifacts = known
    .filter(([rel]) => fs.existsSync(path.join(root, ".aris", rel)))
    .map(([rel, type]) => ({ path: rel, type, status: "complete" }));
}

/* ---------------- the four enforced refusals ---------------- */

// 15. launch-ready is impossible over a failed verification.
const passed = DATA.verify?.passed === true;
if (!passed && DATA.state?.status === "launch-ready") {
  DATA.state = { ...DATA.state, status: "production" };
  notes.push(
    "state.json said launch-ready while verification has not passed. The page was built " +
      "at status 'production'. Fix state.json — something set it that should not have."
  );
}
if (!passed) {
  notes.push(
    DATA.verify
      ? `verification FAILED (${(DATA.verify.blockingIssues ?? []).length} blocking). The page shows BLOCKED.`
      : "verification has never run. The page shows NOT VERIFIED."
  );
  /**
   * --force is what the header says it is: the way to build over a verification that
   * has not passed. The guard was `!FORCE && !DATA.verify`, so it only caught a
   * verification that had never RUN - a verification that ran and FAILED built a page
   * silently, with the refusal the file documents never firing.
   */
  if (!FORCE) {
    process.stderr.write(
      DATA.verify
        ? `\nRefusing to build: verification failed (${(DATA.verify.blockingIssues ?? []).length} blocking issue(s)).\n` +
          "Fix them and re-run /aris-verify, or pass --force to build a page that reports BLOCKED.\n"
        : "\nRefusing to build: verification has never run, so the page would have nothing to report.\n" +
          "Run /aris-verify, or pass --force to build a page that says so.\n"
    );
    process.exit(3);
  }
}

// 14. demand is inferred, whatever the artifact says.
if (DATA.demand && DATA.demand.status !== "inferred_not_tested") {
  notes.push(`demand.json carried status "${DATA.demand.status}" — overwritten with inferred_not_tested.`);
  DATA.demand = { ...DATA.demand, status: "inferred_not_tested" };
}
if (DATA.demand && !(DATA.demand.doesNotProve ?? []).length)
  DATA.demand = {
    ...DATA.demand,
    doesNotProve: ["product-market fit", "willingness to pay", "conversion rate", "demand for this product rather than the category"],
  };

// 13. no fabricated metrics: a pre-launch baseline is an invented number.
const hasData = fs.existsSync(path.join(root, ".aris", "evidence", "analytics")) &&
  fs.readdirSync(path.join(root, ".aris", "evidence", "analytics")).some((f) => /\.(csv|tsv|json)$/i.test(f));
if (!hasData) {
  const bad = (DATA.metrics.metrics ?? []).filter((m) => m.baseline != null);
  if (bad.length) {
    notes.push(
      `${bad.length} metric(s) carried a baseline with no analytics export present. Nulled in the page: ` +
        bad.map((m) => m.id ?? m.name).join(", ")
    );
    DATA.metrics = { ...DATA.metrics, metrics: DATA.metrics.metrics.map((m) => ({ ...m, baseline: null })) };
  }
}

// 12. a testimonial the workflow wrote is fabricated evidence.
/**
 * An attributed quote the workflow wrote is fabricated evidence.
 *
 * Checked PER OCCURRENCE, not per file: an asset can legitimately hold a real
 * placeholder in one section and a fabricated quote in another, and a per-file
 * test lets the placeholder mask the fabrication. Each quote must carry the
 * marker on its own line or the line above.
 */
function fabricatedQuotes(body) {
  const Q = ["\u201c", "\u201d"];
  const re = new RegExp(
    '^[ \\t]*>?[ \\t]*["' + Q[0] + '][^"' + Q[1] + ']{25,}["' + Q[1] + ']'
    + '\\s*[-\u2013\u2014]\\s*\\w',
    "gm"
  );
  const lines = body.split("\n");
  const out = [];
  for (const m of body.matchAll(re)) {
    const upto = body.slice(0, m.index).split("\n").length - 1;
    const here = lines[upto] ?? "";
    const prev = lines[upto - 1] ?? "";
    if (!/\[TESTIMONIAL/i.test(here) && !/\[TESTIMONIAL/i.test(prev))
      out.push({ line: upto + 1, text: here.trim().slice(0, 90) });
  }
  return out;
}
const fabricated = Object.entries(DATA.assets)
  .map(([f, b]) => [f, fabricatedQuotes(b)])
  .filter(([, hits]) => hits.length);
if (fabricated.length) {
  process.stderr.write(
    "\nRefusing to build: these assets carry an attributed quote with no [TESTIMONIAL - SUPPLY REAL] marker:\n" +
      fabricated.map(([f, hits]) => hits.map((h) => `  assets/${f}:${h.line}  ${h.text}`).join("\n")).join("\n") +
      "\n\nA testimonial this workflow wrote is fabricated evidence, and publishing one is not a style\n" +
      "problem. Replace it with the placeholder, or supply a real one via .aris/evidence/supplied/.\n"
  );
  process.exit(4);
}

/* ---------------- inject ---------------- */
// `<` must not be able to close the host <script>, and U+2028/9 are literal breaks in JS strings.
const json = JSON.stringify(DATA)
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

// Three files, one page. Markup, stylesheet and behaviour are edited separately and
// joined here, so a change to one cannot silently delete another.
//
// The replacements go through a FUNCTION, not a string. A string replacement treats
// $&, $\' and $` as patterns, and the page script contains them inside template
// literals -- passing it as a string silently duplicated the rest of the document and
// the page rendered three copies of its own tab bar.
const template = fs.readFileSync(TEMPLATE, "utf8")
  .replace("__ARIS_STYLE__", () => "<style>\n" + fs.readFileSync(TPL_CSS, "utf8") + "</style>")
  .replace("__ARIS_SCRIPT__", () => "<script>\n" + fs.readFileSync(TPL_JS, "utf8") + "</script>");
if (!template.includes(PLACEHOLDER)) {
  process.stderr.write(`template has no ${PLACEHOLDER} placeholder. The install is broken.\n`);
  process.exit(2);
}
const html = template.split(PLACEHOLDER).join(json).replace(
  "<title>Launch package</title>",
  `<title>${String(DATA.state?.product?.name || "Launch package").replace(/[<>&]/g, "")} — launch package</title>`
);

const out = argOut ? path.resolve(argOut) : path.join(root, ".aris", "package", "aris-launch.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

/**
 * A second build for publishing as an Artifact.
 *
 * The Artifact runtime wraps the file it is given in its own
 * <!doctype html><head></head><body> skeleton, so handing it a complete document
 * nests one inside another. This emits the same page as a fragment: title, style,
 * markup and scripts, with the document wrapper removed.
 *
 * Both builds come from one template, so the offline file and the shared link can
 * never drift.
 */
const frag = (() => {
  const t0 = html.indexOf("<title>");
  const s1 = html.indexOf("</style>") + "</style>".length;
  const b0 = html.indexOf("<body>") + "<body>".length;
  const b1 = html.lastIndexOf("</body>");
  if (t0 === -1 || s1 < 8 || b0 < 6 || b1 === -1) return null;
  return html.slice(t0, s1) + "\n" + html.slice(b0, b1).trim() + "\n";
})();
const fragPath = out.replace(/\.html$/, ".artifact.html");
if (frag) fs.writeFileSync(fragPath, frag);

/**
 * Open the finished page.
 *
 * A path printed in a terminal is not a delivered package: the reader has to notice it,
 * copy it, and decide to look. The whole point of the HTML is that someone reads it, so
 * finishing the build and finishing the job are the same moment.
 *
 * This opens the viewer's default browser on a local file. It is not the headless
 * automation the research steps use, which never shows a window; this one is meant to.
 */
function openInBrowser(file) {
  const cmd = process.platform === "darwin" ? ["open", [file]]
            : process.platform === "win32" ? ["cmd", ["/c", "start", "", file]]
            : ["xdg-open", [file]];
  try {
    execFileSync(cmd[0], cmd[1], { stdio: "ignore" });
    return true;
  } catch {
    return false; // headless box, no opener, or a locked-down environment: not an error
  }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
process.stdout.write(`built  ${path.relative(root, out)}  (${kb(Buffer.byteLength(html))})\n`);
if (frag) process.stdout.write(`       ${path.relative(root, fragPath)}  (${kb(Buffer.byteLength(frag))})  for publishing\n`);
process.stdout.write(
  `       ${(DATA.sources.sources ?? []).length} sources, ${(DATA.pains.pains ?? []).length} pains, ` +
    `${(DATA.claims.claims ?? []).length} claims, ${Object.keys(DATA.assets).length} assets\n`
);
process.stdout.write(`       verification: ${DATA.verify ? (passed ? "passed" : "FAILED") : "never run"}\n`);
for (const n of notes) warn(n);
if (!passed) process.stdout.write(`\nThe publish gate stays closed while verification fails.\n`);

// Opt in, not out. A window that appears on every programmatic rebuild is noise, and
// this script runs many times during a session. /aris-package passes --open because
// that is the one moment a person is waiting to look at the result.
if (process.argv.includes("--open")) {
  process.stdout.write(openInBrowser(out)
    ? `\nopened in your browser\n`
    : `\ncould not open a browser here. The file is at:\n  ${out}\n`);
} else {
  process.stdout.write(`\n${out}\n`);
}
