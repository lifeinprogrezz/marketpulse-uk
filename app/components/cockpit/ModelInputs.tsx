'use client';

/**
 * "Inputs we use to forecast sales" — every signal that could feed the
 * forecast, split into two visual columns:
 *
 *   Left  · Wired into the forecast
 *   Right · Not wired (tested-but-rejected, or candidates not yet tested)
 *
 * Each card surface stays clean: name + origin badge (Internal /
 * External) + colored credibility pill (Strong / Weak / Noise /
 * Untested). All numeric context (ρ, R², dataset scale) lives inside
 * the description that appears when the card is expanded.
 */

import { useState } from 'react';
import {
  messagesFor,
  type InputCard,
  type InputCredibility,
  type Lang,
} from '@/app/lib/i18n';

export interface ModelInputsProps {
  lang: Lang;
  /**
   * Optional per-card extra note rendered inside the expansion area
   * beneath the static description. Use this to surface live, runtime
   * numbers (e.g. how much the temperature regressor is currently
   * shifting the forecast) without cluttering the chart footnote.
   */
  dynamicNotesById?: Record<string, string>;
}

const CREDIBILITY_ORDER: Record<InputCredibility, number> = {
  strong: 0,
  weak: 1,
  noise: 2,
  untested: 3,
};

const CREDIBILITY_DOT_CLASS: Record<InputCredibility, string> = {
  strong: 'bg-emerald-500',
  weak: 'bg-amber-500',
  noise: 'bg-red-500',
  untested: 'bg-neutral-400',
};

const CREDIBILITY_PILL_CLASS: Record<InputCredibility, string> = {
  strong: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  weak: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  noise: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  untested: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

export default function ModelInputs({ lang, dynamicNotesById }: ModelInputsProps) {
  const t = messagesFor(lang).modelInputs;

  const wired = t.cards.filter((c) => c.wired);
  const notWired = [...t.cards.filter((c) => !c.wired)].sort(
    (a, b) => CREDIBILITY_ORDER[a.credibility] - CREDIBILITY_ORDER[b.credibility],
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-warm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base tracking-[0.12em] text-charcoal uppercase dark:text-neutral-100">
          {t.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Column
          title={t.wiredColumnTitle}
          count={wired.length}
          accentClass="border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
        >
          {wired.map((card) => (
            <Card
              key={card.id}
              card={card}
              t={t}
              dynamicNote={dynamicNotesById?.[card.id]}
            />
          ))}
        </Column>
        <Column
          title={t.notWiredColumnTitle}
          count={notWired.length}
          accentClass="border-neutral-200 bg-neutral-50/40 dark:border-neutral-800 dark:bg-neutral-900/40"
        >
          {notWired.map((card) => (
            <Card
              key={card.id}
              card={card}
              t={t}
              dynamicNote={dynamicNotesById?.[card.id]}
            />
          ))}
        </Column>
      </div>
    </div>
  );
}

function Column({
  title,
  count,
  accentClass,
  children,
}: {
  title: string;
  count: number;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border p-3 ${accentClass}`}>
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[11px] tracking-[0.15em] uppercase text-charcoal dark:text-neutral-200">
          {title}
        </h3>
        <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
          {count}
        </span>
      </header>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Card({
  card,
  t,
  dynamicNote,
}: {
  card: InputCard;
  t: ReturnType<typeof messagesFor>['modelInputs'];
  dynamicNote?: string;
}) {
  const [open, setOpen] = useState(false);

  const credibilityLabel =
    card.credibility === 'strong'
      ? t.credibilityStrong
      : card.credibility === 'weak'
      ? t.credibilityWeak
      : card.credibility === 'noise'
      ? t.credibilityNoise
      : t.credibilityUntested;

  return (
    <li className="rounded-md border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-950">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-medium text-charcoal dark:text-neutral-100">
              {card.name}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {card.origin === 'internal' ? t.badgeInternal : t.badgeExternal}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${CREDIBILITY_PILL_CLASS[card.credibility]}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${CREDIBILITY_DOT_CLASS[card.credibility]}`}
                aria-hidden
              />
              {credibilityLabel}
            </span>
          </div>
        </div>
        <span
          className="mt-0.5 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          aria-hidden
        >
          ▸
        </span>
      </button>

      {open && (
        <div className="mt-2 border-t border-neutral-100 pt-2 text-[11px] leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          <p>{card.description}</p>
          {dynamicNote && (
            <div className="mt-2 rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1.5 text-[11px] leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
                {t.liveLabel}
              </div>
              <p>{dynamicNote}</p>
            </div>
          )}
          <p className="mt-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
            {t.sourceLabel}:{' '}
            {card.sourceUrl ? (
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={(e) => e.stopPropagation()}
              >
                {card.source} ↗
              </a>
            ) : (
              <span>{card.source}</span>
            )}
          </p>
        </div>
      )}
    </li>
  );
}
