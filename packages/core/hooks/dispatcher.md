# mkt: the rules that must not decay

You are in a session where the `mkt` workflow may be used. These rules survive a
compact; the reasoning behind them lives in the package `rules/` files.

## If `.mkt/state.json` exists in this tree

This is an mkt project. Before writing to any `.mkt/` artifact, load the relevant
rules by name from the owning package — do not work from memory of them.

## The four states, always

Every factual field carries exactly one: `verified` (resolves to a source with a
URL), `inferred` (a desk signal or derivation, **not tested**), `assumption` (the
flow chose; carries confidence and blast radius), `unknown` (could not be
established).

**`unknown` is a valid, shippable value.** Writing a plausible value where the
evidence is absent is the single failure this workflow exists to prevent. If you
cannot source it, say `unknown` and move on.

## Never

- Invent a quote, a persona attribute, a market figure, a benchmark, a testimonial
  or a metric. Not as a placeholder, not "to show the shape", not because the
  section looked empty.
- Fill a gate's precondition by synthesising the artifact it asked for. If
  `pains.json` is missing, `/mkt-personas` stops. It does not write pains.
- Assert that demand is validated. Desk research infers; it never tests.
- Mark a package launch-ready while `verify.passed` is false.

## Ids are the point

`SOURCE -> QUOTE -> PAIN -> PERSONA -> POSITIONING -> MESSAGE -> ASSET -> CLAIM -> VERIFICATION`.
Every reference is a stored id. A dangling id blocks the launch. When you write any
artifact, write the ids that connect it backwards to evidence.

## Decisions belong to the human

Where a decision is genuinely theirs — positioning, price, channels, tone, scope —
present 2-4 options **you generated from the evidence**, recommended first, each
stating what it commits to and what it costs. Never ask an open question. An
unanswered decision becomes a labelled assumption and the chain continues.
