---
description: Size the market bottom-up from cited factors, as ranges, with the arithmetic stored so it can be recomputed
---

# mkt-size: show the calculation

Step 5. The artifact is the calculation; the numbers are a consequence of it.

Load `${CLAUDE_PLUGIN_ROOT}/rules/sizing.md` and the core package's
`evidence-discipline.md`.

## Preconditions

Stop unless `intel/category.json` exists — the ARPU factor comes from the price ladder.

## 1. Factors, each with a source

Typically: a public count of the entities in scope, a penetration proxy, and an ARPU
from the competitor ladder. Each is an `F-` id with a `value` and a `sourceId`.

Bottom-up only. Taking an analyst's market figure and applying a percentage is
untraceable and usually wrong at this stage.

Where a public count does not exist, the factor is `unknown` and the calculation does
not run. Say what would establish it.

## 2. Calculations, each with a formula

```json
"tam": { "formula": "F-001 * F-003", "range": [250000000, 320000000] }
```

Formulas reference factor ids and use `+ - * / ( )` only, because
`arithmetic-check.mjs` re-evaluates them independently and a formula it cannot parse
is a formula a reader cannot check either.

**Ranges, never points.** Derive the range from the uncertainty in your weakest
factor, which is almost always the penetration proxy.

## 3. Limitations

Required, and specific: which factor is weakest, what a different penetration
assumption does to the answer, and what the estimate excludes.

## 4. Check

```
/mkt-verify --only arithmetic
```

It recomputes every formula against its stated range and fails on a mismatch. It
also refuses a size stated as a point.

## Report

The three ranges, the factor chain in one line each, and the weakest factor named.
Then the standing caveat: the sizing derives from public factors and is not
independently validated.
