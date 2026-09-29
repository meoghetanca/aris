# Traceability

```
SOURCE -> QUOTE -> PAIN -> PERSONA -> POSITIONING -> MESSAGE -> ASSET -> CLAIM -> VERIFICATION
```

Every arrow is a stored id. This is not bookkeeping; it is the only thing that
distinguishes this package from a folder of confident marketing documents.

## What each link requires

| Link | Requirement |
|:--|:--|
| SOURCE | an entry in `intel/sources.json` with a URL, type, `accessedAt`, reliability |
| QUOTE | verbatim text + `sourceId` + URL + date, inside a pain |
| PAIN | >= 8 quotes from >= 3 distinct sources before `status: "validated"` |
| PERSONA | every attribute carries `evidence: [QUOTE-...]` |
| POSITIONING | each direction carries `painIds` and `targetPersonaIds` |
| MESSAGE | an id, and `evidence` pointing at pains or quotes |
| ASSET | claim ids in the Markdown as `[CLAIM-014]` |
| CLAIM | an entry in `assets/claims.json` with `sourceIds` and `usedIn` |
| VERIFICATION | a check in `verification/verify.json` that covers it |

## Ids

`SRC-` `QUOTE-` `PAIN-` `PERSONA-` `POS-` `MSG-` `CLAIM-` `VERIFY-` `COMP-` `F-`
`DEMAND-` `METRIC-` `RULE-` `A-` `CUT-`, each zero-padded to three digits.

Assigned once, never reused, including after deletion. If PAIN-004 is dropped, the
next pain is PAIN-005 and nothing is ever PAIN-004 again — otherwise an old
reference silently resolves to new content.

## Check it, do not trust it

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/trace.mjs
node ${CLAUDE_PLUGIN_ROOT}/scripts/trace.mjs --id CLAIM-014
```

A dangling id is a blocking issue, never a warning. Run it after any command that
writes ids, not only at the end: a break found three commands later costs three
commands of rework.

## Writing in the right order

The spine is also the build order. You cannot write a persona before pains exist,
or a claim before the message it serves. If a command finds its input missing, it
**stops and names the command that produces it**. It does not synthesise the input.
