---
description: Generate three scored positioning directions, select one, and keep the rejected two with their reasons
---

# mkt-position: three directions, one choice

Step 7. Blast radius `total`: everything downstream inherits this.

Load `${CLAUDE_PLUGIN_ROOT}/rules/positioning.md` and the core package's
`decisions.md`, `evidence-discipline.md` and `traceability.md`.

## Preconditions

Stop, naming the failure, unless:

- `intel/pains.json` has at least one `validated` pain
- `intel/personas.json` exists
- `intel/category.json` exists — `UNLIKE` must name a real competitor

## 1. Declare the criteria before scoring

`feature_matrix_whitespace`, `pain_frequency`, `defensibility`. Declared first so the
scoring cannot be reverse-engineered from a preferred answer.

## 2. Write three genuinely different directions

Not one idea at three volumes. A useful spread: one leading on the highest-frequency
pain, one on the clearest whitespace, one on a narrower segment with a sharper claim.
If two would produce the same landing page, there are only two.

Each in the full template, with `painIds` and `targetPersonaIds`.

## 3. Score

Against the declared criteria, with the numbers visible. Say plainly that
`defensibility` is the weakest score in the set: it depends on a roadmap this workflow
does not own, and that is an assumption at `total` blast radius.

## 4. The decision block

**One `AskUserQuestion`.** The three directions, written out in full, recommended
first. Each option states what it commits to and what it costs — which pains become
primary, which alternative it picks a fight with, and which segment it gives up.

These are built things, not questions. That is the point: asked to specify a
positioning, people hesitate; shown three written ones, they correct in seconds.

Unanswered takes the recommendation and records an assumption at `total` blast radius.

## 5. Write

`strategy/positioning.json` with `criteria`, all three `directions`, `selected`, and
`rejected` carrying **a specific reason each** — not "scored lower" but what made it
weaker. The HTML shows all three, and the rejected ones are what let a reader judge
the choice.

Record the decision in `state.decisions` with its option set. Set
`state.status = "strategy"`.

## Report

The selected statement in full, the two rejected in one line each with their reason,
and the scores. Then `/mkt-messages`.
