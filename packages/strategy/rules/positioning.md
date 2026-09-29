# Positioning

Three directions, scored against declared criteria, one selected — and the two
rejected kept with their reasons. A winner with no losers is not a decision, it is
an output.

## The criteria are declared first

```json
"criteria": ["feature_matrix_whitespace", "pain_frequency", "defensibility"]
```

Declare them before scoring, so the scoring cannot be reverse-engineered from a
preferred answer.

- **whitespace** — a gap in the feature matrix that the reviews confirm people want.
  A gap nobody complains about is a choice competitors made, not an opportunity.
- **pain frequency** — the quote and source counts behind the pains this direction
  leads on. Countable, from `pains.json`.
- **defensibility** — whether the product can hold this position. This is the one
  criterion the evidence cannot settle: it depends on a roadmap the workflow does not
  own. Score it, then say it is the weakest score in the set.

## Each direction

```
FOR      <persona>
WHO      <pain, in their words>
PRODUCT IS THE <category>
THAT     <value>
UNLIKE   <named alternative>
BECAUSE  <differentiator>
```

`UNLIKE` names a real competitor from `category.json`. "Unlike traditional solutions"
is not a position; it is a way of avoiding one.

Every direction carries `painIds` and `targetPersonaIds`. A direction that cannot name
the pains it serves is not grounded in the research.

## Three genuinely different directions

Not one idea at three volumes. They should differ in **who they are for**, or **which
pain they lead on**, or **which alternative they displace**. If two directions would
produce the same landing page, there are only two directions.

A useful shape: one leading on the highest-frequency pain, one on the clearest
whitespace, one on a narrower segment with a sharper claim.

## Selection

The flow scores and picks; the user may override at the decision block. Record
`selected`, and `rejected` with a **reason per direction** — not "scored lower", but
what specifically made it weaker. The HTML shows all three, and the rejected ones are
what let a reader judge whether the choice was right.

## Blast radius

Positioning is `total`. Every message, every asset and the channel argument inherit
it; changing it later rebuilds the package. Any assumption feeding it inherits that
blast radius too.
