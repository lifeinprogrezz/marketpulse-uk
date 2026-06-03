/**
 * Single-promo effectiveness: observed Hl lift, observed margin lift, the
 * absolute margin delta, and a back-of-envelope ROI proxy.
 *
 * Used by the Promo Effectiveness panel (Task 13) and the
 * get_promo_effectiveness AI Analyst tool (Task 15). The caller is
 * responsible for assembling actuals + baseline + marketing fund —
 * typically by matching the promo to the brand × OFF TRADE × promo-month
 * aggregate and the prior-year same-month baseline, the same pattern as
 * buildLiftSamples in ./lift.ts.
 *
 * Conventions:
 * - Hl and margin lift return NaN when the baseline is non-positive
 *   (returns-dominated, missing data, or new SKU). Callers should branch
 *   on Number.isFinite and render a "—" rather than a misleading 0%.
 * - roiProxy is (margin gained − marketing spend) / marketing spend.
 *   With zero marketing spend the ratio is undefined and we return NaN —
 *   no near-zero divisor cheats. marginDelta carries the underlying
 *   number for cases where ROI can't be expressed as a ratio.
 */

export interface EffectivenessInput {
  retailer: string;
  skuDescr: string;
  actualHl: number;
  baselineHl: number;
  actualMargin: number;
  baselineMargin: number;
  mktgFund: number;
}

export interface EffectivenessResult {
  retailer: string;
  skuDescr: string;
  observedHlLift: number;
  observedMarginLift: number;
  marginDelta: number;
  mktgFund: number;
  roiProxy: number;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : NaN;
}

export function computeEffectiveness(
  input: EffectivenessInput,
): EffectivenessResult {
  const marginDelta = input.actualMargin - input.baselineMargin;
  return {
    retailer: input.retailer,
    skuDescr: input.skuDescr,
    observedHlLift: ratio(input.actualHl - input.baselineHl, input.baselineHl),
    observedMarginLift: ratio(marginDelta, input.baselineMargin),
    marginDelta,
    mktgFund: input.mktgFund,
    roiProxy:
      input.mktgFund > 0 ? (marginDelta - input.mktgFund) / input.mktgFund : NaN,
  };
}
