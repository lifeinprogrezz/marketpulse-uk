/**
 * MarketPulse AI Analyst tools.
 *
 * Six tools the chat agent can call against Damm's internal UK data, in
 * addition to the Cala MCP tools (which stay scoped to external context
 * only). Every tool reads from the cached snapshot in `./cache` so they
 * answer against a single, stable view of the data across one chat turn.
 *
 * Each `execute` is a pure function of the cache + its arguments — easy
 * to unit-test without spinning up the SDK runtime.
 */

import { tool } from 'ai';
import { z } from 'zod';

import { getData } from './cache';
import { getMonthlyByCustomer } from './data/loaders';
import { computeEffectiveness } from './forecast/effectiveness';
import { forecast } from './forecast';
import {
  lookupCoefficient,
  resolveBrand,
  type LiftCoefficient,
} from './forecast/lift';

const PROMO_CHANNEL = 'OFF TRADE';

function priorYearMonth(month: string): string {
  const [year, m] = month.split('-');
  return `${parseInt(year, 10) - 1}-${m}`;
}

function sumForMonth(
  rows: ReturnType<typeof getData>['monthly'],
  month: string,
  field: 'hl' | 'margen_bruto' | 'venta_neta' | 'mktg_fund',
): number {
  let total = 0;
  for (const r of rows) {
    if (r.month === month) total += r[field];
  }
  return total;
}

function sumBrandChannelMonth(
  rows: ReturnType<typeof getData>['monthly'],
  brand: string,
  channel: string,
  month: string,
  key: 'hl' | 'margen_bruto' | 'mktg_fund',
): number {
  let total = 0;
  for (const r of rows) {
    if (r.brand === brand && r.channel === channel && r.month === month) {
      total += r[key];
    }
  }
  return total;
}

interface DecomposedRow {
  label: string;
  hl: number;
  margen_bruto: number;
}

function decompose(
  dimension: 'channel' | 'brand' | 'top_customers',
  asOf: string,
  cache: ReturnType<typeof getData>,
): DecomposedRow[] {
  const buckets = new Map<string, { hl: number; margen_bruto: number }>();
  if (dimension === 'top_customers') {
    for (const r of getMonthlyByCustomer()) {
      if (r.month !== asOf) continue;
      const cur = buckets.get(r.anon_id) ?? { hl: 0, margen_bruto: 0 };
      cur.hl += r.hl;
      cur.margen_bruto += r.margen_bruto;
      buckets.set(r.anon_id, cur);
    }
  } else {
    for (const r of cache.monthly) {
      if (r.month !== asOf) continue;
      const key = dimension === 'channel' ? r.channel : r.brand;
      const cur = buckets.get(key) ?? { hl: 0, margen_bruto: 0 };
      cur.hl += r.hl;
      cur.margen_bruto += r.margen_bruto;
      buckets.set(key, cur);
    }
  }
  const out: DecomposedRow[] = [...buckets.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.hl - a.hl);
  return dimension === 'top_customers' ? out.slice(0, 5) : out;
}

