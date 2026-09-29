---
description: Infer demand from five public signals, and state plainly what it does not prove
---

# mkt-demand: inferred, never tested

Step 6. The workflow cut the willingness-to-pay test, so this is what replaces it —
and the single most important thing this command does is refuse to be mistaken for
validation.

Load `${CLAUDE_PLUGIN_ROOT}/rules/sizing.md` and the core package's
`evidence-discipline.md`.

## Preconditions

Stop unless `intel/category.json` and `intel/sources.json` exist.

## The five signals

| `type` | What to collect | Why it means something |
|:--|:--|:--|
| `search_volume` | trend on the problem's terms, not the brand's | rising queries mean rising awareness |
| `review_growth` | competitor review count over time | accumulating reviews means accumulating customers |
| `community_activity` | thread volume by period | tracks salience |
| `ad_persistence` | how long a competitor ad has run (Meta Ad Library, Google Ads Transparency) | an ad running eighteen months converts |
| `price_survival` | how long a price point has held | a price held three years has been tested harder than any survey |

The last two are the strongest signals available without touching a customer, and
both are free to read. Use them.

Each signal is a `DEMAND-` id with a `sourceId`. A signal you could not measure is
omitted with a note, not estimated.

## The constant

`status` is `"inferred_not_tested"`. It is not a judgement about signal strength; it
is a property of the method, and the schema permits nothing else.

## Two required lists

- **`doesNotProve`** — product-market fit, willingness to pay, conversion rate, and
  demand for *this* product rather than the category.
- **`untestedQuestions`** — the questions a real test would answer. This is the brief
  for the fieldwork a human would do next, and it is the most useful thing this
  artifact produces. Write it properly.

## Report

The signals with their values and directions, then the conclusion — and say, in your
own words to the user, that this is desk inference. If the signals are weak or
contradictory, that is a finding worth more than a confident summary.
