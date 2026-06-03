/**
 * Regressor correlation analysis (Task 16, stretch).
 *
 * Computes Pearson correlation between monthly UK Hl (and Margen Bruto)
 * and a handful of free external signals to decide which ones — if any —
 * are worth wiring into the forecast engine.
 *
 * Run: `npx tsx scripts/regressor-analysis.ts`
 *
 * The plan: keep signals where |ρ| ≥ 0.3 against Hl; document the rest as
 * "tested, did not move volume in the available history" so we don't
 * re-litigate them later.
 */

import { getMonthlyByBrandChannel } from '../app/lib/data/loaders';
import {
  isEasterMonth,
  loadUkHolidaysPerMonth,
} from '../app/lib/external/holidays';
import {
  loadDaysAboveThresholdBedford,
  loadMonthlyMeanTemperatureBedford,
} from '../app/lib/external/weather';

interface Series {
  label: string;
  values: number[];
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 3) return NaN;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? NaN : num / denom;
}

function aggregateByMonth(
  rows: ReturnType<typeof getMonthlyByBrandChannel>,
  field: 'hl' | 'margen_bruto',
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    out.set(r.month, (out.get(r.month) ?? 0) + r[field]);
  }
  return out;
}

function alignToMonths(
  months: string[],
  series: Map<string, number>,
  defaultValue = 0,
): Series {
  return {
    label: '',
    values: months.map((m) => series.get(m) ?? defaultValue),
  };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function pct(n: number, sig = 3): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(sig);
}

function tone(rho: number): string {
  if (!Number.isFinite(rho)) return '   ';
  const abs = Math.abs(rho);
  if (abs >= 0.5) return '★★★';
  if (abs >= 0.3) return '★★ ';
  if (abs >= 0.15) return '★  ';
  return '   ';
}

function main(): void {
  const sales = getMonthlyByBrandChannel();
  const monthlyHl = aggregateByMonth(sales, 'hl');
  const monthlyMargen = aggregateByMonth(sales, 'margen_bruto');
  const months = [...monthlyHl.keys()].sort();
  const hls = months.map((m) => monthlyHl.get(m) ?? 0);
  const margens = months.map((m) => monthlyMargen.get(m) ?? 0);

  console.log(`Sample size: ${months.length} months  (${months[0]} → ${months.at(-1)})\n`);

  // Candidate signals.
  const holidays = loadUkHolidaysPerMonth();
  const easter = months.map((m) => (isEasterMonth(m) ? 1 : 0));
  const meanTemp = loadMonthlyMeanTemperatureBedford();
  const warmDays = loadDaysAboveThresholdBedford(20);

  const candidates: Series[] = [
    { label: 'UK bank holidays / month', values: alignToMonths(months, holidays).values },
    { label: 'Easter month flag (0/1)', values: easter },
    {
      label: 'Bedford mean temperature (°C)',
      values: alignToMonths(months, meanTemp).values,
    },
    {
      label: 'Bedford days ≥ 20°C',
      values: alignToMonths(months, warmDays).values,
    },
    {
      label: 'Month-of-year sin (12-month cycle)',
      values: months.map((m) =>
        Math.sin((2 * Math.PI * Number(m.slice(5))) / 12),
      ),
    },
    {
      label: 'Month-of-year cos (12-month cycle)',
      values: months.map((m) =>
        Math.cos((2 * Math.PI * Number(m.slice(5))) / 12),
      ),
    },
  ];

  console.log(
    pad('Signal', 38) +
      pad('ρ vs Hl', 12) +
      pad('ρ vs Margen', 14) +
      'tone',
  );
  console.log('─'.repeat(70));

  const results: Array<{
    label: string;
    rhoHl: number;
    rhoMargen: number;
  }> = [];
  for (const c of candidates) {
    const rhoHl = pearson(c.values, hls);
    const rhoMargen = pearson(c.values, margens);
    results.push({ label: c.label, rhoHl, rhoMargen });
    console.log(
      pad(c.label, 38) +
        pad(pct(rhoHl), 12) +
        pad(pct(rhoMargen), 14) +
        `${tone(rhoHl)} | ${tone(rhoMargen)}`,
    );
  }

  console.log('\nLegend: ★★★ |ρ|≥0.5  ·  ★★ |ρ|≥0.3  ·  ★ |ρ|≥0.15');
  console.log('Threshold to wire into forecast engine: |ρ| ≥ 0.3 vs Hl.\n');

  const winners = results.filter(
    (r) => Number.isFinite(r.rhoHl) && Math.abs(r.rhoHl) >= 0.3,
  );
  if (winners.length === 0) {
    console.log('No signal cleared the 0.3 threshold.');
  } else {
    console.log('Signals that cleared the threshold:');
    for (const w of winners) {
      console.log(`  · ${w.label}  (ρ vs Hl = ${pct(w.rhoHl)})`);
    }
  }
}

main();
