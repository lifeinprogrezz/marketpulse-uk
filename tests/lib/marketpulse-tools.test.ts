import { describe, expect, it } from 'vitest';

import { getData } from '../../app/lib/cache';
import { marketpulseTools } from '../../app/lib/marketpulse-tools';

type Tool = (typeof marketpulseTools)[keyof typeof marketpulseTools];

async function exec<I, O>(
  t: { execute?: (input: I, options: unknown) => Promise<O> | O } | Tool,
  input: I,
): Promise<O> {
  if (!('execute' in t) || typeof t.execute !== 'function') {
    throw new Error('Tool has no execute');
  }
  const result = await (t.execute as (i: I, o: unknown) => Promise<O>)(input, {} as unknown);
  return result;
}

describe('get_last_closed_month_summary', () => {
  it('reports asOf = meta.last_closed_month and YoY against the same month last year', async () => {
    const cache = getData();
    const out = await exec<Record<string, never>, {
      asOf: string;
      lastMonthHl: number;
      lastMonthMargin: number;
      priorYearMonthHl: number;
      yoyDeltaPct: number;
      next3MonthsHl: number;
    }>(marketpulseTools.get_last_closed_month_summary, {});
    expect(out.asOf).toBe(cache.asOf);
    expect(out.lastMonthHl).toBeGreaterThan(0);
    expect(out.lastMonthMargin).toBeGreaterThan(0);
    expect(out.priorYearMonthHl).toBeGreaterThan(0);
    expect(Number.isFinite(out.yoyDeltaPct)).toBe(true);
    expect(out.next3MonthsHl).toBeGreaterThan(0);
  });
});

describe('get_decomposition', () => {
  it('returns channel rows sorted by Hl descending', async () => {
    const rows = await exec<{ dimension: 'channel' }, Array<{ label: string; hl: number; margen_bruto: number }>>(
      marketpulseTools.get_decomposition,
      { dimension: 'channel' },
    );
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].hl).toBeGreaterThanOrEqual(rows[i].hl);
    }
  });

  it('returns brand rows aggregated correctly (sum matches the raw monthly slice)', async () => {
    const cache = getData();
    const rows = await exec<{ dimension: 'brand' }, Array<{ label: string; hl: number }>>(
      marketpulseTools.get_decomposition,
      { dimension: 'brand' },
    );
    const totalFromTool = rows.reduce((a, r) => a + r.hl, 0);
    const totalFromCache = cache.monthly
      .filter((r) => r.month === cache.asOf)
      .reduce((a, r) => a + r.hl, 0);
    expect(totalFromTool).toBeCloseTo(totalFromCache, 6);
  });

  it('caps top_customers at 5 rows', async () => {
    const rows = await exec<{ dimension: 'top_customers' }, unknown[]>(
      marketpulseTools.get_decomposition,
      { dimension: 'top_customers' },
    );
    expect(rows.length).toBeLessThanOrEqual(5);
  });
});

describe('get_promo_effectiveness', () => {
  it('returns up to 10 EffectivenessResult rows for closed promos only', async () => {
    const cache = getData();
    const rows = await exec<Record<string, never>, Array<{
      retailer: string;
      skuDescr: string;
      observedHlLift: number;
      marginDelta: number;
      roiProxy: number;
    }>>(marketpulseTools.get_promo_effectiveness, {});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(10);
    for (const r of rows) {
      expect(typeof r.retailer).toBe('string');
      expect(typeof r.skuDescr).toBe('string');
      expect(typeof r.marginDelta).toBe('number');
    }
    // All anonymized — never a real retailer name
    for (const r of rows) {
      expect(r.retailer).toMatch(/^Retailer \d+$/);
    }
    void cache;
  });
});

describe('simulate_promo', () => {
  it('returns the historical coefficient when one exists for the mechanic × depth bucket', async () => {
    const { coeffs } = getData();
    const c = coeffs.find((x) => x.n >= 5) ?? coeffs[0];
    const midDepth = ({ '0-5': 0.03, '5-10': 0.07, '10-15': 0.12, '15-20': 0.17, '20-25': 0.22, '25+': 0.28 } as const)[c.depthBucket];
    const out = await exec<{ mechanic: string; depthPct: number }, {
      sampleSize: number;
      hlLiftPctEstimate: number | null;
      marginLiftPctEstimate: number | null;
      note?: string;
    }>(marketpulseTools.simulate_promo, { mechanic: c.mechanic, depthPct: midDepth });
    expect(out.sampleSize).toBe(c.n);
    expect(out.hlLiftPctEstimate).toBeCloseTo(c.hlLift, 6);
    expect(out.marginLiftPctEstimate).toBeCloseTo(c.marginLift, 6);
    expect(out.note).toBeUndefined();
  });

  it('returns sampleSize 0 and a diagnostic note for an unknown mechanic', async () => {
    const out = await exec<{ mechanic: string; depthPct: number }, {
      sampleSize: number;
      hlLiftPctEstimate: number | null;
      marginLiftPctEstimate: number | null;
      note?: string;
    }>(marketpulseTools.simulate_promo, { mechanic: '__nonexistent__', depthPct: 0.1 });
    expect(out.sampleSize).toBe(0);
    expect(out.hlLiftPctEstimate).toBeNull();
    expect(out.marginLiftPctEstimate).toBeNull();
    expect(out.note).toMatch(/Mechanics with data/);
  });
});

describe('suggest_lever', () => {
  it('returns either a ranked suggestion with rationale, or null when nothing qualifies', async () => {
    const out = await exec<Record<string, never>, {
      suggestion: { retailer: string; mechanic: string; depth_pct: number | null } | null;
      expectedMarginLiftPct?: number;
      sampleSize?: number;
      rationale: string;
    }>(marketpulseTools.suggest_lever, {});
    expect(typeof out.rationale).toBe('string');
    if (out.suggestion) {
      expect(out.suggestion.retailer).toMatch(/^Retailer \d+$/);
      expect(typeof out.suggestion.mechanic).toBe('string');
      expect(out.expectedMarginLiftPct).toBeDefined();
      expect(Number.isFinite(out.expectedMarginLiftPct!)).toBe(true);
      expect(out.sampleSize).toBeGreaterThan(0);
    }
  });
});

describe('compare_yoy', () => {
  it('sorts brand-level deltas by |deltaPct| descending', async () => {
    const rows = await exec<{ dimension: 'brand' }, Array<{
      label: string;
      current: number;
      prior: number;
      deltaPct: number;
    }>>(marketpulseTools.compare_yoy, { dimension: 'brand' });
    expect(rows.length).toBeGreaterThan(0);
    let prevAbs = Infinity;
    for (const r of rows) {
      const abs = Number.isFinite(r.deltaPct) ? Math.abs(r.deltaPct) : -1;
      expect(abs).toBeLessThanOrEqual(prevAbs);
      prevAbs = abs;
    }
  });

  it('caps top_customers at 10 rows', async () => {
    const rows = await exec<{ dimension: 'top_customers' }, unknown[]>(
      marketpulseTools.compare_yoy,
      { dimension: 'top_customers' },
    );
    expect(rows.length).toBeLessThanOrEqual(10);
  });
});
