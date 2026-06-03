'use client';

/**
 * "What moved and where" — replaces the old Decomposition + PromoEffectiveness
 * panels with a single 2×2 consulting matrix.
 *
 *   X axis · Volume Δ vs same month last year
 *   Y axis · Gross margin Δ vs same month last year
 *   Bubble size · share of last month's volume (the old "where demand came
 *                 from" signal lives here)
 *   Hover · full name + Δ values + active promotions for that bubble
 *           (the old "did promotions work" signal lives here)
 *
 * Dimension toggle (channel / brand / customer) switches the bubble set —
 * same UX as the old Decomposition tabs.
 *
 * Two-line auto-summary below the chart digests the matrix into plain
 * English so the demo viewer doesn't have to read every bubble.
 */

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { messagesFor, type Lang } from '@/app/lib/i18n';

export interface MatrixBubble {
  /** Display label — brand name, channel, or anonymized customer id. */
  name: string;
  /** Current-month volume in Hl (used for bubble size + share). */
  volume: number;
  /** Share of last month's total volume, 0..1. */
  share: number;
  /** (current − prior) / prior, fraction. */
  volumeDelta: number;
  /** (currentMargin − priorMargin) / abs(priorMargin), fraction. */
  marginDelta: number;
}

type Dim = 'channel' | 'brand' | 'top_customers';

