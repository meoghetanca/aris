---
description: Score channels from the evidence, recommend a price from the ladder, allocate budget as percentages, and set KPI targets with cited benchmarks
---

# mkt-gtm: the plan

Step 9. Two decision blocks: the channel mix and the price point.

Load `${CLAUDE_PLUGIN_ROOT}/rules/channels.md` and the core package's
`decisions.md`, `evidence-discipline.md` and `sector-discipline.md`.

## Preconditions

Stop unless `strategy/messages.json`, `intel/pains.json` and `intel/category.json`
exist, and the sector entry resolves.

## 1. Score the channels

For each candidate: `audienceEvidence` (the quote ids and platforms the evidence
actually came from), `competitorPresence` (from the ad libraries — how long has it been
running), `cost` in effort, and a **cited** `cacBenchmark` or `unknown`.

Then read the sector entry's `channelNorms`. Drop what the field has repeatedly failed
with, however plausible it looks. If the evidence contradicts the norm, say so
explicitly — that is interesting and might be the opportunity.

**Name the structural bias.** Partnerships, PR, events and sales outreach are
relationship channels the workflow cut. Where the sector says one of them dominates,
say the mix is biased toward paid, content and SEO, and record it as a cut
consequence. Do not present the remainder as a complete plan.

## 2. Channel mix — decision block

The scored channels, recommended mix first. Each option states what it commits to in
production effort and what it gives up. One `AskUserQuestion`.

## 3. Price — decision block

Derive from the ladder in `category.json` and the sector's `priceBands`; where those
are null, use the live ladder from this run and cite it. Present with the ladder
visible and the `basis` stated — which positions it sits between and why.

It is a **recommendation**. The flow does not commit pricing.

## 4. Budget, KPIs, timeline

`budgetAllocation` is **percentages summing to 100**. `arithmetic-check.mjs` enforces
the sum; the amount is the user's to set.

Each KPI target carries its cited benchmark, or `unknown`. A target with no benchmark
is a number someone gets held to for no reason.

`timeline` resolves dependencies rather than listing weeks — tracking precedes paid
spend, the landing page precedes anything linking to it. Owners are `[UNASSIGNED]`.

## 5. Write

`strategy/gtm.json`, then `/mkt-verify --only arithmetic`.

## Report

The mix with the evidence behind the top channel, the recommended price and its basis,
the allocation, and the KPI targets marked where the benchmark is `unknown`. Then
`/mkt-assets`.
