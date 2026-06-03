'use client';

/**
 * What if? — brand-scoped trade-off simulator.
 *
 *   1. Pick a brand (dropdown)
 *   2. Pick a past promotion scenario (chip grid — every non-empty
 *      mechanic × depth_bucket cell with its sample count visible)
 *   3. Read two output panels side-by-side: ADD this promo / SKIP it.
 *      Each shows absolute Hl + £ trade-off + the next-month forecast
 *      with that change applied, with a plain-English interpretation
 *      line below.
 *
 * Historical lift coefficients (`inferCoefficients`) live at
 * brand × OFF TRADE × promo-month vs prior-year-same-month, so the
 * simulator applies them to each brand's OFF TRADE baseline.
 *
 * Money is GBP (£) — Damm UK data is UK trade. Magnitudes shown with
 * compact suffixes (k / M) so the scale is unambiguous.
 */

import { useMemo, useState } from 'react';
import { messagesFor, type Lang } from '@/app/lib/i18n';
import type { VolumeUnit } from './UnitToggle';

export interface SimulatorCoefficient {
  mechanic: string;
  depthBucket: string;
  n: number;
  hlLift: number;
  marginLift: number;
}

export interface BrandBaseline {
  name: string;
  /** OFF TRADE volume in the last closed month (active unit). */
  lastMonthHl: number;
  /** OFF TRADE gross margin in the last closed month (£). */
  lastMonthMargin: number;
}

interface Props {
  coefficients: SimulatorCoefficient[];
  brands: BrandBaseline[];
  /** Next-month forecast in active unit. */
  forecastBaseline: number;
  unit: VolumeUnit;
  lang: Lang;
}

const numberFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** Mechanic display order: PRICE → "3 for …" → RB → anything else. */
const MECHANIC_PRIORITY = ['PRICE', '3 for', 'RB'] as const;

function mechanicSortKey(m: string): number {
  for (let i = 0; i < MECHANIC_PRIORITY.length; i++) {
    if (m.startsWith(MECHANIC_PRIORITY[i])) return i;
  }
  return MECHANIC_PRIORITY.length; // unknown mechanics drop to the end
}

