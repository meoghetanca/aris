---
description: Write the conditional growth rules in advance, so the optimisation loop runs itself once data arrives
---

# mkt-playbook: decisions written before the data

Step 13. The rules that make the post-launch loop automatic.

Load the core package's `evidence-discipline.md`.

## Preconditions

Stop unless `harness/metrics.json` exists — a rule can only key off a defined metric.

## The shape

```json
{ "id": "RULE-001", "metric": "CAC", "condition": "> threshold",
  "threshold": null, "window": "14d",
  "action": ["pause lowest-performing creative", "review landing conversion",
             "redistribute budget toward the next channel"],
  "priority": "high" }
```

## Why write them now

A rule written before the data is a decision. A rule written after is a
rationalisation of whatever happened. Committing the thresholds in advance is the whole
value — it is what stops a bad channel being kept because someone liked the creative.

## Thresholds may stay null

`threshold: null` is valid where no cited benchmark exists. **An invented threshold is
worse than an unresolved one**, because a real decision gets made against it. Say what
would set it: usually the first period's own data, which makes the first rule
"establish the baseline, change nothing".

## Write rules that fire on a decision, not on a number

Each `action` is something a person can do on Monday morning. "Improve conversion" is
not an action. Pair conditions where the pairing is what makes the diagnosis: low CTR
with healthy landing conversion means the creative is wrong, not the page — and that
distinction is the rule's entire value.

Cover at least: CAC above tolerance, conversion below target, one channel outperforming,
a channel producing nothing, and the case where volume is too low to conclude anything
— which is the most likely outcome of the first two weeks and the one that most often
gets misread as failure.

## Report

The rules, which thresholds are `null`, and which metric each keys off. Then
`/mkt-package`.
