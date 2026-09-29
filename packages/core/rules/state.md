# The state contract

`.mkt/state.json` is the canonical project state. Hooks and scripts read it;
commands write it. A hook cannot know that a human said yes out loud, so authority
lives here.

## Shape

```json
{
  "product": { "name": "", "description": "", "url": "" },
  "market": {
    "category": "", "geography": [], "language": [],
    "model": "B2B | B2C | B2B2C",
    "sector": "", "sectorStatus": "covered | provisional",
    "secondarySectors": []
  },
  "scope": { "in_scope": [], "out_of_scope": [] },
  "decisions": [],
  "decisionMode": "interactive | auto",
  "status": "intake | researching | strategy | production | verified | launch-ready",
  "verify": { "lastRun": null, "passed": false },
  "launchAuthorization": false,
  "delivered": false
}
```

Companion files, separate because they grow and are read independently:
`assumptions.json`, `cutSteps.json`.

## Rules

- **Write it before you need it.** Any command that learns something durable writes
  it immediately. A fact that lives only in the conversation is lost at the next
  compact, and this workflow is long.
- **`status` only moves forward**, and only when its artifacts exist. Do not set
  `launch-ready`; `/mkt-package` sets it, and only when `close-check.mjs` passes.
- **`launchAuthorization` is never set by a command.** The user sets it by hand.
  This is the one deliberate human act the workflow keeps.
- **`verify` mirrors `verification/verify.json`.** The gate reads both; keep them
  consistent or the gate blocks on the stricter one.
- **Never delete a field to make a check pass.** That is the same failure as
  inventing data, in the other direction.

## Reading it from a script

```js
import { requireRoot, readJson, writeJson } from "./lib/mkt.mjs";
const root = requireRoot();               // walks up for .mkt/state.json, exits 2 if absent
const state = readJson(root, "state.json");
```

`requireRoot()` walking up is what lets every script and the hooks work from a
subdirectory of the project.
