---
name: marketing-flow
description: Use whenever the work touches taking a product to market - market or competitor research, customer pains, personas, TAM/SAM/SOM or market sizing, product-market fit, positioning, USP or differentiation, messaging, value proposition, elevator pitch, tone of voice, go-to-market or GTM, pricing strategy, marketing channels, launch planning, a landing page brief, waitlist, email sequence, social posts, ads, a launch announcement, PR, a sales deck, FAQ, campaign QA, marketing KPIs, CAC, conversion, activation, retention, post-launch measurement, or growth and scaling. Also use when someone asks "how do we sell this", "who is this for", "what do we say", "where do we launch", "is this ready to launch", or "it launched, now what". Routes to the right step of the mkt workflow instead of answering from general marketing knowledge.
---

# Routing into the mkt workflow

Someone is doing marketing work. **Do not answer from general marketing knowledge**
and do not start writing copy: that produces confident, unsourced output, which is
the exact failure the mkt workflow exists to prevent.

Work out where they are, then run the command that owns that step.

## 1. Is there a project?

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/mkt-status.mjs
```

**No `.mkt/` in the tree** → this is a new product. Run `/mkt "<what they described>"`.
Say in one line what the workflow will do and what it deliberately will not
(no interviews, no publishing, no budget), then continue.

**A project exists** → read the status. Never restart a step whose output already
exists; resume from the furthest complete one.

## 2. Route on what they actually asked

| They said, roughly | Command |
|:--|:--|
| "who else is doing this", competitors, the category, pricing landscape | `/mkt-category` |
| "what do customers complain about", pains, reviews, voice of customer | `/mkt-voc` |
| "who is this for", personas, segments, the buyer | `/mkt-personas` |
| "how big is this", TAM, SAM, SOM, market size, opportunity | `/mkt-size` |
| "is there demand", validation, product-market fit, would anyone pay | `/mkt-demand` |
| "how do we position this", USP, differentiation, what makes us different | `/mkt-position` |
| "what do we say", messaging, value prop, pitch, tone of voice, copy | `/mkt-messages` |
| "where do we launch", channels, GTM, pricing, budget, KPIs, timeline | `/mkt-gtm` |
| "write the emails / posts / ads / FAQ / deck / launch post" | `/mkt-assets` |
| "is it ready", check it, QA, did we miss anything | `/mkt-verify` |
| "what do we measure", metrics, dashboard, tracking | `/mkt-harness` |
| "what do we do if X happens", optimisation rules | `/mkt-playbook` |
| "put it all together", the deck, the report, show me everything | `/mkt-package` |
| "do the whole thing", from scratch, end to end | `/mktflow` |
| "it launched, now what", results, the numbers came in | `/mkt-harness` then `analyze.mjs` |

## 3. Respect the order

Each command states its preconditions and **stops** when they are not met, naming
the command that produces what it needs. When that happens, say so and offer to run
the missing step — do not fill the gap yourself.

Positioning cannot be written before pains exist. Pains cannot be written without
quotes. That ordering is the product, not bureaucracy: it is what makes the output
traceable instead of plausible.

## 4. When they ask a question rather than for work

Someone asking "what is a good CAC for B2B SaaS" wants an answer, not a workflow.
Answer it — but if a number would be involved, say where it would have to come from,
and do not state a benchmark as fact without a source. If they are clearly working on
a product, offer the step that would establish it for *their* market.

## 5. Not every marketing mention is this workflow

Editing existing copy, naming a button, writing one tweet, or answering a general
question does not need the chain. Use judgement: the workflow is for taking a product
to market, not for every sentence that mentions marketing.
