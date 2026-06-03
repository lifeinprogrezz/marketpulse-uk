import { beforeEach, describe, expect, it } from 'vitest';

import { __resetCache, getData } from '../../app/lib/cache';
import { getMeta } from '../../app/lib/data/loaders';

describe('getData', () => {
  beforeEach(() => __resetCache());

  it('exposes meta, monthly, promos, and asOf wired to last_closed_month', () => {
    const meta = getMeta();
    const cache = getData();
    expect(cache.meta).toBe(meta);
    expect(cache.asOf).toBe(meta.last_closed_month);
    expect(cache.monthly.length).toBeGreaterThan(0);
    expect(cache.promos.length).toBeGreaterThan(0);
  });

  it('precomputes coefficients with positive sample counts', () => {
    const { coeffs } = getData();
    expect(coeffs.length).toBeGreaterThan(0);
    for (const c of coeffs) {
      expect(typeof c.mechanic).toBe('string');
      expect(typeof c.hlLift).toBe('number');
      expect(Number.isFinite(c.hlLift)).toBe(true);
      expect(c.n).toBeGreaterThan(0);
    }
  });

  it('returns the same object reference on repeated calls', () => {
    expect(getData()).toBe(getData());
  });

  it('rebuilds after __resetCache', () => {
    const a = getData();
    __resetCache();
    const b = getData();
    expect(a).not.toBe(b);
    expect(b.asOf).toBe(a.asOf);
  });
});
