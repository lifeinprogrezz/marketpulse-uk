'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import GranularityToggle, { type Granularity } from './GranularityToggle';
import type { VolumeUnit } from './UnitToggle';
import { formatAxisMonth, messagesFor, type Lang } from '@/app/lib/i18n';

export interface ForecastChartPoint {
  /** Label on the X-axis: "YYYY-MM" for monthly, "YYYY-MM W#" for weekly. */
  month: string;
  /** Volume actual for historical buckets. */
  actual?: number;
  /** Volume projection for future buckets. The last historical bucket also
   *  carries a projection equal to its actual so the projection line
   *  visually starts from the actual line, no gap. */
  projection?: number;
  /** Same period last year volume, plotted as a light reference line. */
  yoy?: number;
}

interface Props {
  data: ForecastChartPoint[];
  unit: VolumeUnit;
  granularity: Granularity;
  lang: Lang;
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function fmtTooltip(value: number | string | undefined): string {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
}

export default function ForecastChart({
  data,
  unit,
  granularity,
  lang,
}: Props) {
  const t = messagesFor(lang);
  // For weekly view (≈60 ticks across 15 months) only show a tick every 4th
  // bucket so the X-axis stays legible. Monthly view shows every tick.
  const xTickInterval = granularity === 'weekly' ? 3 : 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-warm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base tracking-[0.12em] text-charcoal uppercase dark:text-neutral-100">
          {t.chart.title(unit)}
        </h2>
        <GranularityToggle
          active={granularity}
          monthlyLabel={t.granularityToggle.monthly}
          weeklyLabel={t.granularityToggle.weekly}
        />
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ left: 8, right: 12, top: 8, bottom: 4 }}
          >
            <defs>
              <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E32819" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#E32819" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#ece4d2"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#1A1A1A' }}
              tickFormatter={(value: string) => formatAxisMonth(value, lang)}
              tickMargin={6}
              minTickGap={12}
              interval={xTickInterval}
              stroke="#d6cdb8"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#1A1A1A' }}
              tickFormatter={fmtAxis}
              width={48}
              stroke="#d6cdb8"
            />
            <Tooltip
              formatter={(v) => fmtTooltip(v as number)}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                borderColor: '#ece4d2',
                backgroundColor: '#FDFBF7',
              }}
              labelStyle={{ display: 'none' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="line"
              iconSize={12}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="none"
              fill="url(#actualFill)"
              legendType="none"
              tooltipType="none"
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="yoy"
              stroke="#94a3b8"
              strokeWidth={1}
              dot={false}
              name={t.chart.seriesSameLastYear}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#E32819"
              strokeWidth={2}
              dot={false}
              name={t.chart.seriesActual}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="projection"
              stroke="#C5A059"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              name={t.chart.seriesProjection}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
