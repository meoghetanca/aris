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

| | Command | Decision block |
|:--:|:--|:--|
| 1 | `/aris` | audience, market, language, model, out-of-scope |
| 2 | `/aris-category` | — |
| 3 | `/aris-voc` | — |
| 4 | `/aris-personas` | which segment to lead with |
| 5 | `/aris-size` | — |
| 6 | `/aris-demand` | — |
| 7 | `/aris-position` | which of three directions |
| 8 | `/aris-messages` | tone of voice |
| 9 | `/aris-gtm` | channel mix, price point |
| 10 | `/aris-assets` | asset scope |
| 11 | `/aris-verify` | — |
| 12 | `/aris-harness` | — |
| 13 | `/aris-playbook` | — |
| 14 | `/aris-runway` | — |
| 15 | `/aris-package` | — |

Run each as its own command, in order, honouring its preconditions. Do not inline a
step's work here: the commands carry the rules, and a step run from memory of them
is a step run without them.

## Stopping is not optional

If a step's gate refuses — a sector with no entry, pains below threshold, an
unresolvable formula — **stop the chain there and report**. Do not skip to the next
step, and never synthesise the missing artifact to keep moving. A chain that
produces a complete-looking package from a failed gate is worse than one that stops,
because nobody can see where it went wrong.

The one exception is evidence that is merely thin: a pain at 5 quotes stays
`insufficient`, is excluded from personas, and the run continues with fewer pains
and an assumption recording the thinness.

## `--auto`

Takes the recommended option at every decision point, recording each with
`mode: "auto"` and an assumption at that option's confidence. Legitimate, and
honest about what happened. Use it for a first pass on an unfamiliar market, then
re-run the decisions that matter.

## `--resume`

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/next.mjs --all
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
