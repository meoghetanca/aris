---
description: Where this mkt project stands — what exists, what is validated, what blocks the launch
---

# mkt-status

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/mkt-status.mjs
```

Reads state and counts what is on disk. It asserts nothing and fixes nothing.

Then add, in a sentence each, only where it is true:

- the **furthest complete step** and the command that comes next;
- any gate currently refusing, and what would clear it;
- the count of assumptions at `high` or `total` blast radius, because those are the
  ones that make a re-run expensive;
- whether verification is **stale** — an asset newer than the last verify run means
  the green result describes an older package.

If there is no `.mkt/` in the tree, say so and offer `/mkt "<product>"`.
