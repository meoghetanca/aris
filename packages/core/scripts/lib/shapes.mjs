/**
 * What each artifact must look like.
 *
 * Not a general schema language. It exists because of one specific failure: a file
 * that parses but carries the right data in the wrong envelope. `assumptions.json`
 * written as a bare array instead of `{ "assumptions": [...] }` parses, and every
 * reader does `readJson(...).assumptions ?? []`, so the gate reports
 *
 *     assumptions  0
 *
 * on a file holding six of them. The data was written, the tool said zero, and
 * nothing anywhere said why. Silence of that kind is worse than a crash, because
 * the next command inherits it and the reader has no way to tell.
 *
 * So: `require` is a hard error, because a missing or mistyped envelope means the
 * artifact cannot be read at all. `known` is only a warning, because artifacts
 * legitimately carry notes, provenance and dates the fixture never needed, and
 * failing those would push people toward writing less down rather than more.
 */

const rec = (fields) => ({ fields });

export const SHAPES = {
  "state.json": {
    require: { product: "object", market: "object", status: "string" },
    known: ["product", "market", "scope", "decisions", "decisionMode", "status", "verify",
            "launchAuthorization", "launchDate", "delivered", "secondarySectors"],
  },
  "assumptions.json": {
    require: { assumptions: "array" }, element: ["assumptions", rec(["id"])],
    known: ["assumptions"],
  },
  "cutSteps.json": {
    // No element requirement: cuts are keyed by the step they name ("deleted"), not by an id,
    // because nothing references a cut. Requiring an id here would have failed every existing
    // package to satisfy a consistency nobody needs.
    require: { cuts: "array" },
    known: ["cuts", "note"],
  },
  "intel/sources.json": {
    require: { sources: "array" }, element: ["sources", rec(["id", "url"])],
    known: ["sources", "gaps"],
  },
  "intel/pains.json": {
    require: { pains: "array" }, element: ["pains", rec(["id"])],
    known: ["pains", "minedAt", "method", "notReached"],
  },
  "intel/personas.json": {
    require: { personas: "array" }, element: ["personas", rec(["id"])],
    known: ["personas", "leadWith", "rationale"],
  },
  "intel/category.json": {
    require: { players: "array" },
    known: ["players", "priceLadder", "featureMatrix", "marketGaps", "sector", "sectorStatus",
            "scoutedAt", "depthBought", "notProfiled", "whoMattersMost", "openings", "gaps"],
  },
  "intel/demand.json": {
    require: { status: "string", signals: "array", doesNotProve: "array" },
    element: ["signals", rec(["id"])],
    known: ["status", "signals", "doesNotProve", "untestedQuestions", "measuredAt", "method",
            "headline", "conclusion", "signalsNotMeasured"],
  },
  "intel/tam-sam-som.json": {
    require: { factors: "array", limitations: "array" },
    element: ["factors", rec(["id"])],
    known: ["factors", "calculations", "limitations", "tam", "sam", "som", "unknownFactors",
            "sizedAt", "method", "headline"],
  },
  "strategy/positioning.json": {
    require: { directions: "array" }, element: ["directions", rec(["id"])],
    known: ["selected", "directions", "rejected"],
  },
  "strategy/messages.json": {
    require: { usp: "any" },
    known: ["usp", "personaMessages", "unattachedMessages", "elevatorPitch", "featureToBenefit", "tone"],
  },
  "strategy/gtm.json": {
    require: { channels: "any" },
    known: ["channels", "pricing", "budgetAllocation", "kpiTargets"],
  },
  "assets/claims.json": {
    require: { claims: "array" }, element: ["claims", rec(["id"])],
    known: ["claims"],
  },
  "harness/metrics.json": {
    require: { metrics: "array" }, element: ["metrics", rec(["id"])],
    known: ["metrics", "baselines", "note"],
  },
  "playbook/growth-rules.json": {
    require: { rules: "array" }, element: ["rules", rec(["id"])],
    known: ["rules"],
  },
  "playbook/runway.json": {
    require: { weeks: "any" },
    known: ["weeks", "note"],
  },
};

const typeOf = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);
const ok = (v, want) => want === "any" ? v !== undefined : typeOf(v) === want;

/** Returns { errors, warnings }. Unknown paths validate clean: this is a floor, not a gate. */
export function validate(rel, data) {
  const spec = SHAPES[rel];
  const errors = [];
  const warnings = [];
  if (!spec) return { errors, warnings };

  if (Array.isArray(data)) {
    const wanted = Object.keys(spec.require);
    errors.push(
      `${rel} is written as a bare array. It must be an object with ` +
      `${wanted.map((k) => `"${k}"`).join(", ")} at the top level ` +
      `(for example { "${wanted[0]}": [ ... ] }). As a bare array every reader resolves ` +
      `"${wanted[0]}" to undefined and reports it as empty.`
    );
    return { errors, warnings };
  }
  if (typeOf(data) !== "object") {
    errors.push(`${rel} must be an object, not ${typeOf(data)}`);
    return { errors, warnings };
  }

  for (const [key, want] of Object.entries(spec.require)) {
    if (data[key] === undefined) errors.push(`${rel} has no "${key}". Every reader of this artifact needs it.`);
    else if (!ok(data[key], want)) errors.push(`${rel}: "${key}" must be ${want}, not ${typeOf(data[key])}`);
  }

  if (spec.element) {
    const [key, { fields }] = spec.element;
    const list = Array.isArray(data[key]) ? data[key] : [];
    list.forEach((el, i) => {
      if (typeOf(el) !== "object") { errors.push(`${rel}: ${key}[${i}] is ${typeOf(el)}, not an object`); return; }
      for (const f of fields)
        if (el[f] === undefined || el[f] === "") errors.push(`${rel}: ${key}[${i}] has no "${f}"`);
    });
  }

  if (spec.known)
    for (const k of Object.keys(data))
      if (!spec.known.includes(k))
        warnings.push(
          `${rel} has an unknown top-level key "${k}". Nothing reads it, so anything stored ` +
          `there is invisible to every gate. Check it is not data that belongs inside ` +
          `"${Object.keys(spec.require)[0]}".`
        );

  return { errors, warnings };
}
