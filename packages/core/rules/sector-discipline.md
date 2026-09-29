# Sector discipline

The reason the workflow can run on an HR platform and a consumer music app without
producing the same document twice.

## Resolve first, fail closed

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/sector-check.mjs --show "<sector>"
```

Exit 3 means the field is not covered. **Stop.** Do not mine anyway. Without the
entry you do not know which review platforms and communities carry this field's
public voice, which claims it regulates, or what it charges — and mining blind is
where fabrication starts.

Escape hatch: `/mkt-sector <name>` researches and writes a **provisional** entry.
The flow then runs, but `state.market.sectorStatus = "provisional"` propagates into
the manifest and the HTML says so prominently. A provisional sector is a disclosed
weakness, never a silent one.

## The fields that do real work

- **`reviewPlatforms` + `communities`** tell `/mkt-voc` where to look. Use these,
  not a general web search, as the primary mining targets.
- **`regulatedClaims`** is a verify lens, and the highest-stakes one. An automated
  flow writing health, financial, employment or environmental claims with no sector
  rules is a legal hazard, not a style problem. `rule: "forbidden"` means the claim
  cannot appear at all; `requires_disclosure` means it may appear only with the
  named disclosure attached.
- **`forbidden`** lists defects this field recognises and a generic check does not.
  Treat each entry as a lens during `/mkt-verify`.
- **`reservedTerms`** are words the field has already spent on a meaning. Using one
  for something else is a misread waiting to happen, not a taste disagreement.
- **`priceBands`** anchors the pricing recommendation. Where they are `null` and
  uncited, derive the ladder from live competitor pricing in this run and cite it;
  do not fall back to your prior.
- **`channelNorms.ineffective`** is as load-bearing as `effective`. A channel the
  field has repeatedly failed with should not appear in the mix because it looked
  plausible.

## Multi-sector products

A product can sit in two fields (an HR tool sold to agencies is both
`b2b-saas-hr` and `professional-services`). Resolve the primary in `state`, load
both entries, and **union the constraint fields** — `regulatedClaims`, `forbidden`,
`reservedTerms`, `requiredDisclosures`. Constraints add; they never cancel.

## Keeping entries honest

Numeric fields (`priceBands`, `cacBenchmarks`, `salesCycleDays`) in the seeded
entries are deliberately uncited or `null`. They are structure, not data. Anything
numeric that reaches an artifact must be cited from this run.
