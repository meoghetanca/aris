---
description: Research a field the knowledge base does not cover and write a provisional sector entry
argument-hint: "<sector name> [--refresh]"
---

# mkt-sector: bootstrap a field

The escape hatch from a closed gate. The knowledge base fails closed on an
uncovered field because without an entry the miner does not know where this field's
public voice lives, which of its claims are regulated, or what it charges — and
mining blind is where fabrication starts.

Load `${CLAUDE_PLUGIN_ROOT}/rules/sector-discipline.md` and
`${CLAUDE_PLUGIN_ROOT}/rules/evidence-discipline.md`.

---

## 1. Check it is really absent

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/sector-check.mjs --list
```

Alias matching is loose, so the field may already be covered under another name. If
it is, say so and stop — a duplicate entry will drift from the original.

## 2. Research the structure, not the numbers

Establish, each with a source:

- **`reviewPlatforms`** — which review sites actually carry this field, and how well.
  Verify by opening one and confirming there are reviews of products like this.
- **`communities`** — subreddits, forums, Discords, Facebook groups, comment
  sections. For a Vietnamese market this is usually Facebook groups, not Reddit.
- **`buyingCommittee`** — who champions, who pays, who can veto. A field with a
  security or compliance veto behaves nothing like one without.
- **`channelNorms`** — and `ineffective` matters as much as `effective`. Record the
  reason; "TikTok does not work here" without a reason will be overridden later.
- **`regulatedClaims`** — the highest-stakes field. What may this field not claim,
  and under whose authority? Health, financial, employment, environmental and
  children's-data claims are all constrained. Name the authority, not just the rule.
- **`forbidden`** — defects the field recognises that a generic check does not.
- **`reservedTerms`** — words the field has already spent on a meaning.
- **`requiredDisclosures`**, **`seasonality`**, **`salesCycleDays`**.

**Leave `priceBands` and `cacBenchmarks` null unless you can cite them.** A seeded
number becomes a curated fact the next time someone reads the file. The seeded
entries deliberately carry nulls there for exactly this reason.

## 3. Write it

To `.mkt/sectors/<slug>.json` in the project — project entries override built-ins,
so a field can be added without touching the plugin. Use the shape in
`sector-discipline.md`, with `status: "provisional"`.

Then set `state.market.sectorStatus = "provisional"`. That flag propagates into the
manifest and prints prominently in `mkt-launch.html`. **A provisional sector is a
disclosed weakness, never a silent one.**

## 4. Verify it resolves

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/sector-check.mjs --show "<slug>"
```

## `--refresh`

Re-research an existing entry: same steps, but keep the id and aliases, and record
what changed. Use it when `research_is_current` warns, or when a pricing
recommendation looks wrong against the live ladder.

## Promoting to covered

Only a human does that, by hand, after using the entry on a real run and correcting
what it got wrong. Nothing in this workflow promotes its own guesses.
