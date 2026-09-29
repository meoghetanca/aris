---
description: Start an mkt project — resolve the sector, scaffold the artifact tree, and settle audience, geography, language and business model in one decision block
argument-hint: "<what the product is, or a path to a brief>"
---

# mkt: intake

Step 1. Everything else reads what this writes.

Load `${CLAUDE_PLUGIN_ROOT}/rules/state.md`,
`${CLAUDE_PLUGIN_ROOT}/rules/sector-discipline.md`,
`${CLAUDE_PLUGIN_ROOT}/rules/decisions.md`, and
`${CLAUDE_PLUGIN_ROOT}/rules/evidence-discipline.md`.

`$ARGUMENTS` is the product description, or a path to a brief. If it is empty, ask
for it in one line and stop — there is nothing to infer from.

---

## 1. Read the brief, do not embellish it

If `$ARGUMENTS` is a path, read the file. Extract only what is stated: what the
product does, who it appears to serve, where, in what language, and how it charges.
Anything the brief does not say is **unknown**, not inferred. You will offer the
unknowns as choices in step 3; you will not fill them in.

Write down, separately, the things the brief implies but does not state. Those
become assumptions, each one labelled.

## 2. Resolve the sector — before anything else

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/sector-check.mjs --list
node ${CLAUDE_PLUGIN_ROOT}/scripts/sector-check.mjs --show "<your best guess>"
```

**Exit 3 means the field is not covered. Stop and say so.** Do not proceed with a
neighbouring sector because it looks close: the entry decides where the miner
looks, which claims are regulated, and what the field charges. A wrong entry sends
the whole run to the wrong evidence.

Offer two ways forward: `/mkt-sector <name>` to bootstrap a provisional entry, or a
different sector from the list if the guess was simply off.

A product can sit in two fields. Resolve the primary, record the rest in
`secondarySectors`, and remember that constraint fields union — they never cancel.

## 3. The decision block

**One `AskUserQuestion` call, up to four questions.** Generated from the brief and
the sector entry, never generic. Recommended option first, labelled.

| Question | Options come from |
|:--|:--|
| Who is the primary audience? | the sector's `buyingCommittee`, narrowed by the brief |
| Which market and language? | the brief; offer the sector's usual geography as the alternative |
| Business model | B2B / B2C / B2B2C, with the sector's usual first |
| What is explicitly out of scope? | the brief's silences — the things a reader would assume are included |

Each option states what it commits to **and what it costs**. "B2B" is not an
option; "B2B: mine G2 and LinkedIn, buying committee of four, 60–120 day cycle" is.

If superpowers is absent (the SessionStart hook will have said so), say once that
you are running in `auto` mode, take the recommended option for each, and record
every one as a decision with `mode: "auto"` plus an assumption.

## 4. Scaffold

Create the tree — directories only, no placeholder JSON. An empty file that parses
is indistinguishable from a real one three commands later.

```
.mkt/{intel,strategy,assets,verification,harness,playbook,evidence/analytics,evidence/supplied,package}
```

Write `state.json` to the shape in `rules/state.md`, with `status: "intake"`,
`decisionMode`, the resolved sector and `sectorStatus`, and the decisions recorded
with their option sets.

Write `assumptions.json` with everything the brief left open, each carrying
confidence, blast radius, reason and `producedArtifacts: []`.

Write `cutSteps.json` with the seven standing cuts — interviews, willingness-to-pay
test, pricing and budget commitment, real testimonials, outreach channels, pressing
publish, live measurement — each with its consequence and risk. These are
properties of the workflow, so they are known at intake, not discovered at the end.

## 5. Report

Print `node ${CLAUDE_PLUGIN_ROOT}/scripts/mkt-status.mjs` and say what is next:
`/mktflow` for the whole chain, or `/mkt-category` to take it a step at a time.

Say plainly what this run will and will not be able to know. The user should not
learn at the end that the pains came from public reviews rather than from their
customers.
