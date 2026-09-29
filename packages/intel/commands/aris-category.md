---
description: Map the category - who the players are, what they charge, where the gaps are
argument-hint: "[--deep <competitor>] [--players a,b,c]"
---

# aris-category: the market map

Step 2. **Cheap by default.** One scout, one pass, a hard page budget.

Load `${CLAUDE_PLUGIN_ROOT}/rules/mining.md` and the core package's
`evidence-discipline.md` and `sector-discipline.md`.

## Preconditions

Stop, naming the failure, unless `.aris/state.json` exists and `state.market.sector`
is set.

---

## 1. The default: one scout

Dispatch a single **`aris-category-scout`**. It discovers the players in the market's
own language, then reads two pages each — homepage and pricing.

That is the whole default pass. It costs one agent and a few minutes.

**Do not fan out here.** A first run of this workflow dispatched one deep analyst per
competitor: six agents, four to eleven minutes each, roughly 450,000 tokens, for step 2
of fifteen. Every profile was excellent and the phase was still wrong, because nobody
can wait forty minutes to find out who the competitors are. Depth is worth buying for
one or two names — after you know which ones.

If the human already knows the players, `--players a,b,c` skips discovery.

## 2. Read the scout's "who matters most"

It returns at most two names with reasons. That is the decision point, and it is cheap
to act on because it is two names rather than a matrix.

## 3. Only then, `--deep`

`--deep <competitor>` dispatches one **`aris-competitor-analyst`** on that one company:
changelog, job posts, docs, localisation, the things that take time. Worth it for the
direct competitor and the local incumbent. Rarely worth it for the rest.

Run at most two. If a third seems necessary, say why in the report rather than spending
on it silently.

## 4. Assemble

`intel/category.json` and `intel/sources.json`. Every factual field takes the
`{ value, sourceIds, status }` shape.

The feature matrix is built from whatever depth you actually have. A matrix that is
mostly `unknown` after a scout-only pass is **correct** — `unknown` means nobody looked
yet, which is true, and it tells the positioning step exactly where the risk is. Do not
fill it in to make it look finished.

Set `state.status = "researching"`.

## Report

The player table, the two names that matter, the price ladder, and the gaps — each with
the evidence behind it. Then say plainly what depth this pass bought: a scout-only map
is a map of marketing pages, not of products.
