# Assumptions

The flow does not stop when the evidence runs out; it records what it chose and
keeps going. That is only safe because of this register.

## Every assumption is labelled

```json
{
  "id": "A-001",
  "statement": "Primary buyer is the HR manager rather than the CFO",
  "confidence": 0.6,
  "blastRadius": "high",
  "reason": "No pricing-page evidence of finance-led procurement; sector KB lists both",
  "producedArtifacts": ["strategy/positioning.json", "strategy/messages.json"]
}
```

`producedArtifacts` is what lets the HTML show an assumption **beside the thing it
produced**, which is the difference between a disclosure and a footnote nobody reads.

## Blast radius

| | |
|:--|:--|
| `low` | wrong here, fix here |
| `medium` | one artifact rebuilds |
| `high` | several artifacts rebuild |
| `total` | the package rebuilds — positioning-level |

Order the register by lowest confidence first within highest blast radius. That is
the order a reviewer should read it, and the order the HTML renders.

## Confidence

A number in [0,1], and it must mean something. Use it to say how likely the
statement is to survive contact with real evidence, not how comfortable you feel.
An assumption made because a whole class of evidence was unavailable sits below
0.5, however sensible it sounds.

## What is not an assumption

- A fabricated number. An assumption is a **stated choice under uncertainty**, not
  a guess dressed as data. If the field wants a figure and none exists, the field
  is `unknown` and the assumption records the *decision* you took instead.
- Anything the sources actually settle. Record the source, not an assumption.
- A decision the user made. That is a decision, recorded with the option set that
  produced it. See [decisions.md](decisions.md).

## Silence

An unanswered decision block becomes an assumption at the recommended option's
confidence and the chain continues. Silence is never a stop, and never a
fabrication either — it is a recorded default.
