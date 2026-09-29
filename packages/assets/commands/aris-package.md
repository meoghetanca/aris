---
description: Assemble the package — the brief, the checklist, the manifest, and the single-file HTML command centre
---

# aris-package: the command centre

Step 14. Everything produced so far becomes one file a person can read.

Load `${CLAUDE_PLUGIN_ROOT}/rules/html-contract.md`.

## Preconditions — the release gate

Run the core package's `close-check.mjs` (via `/aris-verify` first, then the script).
**Stop if it fails**, and say which check failed and what clears it.

The gate is not advisory. A package assembled over a failed verification looks finished
and is not, which is worse than one that refused to assemble.

## 1. `package/manifest.json`

The artifact index: every path with its `type` and `status`, the sector and
`sectorStatus`, `verification` (passed, citation coverage, blocking count), and
`launchAuthorization`. **The HTML generator reads only the manifest to find everything
else**, so an artifact missing here is invisible to the page.

## 2. `package/launch-brief.md` and `launch-checklist.md`

The brief is a human summary: what is launching, for whom, why, the positioning, the
price recommendation, the channels, the readiness state. Two pages at most.

The checklist is every action with its owner (`[UNASSIGNED]`) and its dependency,
ordered so someone can work down it. Include the items this workflow cannot do —
supply real testimonials, connect the waitlist service, set the budget amount, press
publish — because those are the ones that get forgotten.

## 3. Build the HTML

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/build-html.mjs
```

It reads the manifest, embeds the JSON, and writes `package/aris-launch.html`. It
refuses to write a launch-ready page over a failed verification — requirement 15, and
it is enforced in the generator rather than trusted to the caller.

## 4. Set state

`state.status = "launch-ready"` only when `close-check.mjs` passes. Nothing else sets it.

**Do not set `launchAuthorization`.** That is the one deliberate human act the workflow
keeps, and the publish gate stays closed until a person sets it by hand after reading
the page.

## 5. Report, in this order

1. **The delta** — what changed since the last build.
2. **What was chosen and why** — each decision with its rejected options.
3. **The low-confidence assumptions**, highest blast radius first.
4. **What was not available and what its absence cost** — `cutSteps.json`.

Then the path to the file, and the two remaining human acts: reviewing it, and setting
`launchAuthorization` if they decide to go.

## Optional: publish it

Only if the user asks. Publish the HTML as an Artifact, declaring `db`, `user`,
`comments` (composer_only) and `downloads` so reviewers can record per-asset approvals
that `/aris-verify` reads back. **Never declare `assets`** — that makes the page
organisation-internal and it can never be shared with a client outside the org.
