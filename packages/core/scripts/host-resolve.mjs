#!/usr/bin/env node
/**
 * host-resolve: what host, if any, does a platform word resolve to?
 *
 * A one-line answer to "why is this community not being mined?", which was previously
 * only answerable by reading the resolution code. Prints JSON of word -> host or null.
 *
 *   node host-resolve.mjs reddit forum hackernews
 */
import { help } from "./lib/aris.mjs";
import { hostForPlatform, whyNoHost } from "./lib/hosts.mjs";

help(`
host-resolve — resolve platform words to hostnames.

  node host-resolve.mjs <word> [word...]     JSON of word -> host or null
  --why                                      include why a word has no host`);

const words = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!words.length) {
  process.stderr.write("host-resolve: give at least one platform word.\n");
  process.exit(2);
}

const out = {};
for (const w of words) {
  const h = hostForPlatform(w);
  out[w.trim().toLowerCase()] = process.argv.includes("--why")
    ? { host: h, why: h ? null : whyNoHost(w) }
    : h;
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
