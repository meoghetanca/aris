#!/usr/bin/env node
/**
 * Walk the traceability spine in both directions and fail on a dangling id.
 *
 *   SOURCE -> QUOTE -> PAIN -> PERSONA -> POSITIONING -> MESSAGE -> ASSET -> CLAIM -> VERIFICATION
 *
 * Forward: every published claim reaches a verification result.
 * Backward: every marketing decision reaches a piece of evidence.
 *
 *   trace.mjs                 check the whole spine
 *   trace.mjs --id CLAIM-014  print one chain, backwards to its sources
 *   trace.mjs --json
 *
 * A dangling id is a blocking issue, not a warning. The spine is the only thing
 * standing between "derived from evidence" and "written by a language model".
 */
import { requireRoot, readJson, check, report } from "./lib/aris.mjs";

const root = requireRoot();
const R = (rel) => readJson(root, rel, null);

const sources = R("intel/sources.json")?.sources ?? [];
const pains = R("intel/pains.json")?.pains ?? [];
const personas = R("intel/personas.json")?.personas ?? [];
const sizing = R("intel/tam-sam-som.json");
const demand = R("intel/demand.json");
const positioning = R("strategy/positioning.json");
const messages = R("strategy/messages.json");
const claims = R("assets/claims.json")?.claims ?? [];
const verify = R("verification/verify.json");

const srcIds = new Set(sources.map((s) => s.id));
const quoteIds = new Set();
const painIds = new Set(pains.map((p) => p.id));
const personaIds = new Set(personas.map((p) => p.id));
const posIds = new Set((positioning?.directions ?? []).map((d) => d.id));
const msgIds = new Set();
for (const p of pains) for (const q of p.quotes ?? []) quoteIds.add(q.id);
for (const pm of messages?.personaMessages ?? [])
  for (const m of pm.messageHierarchy ?? []) if (m.id) msgIds.add(m.id);
/**
 * Messages that belong to no persona.
 *
 * The schema assumed personas would always exist, because the chain builds them before
 * messaging. A run that cuts voice-of-customer has no personas at all, and every message
 * then vanished from the spine - trace reported "0 messages" while four were sitting in
 * the file. Invisible is worse than unattached: an unattached message is a disclosed
 * weakness, an invisible one is a hole nothing reports.
 */
for (const m of messages?.unattachedMessages ?? []) if (m.id) msgIds.add(m.id);

const errs = [];
const miss = (what, id, where) => errs.push(`${where}: ${what} ${id} does not exist`);

// ---- backward links: every id referenced must exist ----
for (const p of pains)
  for (const q of p.quotes ?? []) {
    if (!q.sourceId) errs.push(`${p.id}/${q.id}: quote has no sourceId`);
    else if (!srcIds.has(q.sourceId)) miss("source", q.sourceId, `${p.id}/${q.id}`);
  }

for (const f of sizing?.factors ?? [])
  if (!f.sourceId) errs.push(`${f.id}: sizing factor has no sourceId`);
  else if (!srcIds.has(f.sourceId)) miss("source", f.sourceId, f.id);

for (const s of demand?.signals ?? [])
  if (!s.sourceId) errs.push(`${s.id}: demand signal has no sourceId`);
  else if (!srcIds.has(s.sourceId)) miss("source", s.sourceId, s.id);

for (const pe of personas) {
  for (const id of pe.pains ?? []) if (!painIds.has(id)) miss("pain", id, pe.id);
  for (const a of pe.attributes ?? []) {
    if (!a.evidence?.length) errs.push(`${pe.id}: attribute "${a.attribute}" has no evidence`);
    for (const e of a.evidence ?? []) if (!quoteIds.has(e)) miss("quote", e, `${pe.id} attribute "${a.attribute}"`);
  }
}

for (const d of positioning?.directions ?? []) {
  for (const id of d.painIds ?? []) if (!painIds.has(id)) miss("pain", id, d.id);
  for (const id of d.targetPersonaIds ?? []) if (!personaIds.has(id)) miss("persona", id, d.id);
}
if (positioning?.selected && !posIds.has(positioning.selected))
  miss("direction", positioning.selected, "positioning.selected");

for (const pm of messages?.personaMessages ?? []) {
  if (!personaIds.has(pm.personaId)) miss("persona", pm.personaId, "messages");
  for (const id of pm.painIds ?? []) if (!painIds.has(id)) miss("pain", id, `messages/${pm.personaId}`);
  for (const m of pm.messageHierarchy ?? []) {
    if (!m.id) errs.push(`messages/${pm.personaId}: a message has no id`);
    for (const e of m.evidence ?? [])
      if (!painIds.has(e) && !quoteIds.has(e)) miss("pain or quote", e, m.id ?? "message");
  }
}

