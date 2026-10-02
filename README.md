<p align="center">
  <img src="assets/banner.png" width="920"
       alt="aris: from an unknown market to a launch you can defend. Every claim traces back to a source you can open.">
</p>

<p align="center">
  <b>Describe your product. Get a launch package your team can act on and a reviewer can check.</b><br>
  A marketing research team for Claude Code, with the evidence built in.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-4c566b?style=flat-square&labelColor=161b25" alt="version 0.1.0">
  <img src="https://img.shields.io/badge/sectors-62-4c566b?style=flat-square&labelColor=161b25" alt="62 sectors">
  <img src="https://img.shields.io/badge/specialists-11-4c566b?style=flat-square&labelColor=161b25" alt="specialists 11">
  <img src="https://img.shields.io/badge/checks-46%20%7C%2036%20fail--closed-4c566b?style=flat-square&labelColor=161b25" alt="46 checks, 36 of them fail-closed">
  <img src="https://img.shields.io/badge/tests-88-4c566b?style=flat-square&labelColor=161b25" alt="88 tests">
  <img src="https://img.shields.io/badge/licence-MIT-4c566b?style=flat-square&labelColor=161b25" alt="MIT licence">
</p>

---

You describe your product. aris researches the market from the public record, works out the
positioning, writes every launch asset, checks its own work, and hands you one file you open in
a browser where **clicking any sentence shows you the source it came from**.

```
research ─▶ position ─▶ message ─▶ plan ─▶ package ─▶ launch ─▶ keep them
            you pick               you pick            you review
```

It stops **six times**, always with options it has already written out rather than a blank
question, and seven decisions get made because `/aris-gtm` settles both the channel mix and the
price. Anything the sources cannot settle becomes a labelled assumption and the chain keeps going.

## Install

Inside Claude Code:

```
/plugin marketplace add meoghetanca/aris
/plugin install aris-assets@aris
```

That pulls the other three aris packages and `superpowers`. Optional, and in a different
marketplace so a dependency cannot add it for you, if you want the landing page built rather
than the copy deck handed over:

```
/plugin marketplace add vqdungwork/pica
/plugin install pica@pica
```

Then check and go:

```
/aris-setup
/arisflow "a shift-scheduling app for Vietnamese restaurants"
```

Or just talk about marketing ("who else is doing this?", "where should we launch?") and it works
out which step you need. **Requires Node 20 or later on PATH.** Nothing else: no accounts, no API
keys, no config file, no build step.

## What you get

`.aris/package/aris-launch.html`. One file, twelve sections behind three tabs. Opens in any
browser, works offline, shared by sending it.

| | |
|:--|:--|
| **what we know** | the field and what it charges, read off competitors' own pages; what buyers said, ranked by how many said it, each pain opening to their words; the size arithmetic shown as a range; every assumption and every cut step; every source and what used it |
| **what we do** | the chosen position with the two rejected and their reasons; messaging in priority order carrying its evidence; channels and cost; emails, social posts, ads, FAQ, sales deck, PR, launch post; what to do first and what verification still blocks |
| **what happens after** | lifecycle emails that fire on what someone did, a twelve-week cadence, the first ninety days as decision points, growth rules (if CAC stays above X for 14 days, do Y), and a dashboard left empty until real data arrives |

A second build, `aris-launch.artifact.html`, is the same page as a publishable fragment. Both come
from one template so they cannot drift.

## Why the numbers hold

- Every factual sentence carries a claim id. If that id has no source, **the tool refuses to
  publish**. Not a warning, a refusal.
- A pain counts as validated only at **8+ quotes from 3+ separate sources**. Below that it stays
  marked insufficient and nothing is built on it.
- Testimonials are written as `[TESTIMONIAL - SUPPLY REAL]`. A made-up quote stops the build.
- Market sizes are recomputed from their factors by script. Arithmetic that does not close fails.
- `unknown` is a valid, shippable answer. The failure this exists to prevent is `unknown` quietly
  becoming `verified`.

The spine every check enforces:

```
SOURCE -> QUOTE -> PAIN -> PERSONA -> POSITIONING -> MESSAGE -> ASSET -> CLAIM -> VERIFICATION
```

## It knows your field

62 sector profiles, 9 families and 53 specific fields, covering where that field's customers
actually talk, who can veto a purchase, which channels it has repeatedly failed with, and which
claims it is **not legally allowed to make**: a fintech product can never promise a return, a
health product can never say it treats anything, a food brand can never make a health claim. aris
enforces that automatically and names the authority behind each rule.

Fields inherit, so pet insurance is not listed but resolves to `insurance` inside
`regulated-finance` and keeps every constraint. Coverage is any product in one of the nine
families, not a list of 53. Only a field no family can honestly claim fails closed, and
`/aris-sector <name>` then researches it properly.

## The specialists

