import ForecastChart, {
  type ForecastChartPoint,
} from './components/cockpit/ForecastChart';
import KpiStrip from './components/cockpit/KpiStrip';
import ModelInputs from './components/cockpit/ModelInputs';
import PerformanceMatrix, {
  type MatrixBubble,
} from './components/cockpit/PerformanceMatrix';
import Shell from './components/cockpit/Shell';
import Simulator, { type BrandBaseline } from './components/cockpit/Simulator';
import type { CockpitTab } from './components/cockpit/CockpitTabs';
import type { Granularity } from './components/cockpit/GranularityToggle';
import type { VolumeUnit } from './components/cockpit/UnitToggle';
import { humanMonthIn, messagesFor, type Lang } from './lib/i18n';
import {
  getMeta,
  getMonthlyByBrandChannel,
  getMonthlyByCustomer,
  getPromos,
} from './lib/data/loaders';
import { forecast } from './lib/forecast';
import { inferCoefficients } from './lib/forecast/lift';

function priorYearMonth(month: string): string {
  const [year, m] = month.split('-');
  return `${parseInt(year, 10) - 1}-${m}`;
}

interface PageProps {
  searchParams: Promise<{
    unit?: string;
    granularity?: string;
    lang?: string;
    tab?: string;
  }>;
}

const WEEKS_PER_MONTH = 4;

/** Expand one monthly bucket into `WEEKS_PER_MONTH` equal weekly buckets. */
function expandToWeekly(points: ForecastChartPoint[]): ForecastChartPoint[] {
  const out: ForecastChartPoint[] = [];
  for (const p of points) {
    const baseLabel = p.month;
    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
      out.push({
        month: `${baseLabel} W${w + 1}`,
        actual: p.actual != null ? p.actual / WEEKS_PER_MONTH : undefined,
        projection:
          p.projection != null ? p.projection / WEEKS_PER_MONTH : undefined,
        yoy: p.yoy != null ? p.yoy / WEEKS_PER_MONTH : undefined,
      });
    }
  }
  return out;
}

/**
 * Aggregate rows into one bubble per dimension value (brand / channel /
 * anon_id), with current-month volume + share + YoY volume Δ + YoY margin Δ.
 * Drops bubbles with no prior-year baseline (Δ is undefined for them).
 */
function aggregateMatrix<
  T extends { month: string; hl: number; margen_bruto: number },
>(
  rows: T[],
  currentMonth: string,
  priorMonth: string,
  keyOf: (r: T) => string,
): Array<Omit<MatrixBubble, 'promos'>> {
  type Agg = { vol: number; margin: number };
  const current = new Map<string, Agg>();
  const prior = new Map<string, Agg>();

  for (const r of rows) {
    if (r.month !== currentMonth && r.month !== priorMonth) continue;
    const k = keyOf(r);
    const target = r.month === currentMonth ? current : prior;
    const a = target.get(k) ?? { vol: 0, margin: 0 };
    a.vol += r.hl;
    a.margin += r.margen_bruto;
    target.set(k, a);
  }

  const totalCurrentVol =
    [...current.values()].reduce((s, a) => s + a.vol, 0) || 1;

  const out: Array<Omit<MatrixBubble, 'promos'>> = [];
  for (const [name, cur] of current) {
    const pri = prior.get(name);
    if (!pri || pri.vol === 0 || pri.margin === 0) continue;
    out.push({
      name,
      volume: cur.vol,
      share: cur.vol / totalCurrentVol,
      volumeDelta: (cur.vol - pri.vol) / pri.vol,
      marginDelta: (cur.margin - pri.margin) / Math.abs(pri.margin),
    });
  }
  return out.sort((a, b) => b.volume - a.volume);
}

