#!/usr/bin/env node
/**
 * What to run next, and where a stopped run left off.
 *
 *   next.mjs            the next command, and why
 *   next.mjs --all      the whole chain with what is done
 *   next.mjs --json
 *
 * `/arisflow --resume` was documented for weeks and implemented by nothing, so a run
 * that stopped left the human to work out where it had got to by reading the directory.
 * A step is done when its output exists AND its gate passes: a file that exists but
 * fails its gate is not progress, and resuming past it buries the failure.
 */
import { requireRoot, readJson, exists, help, runScript } from "./lib/aris.mjs";
import path from "node:path";
import url from "node:url";

help(`next.mjs [--all] [--json]

What to run next, and where a stopped run left off. A step is done when its output
exists AND its gate passes.`);

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const root = requireRoot();
const state = readJson(root, "state.json") ?? {};

const gate = (script, ...args) => {
  try { runScript(path.join(HERE, script), [...args, "--json"], { cwd: root }); return true; }
  catch { return false; }
};

const STEPS = [
  { cmd: "/aris",           needs: [], makes: "state.json", why: "nothing exists yet" },
  { cmd: "/aris-category",  needs: ["state.json"], makes: "intel/category.json",
    why: "you cannot position against a field you have not mapped" },
  { cmd: "/aris-voc",       needs: ["intel/category.json"], makes: "intel/pains.json",
    why: "everything downstream rests on what customers actually said",
    check: () => gate("pain-check.mjs") },
  { cmd: "/aris-personas",  needs: ["intel/pains.json"], makes: "intel/personas.json",
    why: "a persona is derived from pains, never invented",
    /**
     * needs checks that a file exists. That is not the same question as whether it
     * carries anything a persona can be built from. pains.json with every pain
     * "insufficient" satisfies needs and offers nothing to derive from, and this
     * step used to be announced as the next move anyway.
     */
    ready: () => {
      const pains = readJson(root, "intel/pains.json", { pains: [] }).pains ?? [];
      const validated = pains.filter((p) => p.status === "validated").length;
      if (validated) return { ok: true };
      return { ok: false, why:
        `pains.json holds ${pains.length} pain(s) and 0 validated. A persona attribute may ` +
        `only cite a validated pain, so there is nothing here to derive one from. ` +
        `Run /aris-evidence to paste the sources that were blocked, or accept that the ` +
        `honest next step is interviews.` };
    },
    check: () => gate("persona-check.mjs") },
  { cmd: "/aris-size",      needs: ["intel/category.json"], makes: "intel/tam-sam-som.json",
    why: "the price ladder feeds the ARPU factor", check: () => gate("arithmetic-check.mjs") },
  { cmd: "/aris-demand",    needs: ["intel/category.json"], makes: "intel/demand.json",
    why: "desk signals, inferred and never tested" },
  { cmd: "/aris-position",  needs: ["intel/category.json"], makes: "strategy/positioning.json",
    why: "total blast radius: everything after inherits it",
    /**
     * needs says category.json, and that declaration is wrong but left alone here.
     * traceability.md requires every direction to carry painIds and targetPersonaIds,
     * so positioning cannot be written before personas exist. Withholding personas
     * while still recommending positioning would just move the same lie one step down.
     */
    ready: () => {
      const personas = readJson(root, "intel/personas.json", { personas: [] }).personas ?? [];
      if (personas.length) return { ok: true };
      return { ok: false, why:
        "no personas exist yet. Every positioning direction has to carry painIds and " +
        "targetPersonaIds, so there is nothing to point them at. This step’s declared " +
        "needs say only category.json, which is wrong: it needs personas too." };
    } },
  { cmd: "/aris-messages",  needs: ["strategy/positioning.json"], makes: "strategy/messages.json",
    why: "messages compress the positioning; they cannot precede it" },
  { cmd: "/aris-gtm",       needs: ["strategy/messages.json"], makes: "strategy/gtm.json",
    why: "the channel mix decides which assets are worth writing" },
  { cmd: "/aris-assets",    needs: ["strategy/gtm.json"], makes: "assets/claims.json",
    why: "every asset draws from the message library", check: () => gate("claim-check.mjs") },
  { cmd: "/aris-harness",   needs: ["strategy/gtm.json"], makes: "harness/metrics.json",
    why: "the measurement plan is a precondition of release" },
  { cmd: "/aris-playbook",  needs: ["harness/metrics.json"], makes: "playbook/growth-rules.json",
    why: "rules written after the data are rationalisations" },
  { cmd: "/aris-runway",    needs: ["harness/metrics.json"], makes: "playbook/runway.json",
    why: "everything so far gets someone to sign up; this is the ninety days after" },
  { cmd: "/aris-verify",    needs: ["assets/claims.json"], makes: "verification/verify.json",
    why: "nothing publishes without it", check: () => gate("verify-all.mjs", "--no-write") },
  { cmd: "/aris-package",   needs: ["verification/verify.json"], makes: "package/aris-launch.html",
    why: "assembles and opens the package" },
];

