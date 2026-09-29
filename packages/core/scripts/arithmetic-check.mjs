#!/usr/bin/env node
/**
 * Recompute every stated number from its factors. A sizing artifact that cannot
 * be recomputed is an assertion wearing a formula's clothes.
 *
 * Formulas reference factor ids (F-001 x F-003) or bare numbers, and support
 * + - * / ( ) only. Anything else is rejected rather than evaluated: a formula
 * this script cannot parse is a formula a reader cannot check either.
 *
 * Also checks budget percentages sum to 100, because that is the other place a
 * confident wrong number hides.
 */
import { requireRoot, readJson, check, report } from "./lib/aris.mjs";

const SAFE = /^[\s\d.+\-*/()eE]*$/;

function evaluate(formula, factors) {
  let expr = String(formula);
  // Longest ids first so F-0011 is not clipped by F-001.
  const ids = Object.keys(factors).sort((a, b) => b.length - a.length);
  for (const id of ids) expr = expr.split(id).join(`(${factors[id]})`);
  expr = expr.replace(/[x×·]/g, "*").replace(/,/g, "");
  if (!SAFE.test(expr)) return { error: `formula contains unresolved names or unsupported operators: ${expr.trim()}` };
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict";return (${expr});`)();
    return Number.isFinite(v) ? { value: v } : { error: `formula did not evaluate to a finite number: ${expr}` };
  } catch (e) {
    return { error: `formula is not evaluable: ${e.message}` };
  }
}

const root = requireRoot();
const sizing = readJson(root, "intel/tam-sam-som.json");
const gtm = readJson(root, "strategy/gtm.json");

const errs = [];
const rangeErrs = [];
const pointErrs = [];

if (!sizing) {
  errs.push("intel/tam-sam-som.json is absent");
} else {
  const factors = {};
  for (const f of sizing.factors ?? []) {
    if (f.value == null || !Number.isFinite(Number(f.value))) errs.push(`${f.id}: value is not a number`);
    else factors[f.id] = Number(f.value);
    if (!f.sourceId) errs.push(`${f.id}: no sourceId — a factor without a source is a guess`);
  }
  for (const [name, calc] of Object.entries(sizing.calculations ?? {})) {
    if (!calc || !calc.formula) {
      errs.push(`${name}: no formula stored, so the number cannot be recomputed`);
      continue;
    }
    const out = evaluate(calc.formula, factors);
    if (out.error) {
      errs.push(`${name}: ${out.error}`);
      continue;
    }
    const range = calc.range;
    if (!Array.isArray(range) || range.length !== 2 || !range.every((n) => Number.isFinite(Number(n)))) {
      pointErrs.push(`${name}: range must be [low, high]. A market size stated as a point is overclaimed.`);
      continue;
    }
    const [lo, hi] = range.map(Number);
    if (lo > hi) rangeErrs.push(`${name}: range is inverted [${lo}, ${hi}]`);
    if (out.value < lo * 0.999 || out.value > hi * 1.001)
      errs.push(
        `${name}: formula "${calc.formula}" recomputes to ${out.value.toLocaleString()}, ` +
          `outside the stated range [${lo.toLocaleString()}, ${hi.toLocaleString()}]`
      );
  }
  if (!(sizing.limitations ?? []).length)
    pointErrs.push("sizing has no limitations recorded — every bottom-up estimate has them");
}

const budgetErrs = [];
if (gtm?.budgetAllocation) {
  const vals = Object.entries(gtm.budgetAllocation).filter(([, v]) => Number.isFinite(Number(v)));
  const sum = vals.reduce((a, [, v]) => a + Number(v), 0);
  if (vals.length && Math.abs(sum - 100) > 0.5)
    budgetErrs.push(`budgetAllocation sums to ${sum}, not 100 — it is percentages, not amounts`);
  for (const [k, v] of vals) if (Number(v) < 0) budgetErrs.push(`budgetAllocation.${k} is negative`);
}

report("arithmetic-check: recompute every stated number", [
  check("ARITH-001", "formulas_recompute_to_stated_ranges", errs.length === 0, errs),
  check("ARITH-002", "sizes_are_ranges_not_points", pointErrs.length === 0, pointErrs),
  check("ARITH-003", "ranges_are_well_formed", rangeErrs.length === 0, rangeErrs),
  check("ARITH-004", "budget_is_percentages_summing_to_100", budgetErrs.length === 0, budgetErrs),
]);
