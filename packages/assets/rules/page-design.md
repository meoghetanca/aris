# What the package page contains, and how it displays

Load before touching `scripts/template/page.html`. The honesty requirements live in
`html-contract.md`; this file is about whether a person can actually read the thing.

Three rewrites failed before this was written down. Each fixed what the last one looked
like rather than what it was for, which is why the fourth needed a contract instead of
another opinion.

---

## Part 1 — What it contains

The reader is deciding whether to launch, or carrying out a launch someone else
decided. They arrive with one of six questions. **Each gets exactly one section**, in
this order, and nothing else earns a section.

| # | Their question | The section answers with |
|:--|:--|:--|
| 1 | What are we doing? | the positioning, the price, the channels — stated, not derived |
| 2 | Why that and not something else? | the alternatives, and why each lost |
| 3 | What do we say? | the messages, in priority order, ready to lift |
| 4 | What do I do on Monday? | the sequenced list, blocking items first |
| 5 | What could be wrong? | the bets, ordered by what they cost if wrong |
| 6 | How do you know? | the evidence, and only when asked for |
| 7 | What happens after? | what to watch, and what to do when it moves |

**Anything that does not answer one of those is cut.** Market size, demand signals and
the competitor roster are not sections: they are evidence for question 6, and they
belong behind it.

### The order is not negotiable

A reader who stops after section 1 must already have the answer. A reader who stops
after section 4 must be able to start work. **Evidence is last** because it is the
thing nobody reads until they doubt something — putting it first buries the answer,
which is the mistake every earlier version made.

### What must always be present, even when empty

- **The status of the whole package**, and what clears it if it is blocked.
- **What this package could not know.** The cuts, with their consequence.
- **Every claim's source**, one click away.

---

## Part 2 — How it displays

Twelve rules. They are testable; a version that breaks one is wrong regardless of how
it looks.

**R1 · Answer first, at every level.** Every section opens with a sentence stating its
conclusion. Cards, tables and charts come *after* that sentence, never instead of it. A
section that opens with a table has hidden its own answer.

**R2 · Every heading is a claim, not a label.** "Who else is already selling to these
people", not "Market overview". A reader who skims only the headings must come away
with the argument. If a heading could sit on any other product's page, it is a label.

**R3 · One idea per section.** If a section needs two claims, it is two sections. The
symptom of breaking this is a heading with "and" in it.

**R4 · Three type registers, never four.** Serif for reading, sans for structure and
labels, mono for identifiers and figures. A fourth register reads as decoration.

**R5 · Prose sits at 66ch. Data may be wider.** The reading measure is fixed; tables and
charts break out of it. Full-width prose is unreadable and is the fastest way to make a
document feel like a dump.

**R6 · A number is set large only when it is the point.** A competitor's price on a
card: large. A count of sources: body size. Large numbers everywhere flatten the
hierarchy and nothing reads as important.

**R7 · Cards by default. A table is the exception and must be argued for.**

A card gives each thing a boundary, a heading and room for a sentence. A table row gives
it a horizontal strip shared with five other columns, and the reader has to hold the
header row in memory to know what any cell means. Prose in a table cell is the single
clearest symptom of a page built from a data model rather than for a reader.

Use a card for anything the reader considers **one at a time**: a competitor, a message,
a channel, a persona, a risk, a metric, a capability, a thing that was cut.

A table is permitted only when **all three** hold:
- the rows are homogeneous — same shape, same units, no prose;
- the reader scans down one column to compare, rather than reading each row;
- there are more rows than a person would page through as cards.

A source list is neither: it is a list, and it renders as a list.

When a comparison genuinely spans two dimensions — capabilities across vendors — invert
it. One card per capability, with the vendors inside it, reads far better than a grid
the reader has to triangulate.

**R8 · An unknown must never look like a no.** Distinct mark, everywhere, with a legend.
"Nobody has checked" and "does not have it" are opposite findings and get opposite marks.

**R9 · The reader never meets an identifier without a sentence.**
`messages_reach_a_persona` is a variable name. "Nothing you plan to say has a customer
behind it" is the finding. Ids may appear beside the sentence, never instead of it.

**R10 · Evidence is one click away and never in the way.** Claims and pains open a
drawer. Sources do not interrupt a sentence.

**R11 · Empty means empty.** No sample rows, no placeholder charts, no illustrative
numbers. An empty state says what would fill it and what would have to happen first.

**R12 · The state of the whole package is visible without scrolling**, from wherever
the reader is. If it cannot ship, that fact outranks everything on the page.

### Two habits that produced the bad versions

**Density is not thoroughness.** The failed drafts showed everything at once because
everything existed. A section that fills a screen with one claim and its support reads
faster than one that fits four claims in the same space.

**Do not mirror the file tree.** `category.json` is not a section. The first version had
fourteen sections because `.aris/` has fourteen artifacts, and that is the reason it read
like a dump: the structure described the producer, not the reader.

---

## Part 3 — What to check before publishing

Render it once and answer these. Any "no" is a defect, not a preference.

1. Reading **only the headings**, do you get the argument?
2. Is the answer to "what are we doing" visible **without scrolling**?
3. Does every section open with a **sentence**, not a table?
4. Is there **any table** that is not homogeneous, scannable and long? Any **prose in a cell**?
5. Does any **unknown** look like a no?
6. Is there a **raw identifier** anywhere a reader can see?
7. Does any section hold **two claims**?
8. At 390px wide, does the page **scroll sideways**?
9. Is any number set large that is **not the point** of its block?
10. Is the **blocked/ready state** visible from every part of the page?
