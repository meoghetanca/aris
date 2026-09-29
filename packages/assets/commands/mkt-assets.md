---
description: Write every launch material, each factual claim carrying an id that resolves to a source
argument-hint: "[asset name, or all]"
---

# mkt-assets: the launch materials

Step 10. The largest step, and the one whose output gets published.

Load `${CLAUDE_PLUGIN_ROOT}/rules/copy.md`, `${CLAUDE_PLUGIN_ROOT}/rules/claims.md`,
and the core package's `evidence-discipline.md`, `decisions.md` and `traceability.md`.

## Preconditions

Stop, naming the failure, unless:

- `strategy/messages.json` exists
- `strategy/gtm.json` exists — the channel mix decides which assets are worth writing
- the sector entry resolves — its `regulatedClaims` constrain every sentence here

## 1. Asset scope — decision block

The channel mix in `gtm.json` implies a set. Present it, recommended first, with what
each option costs in production effort. One `AskUserQuestion`. There is no point
writing twelve social posts for a channel the mix dropped.

## 2. Write, one asset at a time

Dispatch **one `mkt-copywriter` per asset in the agreed scope, concurrently**. Each gets
the messaging library, the claim registry, the glossary and the sector's language
constraints — and one asset to write.

One writer per asset keeps a landing brief's register from bleeding into ad copy, and
keeps each asset's claim ids honest: a writer holding six assets starts reusing a claim
where it nearly fits.

A copywriter that reports needing a claim the registry does not hold is doing its job.
**Do not write that sentence yourself.** Either source the claim and add it to the
registry, or cut the sentence.

Per the structures in `copy.md`. Every asset draws its copy from `messages.json` — this
step does not invent new messaging, it renders the library into forms.

**`landing-brief.md`, not a landing page.** The brief is the copy deck pica builds
from: section order, copy per section, claim ids, CTA. Writing HTML here would create a
second source of truth for the same copy and the two would drift immediately.

Every factual assertion gets a `[CLAIM-nnn]` marker and an entry in
`assets/claims.json` with `sourceIds`, `messageId` and `usedIn`.

Testimonials, logos, review scores and named customers are placeholders, loud and
unmissable. A quote this workflow wrote is fabricated evidence.

## 3. Check after each asset, not at the end

```
/mkt-verify --only claims
/mkt-verify --only language
```

First, dispatch the **`mkt-compliance-reviewer`** — one per sector in scope, including
secondary sectors — with the sector entry and the finished assets, and nothing else. It
must not see the brief or the positioning: a reviewer who knows why a claim was made
finds reasons to let it stand.

Fix every `blocker` before running the scripts. Those are the findings that produce a
regulator's letter, not a style note.

`no_uncited_assertions` fires most often and is usually right. When it flags a sentence
that only reads like a claim, rewrite the sentence rather than attaching a marker to a
claim you cannot source.

The language gate runs the sector's `regulatedClaims`. A `forbidden` hit is not a style
note: it means the field does not permit that claim and the authority is named.

## 4. Set state

`state.status = "production"` once the scoped assets exist.

## Report

Each asset with its claim count, the claims still `unsupported`, every placeholder
awaiting real content, and any sentence the language gate refused with the authority
that refuses it. Then `/mkt-harness`.

Say plainly that the landing page is not here and pica builds it from the brief.
