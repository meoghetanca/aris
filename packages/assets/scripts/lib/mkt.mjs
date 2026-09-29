/**
 * Shared helpers for the mkt scripts.
 *
 * Duplicated verbatim in each package's scripts/lib/ rather than imported across
 * packages: ${CLAUDE_PLUGIN_ROOT} differs per package, so a relative import
 * between them breaks the moment a package is installed on its own.
 */
import fs from "node:fs";
import path from "node:path";

export const STATES = ["verified", "inferred", "assumption", "unknown"];

/** Walk up from `start` looking for a .mkt directory, so scripts work from subdirectories. */
export function findRoot(start = process.cwd()) {
  let d = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(d, ".mkt", "state.json"))) return d;
    const parent = path.dirname(d);
    if (parent === d) return null;
    d = parent;
  }
}

export function requireRoot() {
  const root = findRoot();
  if (!root) {
    process.stderr.write("no .mkt/state.json found. Run /mkt first.\n");
    process.exit(2);
  }
  return root;
}

export function readJson(root, rel, fallback = undefined) {
  const p = path.join(root, ".mkt", rel);
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
  const p = path.join(root, ".mkt", rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  return p;
}

export function exists(root, rel) {
  return fs.existsSync(path.join(root, ".mkt", rel));
}

/** Next id in a namespace, e.g. nextId(["PAIN-001","PAIN-004"], "PAIN") -> "PAIN-005". */
export function nextId(existing, prefix) {
  let max = 0;
  for (const id of existing || []) {
    const m = String(id).match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/** A check result, the shape verify.json stores. */
export function check(id, name, ok, errors = [], extra = {}) {
  return { id, check: name, status: ok ? "passed" : "failed", errors, ...extra };
}

/** Print a result set and exit non-zero if anything failed. `--json` prints raw. */
export function report(title, checks, { json = process.argv.includes("--json") } = {}) {
  const failed = checks.filter((c) => c.status === "failed");
  if (json) {
    process.stdout.write(JSON.stringify({ title, passed: failed.length === 0, checks }, null, 2) + "\n");
  } else {
    process.stdout.write(`${title}\n${"-".repeat(title.length)}\n`);
    for (const c of checks) {
      const mark = c.status === "passed" ? "PASS" : c.status === "skipped" ? "SKIP" : "FAIL";
      const cov = c.coverage != null ? `  (${Math.round(c.coverage * 100)}%)` : "";
      process.stdout.write(`${mark}  ${c.check}${cov}\n`);
      for (const e of c.errors || []) process.stdout.write(`      ${e}\n`);
    }
    process.stdout.write(failed.length ? `\n${failed.length} check(s) failed.\n` : "\nAll checks passed.\n");
  }
  process.exit(failed.length ? 1 : 0);
}
