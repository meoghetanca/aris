---
description: Run the whole chain — unknown market to a launch-ready package — stopping only to offer choices it generated
argument-hint: "[the brief, or a path to it] [--auto] [--to strategy|assets|package] [--resume]"
---

# arisflow: a product in, a launch package out

Runs the chain and stops **only** where a person has a genuine choice to make, with
the options already written out in front of them.

**It does not stop to ask questions between those points.** That is not a
convenience, it is the design. Anything the sources cannot settle becomes a
labelled assumption and the chain continues, because reacting to a built thing is
far cheaper than specifying one from nothing. Ask someone what their positioning
should be and you get hesitation; show them three written directions and you get
the correction in three seconds.

**The package is the question. It is only shaped like an answer.** What makes that
safe is the assumptions register and the traceability spine, and nothing else.

Load `${CLAUDE_PLUGIN_ROOT}/rules/decisions.md`,
`${CLAUDE_PLUGIN_ROOT}/rules/evidence-discipline.md`,
`${CLAUDE_PLUGIN_ROOT}/rules/assumptions.md`, and
`${CLAUDE_PLUGIN_ROOT}/rules/traceability.md` before the first step.

---

## Where it finishes

| `--to` | You get | Stops after |
|:--|:--|:--|
| `strategy` | the evidence base, positioning, messaging, go-to-market | `/aris-gtm` |
| `assets` | that, plus every launch material with cited claims | `/aris-verify` |
| `package` *(default)* | that, plus the harness, the playbook and `aris-launch.html` | `/aris-package` |

## The chain

| Wave | Command | Decision block |
|:--:|:--|:--|
| 1 | `/aris` | audience, market, language, model, out-of-scope |
| 2 | `/aris-category` | — |
| 3 | `/aris-voc` | — |
| 3 | `/aris-size` | — |
| 3 | `/aris-demand` | — |
| 3* | `/aris-evidence` | **conditional.** Only when sources were blocked. See "Where it stops" |
| 4 | `/aris-personas` | which segment to lead with |
| 5 | `/aris-position` | which of three directions |
| 6 | `/aris-messages` | tone of voice |
| 7 | `/aris-gtm` | channel mix, price point |
| 8 | `/aris-assets` | asset scope |
| 9 | `/aris-verify` | — |
| 10 | `/aris-harness` | — |
| 11 | `/aris-playbook` | — |
| 12 | `/aris-runway` | — |
| 13 | `/aris-package` | — |

**Same wave means concurrent, not merely adjacent.** `/aris-voc`, `/aris-size` and
`/aris-demand` each need only `intel/category.json`, and none of them feeds another, so
dispatch all three at once. Running them one after another is the single most common
reason a run feels slow, and nothing in the dependency graph asks for it.

Later steps admit concurrency too, `/aris-harness` needs only `strategy/gtm.json` and so
can run beside `/aris-assets`. Rather than hard-code that here, ask the tool:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/next.mjs" --all
```

It prints `Can run now:` with every step whose inputs exist. That line is the authority
on ordering; this table is a map.

Run each as its own command, in order, honouring its preconditions. Do not inline a
step's work here: the commands carry the rules, and a step run from memory of them
is a step run without them.

## Where it stops

Three kinds of stop, and only the first is a decision:

**A decision block.** Six of them: intake, which segment to lead with, the positioning
direction, tone of voice, channel mix and price, asset scope. Each presents options
generated from the evidence, recommended first. Silence becomes a labelled assumption at
the recommended option's confidence and the chain continues.

**The evidence stop.** `/aris-voc` can only mine what a fetch can read, and this field's
highest-coverage review platforms usually cannot be read at all: G2, Capterra and
TrustRadius return 403, and Reddit refuses the crawler outright. `sector-check --show`
marks every such platform, and `/aris-evidence` turns each one into "open this and paste
it here", which a person may do and a fetcher may not. **This stop is not a decision and
not a failure. It is data entry, and the chain cannot route around it.** Budget for it.

**A gate refusal.** Then stop and report. Do not skip the step, and never synthesise the
artifact the gate asked for. A chain that produces a complete-looking package from a
failed gate is worse than one that stops, because nobody can see where it went wrong.

### What counts as a refusal, for pains specifically

This used to be ambiguous and the ambiguity cost a whole run, so it is now spelt out:

| Evidence | What happens |
|:--|:--|
| Some pains validated, others thin | **Continue.** The thin ones keep `status: "insufficient"`, are excluded from personas, and an assumption records the thinness. |
| **Zero validated** pains | **Stop.** Not because the threshold is sacred, but because `/aris-personas` would have nothing to derive from, so every attribute would be invented and `persona-check` would strip them all. Run `/aris-evidence`, or accept that the honest next step is interviews. |
| A gate error: counts disagree with stored quotes, a quote has no URL, one post inflating two pains | **Stop and fix the clustering**, not the numbers. |

The same three cases apply wherever a threshold exists. Thin is not empty, and empty is
not a smaller version of thin, it is a different answer.

## `--auto`

Takes the recommended option at every decision point, recording each with
`mode: "auto"` and an assumption at that option's confidence. Legitimate, and
honest about what happened. Use it for a first pass on an unfamiliar market, then
re-run the decisions that matter.

## `--resume`

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/next.mjs" --all
```

It prints the whole chain with what is done, what is waiting and what is **failing** —
a step whose output exists but whose gate does not pass. Resume at what it names.

A failing step outranks a missing one. Its output exists, so the chain would happily
carry on past it, and everything downstream would inherit something that did not pass.
Re-run it before anything else.

Say which step you resumed at and why, then continue the chain from there.

## At the end

Present, in this order:

1. **The delta** — what changed since the last run, if there was one.
2. **What was chosen and why** — each decision with its rejected options.
3. **The low-confidence assumptions**, most consequential first.
4. **What was not available and what its absence cost** — from `cutSteps.json`.

Then the path to `aris-launch.html`, and the single remaining human act: reviewing
it and setting `launchAuthorization` by hand. Do not set it yourself; the publish
gate exists because publishing is public and irreversible.
