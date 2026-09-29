---
description: Derive personas from coded pains, with every attribute traceable to a quote, and choose which segment to lead with
---

# mkt-personas: derived, not invented

Step 4. A persona here is a **derived object**. It has no attribute that a quote
does not support.

Load `${CLAUDE_PLUGIN_ROOT}/rules/coding.md`, the core package's
`evidence-discipline.md`, `traceability.md` and `decisions.md`.

## Preconditions

Stop unless `intel/pains.json` exists with at least one `validated` pain. **Do not
create pains here.** If they are missing, the command that produces them is
`/mkt-voc`.

## 1. Group pains by who is speaking

The `context` on each quote says who appears to be speaking. Cluster by speaker, not
by pain: one persona usually carries several pains, and the same pain often hits two
personas differently.

Cross-check against the sector entry's `buyingCommittee`. A field with a compliance
veto has a persona who never uses the product and can still kill the purchase — if
the evidence shows them, they are a persona.

## 2. Write each persona from evidence only

```json
{ "attribute": "Needs to import existing data without help",
  "evidence": ["QUOTE-012", "QUOTE-031"] }
```

`jobToBeDone`, `motivations`, `objections`, `buyingTriggers`, `channels` — each
traceable. `channels` comes from where the quotes were actually found, which is what
makes the channel argument honest in `/mkt-gtm`.

**No demographics unless the evidence states them.** Age, income, seniority and
"tech-savviness" almost never appear in publicly mined text. A persona carrying them
is a persona that was imagined, and `persona-check.mjs` flags exactly this.

Insufficient pains contribute nothing. Do not borrow from them to round a persona out.

## 3. Check

```
/mkt-verify --only personas
```

## 4. The decision block

Present the personas **ranked by pain frequency** and ask which to lead with — one
`AskUserQuestion`, recommended first. Each option states what leading with that
persona commits to: which pains become primary, which channels follow, and what it
costs to deprioritise the others.

This is a real choice: the evidence can rank by volume, but which segment the
business can actually serve is not in the evidence. An unanswered block takes the
recommendation and records an assumption at `total` blast radius — positioning
inherits it.

## Report

Each persona with its pain ids and attribute count, the chosen lead, and any persona
that the evidence suggests exists but could not be evidenced well enough to write.
