---
description: Where this aris project stands — what exists, what is validated, what blocks the launch
---

# aris-status

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/aris-status.mjs
```

Reads state and counts what is on disk. It asserts nothing and fixes nothing.

Then add, in a sentence each, only where it is true:

- the **furthest complete step** and the command that comes next;
- any gate currently refusing, and what would clear it;
- the count of assumptions at `high` or `total` blast radius, because those are the
  ones that make a re-run expensive;
- whether verification is **stale** — an asset newer than the last verify run means
  the green result describes an older package.

If there is no `.aris/` in the tree, say so and offer `/aris "<product>"`.
