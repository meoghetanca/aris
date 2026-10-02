---
description: Check everything aris needs and install whatever is missing
---

# aris-setup: make it work

For someone who has just installed aris and does not want to think about
dependencies. Check each item, and **offer to run the fix** rather than printing
instructions for the user to carry out.

---

## 1. Node

```
node -v
```

Required: the gates and the HTML builder are Node scripts. Claude Code needs Node
anyway, so this is nearly always present. If it is missing, say so plainly and point
at nodejs.org — this is the one thing aris cannot install for them.

**Nothing else is required.** No Python, no package installs, no API keys, no build
step.

## 2. The companion plugins

Both are declared as dependencies, so a normal install usually pulls them. Check, and
install what is absent:

| Plugin | What aris uses it for | Install |
|:--|:--|:--|
| `superpowers` | the decision blocks — presenting generated options through `AskUserQuestion` | `/plugin install superpowers@claude-plugins-official` |
| `pica` | building the landing page from `assets/landing-brief.md` | `/plugin marketplace add vqdungwork/pica` then `/plugin install pica@pica` |

**aris runs without either.** Without superpowers it takes the recommended option at
every decision point and records each as an assumption. Without pica it writes the
landing brief and stops there — the brief is still a complete copy deck. Say which
mode they are in rather than failing.

## 3. The sector knowledge base

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/sector-check.mjs" --list
```

Show the covered fields. If the product they mentioned is not among them, say so now
rather than at step 2 of a run, and offer `/aris-sector <name>`.

## 4. Confirm the gates run

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/aris-status.mjs"
```

Outside a project this prints the "not an aris project" line, which is the correct
answer and proves the scripts execute.

## 5. Report

One short paragraph: what is present, what is missing and what that costs them, and
the single next command — `/aris "<your product>"`.

Do not print a wall of checkmarks. Someone running setup wants to know whether they
can start.
