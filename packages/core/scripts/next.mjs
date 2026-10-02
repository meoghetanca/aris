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
    check: () => gate("persona-check.mjs") },
  { cmd: "/aris-size",      needs: ["intel/category.json"], makes: "intel/tam-sam-som.json",
    why: "the price ladder feeds the ARPU factor", check: () => gate("arithmetic-check.mjs") },
  { cmd: "/aris-demand",    needs: ["intel/category.json"], makes: "intel/demand.json",
    why: "desk signals, inferred and never tested" },
  { cmd: "/aris-position",  needs: ["intel/category.json"], makes: "strategy/positioning.json",
    why: "total blast radius: everything after inherits it" },
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
  return { ...s, made, gated, blocked,
    state: !made ? (blocked.length ? "blocked" : "ready") : gated ? "done" : "failing" };
});

const failing = status.find((s) => s.state === "failing");
const next = failing ?? status.find((s) => s.state === "ready");

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify({ next: next?.cmd ?? null, steps: status }, null, 2) + "\n");
  process.exit(0);
}

if (process.argv.includes("--all")) {
  const pad = Math.max(...STEPS.map((s) => s.cmd.length));
  process.stdout.write(`${state.product?.name ?? "this project"}\n\n`);
  for (const s of status) {
    const mark = { done: "[x]", failing: "[!]", ready: "[ ]", blocked: "[ ]" }[s.state];
    const note = s.state === "failing" ? "  output exists but its gate fails"
               : s.state === "blocked" ? `  waiting on ${s.blocked.join(", ")}` : "";
    process.stdout.write(`  ${mark} ${s.cmd.padEnd(pad)}${note}\n`);
  }
  process.stdout.write("\n");
}

if (!next) {
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
    : `Next:  ${next.cmd}\n\n${next.why}.\n`
);