const unattached = (messages?.unattachedMessages ?? []).map((m) => m.id).filter(Boolean);

for (const c of claims) {
  if (c.messageId && !msgIds.has(c.messageId)) miss("message", c.messageId, c.id);
  for (const s of c.sourceIds ?? []) if (!srcIds.has(s)) miss("source", s, c.id);
  if (c.status !== "unknown" && !(c.sourceIds ?? []).length)
    errs.push(`${c.id}: claim has no sourceIds and is not marked unknown`);
}

// ---- forward links: every claim must reach verification ----
const forward = [];
if (verify) {
  const covered = new Set();
  for (const c of verify.checks ?? [])
    for (const e of c.errors ?? []) {
      const m = String(e).match(/CLAIM-\d+/g);
      if (m) for (const id of m) covered.add(id);
    }
  const cited = verify.checks?.find((c) => c.check === "citation_completeness");
  if (!cited) forward.push("verify.json has no citation_completeness check, so no claim reaches verification");
} else if (!process.argv.includes("--in-verify")) {
  forward.push("verification/verify.json is absent: no claim reaches a verification result yet");
}
// --in-verify: verify-all runs this gate BEFORE writing verify.json, so the forward link is
// satisfied by the run in progress. Without the flag a first run could never pass its own check.
const forwardStatus = !verify && process.argv.includes("--in-verify") ? "skipped" : (forward.length ? "failed" : "passed");

// ---- orphans: evidence nobody used (a warning, not a failure) ----
const usedSrc = new Set();
for (const p of pains) for (const q of p.quotes ?? []) usedSrc.add(q.sourceId);
for (const f of sizing?.factors ?? []) usedSrc.add(f.sourceId);
for (const s of demand?.signals ?? []) usedSrc.add(s.sourceId);
for (const c of claims) for (const s of c.sourceIds ?? []) usedSrc.add(s);
const orphanSources = [...srcIds].filter((id) => !usedSrc.has(id));

// ---- one chain, on request ----
const idx = process.argv.indexOf("--id");
if (idx !== -1 && process.argv[idx + 1]) {
  const want = process.argv[idx + 1];
  const lines = [];
  const claim = claims.find((c) => c.id === want);
  if (claim) {
    lines.push(`${claim.id}  ${claim.status}`);
    lines.push(`  "${claim.text}"`);
    lines.push(`  used in: ${(claim.usedIn ?? []).join(", ") || "(nothing)"}`);
    if (claim.messageId) {
      for (const pm of messages?.personaMessages ?? [])
        for (const m of pm.messageHierarchy ?? [])
          if (m.id === claim.messageId) {
            lines.push(`  <- ${m.id}  "${m.message}"`);
            lines.push(`     <- ${pm.personaId}`);
            for (const e of m.evidence ?? []) {
              const pain = pains.find((p) => p.id === e);
              if (pain) {
                lines.push(`        <- ${pain.id}  "${pain.statement}"  (${pain.frequency?.quoteCount ?? 0} quotes / ${pain.frequency?.sourceCount ?? 0} sources)`);
                for (const q of (pain.quotes ?? []).slice(0, 3)) {
                  const s = sources.find((x) => x.id === q.sourceId);
                  lines.push(`           <- ${q.id}  ${q.sourceId}  ${s?.url ?? "(no url)"}`);
                }
              }
            }
          }
    }
    for (const s of claim.sourceIds ?? []) {
      const src = sources.find((x) => x.id === s);
      lines.push(`  <- ${s}  ${src?.url ?? "(missing)"}`);
    }
  } else {
    lines.push(`${want} is not a claim id. --id takes a CLAIM- id.`);
  }
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(claim ? 0 : 2);
}

const counts = `${sources.length} sources, ${quoteIds.size} quotes, ${pains.length} pains, ${personas.length} personas, ${msgIds.size} messages, ${claims.length} claims`;
report(`trace: the spine (${counts})`, [
  check("TRACE-001", "backward_links_resolve", errs.length === 0, errs),
  { id: "TRACE-002", check: "claims_reach_verification", status: forwardStatus, errors: forward },
  {
    id: "TRACE-004",
    check: "messages_reach_a_persona",
    status: unattached.length ? "failed" : "passed",
    errors: unattached.map((id) =>
      `${id} is attached to no persona - it answers competitive evidence, not a person`),
  },
  {
    id: "TRACE-003",
    check: "orphan_sources",
    status: orphanSources.length ? "failed" : "passed",
    errors: orphanSources.map((id) => `${id} is cited by nothing`),
  },
]);