export const marketpulseTools = {
  get_last_closed_month_summary: tool({
    description:
      'Total Hl + Margen Bruto for the latest closed month, YoY delta vs the same month last year, and next-3-month projected totals. Start here when the user asks how the month closed.',
    inputSchema: z.object({}),
    execute: async () => {
      const cache = getData();
      const asOf = cache.asOf;
      const prior = priorYearMonth(asOf);
      const lastMonthHl = sumForMonth(cache.monthly, asOf, 'hl');
      const lastMonthMargin = sumForMonth(cache.monthly, asOf, 'margen_bruto');
      const priorHl = sumForMonth(cache.monthly, prior, 'hl');
      const priorMargin = sumForMonth(cache.monthly, prior, 'margen_bruto');
      const fc = forecast({ asOf, horizonMonths: 3 });
      return {
        asOf,
        lastMonthHl,
        lastMonthMargin,
        priorYearMonthHl: priorHl,
        priorYearMonthMargin: priorMargin,
        yoyDeltaPct: priorHl > 0 ? (lastMonthHl - priorHl) / priorHl : NaN,
        next3MonthsHl: fc.projection.reduce((a, p) => a + p.hl, 0),
        next3MonthsMargin: fc.projection.reduce((a, p) => a + p.margen_bruto, 0),
      };
    },
  }),

  get_decomposition: tool({
    description:
      'Decomposition of the last closed month: where the volume came from. Pass dimension = "channel" | "brand" | "top_customers" (top customers are capped at 5 rows).',
    inputSchema: z.object({
      dimension: z.enum(['channel', 'brand', 'top_customers']),
    }),
    execute: async ({ dimension }) => {
      const cache = getData();
      return decompose(dimension, cache.asOf, cache);
    },
  }),

  get_promo_effectiveness: tool({
    description:
      'Observed Hl lift, Margen Bruto lift, margin delta, and ROI proxy for promos that have closed. Capped at the 10 most recently-ended promos to keep the response compact. Rows where the brand cannot be resolved are dropped silently.',
    inputSchema: z.object({}),
    execute: async () => {
      const cache = getData();
      const closed = cache.promos
        .filter(
          (p) =>
            p.end_date.slice(0, 7) <= cache.asOf &&
            p.depth_pct != null &&
            p.depth_pct > 0,
        )
        .sort((a, b) => b.end_date.localeCompare(a.end_date))
        .slice(0, 10);

      const rows = [];
      for (const p of closed) {
        const brand = resolveBrand(p.sku_descr, cache.meta.brands);
        if (!brand) continue;
        const promoMonth = p.start_date.slice(0, 7);
        const prior = priorYearMonth(promoMonth);
        rows.push(
          computeEffectiveness({
            retailer: p.retailer,
            skuDescr: p.sku_descr,
            actualHl: sumBrandChannelMonth(cache.monthly, brand, PROMO_CHANNEL, promoMonth, 'hl'),
            baselineHl: sumBrandChannelMonth(cache.monthly, brand, PROMO_CHANNEL, prior, 'hl'),
            actualMargin: sumBrandChannelMonth(cache.monthly, brand, PROMO_CHANNEL, promoMonth, 'margen_bruto'),
            baselineMargin: sumBrandChannelMonth(cache.monthly, brand, PROMO_CHANNEL, prior, 'margen_bruto'),
            mktgFund: sumBrandChannelMonth(cache.monthly, brand, PROMO_CHANNEL, promoMonth, 'mktg_fund'),
          }),
        );
      }
      return rows;
    },
  }),

  simulate_promo: tool({
    description:
      'Coefficient-backed estimate of Hl and Margen Bruto lift for activating a promo at a given mechanic + depth. Returns sampleSize — caveat any answer when sampleSize < 3.',
    inputSchema: z.object({
      mechanic: z
        .string()
        .describe(
          'Mechanic label exactly as it appears in the trade plan, e.g. "PRICE", "MTB", "3 for £6.00".',
        ),
      depthPct: z
        .number()
        .min(0)
        .max(0.6)
        .describe('Discount depth as a fraction in [0, 0.6]. 0.10 = 10%.'),
    }),
    execute: async ({ mechanic, depthPct }) => {
      const { coeffs } = getData();
      const c = lookupCoefficient(coeffs, mechanic, depthPct);
      if (!c) {
        const available = [...new Set(coeffs.map((x) => x.mechanic))]
          .slice(0, 8)
          .join(', ');
        return {
          mechanic,
          depthPct,
          hlLiftPctEstimate: null,
          marginLiftPctEstimate: null,
          sampleSize: 0,
          note: `No historical observation for mechanic "${mechanic}" at depth ${(depthPct * 100).toFixed(0)}%. Mechanics with data: ${available}.`,
        };
      }
      return {
        mechanic,
        depthPct,
        hlLiftPctEstimate: c.hlLift,
        marginLiftPctEstimate: c.marginLift,
        sampleSize: c.n,
      };
    },
  }),

  suggest_lever: tool({
    description:
      'Rank currently-planned promos (end_date after the last closed month) by expected margin lift from historical coefficients and return the top one with rationale.',
    inputSchema: z.object({}),
    execute: async () => {
      const cache = getData();
      const open = cache.promos.filter(
        (p) =>
          p.end_date.slice(0, 7) > cache.asOf &&
          p.depth_pct != null &&
          p.depth_pct > 0,
      );
      if (open.length === 0) {
        return {
          suggestion: null,
          rationale: 'No planned promos with non-zero depth in the window.',
        };
      }
      const scored = open
        .map((p) => ({
          p,
          coeff: lookupCoefficient(
            cache.coeffs,
            p.mechanic ?? 'PRICE',
            p.depth_pct ?? 0,
          ),
        }))
        .filter(
          (s): s is { p: typeof s.p; coeff: LiftCoefficient } =>
            s.coeff != null && Number.isFinite(s.coeff.marginLift),
        )
        .sort((a, b) => b.coeff.marginLift - a.coeff.marginLift);
      if (scored.length === 0) {
        return {
          suggestion: null,
          rationale:
            'No planned promo matches a historical mechanic × depth bucket.',
        };
      }
      const best = scored[0];
      const depthLabel = ((best.p.depth_pct ?? 0) * 100).toFixed(0);
      return {
        suggestion: {
          retailer: best.p.retailer,
          sku_descr: best.p.sku_descr,
          mechanic: best.p.mechanic ?? 'PRICE',
          depth_pct: best.p.depth_pct,
          start_date: best.p.start_date,
          end_date: best.p.end_date,
        },
        expectedHlLiftPct: best.coeff.hlLift,
        expectedMarginLiftPct: best.coeff.marginLift,
        sampleSize: best.coeff.n,
        rationale: `Among ${open.length} planned promos with non-zero depth, ${best.p.retailer} · ${best.p.sku_descr} at depth ${depthLabel}% (mechanic "${best.p.mechanic ?? 'PRICE'}") has the highest historical margin lift for its mechanic × depth bucket (n=${best.coeff.n}).`,
      };
    },
  }),

  compare_yoy: tool({
    description:
      'Compare the last closed month to the same month one year earlier by channel | brand | top_customers. Sorted by absolute delta percentage (biggest movers first); top_customers capped at 10.',
    inputSchema: z.object({
      dimension: z.enum(['channel', 'brand', 'top_customers']),
    }),
    execute: async ({ dimension }) => {
      const cache = getData();
      const asOf = cache.asOf;
      const prior = priorYearMonth(asOf);
      const current = decompose(dimension, asOf, cache);
      const previous = decompose(dimension, prior, cache);
      const priorByLabel = new Map(previous.map((r) => [r.label, r]));
      const labels = new Set([
        ...current.map((r) => r.label),
        ...previous.map((r) => r.label),
      ]);
      const out = [...labels].map((label) => {
        const c = current.find((r) => r.label === label)?.hl ?? 0;
        const p = priorByLabel.get(label)?.hl ?? 0;
        return {
          label,
          current: c,
          prior: p,
          deltaPct: p > 0 ? (c - p) / p : NaN,
        };
      });
      out.sort((a, b) => {
        const aAbs = Number.isFinite(a.deltaPct) ? Math.abs(a.deltaPct) : -1;
        const bAbs = Number.isFinite(b.deltaPct) ? Math.abs(b.deltaPct) : -1;
        return bAbs - aAbs;
      });
      return dimension === 'top_customers' ? out.slice(0, 10) : out;
    },
  }),
};