/** Lower bound of a depth bucket label: "0-5" → 0, "25+" → 25. */
function depthLowerBound(bucket: string): number {
  const m = bucket.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Compact volume label: "47k Hl", "1.2M Hl", "950 Hl". */
function fmtVolumeCompact(n: number, unit: VolumeUnit): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${unit}`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(0)}k ${unit}`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k ${unit}`;
  return `${numberFmt.format(Math.round(n))} ${unit}`;
}

/** Compact volume DELTA with sign: "+1.2k Hl", "−47k Hl". */
function fmtVolumeDelta(n: number, unit: VolumeUnit): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return `0 ${unit}`;
  const sign = n > 0 ? '+' : '−';
  return `${sign}${fmtVolumeCompact(Math.abs(n), unit)}`;
}

/** Unsigned compact volume magnitude: "1.2k Hl". */
function fmtVolumeMagnitude(n: number, unit: VolumeUnit): string {
  if (!Number.isFinite(n)) return '—';
  return fmtVolumeCompact(Math.abs(n), unit);
}

/** Compact GBP label: "£8.4k", "£1.2M", "£500". */
function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `£${(n / 1_000).toFixed(0)}k`;
  if (abs >= 1_000) return `£${(n / 1_000).toFixed(1)}k`;
  return `£${numberFmt.format(Math.round(n))}`;
}

/** Compact GBP DELTA with sign: "+£8.4k", "−£1.2M". */
function fmtMoneyDelta(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '£0';
  const sign = n > 0 ? '+' : '−';
  return `${sign}${fmtMoney(Math.abs(n))}`;
}

/** Unsigned compact GBP: "£8.4k". */
function fmtMoneyMagnitude(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return fmtMoney(Math.abs(n));
}

interface Confidence {
  tier: 'low' | 'medium' | 'high';
  label: string;
}

function confidenceFor(
  n: number | undefined,
  t: ReturnType<typeof messagesFor>['simulator'],
): Confidence | null {
  if (n == null) return null;
  if (n < 3) return { tier: 'low', label: t.confidenceLow(n) };
  if (n <= 10) return { tier: 'medium', label: t.confidenceMedium(n) };
  return { tier: 'high', label: t.confidenceHigh(n) };
}

const CONFIDENCE_PILL: Record<NonNullable<ReturnType<typeof confidenceFor>>['tier'], string> = {
  low: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  medium: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
};

export default function Simulator({
  coefficients,
  brands,
  forecastBaseline,
  unit,
  lang,
}: Props) {
  const t = messagesFor(lang).simulator;

  // One chip per non-empty bucket. Left-to-right reading order:
  //   1. PRICE mechanics first
  //   2. "3 for …" mechanics next
  //   3. RB mechanics last
  //   4. Any unknown mechanic falls to the end
  // Within each mechanic group, shallow → deep by depth bucket. Groups
  // the reader's eye by promo type first, then severity.
  const scenarios = useMemo(
    () =>
      coefficients
        .filter((c) => c.n > 0)
        .sort((a, b) => {
          const am = mechanicSortKey(a.mechanic);
          const bm = mechanicSortKey(b.mechanic);
          if (am !== bm) return am - bm;
          return depthLowerBound(a.depthBucket) - depthLowerBound(b.depthBucket);
        }),
    [coefficients],
  );

  const scenarioKey = (c: SimulatorCoefficient) => `${c.mechanic}|${c.depthBucket}`;

  const [brand, setBrand] = useState(brands[0]?.name ?? '');
  const [activeKey, setActiveKey] = useState(
    scenarios[0] ? scenarioKey(scenarios[0]) : '',
  );

  const brandBaseline = useMemo(
    () => brands.find((b) => b.name === brand),
    [brands, brand],
  );

  const active = useMemo(
    () => scenarios.find((c) => scenarioKey(c) === activeKey),
    [scenarios, activeKey],
  );

  const confidence = confidenceFor(active?.n, t);

  // Apply lift to the brand's OFF TRADE baseline. ADD = positive; SKIP =
  // negated (we model skipping a typical promo as the inverse of running
  // one).
  const outputs = useMemo(() => {
    if (!brandBaseline || !active) return null;
    const addVol = brandBaseline.lastMonthHl * active.hlLift;
    const addMargin = brandBaseline.lastMonthMargin * active.marginLift;
    return {
      add: {
        volDelta: addVol,
        marginDelta: addMargin,
        newForecast: forecastBaseline + addVol,
      },
      cut: {
        volDelta: -addVol,
        marginDelta: -addMargin,
        newForecast: forecastBaseline - addVol,
      },
    };
  }, [brandBaseline, active, forecastBaseline]);

  function addInterpretation(): string {
    if (!outputs) return '';
    const { volDelta, marginDelta } = outputs.add;
    const volMag = fmtVolumeMagnitude(volDelta, unit);
    const marginMag = fmtMoneyMagnitude(marginDelta);
    if (volDelta > 0 && marginDelta > 0) return t.interpretAddGainsBoth(volMag, marginMag);
    return t.interpretAddCostsMargin(volMag, marginMag);
  }

  function skipInterpretation(): string {
    if (!outputs) return '';
    const { volDelta, marginDelta } = outputs.cut;
    const volMag = fmtVolumeMagnitude(volDelta, unit);
    const marginMag = fmtMoneyMagnitude(marginDelta);
    if (volDelta < 0 && marginDelta < 0) return t.interpretSkipCostsBoth(volMag, marginMag);
    return t.interpretSkipSavesMargin(volMag, marginMag);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-warm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base tracking-[0.12em] text-charcoal uppercase dark:text-neutral-100">
          {t.title}
        </h2>
      </div>
      <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        {t.subtitle}
      </p>

      {/* Brand picker */}
      <div className="mb-4">
        <div className="mb-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          {t.brandLabel}
        </div>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:border-neutral-900 focus:outline-none md:max-w-sm dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        >
          {brands.length === 0 && <option value="">{t.brandPlaceholder}</option>}
          {brands.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scenario chips — one per non-empty historical bucket. Sample count
          is the second line so the user can see at a glance which buttons
          have enough evidence to trust. */}
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          {t.scenarioPickerLabel}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scenarios.map((c) => {
            const key = scenarioKey(c);
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                className={`flex min-w-[7rem] flex-col items-start gap-0.5 rounded px-2.5 py-1.5 text-left text-[11px] transition ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <span className="font-medium">
                  {c.mechanic} · {c.depthBucket.replace('-', '–')}% off
                </span>
                <span
                  className={`text-[10px] ${
                    isActive
                      ? 'text-neutral-300 dark:text-neutral-600'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {t.chipPromoCount(c.n)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two output panels side-by-side. */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <OutputPanel
          title={t.outputAddTitle}
          tone="add"
          outputs={outputs?.add}
          interpretation={outputs ? addInterpretation() : ''}
          unit={unit}
          t={t}
        />
        <OutputPanel
          title={t.outputCutTitle}
          tone="cut"
          outputs={outputs?.cut}
          interpretation={outputs ? skipInterpretation() : ''}
          unit={unit}
          t={t}
        />
      </div>

      {/* Confidence pill — bigger, bolder, color-coded by tier. Renders
          only when the active scenario has a sample. */}
      {confidence && (
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${CONFIDENCE_PILL[confidence.tier]}`}
          >
            {confidence.label}
          </span>
        </div>
      )}

      {confidence?.tier === 'low' && active != null && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {t.lowConfidenceBanner(active.n)}
        </p>
      )}

      <button
        type="button"
        disabled={active == null || !brandBaseline || !outputs}
        onClick={() => {
          if (active == null || !brandBaseline || !outputs || !confidence) return;
          const depthPct = active.depthBucket.replace('-', '–');
          const prompt = t.handoffPromptTemplate({
            brand,
            mechanic: active.mechanic,
            depthPct,
            addVolHl: fmtVolumeDelta(outputs.add.volDelta, unit),
            addMarginGbp: fmtMoneyDelta(outputs.add.marginDelta),
            cutVolHl: fmtVolumeDelta(outputs.cut.volDelta, unit),
            cutMarginGbp: fmtMoneyDelta(outputs.cut.marginDelta),
            n: active.n,
            confidenceTier: confidence.tier,
          });
          window.dispatchEvent(
            new CustomEvent('marketpulse:simulator-handoff', { detail: prompt }),
          );
        }}
        className="flex w-full items-center justify-center rounded-md bg-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t.handoffButton}
      </button>
    </div>
  );
}

