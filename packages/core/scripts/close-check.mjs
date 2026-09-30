#!/usr/bin/env node
/**
 * The release gate. Refuses to call a package launch-ready while anything is
 * missing, unverified, or stale.
 *
 * Nothing here is advisory. /aris-package will not write a launch-ready manifest
 * while this fails, and the publish hook reads the same state.
 */
import fs from "node:fs";
import path from "node:path";
import { requireRoot, readJson, exists, check, report } from "./lib/aris.mjs";

const root = requireRoot();
const M = (rel) => path.join(root, ".aris", rel);
const state = readJson(root, "state.json");
const verify = readJson(root, "verification/verify.json");
const claims = readJson(root, "assets/claims.json", { claims: [] }).claims ?? [];
const assumptions = readJson(root, "assumptions.json", { assumptions: [] }).assumptions ?? [];
const cuts = readJson(root, "cutSteps.json", { cuts: [] }).cuts ?? [];
const metrics = readJson(root, "harness/metrics.json", { metrics: [] }).metrics ?? [];

const required = [
  "intel/category.json", "intel/sources.json", "intel/pains.json", "intel/personas.json",
  "intel/tam-sam-som.json", "intel/demand.json",
  "strategy/positioning.json", "strategy/messages.json", "strategy/gtm.json",
  "assets/claims.json", "verification/verify.json",
  "harness/metrics.json", "harness/dashboard-spec.json", "playbook/growth-rules.json",
  "playbook/runway.json",
];
const missing = required.filter((r) => !exists(root, r));

const unsupported = claims.filter((c) => c.status === "unsupported").map((c) => `${c.id}: ${c.text}`);
const unBadged = assumptions.filter((a) => !a.blastRadius || a.confidence == null).map((a) => `${a.id} has no confidence or blastRadius`);
const invented = metrics.filter((m) => m.baseline != null).map((m) => `${m.id} has a pre-launch baseline of ${m.baseline} — baselines must be null before data exists`);

// Verification must be newer than the newest asset edit, or it measured an older package.
let stale = [];
const assetsDir = M("assets");
if (verify && fs.existsSync(assetsDir)) {
  const vt = verify.timestamp ? Date.parse(verify.timestamp) : NaN;
  if (!Number.isFinite(vt)) {
    // Guarding the whole block on `verify?.timestamp` meant a verify.json without one
    // reported "verification_is_current: passed" while nothing had been compared.
    stale.push("verify.json has no usable timestamp, so nothing could be compared against it");
  } else {
    for (const f of fs.readdirSync(assetsDir)) {
      let st;
      try { st = fs.statSync(path.join(assetsDir, f)); } catch { continue; }
      if (st.isFile() && st.mtimeMs > vt) stale.push(`assets/${f} changed after the last verify run`);
    }
  }
}

report("close-check: is this package releasable", [
  check("CLOSE-001", "required_artifacts_present", missing.length === 0, missing.map((m) => `${m} is absent`)),
  check("CLOSE-002", "verification_passed", !!verify?.passed, verify ? (verify.passed ? [] : (verify.blockingIssues ?? ["verify.json reports passed: false"]).map(String)) : ["verification/verify.json is absent — run /aris-verify"]),
  check("CLOSE-003", "verification_is_current", stale.length === 0, stale),
  check("CLOSE-004", "no_unsupported_claims", unsupported.length === 0, unsupported),
  check("CLOSE-005", "assumptions_are_labelled", unBadged.length === 0, unBadged),
  check("CLOSE-006", "cuts_recorded", cuts.length > 0, cuts.length ? [] : ["cutSteps.json is empty — the package must state what it could not know"]),
  check("CLOSE-007", "no_invented_baselines", invented.length === 0, invented),
  check("CLOSE-008", "harness_present", metrics.length > 0, metrics.length ? [] : ["harness/metrics.json defines no metrics — no measurement plan, no launch"]),
  check("CLOSE-009", "sector_resolved", !!state?.market?.sector, state?.market?.sector ? [] : ["state.market.sector is unset"]),
]);
