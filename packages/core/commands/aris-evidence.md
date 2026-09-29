---
description: Show what the run could not read, and turn a blocked source into something usable
argument-hint: "[--ingest]"
---

# aris-evidence: what we could not read

A blocked source must degrade to **"open this and paste it here"**, never to a silent
gap. On the first real run G2, Capterra, TrustRadius and three help centres all returned
403 — and those are named `coverage: high` in most sector entries, so the miner is sent
exactly where it cannot go.

Without this step the workflow produces a thin result and reports it as a quiet market.
That is a finding about the market, and it is wrong.

---

## What is missing

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.mjs
```

Prints every source recorded as blocked, with the URL to open and the file to paste it
into. A person with a browser reads in two minutes what a fetcher cannot read at all.

## After they paste

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.mjs --ingest
```

Checks each file is actually usable: **a paste with no URL in it cannot be cited, and an
uncitable quote is not evidence.** Then re-run `/aris-voc`, which codes the supplied text
into pains exactly as it would a fetched page — same thresholds, same verbatim rule, same
requirement that every quote carries its own URL and date.

## Recording a block when it happens

This only works if blocks are written down. When a fetch is refused, add the source with
`status: "blocked"` and a `blockedReason` saying **403 or 404** — they mean different
things, and one is worth retrying by hand while the other is not.

Never drop a blocked source silently. A gap nobody wrote down is indistinguishable from a
negative finding, and the whole package then rests on an absence that was never real.

## What not to do

Do not substitute a search snippet for the page. Do not summarise what a blocked page
"probably says". Do not quietly lower the pain thresholds because the evidence was hard
to get — the thresholds are what make a validated pain mean anything.
