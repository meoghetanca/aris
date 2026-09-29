# The HTML contract

`package/mkt-launch.html` is a **presentation layer over the JSON**, never a
replacement for it. If the two disagree, the JSON is right and the HTML is stale.

## The twenty requirements

The generator must produce a single file that:

1. works offline;
2. contains all generated marketing content;
3. has no external runtime dependencies;
4. loads all data from the generated artifact package, embedded at build time;
5. never invents missing evidence;
6. distinguishes `verified` / `inferred` / `assumption` / `unknown`;
7. makes every factual claim traceable to a source id;
8. makes every pain traceable to quotes;
9. makes every persona attribute traceable to quote ids;
10. makes every positioning and message claim traceable to evidence;
11. displays verification status prominently;
12. never displays fabricated testimonials;
13. never displays fabricated metrics;
14. never implies inferred demand was experimentally validated;
15. **never shows launch-ready status when `verify.passed` is false**;
16. includes the complete launch assets;
17. includes the dormant measurement dashboard;
18. includes the conditional growth playbook;
19. includes the complete source registry;
20. includes the generation timestamp and artifact version.

## Enforced twice

Points 12 to 15 are enforced in the generator **and** in the data shape: the page
renders readiness from `verify.passed`, so there is no code path that prints
"launch-ready" over a failed verification. A rule enforced only by intention is a rule
that breaks during the one run nobody checked.

## The five persistent elements

1. **Sidebar** — the fourteen sections.
2. **Evidence badges** — on every material statement.
3. **Citation drawer** — click a claim, see its quote count, source count and links.
4. **Global search** — competitors, pains, personas, claims, assets, sources.
5. **Export** — launch package, assets, evidence, raw JSON.

## Empty is rendered as empty

The measurement dashboard shows em-dashes, not sample charts. A chart with plausible
numbers in it before launch is the clearest possible example of the failure this
workflow exists to prevent, and it is the one a reader is least likely to question.

Sections whose artifacts do not exist render as "not yet produced" with the command
that produces them. They do not render as complete-looking placeholders.

## Style

Dense and readable, not a pitch deck. Its reader is deciding whether to launch, so
the evidence must be reachable in one click and the caveats must be as prominent as
the numbers. Light and dark both, no external fonts, no CDN.

## Optional published-Artifact layer

The file is offline-first, so publishing it is optional. When published, runtime
capabilities light up on the same HTML and it degrades to read-only when they are
absent — `claude.use()` returning `null` is the designed path, not an error.

Do **not** declare the `assets` capability: a page declaring it is
organisation-internal and can never be shared with a client outside the org. Inline
images as data URIs instead.
