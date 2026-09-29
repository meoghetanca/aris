# Claims

Every factual assertion in every asset carries an id that resolves to a source. This
is the highest-value rule in the workflow: it is what stops an invented market figure
or an unverified competitor price from reaching something published.

## The marker

In the Markdown, inline, right where the assertion is:

```
Teams lose about six hours a week re-entering data by hand [CLAIM-014].
```

In `assets/claims.json`:

```json
{ "id": "CLAIM-014", "text": "Teams lose ~6 hours/week on manual re-entry",
  "type": "factual", "sourceIds": ["SRC-034"], "messageId": "MSG-008",
  "usedIn": ["assets/landing-brief.md", "assets/ad-variants.md"],
  "status": "verified" }
```

## What needs a marker

Anything a reader could check: a number, a comparison, a claim about what competitors
do, a claim about outcomes, a claim about the market. `claim-check.mjs` flags sentences
carrying a number or a comparative with no marker, and it is usually right.

What does **not** need one: a description of what the product does, a benefit stated as
a mechanism, a question, a call to action.

## `type`

| | |
|:--|:--|
| `factual` | a checkable statement about the world |
| `comparative` | mentions or implies a competitor. Must cite the competitor's own page. |
| `superlative` | "best", "fastest", "only". Needs evidence for the superlative itself, not just the underlying fact. |

A `superlative` with a citation that only supports the underlying fact is still
unsupported. "The fastest" needs evidence about everyone else.

## `status`

`verified` cites a source. `inferred` is derived from cited sources with the derivation
stated. `unsupported` **blocks the launch** — the gate refuses and the publish hook
refuses. `unknown` is permitted only for a claim deliberately left in the register as a
gap, cited by nothing and used by nothing.

The honest fix for `unsupported` is usually to soften the sentence until it is no longer
a factual claim, not to hunt for a citation that says what you wanted.

## Testimonials

```
> [TESTIMONIAL - SUPPLY REAL]
> Placeholder. A quote written by this workflow is fabricated evidence.
```

Loud and unmissable. Never quiet grey text someone ships by accident. `claim-check.mjs`
flags an attributed quote with no placeholder marker, because that is what a fabricated
testimonial looks like.

The same applies to logos, case studies, review scores and named customers. If it is
not supplied by a human from `.aris/evidence/supplied/`, it is a placeholder.

## Numbers that appear in more than one asset

They must match. `verify-all.mjs` compares every price figure across the package and
fails when two disagree — one of them is wrong, and the one on the landing page is the
one people act on.
