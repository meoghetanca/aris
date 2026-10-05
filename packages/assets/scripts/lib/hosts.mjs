/**
 * Platform words are KINDS. Hostnames are addresses. They are not interchangeable.
 *
 * Sector entries name a community by platform and handle, `{ platform: "reddit",
 * handle: "r/SaaS" }`, with no URL. Resolving that to a host by appending ".com" works
 * for reddit and facebook and fails silently everywhere else: it invented `forum.com`
 * for ten sectors and `hackernews.com` for one, and both then showed up as "never
 * observed, try one" — inviting a fetch against a domain with nothing to do with the
 * community. A guessed address is worse than no address, because it looks actionable.
 *
 * So: a word resolves only if it is listed here. Anything else resolves to nothing and
 * makes no claim at all.
 */

/**
 * The statuses a host may carry. Centralised because it was previously spelled out in
 * sector-check and again in the test suite, which is two places to disagree.
 *
 * login-required was added after probing the five most-referenced unobserved hosts:
 * linkedin, instagram and discord all RESPOND with readable marketing or nav text while
 * the community content a miner actually needs sits behind authentication. Calling that
 * "open" would send a miner to read a sign-up page and report the market as quiet.
 */
export const FETCH_STATUSES = [
  "open",                // a plain fetch returns the content you came for
  "blocked-403",         // refused by the site
  "blocked-user-agent",  // refused by crawler policy before reaching the site
  "js-rendered",         // responds, but the content loads client-side
  "login-required",      // responds, and what you came for needs an account
];

/** Platform word -> the host that actually serves it. */
export const PLATFORM_HOSTS = {
  reddit: "reddit.com",
  facebook: "facebook.com",
  linkedin: "linkedin.com",
  youtube: "youtube.com",
  tiktok: "tiktok.com",
  discord: "discord.com",
  instagram: "instagram.com",
  twitter: "twitter.com",
  github: "github.com",
  // The two that the naive rule got wrong, which is why this file exists.
  hackernews: "news.ycombinator.com",
  twitch: "twitch.tv",
};

/**
 * Words that name something real with no fetchable address. Distinct from "unknown":
 * these must never be offered as a probe, because there is nothing to probe.
 */
export const NOT_A_HOST = {
  forum: "a kind of venue, not a site. Find the field's actual forum and record it by URL.",
  slack: "Slack workspaces are closed to any fetch. Membership is the only way in, so this is a human task or nothing.",
  zalo: "Zalo groups are closed to any fetch.",
};

/** The host for a platform word, or null. Null means make no claim. */
export function hostForPlatform(word) {
  const p = typeof word === "string" ? word.trim().toLowerCase() : "";
  if (!p || /\s/.test(p)) return null;          // a description, not a platform word
  return PLATFORM_HOSTS[p] ?? null;
}

/** Why a word has no host, when that is worth saying. */
export function whyNoHost(word) {
  const p = typeof word === "string" ? word.trim().toLowerCase() : "";
  return NOT_A_HOST[p] ?? null;
}

/** Hostname from a URL, or null. */
export function hostFromUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** Longest suffix wins, so community.zoom.com is not answered by a zoom.com rule. */
export function matchHost(hosts, host) {
  if (!host) return null;
  let best = null;
  for (const k of Object.keys(hosts ?? {}))
    if ((host === k || host.endsWith("." + k)) && (!best || k.length > best.length)) best = k;
  return best;
}