export default async function CockpitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const unit: VolumeUnit = params.unit === 'L' ? 'L' : 'Hl';
  const granularity: Granularity =
    params.granularity === 'weekly' ? 'weekly' : 'monthly';
  const lang: Lang = params.lang === 'es' ? 'es' : 'en';
  const tab: CockpitTab = params.tab === 'playbook' ? 'playbook' : 'forecast';
  const volumeFactor = unit === 'L' ? 100 : 1;

  const meta = getMeta();
  const monthly = getMonthlyByBrandChannel();
  const last = meta.last_closed_month;
  const prior = priorYearMonth(last);

  const HORIZON_MONTHS = 3;
  const fc = forecast({ horizonMonths: HORIZON_MONTHS });
  const nextMonthLabel = humanMonthIn(fc.projection[0]?.month ?? '', lang);
  const nextMonthForecast = fc.projection[0]?.hl ?? 0;

  // Format the live "how much is temperature actually shifting the
  // forecast right now?" note for the Bedford temperature input card.
  // Volumes are converted to the active display unit so the shift
  // reads in the same unit as everything else on the page.
  const t = messagesFor(lang);
  const tempAdj = fc.temperatureAdjustment;
  const signed = (n: number, digits: number): string => {
    const rounded = Number(n.toFixed(digits));
    if (rounded === 0) return '0';
    return rounded > 0 ? `+${rounded.toFixed(digits)}` : rounded.toFixed(digits);
  };
  const signedInt = (n: number): string => {
    const r = Math.round(n);
    if (r === 0) return '0';
    return r > 0 ? `+${r.toLocaleString('en-GB')}` : `-${Math.abs(r).toLocaleString('en-GB')}`;
  };
  const firstShiftHl = Object.values(tempAdj.perMonthShiftHl)[0] ?? 0;
  const bedfordShiftNote =
    tempAdj.recentBasisMonths > 0
      ? t.modelInputs.bedfordShiftNote({
          anomalyC: signed(tempAdj.recentAnomalyC, 1),
          basisMonths: tempAdj.recentBasisMonths,
          betaHlPerC: signedInt(fc.regressors.temperature.betaHlPerCelsius * volumeFactor),
          perMonthShiftHl: signedInt(firstShiftHl * volumeFactor),
        })
      : undefined;
  const inputDynamicNotes: Record<string, string> = {};
  if (bedfordShiftNote) inputDynamicNotes['bedford_temp'] = bedfordShiftNote;

  // Chart: last 12 months of history + next 3 months of projection.
  const historyTail = fc.history.slice(-12);
  const histByMonth = new Map(fc.history.map((h) => [h.month, h.hl]));
  function yoyFor(month: string): number | undefined {
    return histByMonth.get(priorYearMonth(month));
  }
  const chartData: ForecastChartPoint[] = [
    ...historyTail.map((h, i, arr) => ({
      month: h.month,
      actual: h.hl * volumeFactor,
      projection: i === arr.length - 1 ? h.hl * volumeFactor : undefined,
      yoy: yoyFor(h.month) != null ? yoyFor(h.month)! * volumeFactor : undefined,
    })),
    ...fc.projection.map((p) => ({
      month: p.month,
      projection: p.hl * volumeFactor,
      yoy: yoyFor(p.month) != null ? yoyFor(p.month)! * volumeFactor : undefined,
    })),
  ];

  // Matrix data: one bubble per dimension value, positioned by YoY Δ
  // volume / Δ margin.
  const byChannel: MatrixBubble[] = aggregateMatrix(monthly, last, prior, (r) => r.channel);
  const byBrand: MatrixBubble[] = aggregateMatrix(monthly, last, prior, (r) => r.brand);
  const byTopCustomers: MatrixBubble[] = aggregateMatrix(
    getMonthlyByCustomer(),
    last,
    prior,
    (r) => r.anon_id,
  ).slice(0, 10);

  // Simulator baselines: per-brand last-month OFF TRADE volume + margin.
  // Lift coefficients are measured at brand × OFF TRADE level, so the
  // simulator applies them to this same scope. Sorted by volume so the
  // dropdown default lands on the biggest brand.
  const PROMO_CHANNEL = 'OFF TRADE';
  const brandAggMap = new Map<string, { hl: number; margin: number }>();
  for (const r of monthly) {
    if (r.month !== last) continue;
    if (r.channel !== PROMO_CHANNEL) continue;
    const a = brandAggMap.get(r.brand) ?? { hl: 0, margin: 0 };
    a.hl += r.hl;
    a.margin += r.margen_bruto;
    brandAggMap.set(r.brand, a);
  }
  const brandBaselines: BrandBaseline[] = [...brandAggMap.entries()]
    .filter(([, a]) => a.hl > 0)
    .map(([name, a]) => ({
      name,
      lastMonthHl: a.hl * volumeFactor,
      lastMonthMargin: a.margin,
    }))
    .sort((a, b) => b.lastMonthHl - a.lastMonthHl);

  return (
    <Shell
      monthLabel={humanMonthIn(last, lang)}
      unit={unit}
      lang={lang}
      tab={tab}
      kpi={
        <KpiStrip
          nextMonthLabel={nextMonthLabel}
          nextMonthForecast={nextMonthForecast * volumeFactor}
          unit={unit}
          lang={lang}
        />
      }
      forecast={
        <ForecastChart
          data={granularity === 'weekly' ? expandToWeekly(chartData) : chartData}
          unit={unit}
          granularity={granularity}
          lang={lang}
        />
      }
      inputs={<ModelInputs lang={lang} dynamicNotesById={inputDynamicNotes} />}
      matrix={
        <PerformanceMatrix
          byChannel={byChannel}
          byBrand={byBrand}
          byTopCustomers={byTopCustomers}
          lang={lang}
        />
      }
      simulator={
        <Simulator
          lang={lang}
          unit={unit}
          coefficients={inferCoefficients(
            getPromos(),
            monthly,
            meta.brands,
            last,
          )}
          brands={brandBaselines}
          forecastBaseline={nextMonthForecast * volumeFactor}
        />
      }
    />
  );
}
