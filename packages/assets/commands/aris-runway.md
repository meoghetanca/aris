---
description: The first ninety days after launch - lifecycle emails, a content cadence, and the decisions to make on the way
---

# aris-runway: after the launch

Step 14. Everything before this gets someone to sign up. This is the part where the
business either works or does not, and it is the part most plans leave out.

Load `${CLAUDE_PLUGIN_ROOT}/rules/lifecycle.md`, `${CLAUDE_PLUGIN_ROOT}/rules/copy.md`
and `${CLAUDE_PLUGIN_ROOT}/rules/claims.md`.

## Preconditions

Stop, naming the failure, unless:

- `strategy/messages.json` exists — lifecycle copy draws from the same library
- `strategy/gtm.json` exists — the calendar may only use channels someone agreed to run
- `harness/metrics.json` exists — every trigger threshold is a metric, not a guess

## 1. Lifecycle emails

Seven, each firing on an **event**, never on a date alone. A fourteen-day drip reaches
someone who churned on day two, and reaching them is worse than silence.

Where a threshold is unknown because no cohort has run yet, write
`[N: set after the first cohort]` and leave it. A guessed number here becomes a real
decision about when to interrupt someone.

Every factual sentence carries a claim id, exactly as in the launch assets. A claim
arriving in an onboarding email is more dangerous than one on a landing page, because by
then the person believes you.

## 2. The content calendar

Twelve weeks, one line each: what publishes, on which channel, carrying which message.

**Plan the cadence the smallest likely team can hold.** Two posts a week that appear
beat five planned by someone who does not have to write them. Say what the cadence
assumes about who writes, and put `[UNASSIGNED]` against every slot, because this
workflow does not know the team.

## 3. The runway

`playbook/runway.json`: the ninety days as decision points, not activities. For each:
what is true by then if this is working, and what to do if it is not.

Write it for the reader in week six looking at ambiguous numbers, where the temptation
is to change everything at once. The most valuable entry is usually the one that says
the volume is still too low to conclude anything.

## 4. Check

```
/aris-verify --only claims
```

## Report

The seven triggers with their thresholds, marking which are still unset. The cadence and
what it assumes. The first three decision points. Then say plainly which part of this the
workflow cannot do: nobody has been onboarded yet, so every threshold is a placeholder
until a real cohort moves through.
