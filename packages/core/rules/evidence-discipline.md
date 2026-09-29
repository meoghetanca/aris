# Evidence discipline

The rule the whole workflow rests on. Load it before writing any artifact.

## The four states

Every factual field carries exactly one:

| State | Meaning |
|:--|:--|
| `verified` | resolves to a source id whose URL you actually fetched |
| `inferred` | a desk signal or a derivation from cited factors. **Not tested.** |
| `assumption` | the flow chose in the absence of evidence. Carries confidence and blast radius. |
| `unknown` | could not be established |

Canonical shape:

```json
{ "value": "", "sourceIds": ["SRC-001"], "status": "verified" }
```

## `unknown` is a shippable value

This is the most important sentence in the workflow. A section with three
`unknown` fields is correct and useful. A section with three plausible invented
values is worthless and actively dangerous, because everything downstream inherits
them and nobody can tell which is which afterwards.

**Never** fill a field because it looked empty, because the shape wanted a value,
because the user is waiting, or "as a placeholder to show the structure". A
placeholder that looks like data becomes data the moment the next command reads it.

## Where a number may come from

1. A source you fetched in this run, recorded in `sources.json`. → `verified`
2. Arithmetic over such sources, with the formula stored. → `inferred`
3. Nowhere else.

Your own prior about typical conversion rates, CAC, market size or pricing is not
a source. If a benchmark is needed and none can be cited, the field is `unknown`
and the artifact says what it would have taken to establish it.

## Quotes are quoted

A quote is verbatim text from a real page, stored with its source id, URL and date.
Do not tidy grammar, do not compress two posts into one, do not translate without
keeping the original alongside. A paraphrase presented as a quote is fabricated
evidence.

## When the evidence is not there

Say so, in the artifact and to the user, naming what you searched and what you
found. A reported gap is a finding. A filled gap is a lie with a citation-shaped
hole in it.

See [traceability.md](traceability.md) for how these fields link, and
[assumptions.md](assumptions.md) for what to do when you must proceed anyway.