Eleven roles dispatched in parallel, each seeing only its own slice: one miner per platform, one
analyst per competitor, per sizing factor, per demand signal and per channel, one evaluator per
persona, one copywriter per asset, a claim verifier that **opens each cited page and answers
whether it supports that exact sentence**, and a compliance reviewer that never sees who wrote
the copy. A cheap scout runs over the whole category by default; the deep analysts are opt-in.

Ten of the eleven hold no Write, Edit or Bash, deliberately. A reviewer who rewrites has already
decided how to resolve the finding, and that decision is not theirs: "clinically proven" can be
fixed by citing a trial or by deleting the claim, and those are completely different products.

## Commands

| | |
|:--|:--|
| `/arisflow "<product>"` | the whole chain |
| `/arisflow --auto` | unattended: takes the recommended option everywhere and records it |
| `/aris-status` | where this project stands |
| `/aris-verify` | run every check |
| `/aris-setup` | check and fix what is missing |
| `/aris-evidence` | what a run could not read, and how to hand it over yourself |
| `/aris-runway` | the ninety days after launch |

The fifteen steps run on their own too: `/aris`, `/aris-category`, `/aris-voc`, `/aris-personas`,
`/aris-size`, `/aris-demand`, `/aris-position`, `/aris-messages`, `/aris-gtm`, `/aris-assets`,
`/aris-verify`, `/aris-harness`, `/aris-playbook`, `/aris-runway`, `/aris-package`. Each states
what it needs and stops if that is missing, naming the command that produces it.

Having aris installed costs roughly **2,000 tokens** of context: it loads step and specialist
descriptions, not their instructions. A step's instructions load when it runs, and the 62 sector
files are read by script and never enter context at all. The expensive part is reading the
internet once, in `/aris-voc`, which fans out per platform so raw pages stay out of your
conversation.

## What it will not do

- **It never talks to a customer.** It reads what people wrote publicly, which finds everything
  wrong with your competitors but not the thing nobody has put into words yet. Every package
  prints this warning on its front page.
- **It does not set your price or your budget.** It recommends, you decide.
- **It does not press publish.** A hook refuses an Artifact publish, an outbound email or a
  publishing shell command (resolving one level of indirection, so `./deploy.sh` and `npm run
  deploy` are seen) until verification passes and `launchAuthorization` is set by hand, which
  nothing in the chain can do for you. It is not a sandbox: a tool it is not registered for
  is not gated.
- **It does not build the landing page.** It writes the copy deck to `assets/landing-brief.md` and
  hands it to [pica](https://github.com/vqdungwork/pica), which builds the page and the Figma file.

## For developers

```
.aris/
├── state.json     the run, its decisions and its authorisation
├── assumptions.json, cutSteps.json
├── intel/         category, sources, pains, personas, size, demand
├── strategy/      positioning, messaging, go-to-market
├── assets/        every launch material + the claim registry
├── verification/  what passed, what blocks
├── harness/       metrics contract + analyzer
├── playbook/      conditional growth rules + the ninety-day runway
└── package/       manifest + aris-launch.html
```

**JSON is the source of truth. Markdown is the human deliverable. Scripts are the validation.**
The HTML is a presentation layer over the JSON, never a replacement. Four packages: `aris-core`
(state, sectors, decisions, gates, the publish hook), `aris-intel` (research), `aris-strategy`
(positioning, messaging, GTM), `aris-assets` (materials, harness, playbook, the HTML build).

`.aris/` holds the quotes, the rejected positioning, the pricing basis and every assumption. None
of it is written for an audience outside the team, so if the project is a public git repo, add it
to `.gitignore`. The same question applies to the launch page before you share it.

```
node test/run.mjs            every case
node test/run.mjs pricing    only the ones whose name matches
```

88 cases, no dependencies, about four seconds, run on Node 20, 22 and 24 in CI. They prove that a
clean package passes every gate and builds a page, that **each gate refuses when its own defect is
planted**, and that the false positives which used to refuse correct packages do not.
`test/fixture.mjs` generates the project they run against, because half the gates compare a stored
date against today.

## Status

**v0.1.0.** Run once end to end against a real product, then audited script by script with every
finding fixed and a test case added for it. Read **[AUDIT.md](AUDIT.md)** before you trust a gate.
The limits that survive: the big review sites (G2, Capterra, TrustRadius) return 403 to an
automated fetch, so `/aris-evidence` turns a blocked source into a two-minute paste; prices are
often injected by JavaScript, and a fetch returning no number has not proved the price is
unpublished; the quote thresholds have been exercised on one market only; and every sector's
`priceBands` stays null until a run cites it.

Built on the shape of [pica](https://github.com/vqdungwork/pica) by Dung Vuong: state on disk,
rules loaded by name, and gates enforced by script rather than by good intentions.

MIT.
