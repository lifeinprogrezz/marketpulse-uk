/**
 * Promo lift coefficients.
 *
 * For each closed promo (end_date within the last closed month), we observe
 * the brand × OFF TRADE × month Hl + Margen Bruto in the promo's month and
 * compare it against the same brand × channel × prior-year month. The
 * percent change becomes a `LiftSample`. Samples are grouped by
 * (mechanic, depth bucket) into `LiftCoefficient` rows so the simulator and
 * the suggest_lever AI tool can estimate the impact of an unseen promo by
 * looking up the closest historical cell.
 *
 * Promo SKU descriptions are retailer-facing names (e.g. "Estrella 4x440ml")
 * while the sales SKU descriptions are internal codes, so direct join is
 * impossible. Brand-level matching is the closest signal we can get from
 * the monthly aggregates.
 */

import type {
  MonthlyByBrandChannel,
  PromoEntry,
} from '../data/loaders';

import { addMonths } from './baseline';

export type DepthBucket = '0-5' | '5-10' | '10-15' | '15-20' | '20-25' | '25+';

export interface LiftSample {
  retailer: string;
  brand: string;
  channel: string;
  mechanic: string;
  depthPct: number;
  actualHl: number;
  baselineHl: number;
  actualMargin: number;
  baselineMargin: number;
}

export interface LiftCoefficient {
  mechanic: string;
  depthBucket: DepthBucket;
  n: number;
  hlLift: number;
  marginLift: number;
}

const PROMO_CHANNEL = 'OFF TRADE';

export function depthBucket(pct: number): DepthBucket {
  const p = Math.floor(pct * 100 + 1e-9);
  if (p < 5) return '0-5';
  if (p < 10) return '5-10';
  if (p < 15) return '10-15';
  if (p < 20) return '15-20';
  if (p < 25) return '20-25';
  return '25+';
}

function isZeroAlcoholSku(skuDescr: string): boolean {
  return /(?:0\.0%|0%|non[-\s]?alcoholic)/i.test(skuDescr);
}

/**
 * Best-effort brand resolution from a retailer-facing SKU description.
 *
 * Strategy: take the longest leading run of alphabetic words from the SKU,
 * shrinking from N tokens down to 1, and find a brand that either equals
 * that prefix or starts with it. When multiple brands share a prefix
 * (Estrella → ESTRELLA DAMM | ESTRELLA NON-ALCOHOLIC), prefer the
 * non-alcoholic variant only if the SKU signals it; otherwise pick the
 * shortest brand (the principal one).
 */
function alphabeticTokens(s: string): string[] {
  return s
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Za-z]/g, ''))
    .filter((t) => t.length > 0);
}

interface NormalizedBrand {
  original: string;
  normalized: string;
}

function normalizeBrands(brands: readonly string[]): NormalizedBrand[] {
  return brands
    .map((b) => ({ original: b, normalized: alphabeticTokens(b).join(' ').toUpperCase() }))
    .filter((b) => b.normalized.length > 0);
}

export function resolveBrand(
  skuDescr: string,
  brands: readonly string[],
): string | undefined {
  const tokens = alphabeticTokens(skuDescr).slice(0, 3);
  if (tokens.length === 0) return undefined;

  const wantsZeroAlcohol = isZeroAlcoholSku(skuDescr);
  const normalized = normalizeBrands(brands);

  for (let k = tokens.length; k >= 1; k--) {
    const prefix = tokens.slice(0, k).join(' ').toUpperCase();
    const matches = normalized.filter(
      (b) => b.normalized === prefix || b.normalized.startsWith(prefix + ' '),
    );
    if (matches.length === 0) continue;
    if (matches.length === 1) return matches[0].original;

    if (wantsZeroAlcohol) {
      const nonAlc = matches.find((b) =>
        /NON-?ALCOHOLIC|FREE/.test(b.normalized),
      );
      if (nonAlc) return nonAlc.original;
    } else {
      const principal = matches
        .filter((b) => !/NON-?ALCOHOLIC|FREE/.test(b.normalized))
        .sort((a, b) => a.normalized.length - b.normalized.length)[0];
      if (principal) return principal.original;
    }
    return [...matches].sort(
      (a, b) => a.normalized.length - b.normalized.length,
    )[0].original;
  }
  return undefined;
}