interface Props {
  byChannel: MatrixBubble[];
  byBrand: MatrixBubble[];
  byTopCustomers: MatrixBubble[];
  lang: Lang;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

/** Rounded percent for axis ticks — keeps the axis readable when bubbles
 *  span big ranges (no decimals; ±843% reads cleaner than ±843.1%). */
function fmtPctAxis(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n * 100)}%`;
}

function quadrantOf(b: MatrixBubble): 'winning' | 'margin_defence' | 'volume_push' | 'underperforming' {
  if (b.volumeDelta >= 0 && b.marginDelta >= 0) return 'winning';
  if (b.volumeDelta < 0 && b.marginDelta >= 0) return 'margin_defence';
  if (b.volumeDelta >= 0 && b.marginDelta < 0) return 'volume_push';
  return 'underperforming';
}

const QUADRANT_FILL: Record<ReturnType<typeof quadrantOf>, string> = {
  winning: '#10B981', // emerald-500
  margin_defence: '#3B82F6', // blue-500
  volume_push: '#F59E0B', // amber-500
  underperforming: '#EF4444', // red-500
};

export default function PerformanceMatrix({
  byChannel,
  byBrand,
  byTopCustomers,
  lang,
}: Props) {
  const t = messagesFor(lang).matrix;
  const [dim, setDim] = useState<Dim>('brand');

  const bubbles =
    dim === 'channel'
      ? byChannel
      : dim === 'brand'
      ? byBrand
      : byTopCustomers;

  // Symmetric axis bounds so (0,0) stays at the centre even if the
  // distribution is skewed. Pad 10% so dots never sit on the edge.
  const { xMax, yMax } = useMemo(() => {
    if (bubbles.length === 0) return { xMax: 0.5, yMax: 0.5 };
    const vx = Math.max(...bubbles.map((b) => Math.abs(b.volumeDelta)));
    const vy = Math.max(...bubbles.map((b) => Math.abs(b.marginDelta)));
    return {
      xMax: Math.max(0.1, vx * 1.1),
      yMax: Math.max(0.1, vy * 1.1),
    };
  }, [bubbles]);

  const summary = useMemo(() => {
    if (bubbles.length === 0) return t.summaryEmpty;
    const winning = bubbles.filter((b) => b.volumeDelta > 0 && b.marginDelta > 0);
    const losing = bubbles.filter((b) => b.volumeDelta < 0 && b.marginDelta < 0);

    if (winning.length === bubbles.length) {
      const top = [...bubbles].sort(
        (a, b) => b.volumeDelta + b.marginDelta - (a.volumeDelta + a.marginDelta),
      )[0];
      return t.summaryAllGained(bubbles.length, top.name);
    }
    if (losing.length === bubbles.length) {
      const worst = [...bubbles].sort(
        (a, b) => a.volumeDelta + a.marginDelta - (b.volumeDelta + b.marginDelta),
      )[0];
      return t.summaryAllLost(bubbles.length, worst.name);
    }
    const worst = [...bubbles].sort(
      (a, b) => a.volumeDelta + a.marginDelta - (b.volumeDelta + b.marginDelta),
    )[0];
    return t.summaryMixed(winning.length, bubbles.length, worst.name);
  }, [bubbles, t]);

  // Recharts Scatter wants a single data array. Split by quadrant so each
  // group can carry its own fill colour.
  const byQuadrant = useMemo(() => {
    const groups: Record<ReturnType<typeof quadrantOf>, MatrixBubble[]> = {
      winning: [],
      margin_defence: [],
      volume_push: [],
      underperforming: [],
    };
    for (const b of bubbles) groups[quadrantOf(b)].push(b);
    return groups;
  }, [bubbles]);

  const TAB_LABELS: Record<Dim, string> = {
    channel: t.tabChannel,
    brand: t.tabBrand,
    top_customers: t.tabTopCustomers,
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-warm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base tracking-[0.12em] text-charcoal uppercase dark:text-neutral-100">
          {t.title}
        </h2>
        <div className="flex gap-1 text-[11px]">
          {(Object.keys(TAB_LABELS) as Dim[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDim(d)}
              className={`rounded px-2 py-1 ${
                d === dim
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {TAB_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Quadrant labels: a header row above the chart and a footer row
          below. Arrows point to the corner each label describes — keeps
          them out of the chart area so they never collide with axis
          ticks. The chart frame stays clean. */}
      <div className="mb-1 flex justify-between px-2 text-[10px] font-bold uppercase tracking-wider">
        <span className="text-blue-600 dark:text-blue-400">{t.quadrantMarginDefence}</span>
        <span className="text-emerald-600 dark:text-emerald-400">{t.quadrantWinning}</span>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 36, right: 16, top: 8, bottom: 32 }}>
            <CartesianGrid stroke="#ece4d2" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="volumeDelta"
              domain={[-xMax, xMax]}
              tickFormatter={fmtPctAxis}
              tick={{ fontSize: 10, fill: '#1A1A1A' }}
              stroke="#d6cdb8"
              label={{
                value: t.xAxisLabel,
                position: 'insideBottom',
                offset: -18,
                style: { fontSize: 12, fontWeight: 700, fill: '#1A1A1A' },
              }}
            />
            <YAxis
              type="number"
              dataKey="marginDelta"
              domain={[-yMax, yMax]}
              tickFormatter={fmtPctAxis}
              tick={{ fontSize: 10, fill: '#1A1A1A' }}
              stroke="#d6cdb8"
              width={64}
              label={{
                value: t.yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                offset: -8,
                style: { fontSize: 12, fontWeight: 700, fill: '#1A1A1A', textAnchor: 'middle' },
              }}
            />
            <ZAxis type="number" dataKey="share" range={[80, 500]} />
            <ReferenceLine x={0} stroke="#888" strokeDasharray="2 2" />
            <ReferenceLine y={0} stroke="#888" strokeDasharray="2 2" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={<MatrixTooltip t={t} />}
              wrapperStyle={{
                zIndex: 100,
                pointerEvents: 'none',
                transition: 'opacity 150ms ease-out',
              }}
              offset={24}
            />
            {(Object.entries(byQuadrant) as [keyof typeof byQuadrant, MatrixBubble[]][]).map(
              ([q, data]) => (
                <Scatter
                  key={q}
                  data={data}
                  fill={QUADRANT_FILL[q]}
                  fillOpacity={0.65}
                  stroke={QUADRANT_FILL[q]}
                  isAnimationActive={false}
                />
              ),
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 flex justify-between px-2 text-[10px] font-bold uppercase tracking-wider">
        <span className="text-red-600 dark:text-red-400">{t.quadrantUnderperforming}</span>
        <span className="text-amber-600 dark:text-amber-400">{t.quadrantVolumePush}</span>
      </div>

      <p className="mt-3 border-t border-neutral-100 pt-3 text-xs leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
        {summary}
      </p>
    </div>
  );
}

function MatrixTooltip({
  active,
  payload,
  t,
}: {
  active?: boolean;
  payload?: Array<{ payload: MatrixBubble }>;
  t: ReturnType<typeof messagesFor>['matrix'];
}) {
  if (!active || !payload?.[0]) return null;
  const b = payload[0].payload;
  return (
    <div className="rounded-md border border-neutral-300 bg-white p-2.5 text-[11px] shadow-lg dark:border-neutral-600 dark:bg-neutral-900">
      <div className="mb-1 font-semibold text-charcoal dark:text-neutral-100">
        {b.name}
      </div>
      <div className="space-y-0.5 text-neutral-600 dark:text-neutral-300">
        <div className="tabular-nums">
          {t.tooltipVolumeChange}:{' '}
          <span className={b.volumeDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {fmtPct(b.volumeDelta)}
          </span>
        </div>
        <div className="tabular-nums">
          {t.tooltipMarginChange}:{' '}
          <span className={b.marginDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {fmtPct(b.marginDelta)}
          </span>
        </div>
        <div className="tabular-nums text-neutral-500 dark:text-neutral-400">
          {t.tooltipShare}: {fmtPct(b.share)}
        </div>
      </div>
    </div>
  );
}
