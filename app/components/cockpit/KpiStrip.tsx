'use client';

/**
 * Two tiles, side by side. One thing the team owns, one thing the model
 * owns:
 *
 *   1. Your sales budget · {next month}
 *      Starts blank — strategy/sales need to type their own number so
 *      the forecast comparison is meaningful (matching defaults read as
 *      a duplicate stat). The tile is a click target until set, then
 *      shows the value + a Clear link.
 *   2. {next month} forecast
 *      The single machine number for next month + the gap vs the
 *      team's budget. Gap reads "—" until they enter a target.
 *
 * Copy comes from i18n.ts via the `t` prop so the entire strip flips
 * cleanly between EN and ES.
 */

import { useState } from 'react';
import type { VolumeUnit } from './UnitToggle';
import { messagesFor, type Lang } from '@/app/lib/i18n';

export interface KpiStripProps {
  nextMonthLabel: string; // e.g. "May 2026"
  nextMonthForecast: number;
  unit: VolumeUnit;
  lang: Lang;
}

const numberFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

function fmtVolume(n: number, unit: VolumeUnit): string {
  return `${numberFmt.format(n)} ${unit}`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

export default function KpiStrip({
  nextMonthLabel,
  nextMonthForecast,
  unit,
  lang,
}: KpiStripProps) {
  const t = messagesFor(lang);
  const [budget, setBudget] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const gap =
    budget !== null && budget > 0
      ? (nextMonthForecast - budget) / budget
      : NaN;
  const gapTone = Number.isFinite(gap)
    ? gap >= 0
      ? 'text-emerald-600'
      : 'text-red-600'
    : 'text-neutral-400';

  const hasBudget = budget !== null;

  function startEdit() {
    setDraft(budget !== null ? String(Math.round(budget)) : '');
    setEditing(true);
  }
  function commitEdit() {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) setBudget(n);
    setEditing(false);
  }
  function clearBudget() {
    setBudget(null);
    setDraft('');
    setEditing(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Tile 1 — the team's number */}
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white px-5 py-5 shadow-warm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {t.kpi.yourBudget(nextMonthLabel)}
        </div>
        {editing ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-1">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="w-40 rounded border border-neutral-300 px-3 py-1.5 text-center text-2xl font-semibold tabular-nums focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:focus:border-neutral-100"
                autoFocus
              />
              <span className="text-base text-neutral-500">{unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={commitEdit}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900"
              >
                {t.kpi.save}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                {t.kpi.cancel}
              </button>
            </div>
          </div>
        ) : hasBudget ? (
          <div className="flex flex-1 flex-col items-center justify-center py-1">
            <button
              type="button"
              onClick={startEdit}
              title={t.kpi.edit}
              aria-label={t.kpi.edit}
              className="group flex flex-col items-center gap-1 rounded-md px-3 py-1.5 text-charcoal transition hover:bg-cream/60 focus:bg-cream/60 focus:outline-none dark:text-neutral-100 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
            >
              <span className="text-3xl font-semibold tabular-nums underline-offset-4 decoration-dotted decoration-neutral-300 group-hover:underline group-focus:underline dark:decoration-neutral-700">
                {fmtVolume(budget, unit)}
              </span>
              <span className="text-[11px] font-medium text-neutral-500 group-hover:text-charcoal dark:text-neutral-400 dark:group-hover:text-neutral-200">
                {t.kpi.edit}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center py-1">
            <button
              type="button"
              onClick={startEdit}
              className="group flex w-full items-center justify-center rounded-md border-2 border-dashed border-neutral-300 px-4 py-4 text-base font-semibold text-neutral-500 transition hover:border-charcoal hover:bg-cream/60 hover:text-charcoal focus:border-charcoal focus:bg-cream/60 focus:text-charcoal focus:outline-none dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-100 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
            >
              {t.kpi.setTargetCta}
            </button>
          </div>
        )}
        {!editing && (
          <p className="mt-auto text-center text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            {hasBudget ? (
              <>
                {t.kpi.overriddenCaption}{' '}
                <button
                  type="button"
                  onClick={clearBudget}
                  className="underline-offset-2 hover:underline"
                >
                  {t.kpi.resetLink}
                </button>
                .
              </>
            ) : (
              t.kpi.defaultCaption
            )}
          </p>
        )}
      </div>

      {/* Tile 2 — the model's number + the gap */}
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white px-5 py-5 shadow-warm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {t.kpi.forecastFor(nextMonthLabel)}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-1">
          <div className="text-3xl font-semibold tabular-nums text-charcoal dark:text-neutral-100">
            {fmtVolume(nextMonthForecast, unit)}
          </div>
          <div
            className={`text-base font-semibold tabular-nums ${gapTone}`}
          >
            {fmtPct(gap)}
          </div>
        </div>
        <p className="mt-auto text-center text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          {t.kpi.vsYourBudget}
        </p>
      </div>
    </div>
  );
}
