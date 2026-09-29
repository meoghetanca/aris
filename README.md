# mkt

**Take a product from "we don't know this market" to a launch-ready package — and be able to prove where every claim came from.**

A workflow for [Claude Code](https://claude.com/claude-code). You describe your
product; it researches the market from the public record, works out the positioning,
writes every launch asset, checks its own work, and hands you one file you open in a
browser where **clicking any sentence shows you the source it came from**.

---

## Start here

**1. Install Claude Code**, if you haven't: [claude.com/claude-code](https://claude.com/claude-code)

**2. Add mkt** — type this inside Claude Code:

```
/plugin marketplace add <this repo>
/plugin install mkt-assets@mkt
```

That pulls everything else it needs automatically.

**3. Check it's ready:**

```
/mkt-setup
```

**4. Go:**

```
/mktflow "a shift-scheduling app for Vietnamese restaurants"
```

Or just *talk about marketing* — "who else is doing this?", "what should we say?",
"where should we launch?" — and it works out which step you need.

**There is nothing else to set up.** No accounts, no API keys, no config file, no
install commands in a terminal. If you can run Claude Code, you can run this.

---

## What you get

It stops **four times** to show you options it has already written out, you pick one,
and it carries on. At the end:

```
.mkt/package/mkt-launch.html
```

One file. Fourteen sections. Open it in any browser, works offline, share it by
sending the file.

| | |
|:--|:--|
| **Market overview** | who else is doing this, what they charge, what they claim |
| **Customer & pain** | ranked by how many real people said it — click to read their actual words |
| **Personas** | built from quotes, not imagination |
| **Market size** | with the arithmetic shown, so anyone can check it |
| **Demand signals** | and a blunt list of what they do *not* prove |
| **Positioning** | all three options, the chosen one marked, the rejected two with reasons |
| **Messaging** | every message traced back to the pain it answers |
| **GTM** | channels argued from where the evidence actually came from |
| **Launch assets** | emails, social posts, ads, FAQ, sales deck, PR, launch post |
| **Verification** | what passed, what blocks the launch |
| **Measurement** | the dashboard, deliberately empty until real data arrives |
| **Growth playbook** | if CAC goes above X for 14 days, do Y |
| **Evidence** | every source, and what used it |

---

## Why not just ask an AI to write marketing copy?

Because you get something that reads beautifully and contains numbers nobody can
source — and no way to tell which ones.

mkt makes that **mechanically impossible**:

- Every factual sentence carries an id. If that id has no source, **the tool refuses
  to publish**. Not a warning — a refusal.
- A pain is only "validated" at **8+ quotes from 3+ separate sources**. Below that it
  stays marked insufficient and nothing is built on it.
- Testimonials are written as `[TESTIMONIAL — SUPPLY REAL]`. If a made-up quote
  appears instead, **the build stops**.
- Market sizes are recomputed from their factors by a script. A number that doesn't
  add up fails.
- `unknown` is a valid, shippable answer. The failure this exists to prevent is
  `unknown` quietly becoming `verified`.

## It knows your field

Marketing an HR tool is not like marketing a music app. mkt ships knowledge for nine
fields — **HR software, consumer media, fintech & wealth, sales tech, edtech, DTC
ecommerce, developer tools, healthtech, professional services** — covering where that
field's customers actually talk, who can veto a purchase, which channels it has
repeatedly failed with, and **which claims it is not legally allowed to make**.

A fintech product can never promise a return. A health product can never say it treats
anything. mkt enforces that automatically.

If your field isn't covered it **stops and says so** rather than guessing, and
`/mkt-sector <name>` researches a new one.

---

## What it will not do

Honest limits, because they matter more than the feature list:

- **It never talks to a customer.** It reads what people wrote publicly. That finds
  everything wrong with your competitors — but not the thing nobody has put into words
  yet, which is often where the real opportunity is. Every package prints this warning
  on its front page.
- **It does not set your price or your budget.** It recommends; you decide.
- **It does not press publish.** You review the file, then grant permission by hand.
- **It does not build the landing page.** It writes the copy brief and hands it to
  [pica](https://github.com/vqdungwork/pica), which builds the page and the Figma file.

---

## Commands

| | |
|:--|:--|
| `/mktflow "<product>"` | the whole chain |
| `/mktflow --auto` | unattended: takes the recommended option everywhere and records it |
| `/mkt-status` | where this project stands |
| `/mkt-verify` | run every check |
| `/mkt-setup` | check and fix what's missing |

The fifteen individual steps — `/mkt-category`, `/mkt-voc`, `/mkt-personas`,
`/mkt-size`, `/mkt-demand`, `/mkt-position`, `/mkt-messages`, `/mkt-gtm`,
`/mkt-assets`, `/mkt-harness`, `/mkt-playbook`, `/mkt-package` — can each be run on
their own. Every one states what it needs and stops if that's missing, naming the
command that produces it.

## What it costs to run

The expensive part is **reading the internet, once**. That happens in `/mkt-voc`,
which fans out one researcher per platform so the raw pages never enter your main
conversation. Everything after that is written to disk, so re-running a step or
changing a decision is cheap.

Just having mkt installed costs roughly **1,300 tokens** of context — it loads the
step descriptions, not the step instructions. A step's full instructions load only
when that step runs.

## For developers

```
.mkt/
├── intel/        category, sources, pains, personas, size, demand
├── strategy/     positioning, messaging, go-to-market
├── assets/       every launch material + the claim registry
├── verification/ what passed, what blocks
├── harness/      metrics contract + analyzer
├── playbook/     conditional growth rules
└── package/      manifest + mkt-launch.html
```

**JSON is the source of truth. Markdown is the human deliverable. Scripts are the
validation.** The HTML is a presentation layer over the JSON, never a replacement.

The spine every check enforces:

```
SOURCE -> QUOTE -> PAIN -> PERSONA -> POSITIONING -> MESSAGE -> ASSET -> CLAIM -> VERIFICATION
```

Four packages: `mkt-core` (state, sectors, decisions, gates, the publish hook),
`mkt-intel` (research), `mkt-strategy` (positioning, messaging, GTM), `mkt-assets`
(materials, harness, playbook, the HTML build).

### Test

```
./test/run.sh
```

29 assertions, run in a temp directory. Both directions: a clean package must pass,
and **each gate must refuse when its defect is planted** — a pain below threshold, an
unevidenced persona attribute, a size that doesn't recompute, an uncited claim, an
unsupported superlative, a fabricated testimonial, an invented pre-launch baseline, a
dangling id. Plus the publish hook's full matrix.

A gate that has never failed in testing is a gate nobody has evidence about.

### Requires

Node (Claude Code needs it anyway). Nothing else — no Python, no package install, no
build step. `superpowers` and `pica` install automatically and mkt degrades gracefully
without either.

---

## Status

**v0.1.0.** The scripts, hooks, sector knowledge, HTML generator and test suite are
built and passing. The commands are written but have **not yet been run against a real
market** — the first live run is what will calibrate the quote thresholds and show
whether each sector's research targets are the right ones.

Built on the shape of [pica](https://github.com/vqdungwork/pica) by Dung Vuong: state
on disk, rules loaded by name, and gates enforced by script rather than by good
intentions.

MIT.
