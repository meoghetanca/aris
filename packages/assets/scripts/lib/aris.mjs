/**
 * Shared helpers for the aris scripts.
 *
 * Duplicated verbatim in each package's scripts/lib/ rather than imported across
 * packages: ${CLAUDE_PLUGIN_ROOT} differs per package, so a relative import
 * between them breaks the moment a package is installed on its own. CI checks the
 * two copies are byte-identical, because "duplicated verbatim" is a claim that
 * decays the first time someone edits one of them.
 *
 * Exit codes, one meaning each, across every script:
 *
 *   0  did what it was asked
 *   1  ran, and a check failed
 *   2  cannot run: no project, a missing input, or bad usage
 *   3  refused to produce output (verification not passed)
 *   4  refused to produce output (the content itself is not publishable)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const STATES = ["verified", "inferred", "assumption", "unknown"];

/** Walk up from `start` looking for a .aris directory, so scripts work from subdirectories. */
export function findRoot(start = process.cwd()) {
  let d = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(d, ".aris", "state.json"))) return d;
    const parent = path.dirname(d);
    if (parent === d) return null;
    d = parent;
  }
}

export function requireRoot() {
  const root = findRoot();
  if (!root) {
    process.stderr.write("no .aris/state.json found. Run /aris first.\n");
    process.exit(2);
  }
  return root;
}

/** `--help` on any script prints its own header comment and exits 0. */
export function help(usage) {
  if (!process.argv.slice(2).some((a) => a === "--help" || a === "-h")) return;
  process.stdout.write(usage.trim() + "\n\nExit codes: 0 ok, 1 a check failed, 2 cannot run, 3 refused (unverified), 4 refused (content).\n");
  process.exit(0);
}

export function readJson(root, rel, fallback = undefined) {
  const p = path.join(root, ".aris", rel);
  if (!fs.existsSync(p)) {
    if (fallback !== undefined) return fallback;
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`${rel} is not valid JSON: ${e.message}`);
  }
}

export function writeJson(root, rel, obj) {
  const p = path.join(root, ".aris", rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

export function exists(root, rel) {
  return fs.existsSync(path.join(root, ".aris", rel));
}

/**
 * Every asset file, RECURSIVELY, as paths relative to .aris/assets.
 *
 * A flat readdir was the single widest hole in the gates: an asset written to
 * assets/social/post-1.md was read by no cross-asset check, cited no claim as far as
 * claim-check could tell, and did not make verification stale, so it published
 * unexamined. Nothing enforces flatness, so nothing may assume it.
 */
export function walkAssets(root, { ext = ".md" } = {}) {
  const base = path.join(root, ".aris", "assets");
  const out = [];
  const walk = (dir, prefix) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      // Symlinks are not followed: a link out of the tree is not an asset of this package.
      if (e.isDirectory()) walk(abs, rel);
      else if (e.isFile() && (!ext || e.name.endsWith(ext))) out.push({ file: rel, abs });
    }
  };
  walk(base, "");
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

/** The asset corpus as [relativePath, text] pairs, recursively. */
export function assetCorpus(root) {
  return walkAssets(root).map(({ file, abs }) => [file, fs.readFileSync(abs, "utf8")]);
}

/** Newest mtime across every asset file, recursively. 0 when there are none. */
export function newestAssetMtime(root) {
  let newest = 0;
  for (const { abs } of walkAssets(root, { ext: null })) {
    let st;
    try { st = fs.statSync(abs); } catch { continue; }
    newest = Math.max(newest, st.mtimeMs);
  }
  return newest;
}

/**
 * Run another aris script with THIS Node, not whatever `node` resolves to on PATH.
 *
 * `execFileSync("node", ...)` fails outright where Claude Code runs without Node on
 * PATH, and silently uses a different version where one is shadowed. The timeout and
 * maxBuffer are the other half: the default 1 MB buffer turned a large gate result
 * into ENOBUFS, which the caller then reported as "could not run" rather than as the
 * failure it was.
 */
export function runScript(scriptPath, args = [], opts = {}) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

/** Next id in a namespace, e.g. nextId(["PAIN-001","PAIN-004"], "PAIN") -> "PAIN-005". */
export function nextId(existing, prefix) {
  let max = 0;
  const esc = String(prefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const id of existing || []) {
    const m = String(id).match(new RegExp(`^${esc}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/**
 * A check result, the shape verify.json stores.
 *
 * `advisory: true` says a failure here is worth reading and not worth blocking a
 * publish over. It lives on the check, next to the thing it describes, because a
 * hand-kept list of names in the aggregator is how `date_consistency` ended up a
 * hard gate on copy that mentions the year a company was founded.
 */
export function check(id, name, ok, errors = [], extra = {}) {
  return { id, check: name, status: ok ? "passed" : "failed", errors, ...extra };
}

/** Same shape, declared advisory. */
export function advisory(id, name, ok, errors = [], extra = {}) {
  return check(id, name, ok, errors, { ...extra, advisory: true });
}

/** Print a result set and exit non-zero if anything blocking failed. `--json` prints raw. */
export function report(title, checks, { json = process.argv.includes("--json") } = {}) {
  const failed = checks.filter((c) => c.status === "failed");
  const blocking = failed.filter((c) => !c.advisory);
  if (json) {
    process.stdout.write(JSON.stringify({ title, passed: blocking.length === 0, checks }, null, 2) + "\n");
  } else {
    process.stdout.write(`${title}\n${"-".repeat(title.length)}\n`);
    for (const c of checks) {
      const mark = c.status === "passed" ? "PASS" : c.status === "skipped" ? "SKIP" : c.advisory ? "WARN" : "FAIL";
      const cov = c.coverage != null ? `  (${Math.round(c.coverage * 100)}%)` : "";
      process.stdout.write(`${mark}  ${c.check}${cov}\n`);
      for (const e of c.errors || []) process.stdout.write(`      ${e}\n`);
    }
    process.stdout.write(
      blocking.length
        ? `\n${blocking.length} check(s) failed${failed.length > blocking.length ? `, ${failed.length - blocking.length} advisory` : ""}.\n`
        : `\nAll checks passed${failed.length ? `, ${failed.length} advisory finding(s) to read` : ""}.\n`
    );
  }
  process.exit(blocking.length ? 1 : 0);
}
