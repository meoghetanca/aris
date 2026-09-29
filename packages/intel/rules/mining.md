# Mining the public record

The workflow has no interviews, so this is the entire evidence base. Everything
downstream — pains, personas, positioning, every message — rests on what this step
collects and on how honestly it is recorded.

## Where to look, and in what order

The sector entry decides. Run the core command `/aris-sector`'s check first, or read
the entry, and mine in this order:

1. **Competitor review sites** named in `reviewPlatforms`. Sort by 1 and 2 stars.
   A 5-star review tells you what a product does; a 2-star review tells you what the
   market needs and nobody has built.
2. **Communities** named in `communities`. Search for the competitor names, not for
   your product's category — people complain about tools by name.
3. **Competitor issue trackers and support forums**, where they are public. In
   developer tools this is the single highest-signal source in the field.
4. **Ad libraries** — Meta Ad Library, Google Ads Transparency Center. Both public.
   An ad running for eighteen months converts; that is a real signal about messaging
   and it costs nothing to read.
5. **Job posts** of competitors. They reveal roadmap, team size and which problems
   the company is currently spending salary on.
6. **Pricing pages and changelogs**, for the ladder and for what the field considers
   table stakes this year.

## What a source record must carry

Every page you actually opened becomes an entry in `intel/sources.json` with a URL,
`sourceType`, `accessedAt`, and a `reliability` you can defend. A source you did not
open does not get an entry, however confident you are about what it says.

`reliability`: `high` for a first-party pricing page or a named review with a date;
`medium` for an undated forum post or an aggregator; `low` for a secondary summary
of something you could have read directly. If it is `low`, go read the primary.

## Quotes are verbatim

Copy the text. Do not fix the grammar, do not compress two posts into one sentence,
do not translate without keeping the original alongside. Store the URL and the date
with every quote.

**A paraphrase presented as a quote is fabricated evidence**, even when the
paraphrase is accurate. The whole value of a quote is that a reader can click
through and find those words.

## Vietnamese and other non-English markets

Reddit is thin; Facebook groups, Zalo communities, local forums and YouTube comments
carry the voice instead. Facebook groups are frequently unscrapable — when a source
cannot be fetched, record what you searched and mark the gap. Then keep the original
text and put the translation beside it, never instead of it.

## When there is nothing there

Some fields have no public voice: small-market B2B, anything sold entirely through
relationships, brand-new categories. **This is a finding, and you report it.**

Say what you searched, what you found, and that the thresholds cannot be met. Then
stop. The alternative — writing plausible pains — produces a package that is
confidently wrong in a way nobody downstream can detect, which is the single
outcome this workflow exists to prevent.

## Fan-out

One `aris-miner` per platform, none seeing another's findings. A miner that has read
the G2 reviews will code a Reddit thread in G2's vocabulary, and the clustering then
reflects the framing rather than the market. Overlap also wastes the fan-out: each
miner has one platform and does not stray into another's.
