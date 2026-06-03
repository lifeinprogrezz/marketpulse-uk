import { describe, it, expect } from 'vitest';

import type {
  MonthlyByBrandChannel,
  PromoEntry,
} from '../../app/lib/data/loaders';
import {
  buildLiftSamples,
  computeLiftCoefficients,
  depthBucket,
  lookupCoefficient,
  resolveBrand,
  type LiftSample,
} from '../../app/lib/forecast/lift';

const BRANDS = [
  'CARLSBERG',
  'DAMM LEMON',
  'DAURA',
  'ESTRELLA DAMM',
  'ESTRELLA NON-ALCOHOLIC',
  'VICTORIA',
] as const;

describe('depthBucket', () => {
  it('buckets to 5-percent ranges up to 25%, then "25+"', () => {
    expect(depthBucket(0)).toBe('0-5');
    expect(depthBucket(0.04999)).toBe('0-5');
    expect(depthBucket(0.05)).toBe('5-10');
    expect(depthBucket(0.08)).toBe('5-10');
    expect(depthBucket(0.1)).toBe('10-15');
    expect(depthBucket(0.15)).toBe('15-20');
    expect(depthBucket(0.2)).toBe('20-25');
    expect(depthBucket(0.25)).toBe('25+');
    expect(depthBucket(0.42)).toBe('25+');
  });
});

describe('resolveBrand', () => {
  it('matches a multi-word brand by case-insensitive prefix', () => {
    expect(resolveBrand('Damm Lemon 4x330ml Can', BRANDS)).toBe('DAMM LEMON');
  });

  it('resolves a single-word leading token to the principal brand', () => {
    expect(resolveBrand('Daura 4x330ml (Can)', BRANDS)).toBe('DAURA');
    expect(resolveBrand('Victoria Malaga 660ml NRB', BRANDS)).toBe('VICTORIA');
  });

  it('prefers ESTRELLA DAMM over ESTRELLA NON-ALCOHOLIC unless the SKU flags zero-alcohol', () => {
    expect(resolveBrand('Estrella 4x440ml Can', BRANDS)).toBe('ESTRELLA DAMM');
    expect(resolveBrand('Estrella 4x440ml 0.0% Can', BRANDS)).toBe(
      'ESTRELLA NON-ALCOHOLIC',
    );
    expect(resolveBrand('Estrella 0% 10x440ml', BRANDS)).toBe(
      'ESTRELLA NON-ALCOHOLIC',
    );
  });

  it('returns undefined when no brand can be inferred', () => {
    expect(resolveBrand('Mystery Lager 4-pack', BRANDS)).toBeUndefined();
  });
});

describe('computeLiftCoefficients', () => {
  it('averages Hl + margin lift inside each (mechanic, depth bucket) cell', () => {
    const samples: LiftSample[] = [
      {
        retailer: 'Retailer 1',
        brand: 'ESTRELLA DAMM',
        channel: 'OFF TRADE',
        mechanic: 'MTB',
        depthPct: 0.1,
        actualHl: 110,
        baselineHl: 100,
        actualMargin: 40,
        baselineMargin: 40,
      },
      {
        retailer: 'Retailer 1',
        brand: 'ESTRELLA DAMM',
        channel: 'OFF TRADE',
        mechanic: 'MTB',
        depthPct: 0.11,
        actualHl: 120,
        baselineHl: 100,
        actualMargin: 35,
        baselineMargin: 40,
      },
    ];
    const coeffs = computeLiftCoefficients(samples);
    const bucket = coeffs.find(
      (c) => c.mechanic === 'MTB' && c.depthBucket === '10-15',
    );
    expect(bucket).toBeDefined();
    expect(bucket!.n).toBe(2);
    expect(bucket!.hlLift).toBeCloseTo(0.15, 3);
    expect(bucket!.marginLift).toBeCloseTo(-0.0625, 4);
  });

  it('groups distinct (mechanic, bucket) pairs separately', () => {
    const samples: LiftSample[] = [
      {
        retailer: 'R',
        brand: 'DAURA',
        channel: 'OFF TRADE',
        mechanic: 'PRICE',
        depthPct: 0.06,
        actualHl: 60,
        baselineHl: 50,
        actualMargin: 20,
        baselineMargin: 20,
      },
      {
        retailer: 'R',
        brand: 'DAURA',
        channel: 'OFF TRADE',
        mechanic: '3 for £6.00',
        depthPct: 0.18,
        actualHl: 80,
        baselineHl: 50,
        actualMargin: 15,
        baselineMargin: 20,
      },
    ];
    const coeffs = computeLiftCoefficients(samples);
    expect(coeffs).toHaveLength(2);
  });
});

