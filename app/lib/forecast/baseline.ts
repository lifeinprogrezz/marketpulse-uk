/**
 * Baseline monthly forecast: prior-year same month × trailing-12 trend.
 *
 * The shape mirrors the build-time JSON artifacts in
 * `app/lib/data/__generated__/uk-monthly.json` — `month` is a "YYYY-MM"
 * string and we keep all date arithmetic at the string level so we never
 * need a Date round-trip.
 */

export interface MonthlyValue {
  month: string; // "YYYY-MM"
  hl: number;
  margen_bruto: number;
}

export interface Projected {
  month: string;
  hl: number;
  margen_bruto: number;
}

export function addMonths(month: string, n: number): string {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const totalIdx = y * 12 + (m - 1) + n;
  const ny = Math.floor(totalIdx / 12);
  const nm = (totalIdx % 12 + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, '0')}`;
}

function sumWindow(
  series: MonthlyValue[],
  end: string,
  monthsBack: number,
  key: 'hl' | 'margen_bruto',
): number {
  const start = addMonths(end, -monthsBack + 1);
  let sum = 0;
  for (const v of series) {
    if (v.month >= start && v.month <= end) sum += v[key];
  }
  return sum;
}

/** Average per present month — divides by actual count, not the nominal window size. */
function avgWindow(
  series: MonthlyValue[],
  end: string,
  monthsBack: number,
  key: 'hl' | 'margen_bruto',
): number {
  const start = addMonths(end, -monthsBack + 1);
  let total = 0;
  let n = 0;
  for (const v of series) {
    if (v.month >= start && v.month <= end) {
      total += v[key];
      n += 1;
    }
  }
  return n > 0 ? total / n : 0;
}

function findSameMonthLastYear(
  series: MonthlyValue[],
  target: string,
): MonthlyValue | undefined {
  const prior = addMonths(target, -12);
  return series.find((v) => v.month === prior);
}

export function project(
  history: MonthlyValue[],
  asOf: string,
  horizonMonths: number,
): Projected[] {
  const recent12Hl = sumWindow(history, asOf, 12, 'hl');
  const prior12Hl = sumWindow(history, addMonths(asOf, -12), 12, 'hl');
  const trend = prior12Hl > 0 ? recent12Hl / prior12Hl : 1;
  const avgHl = avgWindow(history, asOf, 12, 'hl');
  const avgMargin = avgWindow(history, asOf, 12, 'margen_bruto');

  const out: Projected[] = [];
  for (let h = 1; h <= horizonMonths; h++) {
    const target = addMonths(asOf, h);
    const prev = findSameMonthLastYear(history, target);
    const hl = prev ? prev.hl * trend : avgHl;
    const margin = prev ? prev.margen_bruto * trend : avgMargin;
    out.push({
      month: target,
      hl,
      margen_bruto: margin,
    });
  }
  return out;
}