function OutputPanel({
  title,
  tone,
  outputs,
  interpretation,
  unit,
  t,
}: {
  title: string;
  tone: 'add' | 'cut';
  outputs:
    | {
        volDelta: number;
        marginDelta: number;
        newForecast: number;
      }
    | undefined;
  interpretation: string;
  unit: VolumeUnit;
  t: ReturnType<typeof messagesFor>['simulator'];
}) {
  const accent =
    tone === 'add'
      ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20'
      : 'border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20';

  if (!outputs) {
    return (
      <div className={`rounded-md border p-3 ${accent}`}>
        <div className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </div>
        <div className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">—</div>
      </div>
    );
  }

  const volColor =
    outputs.volDelta > 0
      ? 'text-emerald-600'
      : outputs.volDelta < 0
      ? 'text-red-600'
      : 'text-neutral-500';
  const marginColor =
    outputs.marginDelta > 0
      ? 'text-emerald-600'
      : outputs.marginDelta < 0
      ? 'text-red-600'
      : 'text-neutral-500';

  return (
    <div className={`rounded-md border p-3 ${accent}`}>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </div>
      <dl className="mt-2 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {t.outputVolumeChange}
          </dt>
          <dd className={`text-sm font-semibold tabular-nums ${volColor}`}>
            {fmtVolumeDelta(outputs.volDelta, unit)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {t.outputMarginChange}
          </dt>
          <dd className={`text-sm font-semibold tabular-nums ${marginColor}`}>
            {fmtMoneyDelta(outputs.marginDelta)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-t border-neutral-200 pt-1.5 dark:border-neutral-800">
          <dt className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {t.outputNewForecast}
          </dt>
          <dd className="text-base font-bold tabular-nums text-charcoal dark:text-neutral-100">
            {fmtVolumeCompact(outputs.newForecast, unit)}
          </dd>
        </div>
      </dl>
      {/* Interpretive line: plain-English summary of the trade-off so the
          viewer doesn't have to read the numbers to understand the move. */}
      <p className="mt-2 border-t border-neutral-200 pt-2 text-[11px] leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
        {interpretation}
      </p>
    </div>
  );
}

