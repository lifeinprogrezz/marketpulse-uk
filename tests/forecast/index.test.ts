import { describe, expect, it } from 'vitest';

import { forecast } from '../../app/lib/forecast';
import { getMeta } from '../../app/lib/data/loaders';

describe('forecast', () => {
  it('returns history terminating at the last closed month and `horizonMonths` projections beyond it', () => {
    const meta = getMeta();
    const fc = forecast({ horizonMonths: 3 });

    expect(fc.asOf).toBe(meta.last_closed_month);
    expect(fc.history.length).toBeGreaterThan(0);
    expect(fc.history[fc.history.length - 1].month).toBe(meta.last_closed_month);
    expect(fc.projection).toHaveLength(3);

    const allHistoryMonths = fc.history.map((h) => h.month);
    const sorted = [...allHistoryMonths].sort();
    expect(allHistoryMonths).toEqual(sorted);
  });

  it('projects positive Hl for the UK pilot data', () => {
    const fc = forecast({ horizonMonths: 1 });
    expect(fc.projection[0].hl).toBeGreaterThan(0);
  });

  it('filtering by channel returns a smaller history sum than unfiltered', () => {
    const total = forecast();
    const offTrade = forecast({ filter: { channel: 'OFF TRADE' } });
    const totalSum = total.history.reduce((a, h) => a + h.hl, 0);
    const offSum = offTrade.history.reduce((a, h) => a + h.hl, 0);
    expect(offSum).toBeGreaterThan(0);
    expect(offSum).toBeLessThan(totalSum);
  });

  it('filtering by brand returns a smaller history sum than unfiltered', () => {
    const total = forecast();
    const oneBrand = forecast({ filter: { brand: 'ESTRELLA DAMM' } });
    const totalSum = total.history.reduce((a, h) => a + h.hl, 0);
    const brandSum = oneBrand.history.reduce((a, h) => a + h.hl, 0);
    expect(brandSum).toBeGreaterThan(0);
    expect(brandSum).toBeLessThan(totalSum);
  });
});
