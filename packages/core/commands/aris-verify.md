---
description: Run every gate and every cross-asset consistency check, and write the verification the publish gate reads
argument-hint: "[--only pains|personas|arithmetic|claims|language|trace] [--no-write]"
---

# aris-verify: measure the package

Step 11, and re-runnable at any time. This is what the publish hook reads, so it is
the difference between "it looks fine" and "it was checked".

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/verify-all.mjs" $ARGUMENTS
```

That runs the six gates and the eleven cross-asset checks, then writes
`verification/verify.json`, `verification/issues.json`, and `state.verify`.

---

## What it checks

Scripts only. The **`aris-compliance-reviewer`** runs inside `/aris-assets`, where the copy
is still being written and a blocker is cheap to fix — not here, where it would be found
after everything downstream already used the sentence.


**Gates** — pains meet threshold, persona attributes are evidenced, formulas
recompute, claims resolve to sources, language passes the sector lens, the spine
has no dangling ids.

**Consistency, which nobody owns and so rots** - broken, unparseable or placeholder
links, UTM completeness and a single campaign value, tracking present at all, one price
per unit across every asset, one product-name spelling, one launch date, a bounded set
of CTAs, a privacy reference, declared languages actually produced, no stray TODO or
lorem ipsum, and research age.

Assets are read **recursively**: `assets/social/post-1.md` is checked exactly like
`assets/launch-post.md`. It was not, and an asset in a subdirectory used to publish
without being read by anything.

## Advisory versus blocking

46 checks run here. 36 block a publish and 10 are warnings that need judgement rather
than a refusal: `research_is_current`, `no_orphan_claims`, `orphan_sources`,
`reserved_terms_used_correctly`, `insufficient_pains_are_marked_not_dropped`,
`verification_is_current`, `cta_consistency`, `translation_complete`,
`dates_in_the_past` and `money_figures_carry_a_unit`.

Severity lives **on the check**, declared where the check is written, as
`advisory(...)` instead of `check(...)`. It used to live in a list of names inside
`verify-all.mjs`, which is how a check that flags the year a company was founded ended
up refusing to let a correct package publish. If you find yourself wanting to move a
check to advisory to get a green run, that is the check doing its job; if you find
yourself wanting to because it fires on something that is not a defect, that is a bug in
the check and it belongs in `test/run.mjs` before it is reclassified.

Releasable is a separate question with its own nine checks, and `/aris-package` runs
`close-check.mjs` for it. Nothing there is advisory.

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
