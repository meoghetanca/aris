# Decision blocks

The flow removes human *labour*, not human *judgement*. Where a decision is
genuinely the user's, present options you generated and let them pick.

## Requires superpowers

`/mkt` loads `superpowers:brainstorming` for the intake block. Every decision point
is an `AskUserQuestion` call. If superpowers is absent the `SessionStart` hook says
so and sets `state.decisionMode = "auto"`; say it once, then run unattended.

## The shape of a good block

- **2 to 4 options, generated from the evidence in front of you.** Not a menu of
  generic possibilities — the three positioning directions you actually scored.
- **Recommended first, labelled `(Recommended)`.**
- **Each option states what it commits to and what it costs.** An option whose
  description could be swapped with another's is not an option, it is a label.
- **Never an open question.** "What is your tone of voice?" gets hesitation.
  "Which of these three, here they are written out" gets a correction in seconds.
- **Collapse, do not drip.** The intake block asks its questions in *one*
  `AskUserQuestion` call (the tool takes up to four), not one message at a time.

## The points that are decisions

| Point | Command | Options generated from |
|:--|:--|:--|
| audience, geography, language, model, sector | `/mkt` | product description + sector KB |
| which segment to lead with | `/mkt-personas` | personas ranked by pain frequency |
| positioning direction | `/mkt-position` | the three scored directions |
| tone of voice | `/mkt-messages` | sector norms + chosen positioning |
| channel mix | `/mkt-gtm` | scored channels with audience evidence |
| price point | `/mkt-gtm` | the competitor ladder + sector `priceBands` |
| asset scope | `/mkt-assets` | the chosen channel mix |

Everything else is either derived from evidence or an assumption. Do not invent new
decision points to be polite; each one costs the user attention, and a flow that
asks twenty questions gets abandoned by the fourth.

## Recording

Write the decision **with the option set that produced it**, so the HTML can show
what was chosen *and what was rejected*:

```json
{ "id": "D-001", "point": "positioning", "chosen": "POS-002",
  "options": ["POS-001", "POS-002", "POS-003"],
  "rejected": [{ "id": "POS-001", "reason": "..." }],
  "mode": "user | auto", "at": "2026-09-29T10:00:00Z" }
```

`mode: "auto"` means nobody answered and the recommendation was taken. That
distinction must survive into the artifact.

## `--auto`

Takes the recommended option at every point, records each as a decision with
`mode: "auto"` **and** an assumption carrying its confidence. This is the
unattended path and it is legitimate — it is simply honest about what happened.
