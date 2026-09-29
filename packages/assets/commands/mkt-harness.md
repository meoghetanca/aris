---
description: Define the measurement contract before any data exists — metrics, formulas, null baselines, and the analyzer that wakes when an export arrives
---

# mkt-harness: the measurement contract

Step 12. Not "measure" — there is no data yet. This builds the thing that measures.

Load the core package's `evidence-discipline.md`.

## Preconditions

Stop unless `strategy/gtm.json` exists — the KPIs and channels define what to measure.

## 1. `harness/metrics.json`

One `METRIC-` entry per thing you will actually decide on. Each carries a `definition`
in words, a `formula` in field names, the `source`, the `frequency`, and:

```
"baseline": null,
"target": null
```

**`null` is correct and required.** A pre-launch baseline is an invented number, and
`close-check.mjs` fails the package for carrying one. Targets come from `gtm.json`'s
cited benchmarks; where the benchmark is `unknown`, the target stays `null` and the
metric says what would set it.

Cover the funnel the KPIs imply: awareness, acquisition, activation, conversion,
retention. A metric nobody would act on is noise — leave it out.

## 2. `harness/dashboard-spec.json`

Sections, the metrics in each, and the filters (date, channel, campaign, persona).
Defined before the data exists so the tracking gets built to match, rather than the
dashboard being shaped by whatever happened to be logged.

## 3. `harness/analyze.mjs`

The script that runs when a real export lands in `.mkt/evidence/analytics/`. It must:

- read whatever CSVs are there and say which metrics it could and could not compute;
- compute only from the file, never fill a gap with an estimate;
- compare against `target` where one exists, and say "no target" where none does;
- evaluate `playbook/growth-rules.json` and print which rules fired;
- **never write a baseline into `metrics.json` from a partial export.** First real
  period sets the baseline, and that is a human's call.

Write it so it fails loudly on an unexpected column rather than guessing the mapping.

## 4. Report

The metric list, which targets are `null` and why, and the drop path:
`.mkt/evidence/analytics/`. Say that the dashboard in the HTML renders empty — em-dashes,
not sample charts — until something is dropped there.
