---
description: Where this aris project stands — what exists, what is validated, what blocks the launch
---

# aris-status

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/next.mjs" --all
node "${CLAUDE_PLUGIN_ROOT}/scripts/aris-status.mjs"
```

**Lead with the next command, not the inventory.** Someone running status wants to know
what to do; the counts are context for that answer, not the answer. `next.mjs` computes
it from what exists and whether each gate passes, so it is never a guess.

A step whose output exists but whose gate fails is reported as failing rather than done,
and it becomes the next command. Resuming past a failing step buries the failure.

Reads state and counts what is on disk. It asserts nothing and fixes nothing.

Then add, in a sentence each, only where it is true:

- the **furthest complete step** and the command that comes next;
- any gate currently refusing, and what would clear it;
- the count of assumptions at `high` or `total` blast radius, because those are the
  ones that make a re-run expensive;
- whether verification is **stale** — an asset newer than the last verify run means
  the green result describes an older package.

If there is no `.aris/` in the tree, say so and offer `/aris "<product>"`.
