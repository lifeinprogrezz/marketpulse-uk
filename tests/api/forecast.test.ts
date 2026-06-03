import { describe, expect, it } from 'vitest';

import { GET, parseHorizon } from '../../app/api/forecast/route';

function call(url: string): Response {
  return GET(new Request(url));
}

async function body<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

interface ForecastResponse {
  asOf: string;
  history: Array<{ month: string; hl: number; margen_bruto: number }>;
  projection: Array<{
    month: string;
    hl: number;
    margen_bruto: number;
    low: number;
    high: number;
  }>;
  horizonMonths: number;
  filter: { brand: string | null; channel: string | null };
}

describe('parseHorizon', () => {
  it('defaults to 3 when missing, NaN, or below 1', () => {
    expect(parseHorizon(null)).toBe(3);
    expect(parseHorizon('abc')).toBe(3);
    expect(parseHorizon('0')).toBe(3);
    expect(parseHorizon('-4')).toBe(3);
  });

  it('clamps to 12 max and floors fractional input', () => {
    expect(parseHorizon('100')).toBe(12);
    expect(parseHorizon('6.7')).toBe(6);
    expect(parseHorizon('1')).toBe(1);
  });
});

describe('GET /api/forecast', () => {
  it('returns the default horizon-3 forecast when no params', async () => {
    const res = call('http://localhost/api/forecast');
    expect(res.status).toBe(200);
    const b = await body<ForecastResponse>(res);
    expect(b.horizonMonths).toBe(3);
    expect(b.projection).toHaveLength(3);
    expect(b.history.length).toBeGreaterThan(0);
    expect(b.filter).toEqual({ brand: null, channel: null });
  });

  it('honours horizon and echoes it back on the payload', async () => {
    const b = await body<ForecastResponse>(call('http://localhost/api/forecast?horizon=6'));
    expect(b.horizonMonths).toBe(6);
    expect(b.projection).toHaveLength(6);
  });

  it('filters by brand — filtered Hl never exceeds the unfiltered total in any month', async () => {
    const all = await body<ForecastResponse>(call('http://localhost/api/forecast'));
    const filtered = await body<ForecastResponse>(
      call('http://localhost/api/forecast?brand=ESTRELLA%20DAMM'),
    );
    expect(filtered.filter).toEqual({ brand: 'ESTRELLA DAMM', channel: null });
    expect(filtered.history.length).toBeGreaterThan(0);
    const allByMonth = new Map(all.history.map((h) => [h.month, h.hl]));
    for (const h of filtered.history) {
      const total = allByMonth.get(h.month);
      expect(total).toBeDefined();
      expect(h.hl).toBeLessThanOrEqual(total! + 1e-6);
    }
  });

  it('filters by channel', async () => {
    const offTrade = await body<ForecastResponse>(
      call('http://localhost/api/forecast?channel=OFF%20TRADE'),
    );
    expect(offTrade.filter).toEqual({ brand: null, channel: 'OFF TRADE' });
    expect(offTrade.history.length).toBeGreaterThan(0);
  });
});
