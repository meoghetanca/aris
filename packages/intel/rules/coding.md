# Coding what was mined

Turning raw quotes into pains. This is the step where an honest pile of evidence
becomes either a real finding or a plausible story.

## The unit is the quote, not the impression

A pain exists because specific people said specific things. Every pain carries its
quotes; the quotes carry their sources. Never write a pain whose evidence you
summarised and discarded — the evidence *is* the pain.

## Clustering

Group by **the problem described**, not by the words used. "Setup took three weeks",
"we needed a consultant to onboard" and "gave up during import" are one pain. "Too
expensive" and "no annual discount" are two.

Resist the pull toward tidy, mid-sized clusters. Real markets have one enormous pain
and a long tail; a list of six evenly sized pains is usually an artifact of the
clustering, not of the market.

## Frequency is counted, never estimated

`quoteCount` is the number of quotes stored. `sourceCount` is the number of distinct
`sourceId` values among them. `pain-check.mjs` recomputes both and fails when the
stated numbers disagree with what is stored, so there is no point writing anything
else.

One post never counts twice. If the same text appears under two pains, one of them
is wrong — the check catches it, but fix the cluster rather than deleting a quote.

## The threshold

```
validated  requires  quoteCount >= 8  AND  sourceCount >= 3
```

Below that, `status: "insufficient"`. Keep it — an insufficient pain is useful
information and may cross the threshold on the next run. Do not promote it, and do
not derive a persona attribute from it.

Three sources matter as much as eight quotes: eight complaints in one subreddit
thread is one conversation, not a market.

## Severity

`high` only where the evidence shows consequence — someone churned, paid for a
workaround, or built it themselves. Frustration is not severity. Say which quotes
carry the consequence.

## Contexts and platforms

Record where each pain was found. This is what makes `/aris-gtm`'s channel argument
honest later: a channel earns its place because the evidence came from there, not
because it appeared on a list of channels.

## What not to produce

- A pain with no quotes.
- A pain assembled from what you know about this kind of product.
- A statement of a solution ("users want an integration") instead of a problem
  ("exports have to be re-imported by hand every Monday").
- A pain whose quotes all come from one competitor's reviews, presented as a market
  pain. That is a pain with *that product*, and the distinction matters.
