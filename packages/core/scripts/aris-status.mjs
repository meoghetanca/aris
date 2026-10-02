#!/usr/bin/env node
/**
 * Where is this project. Reads state and counts what exists; asserts nothing.
 */
import { findRoot, readJson, exists, help } from "./lib/aris.mjs";

help(`aris-status.mjs

Where is this project. Reads state and counts what exists; asserts nothing.`);

const root = findRoot();
if (!root) {
  process.stdout.write("Not an aris project (no .aris/state.json). Run /aris \"<product>\" to start.\n");
  process.exit(0);
}
const s = readJson(root, "state.json") ?? {};
const n = (rel, key) => (readJson(root, rel, {})[key] ?? []).length;

const pains = readJson(root, "intel/pains.json", { pains: [] }).pains ?? [];
const validated = pains.filter((p) => p.status === "validated").length;
const claims = readJson(root, "assets/claims.json", { claims: [] }).claims ?? [];
const unsupported = claims.filter((c) => c.status === "unsupported").length;
const verify = readJson(root, "verification/verify.json");
const assumptions = readJson(root, "assumptions.json", { assumptions: [] }).assumptions ?? [];
const highBlast = assumptions.filter((a) => ["high", "total"].includes(a.blastRadius)).length;

const rows = [
  ["product", s.product?.name || "(unnamed)"],
  ["sector", `${s.market?.sector || "unresolved"}${s.market?.sectorStatus === "provisional" ? "  [PROVISIONAL]" : ""}`],
  ["model", s.market?.model || "?"],
  ["status", s.status || "?"],
  ["decisions", s.decisionMode || "interactive"],
  ["sources", String(n("intel/sources.json", "sources"))],
  ["pains", `${pains.length} (${validated} validated)`],
  ["personas", String(n("intel/personas.json", "personas"))],
  ["assumptions", `${assumptions.length} (${highBlast} high or total blast radius)`],
  ["cuts", String(n("cutSteps.json", "cuts"))],
  ["claims", `${claims.length}${unsupported ? ` (${unsupported} UNSUPPORTED)` : ""}`],
  ["verify", verify ? (verify.passed ? `passed ${verify.timestamp ?? ""}` : "FAILED") : "never run"],
  ["launch auth", s.launchAuthorization ? "GRANTED" : "not granted"],
];
const w = Math.max(...rows.map((r) => r[0].length));
process.stdout.write(`aris: ${root}\n\n`);
for (const [k, v] of rows) process.stdout.write(`  ${k.padEnd(w)}  ${v}\n`);

const artifacts = [
  "intel/category.json", "intel/pains.json", "intel/personas.json", "intel/tam-sam-som.json",
  "intel/demand.json", "strategy/positioning.json", "strategy/messages.json", "strategy/gtm.json",
  "assets/claims.json", "verification/verify.json", "harness/metrics.json",
  "playbook/growth-rules.json", "package/aris-launch.html",
];
process.stdout.write("\n  artifacts\n");
for (const a of artifacts) process.stdout.write(`    ${exists(root, a) ? "[x]" : "[ ]"} ${a}\n`);
process.stdout.write("\n");
