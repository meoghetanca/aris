# Sizing and demand

Two artifacts, one discipline: show the calculation, and never let a desk signal
pass for a test.

## TAM / SAM / SOM

Bottom-up only. Top-down sizing — taking an analyst's market figure and applying a
percentage — is untraceable and almost always wrong at this stage.

Every factor is an `F-` id with a `value` and a `sourceId`. Every calculation stores
a `formula` referencing those ids, so `arithmetic-check.mjs` can recompute it
independently. A number whose formula cannot be re-evaluated is an assertion.

```json
{ "id": "F-001", "name": "Companies in scope", "value": 120000, "sourceId": "SRC-088" }
```

**Ranges, never points.** A single figure claims a precision that bottom-up
estimation does not have. Take the range from the uncertainty in your weakest
factor — usually the penetration proxy.

Record `limitations` honestly: which factor is weakest, what a different penetration
assumption would do to the answer, and what the estimate excludes.

Where a public count genuinely does not exist, the factor is `unknown` and the
calculation does not run. A sizing section that says "we could not establish the
number of companies in scope" is worth more than one built on an invented count.

## Demand is inferred, never tested

`demand.json` carries `status: "inferred_not_tested"` as a constant. The schema
permits nothing else, because the one thing this artifact must never do is read as
validation.

Five signals, each citable:

| Signal | Why it means something |
|:--|:--|
| search volume trend | rising queries mean rising awareness of the problem |
| review growth rate | a competitor accumulating reviews is accumulating customers |
| community activity over time | thread volume tracks salience |
| **ad persistence** | an ad running eighteen months converts. Nobody funds a losing ad that long. |
| **price survival** | a price held for three years has been tested by the market far more thoroughly than any survey |

The last two are the strongest signals available without touching a customer, and
both are free to read.

## The list that keeps this honest

`doesNotProve` is a required field, and it says: product-market fit, willingness to
pay, conversion rate, and demand for *this* product rather than the category.

Write `untestedQuestions` as the questions a real test would answer. That list is
the brief for the validation work a human would do next, and it is the most useful
thing this artifact produces.