const status = STEPS.map((s) => {
  const made = exists(root, s.makes);
  const blocked = s.needs.filter((n) => !exists(root, n));
  const gated = made && s.check ? s.check() : true;
  const unmet = !made && !blocked.length && s.ready ? s.ready() : null;
  const notReady = unmet && !unmet.ok;
  return { ...s, made, gated, blocked, readyWhy: notReady ? unmet.why : null,
    state: !made
      ? (blocked.length ? "blocked" : notReady ? "not-ready" : "ready")
      : gated ? "done" : "failing" };
});

const failing = status.find((s) => s.state === "failing");
const ready = status.filter((s) => s.state === "ready");
const next = failing ?? ready[0];

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(
    { next: next?.cmd ?? null, canRunNow: ready.map((s) => s.cmd), steps: status }, null, 2) + "\n");
  process.exit(0);
}

if (process.argv.includes("--all")) {
  const pad = Math.max(...STEPS.map((s) => s.cmd.length));
  process.stdout.write(`${state.product?.name ?? "this project"}\n\n`);
  for (const s of status) {
    const mark = { done: "[x]", failing: "[!]", ready: "[ ]", blocked: "[ ]", "not-ready": "[~]" }[s.state];
    const note = s.state === "failing" ? "  output exists but its gate fails"
               : s.state === "blocked" ? `  waiting on ${s.blocked.join(", ")}`
               : s.state === "not-ready" ? `  inputs exist but are not usable yet` : "";
    process.stdout.write(`  ${mark} ${s.cmd.padEnd(pad)}${note}\n`);
  }
  for (const s of status.filter((x) => x.state === "not-ready"))
    process.stdout.write(`  ${s.cmd} is not ready: ${s.readyWhy}\n\n`);
  process.stdout.write("\n");
}

if (!next) {
  /**
   * Nothing runnable has two completely different causes and they must not share a
   * message. Everything done is a finish; everything blocked is a stop. Conflating
   * them told a project halted at step 4 of 15, with nothing verified, that it was
   * finished and could set launchAuthorization.
   */
  const undone = status.filter((s) => s.state !== "done");
  if (undone.length) {
    process.stdout.write(
      `Nothing can run. ${undone.length} step(s) remain and none of them is ready.\n\n` +
      undone.map((s) => `  ${s.cmd.padEnd(18)}${
        s.state === "not-ready" ? s.readyWhy : `waiting on ${s.blocked.join(", ")}`}`).join("\n") +
      `\n\nThe chain is stopped, not finished. Clear the first of those and the rest follow.\n`
    );
    process.exit(0);
  }
  process.stdout.write(`Every step has run and every gate passes.\n\n` +
    `What is left is not something this workflow does: review the package, then set\n` +
    `launchAuthorization by hand if you decide to go.\n`);
  process.exit(0);
}
process.stdout.write(
  failing
    ? `Next:  ${next.cmd}   (re-run it)\n\n` +
      `${next.makes} exists but its gate fails, so nothing after it is trustworthy.\n` +
      `Resuming past a failing step buries the failure rather than fixing it.\n`
    : `Can run now:  ${ready.map((s) => s.cmd).join("  ")}\n\n` +
      (ready.length > 1
        ? `Those share no inputs and none feeds another, so they can run concurrently.\n` +
          `Running them one after another is the most common reason a run feels slow.\n\n`
        : "") +
      `${next.cmd}: ${next.why}.\n`
);