describe('lookupCoefficient', () => {
  const coeffs = computeLiftCoefficients([
    {
      retailer: 'R',
      brand: 'B',
      channel: 'OFF TRADE',
      mechanic: 'PRICE',
      depthPct: 0.08,
      actualHl: 110,
      baselineHl: 100,
      actualMargin: 40,
      baselineMargin: 40,
    },
  ]);

  it('finds the coefficient for a (mechanic, depth) pair via its bucket', () => {
    const c = lookupCoefficient(coeffs, 'PRICE', 0.07);
    expect(c).toBeDefined();
    expect(c!.depthBucket).toBe('5-10');
  });

  it('returns undefined when the bucket has no observations', () => {
    expect(lookupCoefficient(coeffs, 'PRICE', 0.32)).toBeUndefined();
    expect(lookupCoefficient(coeffs, 'MTB', 0.07)).toBeUndefined();
  });
});

describe('buildLiftSamples', () => {
  const monthly: MonthlyByBrandChannel[] = [
    // Prior-year baseline (March 2025)
    {
      month: '2025-03',
      brand: 'ESTRELLA DAMM',
      channel: 'OFF TRADE',
      hl: 100,
      venta_neta: 0,
      margen_bruto: 200,
      mktg_fund: 0,
    },
    // Promo month (March 2026)
    {
      month: '2026-03',
      brand: 'ESTRELLA DAMM',
      channel: 'OFF TRADE',
      hl: 130,
      venta_neta: 0,
      margen_bruto: 180,
      mktg_fund: 0,
    },
    // Irrelevant: same brand, different channel — should be excluded
    {
      month: '2026-03',
      brand: 'ESTRELLA DAMM',
      channel: 'ON TRADE',
      hl: 9999,
      venta_neta: 0,
      margen_bruto: 9999,
      mktg_fund: 0,
    },
  ];

  const promos: PromoEntry[] = [
    {
      retailer: 'Retailer 1',
      sku_descr: 'Estrella 4x440ml Can',
      start_date: '2026-03-02',
      end_date: '2026-03-15',
      promo_price: 5,
      mechanic: null,
      depth_pct: 0.1,
    },
    // Should be skipped: not yet closed as of asOf
    {
      retailer: 'Retailer 1',
      sku_descr: 'Estrella 4x440ml Can',
      start_date: '2026-05-01',
      end_date: '2026-05-10',
      promo_price: 5,
      mechanic: null,
      depth_pct: 0.1,
    },
    // Should be skipped: depth_pct is null
    {
      retailer: 'Retailer 1',
      sku_descr: 'Estrella 4x440ml Can',
      start_date: '2026-03-02',
      end_date: '2026-03-15',
      promo_price: null,
      mechanic: 'MTB',
      depth_pct: null,
    },
  ];

  it('matches a closed promo against brand × OFF TRADE × month with the prior-year baseline', () => {
    const samples = buildLiftSamples(promos, monthly, BRANDS, '2026-04');
    expect(samples).toHaveLength(1);
    const s = samples[0];
    expect(s.brand).toBe('ESTRELLA DAMM');
    expect(s.channel).toBe('OFF TRADE');
    expect(s.actualHl).toBe(130);
    expect(s.baselineHl).toBe(100);
    expect(s.actualMargin).toBe(180);
    expect(s.baselineMargin).toBe(200);
    expect(s.mechanic).toBe('PRICE');
  });

  it('falls back to mechanic "PRICE" when the promo has only a price and no mechanic label', () => {
    const samples = buildLiftSamples(promos, monthly, BRANDS, '2026-04');
    expect(samples[0].mechanic).toBe('PRICE');
  });

  it('skips promos with depth_pct === 0 — a listing without a discount is not a lift observation', () => {
    const zeroDepth: PromoEntry[] = [
      {
        retailer: 'Retailer 1',
        sku_descr: 'Estrella 4x440ml Can',
        start_date: '2026-03-02',
        end_date: '2026-03-15',
        promo_price: 5,
        mechanic: null,
        depth_pct: 0,
      },
    ];
    expect(buildLiftSamples(zeroDepth, monthly, BRANDS, '2026-04')).toHaveLength(0);
  });

  it('skips samples whose baseline Hl, baseline margin, or actual Hl is non-positive', () => {
    const negMonthly: MonthlyByBrandChannel[] = [
      // Negative-Hl prior year (returns dominated)
      { month: '2025-03', brand: 'DAURA', channel: 'OFF TRADE', hl: -5, venta_neta: 0, margen_bruto: 50, mktg_fund: 0 },
      { month: '2026-03', brand: 'DAURA', channel: 'OFF TRADE', hl: 80, venta_neta: 0, margen_bruto: 30, mktg_fund: 0 },
      // Zero-actual promo month (brand had no off-trade sales)
      { month: '2025-03', brand: 'VICTORIA', channel: 'OFF TRADE', hl: 50, venta_neta: 0, margen_bruto: 60, mktg_fund: 0 },
      { month: '2026-03', brand: 'VICTORIA', channel: 'OFF TRADE', hl: 0, venta_neta: 0, margen_bruto: 0, mktg_fund: 0 },
      // Negative baseline margin (one-off rebate prior year)
      { month: '2025-03', brand: 'CARLSBERG', channel: 'OFF TRADE', hl: 40, venta_neta: 0, margen_bruto: -10, mktg_fund: 0 },
      { month: '2026-03', brand: 'CARLSBERG', channel: 'OFF TRADE', hl: 50, venta_neta: 0, margen_bruto: 20, mktg_fund: 0 },
    ];
    const bad: PromoEntry[] = [
      { retailer: 'R1', sku_descr: 'Daura 4x330ml (Can)', start_date: '2026-03-02', end_date: '2026-03-15', promo_price: 5, mechanic: null, depth_pct: 0.1 },
      { retailer: 'R1', sku_descr: 'Victoria Malaga 660ml NRB', start_date: '2026-03-02', end_date: '2026-03-15', promo_price: 5, mechanic: null, depth_pct: 0.1 },
      { retailer: 'R1', sku_descr: 'Carlsberg 4x440ml Can', start_date: '2026-03-02', end_date: '2026-03-15', promo_price: 5, mechanic: null, depth_pct: 0.1 },
    ];
    expect(buildLiftSamples(bad, negMonthly, BRANDS, '2026-04')).toHaveLength(0);
  });
});

describe('resolveBrand — ampersand-containing brand names', () => {
  it('matches brand names whose normalized tokens align with the SKU even when the brand contains punctuation', () => {
    const brandsWithPunct = ['INNIS & GUNN', 'ESTRELLA DAMM'] as const;
    expect(resolveBrand('Innis & Gunn 4x330ml Can', brandsWithPunct)).toBe('INNIS & GUNN');
    expect(resolveBrand('Innis Gunn 4x330ml', brandsWithPunct)).toBe('INNIS & GUNN');
  });

  it('ignores junk brand entries (e.g. "#") that normalize to empty', () => {
    const brandsWithJunk = ['#', 'Dummy', 'ESTRELLA DAMM'] as const;
    expect(resolveBrand('Estrella 4x440ml Can', brandsWithJunk)).toBe('ESTRELLA DAMM');
  });
});
