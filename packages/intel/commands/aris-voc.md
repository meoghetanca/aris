---
description: Mine the public voice of the market and code it into pains with quotes, frequency and sources
argument-hint: "[--platforms g2,reddit,appstore]"
---

# aris-voc: voice of customer, mined not asked

Step 3, and **the load-bearing step of the whole workflow.** The flow runs no
interviews, so everything downstream rests on what this collects. It is also the
step where fabrication is most tempting and least detectable.

Load `${CLAUDE_PLUGIN_ROOT}/rules/mining.md`,
`${CLAUDE_PLUGIN_ROOT}/rules/coding.md`, and the core package's
`evidence-discipline.md`.

## Preconditions

Stop, naming the failure, unless:

- `intel/category.json` exists — you need the competitor names to search for
- `state.market.sector` is set and its entry resolves

## 1. Fan out, one miner per platform

Dispatch a `aris-miner` per platform, **in a single message so they run concurrently**,
each given its platform, the competitor names and the category. None sees another's
findings.

**Cap the fan-out at four miners, and pick the four by what actually opens.** The sector
entry's `coverage` says how much a platform carries, not whether a miner can retrieve it
— G2, Capterra, TrustRadius and most help centres return 403 to automated fetching, and
a miner sent to one burns its whole budget discovering that. Prefer open sources: the
market's own forums, Reddit, GitHub issues, app stores, and vendors' own docs.

Each miner has a hard page budget and stops when it hits it. Four bounded miners beat
eight unbounded ones, and the run finishes while the human is still watching.

Do not mine yourself in parallel with them. Wait for the returns.

## 2. Record the sources

Every page a miner actually opened becomes a `SRC-` entry in `intel/sources.json`
with URL, `sourceType`, `accessedAt` and `reliability`. Record the gaps the miners
reported too, as a `gaps` list — a source that could not be reached is information,
and an absence nobody wrote down is indistinguishable from a negative finding.

## 3. Code into pains

Per `coding.md`: cluster by the problem described, not the words used. Each pain
carries its quotes; each quote carries `sourceId`, `url`, `date`, `platform`.

Count frequency, never estimate it. Mark `validated` only at **>= 8 quotes from >= 3
distinct sources**; everything else stays `insufficient` and is kept.

## 4. Check before you continue

```
/aris-verify --only pains
```

Fix what it finds in the clustering, not in the numbers. If it reports a quote
counted twice, one of the clusters is wrong.

## 5. If the thresholds cannot be met

Three cases, and they are not the same answer. `arisflow` states the same table; keep
them in step.

**Some validated, others thin.** Continue. The thin ones keep `status: "insufficient"`,
stay in the file, are excluded from personas, and an assumption records the thinness.

**Zero validated.** Stop and report. Not because the threshold is sacred, but because
`/aris-personas` has nothing to derive from: every attribute would be invented and
`persona-check` would strip all of them. Say which platforms you searched, what you
found, and how far short it falls.

**A gate error.** Counts disagreeing with stored quotes, a quote with no URL, one post
inflating two pains. Fix the clustering, never the numbers.

### Before concluding the market is quiet

Check what you were actually able to read. Run `sector-check --show <sector>` and look at
the fetch annotations: if the platforms this field keeps its voice on are marked
`BLOCKED-403` or `BLOCKED-USER-AGENT`, then a thin result measures your access, not the
market. **A blocked source and an empty source produce the same silence and mean opposite
things.** Run `/aris-evidence` and say plainly which it was.

Then offer the honest ways forward: paste the blocked sources, re-point at platforms the
sector entry got wrong, or human fieldwork. Interviews are exactly the cut this workflow
made, and this is where it bites.

Do not write plausible pains. A package built on invented pains is confidently wrong in
a way nobody downstream can detect.

## Report

Pains ranked by quote count, each with its source count and status. The platforms
that produced the most, because that drives the channel argument later. And the
gaps, stated plainly.
