# Channels, price and the plan

## A channel earns its place from the evidence

The strongest argument for a channel is that the quotes came from there. If forty
percent of the coded quotes came off two subreddits, those communities are where the
audience is — that is measured, not assumed.

Score each channel on:

| | |
|:--|:--|
| `audienceEvidence` | quote ids and platforms the evidence actually came from |
| `competitorPresence` | are competitors running here, and for how long (ad libraries) |
| `cost` | production cost in effort, not currency |
| `cacBenchmark` | cited, or `unknown`. Never your prior. |

Then read the sector entry's `channelNorms`. **`ineffective` is as load-bearing as
`effective`**: a channel the field has repeatedly failed with does not enter the mix
because it looked plausible. If the evidence contradicts the sector norm, say so
explicitly — that is interesting, and it might be the whole opportunity.

## The channels this workflow cannot serve

Partnerships, PR, events and sales outreach are relationship channels and the flow
cut them. They may still be right for the field. Where the sector entry says a
relationship channel dominates, **say that the mix is structurally biased** toward
paid, content and SEO, and record it as a cut consequence. Do not quietly drop them
and present the remainder as a complete plan.

## Price

Derive from the competitor ladder in `category.json` and the sector entry's
`priceBands`. Where the bands are null and uncited, use the live ladder from this run
and cite it.

The recommendation carries `basis` — the ladder positions it sits between and why —
and a `confidence`. It is a **recommendation, not a decision**: the flow does not
commit pricing. Present it at the decision block with the ladder visible.

## Budget

**Percentages summing to 100, never currency amounts.** `arithmetic-check.mjs`
enforces the sum. The flow does not commit money; an allocation is a shape, and the
amount is the user's to set.

## KPIs

Each target carries the cited benchmark it came from, or `unknown`. A target with no
benchmark is a number someone will be held to for no reason.

## Timeline

Resolve dependencies rather than listing weeks: the waitlist page precedes the email
sequence, tracking precedes any paid spend, the landing page precedes everything that
links to it. Owners are `[UNASSIGNED]` — the workflow does not know the team.
