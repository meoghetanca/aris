---
description: Build the messaging library — USP, value proposition, pitches, per-persona hierarchy — every message traceable to a pain
---

# mkt-messages: the copy library

Step 8. Everything an asset will say, with its evidence attached.

Load `${CLAUDE_PLUGIN_ROOT}/rules/messaging.md` and the core package's
`decisions.md`, `evidence-discipline.md` and `traceability.md`.

## Preconditions

Stop unless `strategy/positioning.json` exists with a `selected` direction, and
`intel/personas.json` and `intel/pains.json` exist.

## 1. The top level

`usp`, `valueProposition`, and `elevatorPitch` at three lengths — roughly 10, 30 and
60 seconds spoken. All derived from the selected direction; if the USP does not read
as a compression of the positioning statement, one of the two is wrong.

## 2. Per-persona hierarchy

For each persona, messages in priority order. Each is an `MSG-` id carrying `message`,
`benefit`, `proof`, `cta` and `evidence` pointing at pain ids.

**Exactly one `priority: 1` per persona.** If two compete, the hierarchy has not been
decided yet — decide it.

Where a benefit has no real proof, set `proof` to `unknown` rather than asserting one.
An unproven benefit stated as proven becomes an unsupported claim in an asset, and the
claim gate catches it there — later, and after it has been written into six places.

## 3. Features to benefits

`featureToBenefit` pairs each feature with what changes for the person. Not
"increases efficiency" — that is a category of benefit, not a benefit.

## 4. The glossary

Build it from the sector entry's `reservedTerms` plus the terms this product needs.
One concept, one word, everywhere after this. Drift between three synonyms for the
same object reads as three different features.

## 5. Tone of voice — decision block

Offer options built from the sector norms and the positioning, and write **the same
sentence in each tone** so the difference is visible rather than described. One
`AskUserQuestion`, recommended first. Record the choice.

## 6. Evaluate, fanned out

Dispatch one `mkt-evaluator` per persona **in a single message so they run
concurrently**, each given only its persona, that persona's pains, and the messages
aimed at it. None sees another's findings.

Fix every `blocker`: a message contradicting its own evidence, an unprovable claim, or
a message aimed at a pain the persona does not carry. Record `minor` findings and move
on — do not gold-plate bland copy.

## 7. Write

`strategy/messages.json`. Then `/mkt-verify --only trace` to confirm every `evidence`
id resolves.

## Report

The USP, the priority-1 message per persona, and the blockers the evaluators found and
what you changed. Then `/mkt-gtm`.
