import { describe, expect, it } from 'vitest';

import {
  getCustomers,
  getMeta,
  getMonthlyByBrandChannel,
  getMonthlyByCustomer,
  getMonthlyBySku,
  getPromos,
} from '../../app/lib/data/loaders';

describe('loaders', () => {
  it('getMeta returns months sorted ascending and a non-empty brands list', () => {
    const m = getMeta();
    expect(m.months.length).toBeGreaterThan(0);
    expect(m.brands.length).toBeGreaterThan(0);
    expect([...m.months].sort()).toEqual(m.months);
    expect(m.last_closed_month).toBe(m.months[m.months.length - 1]);
  });

  it('getMonthlyByBrandChannel returns rows with the documented shape', () => {
    const rows = getMonthlyByBrandChannel();
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0];
    expect(typeof r.month).toBe('string');
    expect(typeof r.brand).toBe('string');
    expect(typeof r.channel).toBe('string');
    expect(typeof r.hl).toBe('number');
    expect(typeof r.margen_bruto).toBe('number');
  });

  it('getCustomers returns anonymized labels', () => {
    const cs = getCustomers();
    expect(cs.length).toBeGreaterThan(0);
    for (const c of cs.slice(0, 5)) {
      expect(c.anon_id).toMatch(/#\d+$/);
    }
  });

  it('getMonthlyByCustomer and getMonthlyBySku reconcile to brand×channel totals', () => {
    const month = getMeta().last_closed_month;
    const sumHl = (rows: Array<{ month: string; hl: number }>) =>
      rows.reduce((a, r) => (r.month === month ? a + r.hl : a), 0);
    const baseline = sumHl(getMonthlyByBrandChannel());
    expect(sumHl(getMonthlyByCustomer())).toBeCloseTo(baseline, 2);
    expect(sumHl(getMonthlyBySku())).toBeCloseTo(baseline, 2);
  });

  it('getPromos returns rows with anonymized retailers and no leaked real names', () => {
    const promos = getPromos();
    expect(promos.length).toBeGreaterThan(0);
    const realNames = /tesco|sainsbury|asda|morrisons|waitrose/i;
    for (const p of promos) {
      expect(p.retailer).toMatch(/^Retailer \d+$/);
      expect(p.retailer).not.toMatch(realNames);
    }
    // depth_pct, when present, is a fraction in [0, 1).
    for (const p of promos) {
      if (p.depth_pct != null) {
        expect(p.depth_pct).toBeGreaterThanOrEqual(0);
        expect(p.depth_pct).toBeLessThan(1);
      }
    }
  });
});
