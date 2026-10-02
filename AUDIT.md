# What the first run and the audit turned up

The short version is in the [README](README.md). This is the long one, kept because reading a
gate tells you what it intends and only planting its defect tells you what it does.


## The first real run

**v0.1.0** was run once, end to end, against a real product in a real market. That run
changed the tool more than any amount of design did, and the findings worth knowing
before you use it are these:

- **The big review sites block automated fetching.** G2, Capterra and TrustRadius all
  return 403, and most sector entries name them as the primary place to look. Use
  `/aris-evidence` when it happens; a blocked source becomes a two-minute paste rather
  than a silent gap, and a thin result must never be reported as a quiet market.
- **Prices are frequently unreadable by a plain fetch**, injected by JavaScript and
  chosen by the visitor's country. A fetch that returns no number has not proved the
  price is unpublished.
- **Do not let the model pick the competitors.** It picks whoever has the best
  international SEO and misses the local incumbent a buyer already owns — which is the
  one whose absence wrecks a positioning. `/aris-category` discovers them in the
  market's own language first.
- **The run was stopped by its user partway through**, because the research step
  dispatched one deep agent per competitor. Every fan-out now has a hard budget and a
  cheap default, and depth is something you ask for.

## The gates, against planted defects

**Since then the gates have been exercised against planted defects** — what the Test
section above asks for, and the evidence v0.1.0 shipped without. Each of these reported
PASS on the thing it exists to catch:

- **the sector's `forbidden` claims never matched.** Copy reading "expected returns of
  12 percent per year" cleared `no_forbidden_claims` in `fintech-wealth`. The matcher
  looked for the first 28 characters of the claim *description* — "any projected,
  expected or guaranteed return" — which is not a phrase anyone writes, so what caught
  anything was the generic superlative wordlist, and dropping one word walked through.
  Descriptions are matched by word overlap per sentence now: eight violations across
  eight fields fire, six careful packages stay clean.
- **a `tam-sam-som.json` with no `calculations` block recomputed nothing and passed.**
  A stated 9,000,000,000 TAM with no factors and no formula cleared all four arithmetic
  checks, including the one called `sizes_are_ranges_not_points`.
- **one absent field blanked most of the HTML.** A cut recorded as `{step, reason}`
  threw inside section 04, so sections 04–12 never rendered — while the masthead still
  drew, which is why it looked built. `aris-launch.artifact.html` had never been
  written at all: the fragment is sliced between the body tags and the template had no
  body element, nor a doctype, so the offline page rendered in quirks mode.

The lesson is the one the Test section states. Reading a gate tells you what it
intends; only planting its defect tells you what it does.

## Then the whole thing was audited, and the suite was written

A read of every script, both hooks, the agent definitions and this file, with the
findings fixed and a case in `test/run.mjs` for each one. What it turned up:

- **every research agent held `Bash` while reading attacker-controlled text.** The
  miners, the scouts and the analysts fetch competitor pages, reviews, forums, ad
  libraries and job ads, and nothing anywhere told them that fetched text is data rather
  than instruction. Seven of them also said "you do not have Write or Edit. That is
  deliberate" while their frontmatter granted a shell, which writes files. Ten agents
  lost `Bash`; the one that keeps it runs a local script and fetches nothing.
- **the sector's `forbidden` list was collected and never read.** Layer 3 of
  `superlative-check` was documented as "the sector's `forbidden` and `reservedTerms`"
  and only ever checked `reservedTerms`. Several hundred entries across 62 fields could
  not fire. `b2b-saas` forbids "an ROI or time-saved figure with no baseline and no
  sample size", and copy stating exactly that passed. This one was found by the test
  suite, on its first run, which is the argument for the suite.
- **two cross-asset checks refused correct packages.** `pricing_consistency` blocked on
  any two money figures, so a deck quoting a market size beside a price was permanently
  unpublishable; `date_consistency` blocked on any date in the past, so "in testing since
  2024-03-01" was a defect. Meanwhile the "one launch date" half of that check was
  collected into a set and never read, so it never ran at all.
- **a flat `readdir` in five places** meant an asset in a subdirectory was read by no
  cross-asset check, carried no claims as far as the claim gate could tell, and did not
  make a green verification stale. It published unexamined.
- **the publish gate was a pattern list with no indirection.** `./deploy.sh`,
  `make ship` and `npm run deploy` all walked through it, which made the list's coverage
  mostly decorative. It now reads the script, the make recipe or the npm script.
- **`verify-all` crashed on two ordinary inputs.** A product name containing `+` or `(`
  hit an unescaped `new RegExp` two lines below an escaped copy of itself; a malformed
  link reached `new URL` unguarded. Both took down the run with no `verify.json` written.
- smaller: `execFileSync("node")` where Node may not be on PATH, with no timeout and a
  1 MB buffer that reported a large result as "could not run"; an unquoted
  `${CLAUDE_PLUGIN_ROOT}` in twelve command files, breaking on any install path with a
  space in it; a substring test that let a plugin named `typical` satisfy a check for
  `pica`; a hook that would wait forever on a stdin nobody closed; an `extends` cycle
  that silently truncated at twelve hops and hid both entries from `--list`; a Windows
  opener that went through `cmd.exe` with an unescaped path; a mined `javascript:` URL
  rendered as a clickable link in the published page.

Severity lives on each check now, next to the thing it describes, rather than in a
hand-kept list of names in the aggregator. That list is how a date check became a hard
publish gate.

The quote thresholds have still only been exercised on one market, and every sector's
`priceBands` are deliberately null until a run cites them.