function pctChange(actual: number, baseline: number): number {
  return baseline === 0 ? 0 : (actual - baseline) / baseline;
}

function sumBrandChannelMonth(
  rows: MonthlyByBrandChannel[],
  brand: string,
  channel: string,
  month: string,
  key: 'hl' | 'margen_bruto',
): number {
  let total = 0;
  for (const r of rows) {
    if (r.brand === brand && r.channel === channel && r.month === month) {
      total += r[key];
    }
  }
  return total;
}

export function buildLiftSamples(
  promos: PromoEntry[],
  monthly: MonthlyByBrandChannel[],
  brands: readonly string[],
  asOf: string,
): LiftSample[] {
  const samples: LiftSample[] = [];
  for (const p of promos) {
    // Skip rows that aren't real promo training signal: missing depth, zero
    // depth (a listing without a discount), or not yet closed.
    if (p.depth_pct == null || p.depth_pct === 0) continue;
    const endMonth = p.end_date.slice(0, 7);
    if (endMonth > asOf) continue;

    const brand = resolveBrand(p.sku_descr, brands);
    if (!brand) continue;

    const promoMonth = p.start_date.slice(0, 7);
    const priorMonth = addMonths(promoMonth, -12);

    const actualHl = sumBrandChannelMonth(
      monthly,
      brand,
      PROMO_CHANNEL,
      promoMonth,
      'hl',
    );
    const baselineHl = sumBrandChannelMonth(
      monthly,
      brand,
      PROMO_CHANNEL,
      priorMonth,
      'hl',
    );
    const actualMargin = sumBrandChannelMonth(
      monthly,
      brand,
      PROMO_CHANNEL,
      promoMonth,
      'margen_bruto',
    );
    const baselineMargin = sumBrandChannelMonth(
      monthly,
      brand,
      PROMO_CHANNEL,
      priorMonth,
      'margen_bruto',
    );

    // Require positive baselines and a positive actual: a zero or negative
    // value usually means the brand had no off-trade activity that month
    // (new SKU, prior-year gap, or returns dominating), and the resulting
    // ±100%+ pctChange would pollute the cell average. Margin can swing
    // negative inside the promo window — that's real signal — but the
    // baseline needs to be positive for the ratio to mean anything.
    if (actualHl <= 0 || baselineHl <= 0 || baselineMargin <= 0) continue;

    samples.push({
      retailer: p.retailer,
      brand,
      channel: PROMO_CHANNEL,
      mechanic: p.mechanic ?? 'PRICE',
      depthPct: p.depth_pct,
      actualHl,
      baselineHl,
      actualMargin,
      baselineMargin,
    });
  }
  return samples;
}

export function computeLiftCoefficients(
  samples: LiftSample[],
): LiftCoefficient[] {
  interface Group {
    mechanic: string;
    bucket: DepthBucket;
    hl: number[];
    margin: number[];
  }
  const groups = new Map<string, Group>();
  for (const s of samples) {
    const bucket = depthBucket(s.depthPct);
    const key = `${s.mechanic}::${bucket}`;
    const g = groups.get(key) ?? {
      mechanic: s.mechanic,
      bucket,
      hl: [],
      margin: [],
    };
    g.hl.push(pctChange(s.actualHl, s.baselineHl));
    g.margin.push(pctChange(s.actualMargin, s.baselineMargin));
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    mechanic: g.mechanic,
    depthBucket: g.bucket,
    n: g.hl.length,
    hlLift: g.hl.reduce((a, b) => a + b, 0) / g.hl.length,
    marginLift: g.margin.reduce((a, b) => a + b, 0) / g.margin.length,
  }));
}

export function inferCoefficients(
  promos: PromoEntry[],
  monthly: MonthlyByBrandChannel[],
  brands: readonly string[],
  asOf: string,
): LiftCoefficient[] {
  return computeLiftCoefficients(
    buildLiftSamples(promos, monthly, brands, asOf),
  );
}

export function lookupCoefficient(
  coeffs: LiftCoefficient[],
  mechanic: string,
  depthPct: number,
): LiftCoefficient | undefined {
  const bucket = depthBucket(depthPct);
  return coeffs.find(
    (c) => c.mechanic === mechanic && c.depthBucket === bucket,
  );
}
