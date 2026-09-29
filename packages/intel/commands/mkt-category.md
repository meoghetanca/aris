---
description: Map the category from the public record — players, claims, the price ladder, the feature matrix and the gaps
---

# mkt-category: the market map

Step 2. Desk research, fully automatable, and the foundation everything else stands on.

Load `${CLAUDE_PLUGIN_ROOT}/rules/mining.md` and the core package's
`evidence-discipline.md` and `sector-discipline.md`.

## Preconditions

Check and **stop** if any fail, naming the one that failed:

- `.mkt/state.json` exists
- `state.market.sector` is set

## 1. Find the players

Identify the players first — the obvious leaders plus at least two adjacent or smaller
ones. A map of only the leaders makes every gap look like whitespace when it is really
a deliberate choice.

Then dispatch **one `mkt-competitor-analyst` per player, in a single message so they
run concurrently.** Each gets one company and nothing else. None sees another's
profile: an analyst who has read the market leader describes everyone else as a
variation of it, and the feature matrix then reflects the reading order rather than
the market.

Do not profile any competitor yourself in parallel with them. Wait for the returns,
then assemble the matrix — that is the step that needs every profile at once, and it
is yours.

From the sector entry's `reviewPlatforms`, plus a search on the category. Include
the obvious leaders and at least two adjacent or smaller players — a map of only the
leaders makes every gap look like whitespace when it is really a deliberate choice.

For each, open the product's own pages. For each `COMP-` entry record
`targetCustomer`, `positioning` (their words, not yours), `features`, `pricing`,
`distribution`, `claims`, `strengths`, `weaknesses`, and `evidence` as source ids.

## 2. The price ladder

Read pricing pages directly. Record the unit — per seat, per month, per transaction —
because a ladder mixing units is unusable. Where pricing is "contact sales", that is
the finding: record `unknown` with the URL showing it.

## 3. The feature matrix

Rows are features the field treats as meaningful; columns are the players. Every cell
is `true`, `false` or `unknown` **with a source id**. `unknown` is the honest value
for a feature you could not confirm, and it is common — do not infer absence from a
marketing page's silence.

## 4. The gaps

`marketGaps` are rows where the matrix, the reviews and the ladder agree that
something is missing. A gap asserted from one competitor's marketing page is not a
gap. Each entry names the evidence that makes it one.

## 5. Write

`intel/category.json` and `intel/sources.json`. Every factual field takes the
`{ value, sourceIds, status }` shape. Set `state.status = "researching"`.

## Report

The player count, the ladder's span, how many matrix cells are `unknown`, and the
gaps with their evidence. If more than about a third of the matrix is `unknown`, say
so plainly — it means the field does not publish, and the positioning step will be
working with less than it looks.
