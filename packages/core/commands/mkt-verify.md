---
description: Run every gate and every cross-asset consistency check, and write the verification the publish gate reads
argument-hint: "[--only pains|personas|arithmetic|claims|language|trace] [--no-write]"
---

# mkt-verify: measure the package

Step 11, and re-runnable at any time. This is what the publish hook reads, so it is
the difference between "it looks fine" and "it was checked".

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-all.mjs $ARGUMENTS
```

That runs the six gates and the eleven cross-asset checks, then writes
`verification/verify.json`, `verification/issues.json`, and `state.verify`.

---

## What it checks

**Gates** — pains meet threshold, persona attributes are evidenced, formulas
recompute, claims resolve to sources, language passes the sector lens, the spine
has no dangling ids.

**Consistency, which nobody owns and so rots** — broken or placeholder links, UTM
completeness and a single campaign value, tracking present at all, one price across
every asset, one product-name spelling, no past dates, a bounded set of CTAs, a
privacy reference, declared languages actually produced, no stray TODO or lorem
ipsum, and research age.

## Advisory versus blocking

`research_is_current`, `no_orphan_claims`, `orphan_sources` and
`reserved_terms_used_correctly` are warnings: they need judgement, not a refusal.
Everything else blocks. The split lives in `verify-all.mjs`; if you find yourself
wanting to move a check into the advisory set to get a green run, that is the check
doing its job.

## Reading a failure

Each error names the asset, the finding and enough to act. Fix the **cause**, then
re-run; do not edit `verify.json`. It is a measurement, and editing a measurement
to get a pass is the one move that breaks every guarantee in the workflow.

`no_uncited_assertions` fires most often. It catches sentences carrying a number or
a comparative with no `[CLAIM-nnn]` marker — usually a real uncited claim, sometimes
a sentence that only reads like one. When it is the latter, rewrite the sentence so
it is not making a factual assertion, rather than adding a marker to a claim you
cannot source.

## Afterwards

If it passed and `status` was `production`, the script advances it to `verified`.

It does **not** set `launchAuthorization`. Nothing in this workflow does.
