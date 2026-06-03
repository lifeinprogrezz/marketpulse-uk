/**
 * Forecast entry point. Reads from the typed JSON loaders, aggregates to a
 * single monthly time series (optionally filtered by brand/channel), and
 * runs the baseline projection on top.
 */

import { loadMonthlyMeanTemperatureBedford } from '../external/weather';
import {
  getMeta,
  getMonthlyByBrandChannel,
  type MonthlyByBrandChannel,
} from '../data/loaders';

import { project, type MonthlyValue, type Projected } from './baseline';
import {
  applyTemperatureAdjustment,
  computeRecentTemperatureAnomaly,
  fitTemperatureElasticity,
  type TemperatureElasticity,
} from './regressors';

export interface ForecastInput {
  asOf?: string; // defaults to meta.last_closed_month
  horizonMonths?: number; // defaults to 3
  filter?: { brand?: string; channel?: string };
  /**
   * Optional per-month expected temperature anomaly in °C above the
   * seasonal norm. If provided, overrides the default "recent climate
   * persists" assumption for that month.
   */
  temperatureAnomalies?: Record<string, number>;
}

export interface TemperatureAdjustment {
  /** Average anomaly °C above the seasonal norm over the recent window. */
  recentAnomalyC: number;
  /** Number of recent months the recent anomaly was averaged over. */
  recentBasisMonths: number;
  /** Per-month Hl shift applied to the central projection. */
  perMonthShiftHl: Record<string, number>;
  /** Total Hl shift summed across the projection horizon. */
  totalShiftHl: number;
}

export interface ForecastResult {
  asOf: string;
  history: MonthlyValue[];
  projection: Projected[];
  regressors: {
    temperature: TemperatureElasticity;
  };
  temperatureAdjustment: TemperatureAdjustment;
}

function aggregate(rows: MonthlyByBrandChannel[]): MonthlyValue[] {
  const byMonth = new Map<string, MonthlyValue>();
  for (const r of rows) {
    const prev = byMonth.get(r.month);
    if (prev) {
      prev.hl += r.hl;
      prev.margen_bruto += r.margen_bruto;
    } else {
      byMonth.set(r.month, {
        month: r.month,
        hl: r.hl,
        margen_bruto: r.margen_bruto,
      });
    }
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function forecast(input: ForecastInput = {}): ForecastResult {
  const meta = getMeta();
  const asOf = input.asOf ?? meta.last_closed_month;
  const horizon = input.horizonMonths ?? 3;

  const rows = getMonthlyByBrandChannel().filter((r) => {
    if (input.filter?.brand && r.brand !== input.filter.brand) return false;
    if (input.filter?.channel && r.channel !== input.filter.channel) return false;
    return true;
  });

  const history = aggregate(rows);
  const rawProjection = project(history, asOf, horizon);

  // Fit the temperature elasticity once, off the same history. The fit
  // uses deviation-from-seasonal-norm to isolate the marginal effect
  // of temperature above the seasonality that YoY already captures.
  const temperatures = loadMonthlyMeanTemperatureBedford();
  const tempElasticity = fitTemperatureElasticity(history, temperatures);

  // Default anomaly assumption: the recent climate persists. We
  // average the observed (temp - seasonal_norm) over the last few
  // closed months and carry that forward. Callers can override per
  // month via `input.temperatureAnomalies`.
  const recent = computeRecentTemperatureAnomaly(temperatures, asOf, 3);

  // Apply the regressor to each projected month. The shift is
  // β · anomaly, where anomaly = override if provided, else the
  // recent persistent anomaly.
  const perMonthShiftHl: Record<string, number> = {};
  let totalShiftHl = 0;
  const projection = rawProjection.map((p) => {
    const anomaly =
      input.temperatureAnomalies?.[p.month] ?? recent.anomaly;
    if (anomaly === 0) {
      perMonthShiftHl[p.month] = 0;
      return p;
    }
    const adjusted = applyTemperatureAdjustment(p.hl, anomaly, tempElasticity);
    const shift = adjusted - p.hl;
    perMonthShiftHl[p.month] = shift;
    totalShiftHl += shift;
    return {
      ...p,
      hl: adjusted,
    };
  });

  return {
    asOf,
    history,
    projection,
    regressors: { temperature: tempElasticity },
    temperatureAdjustment: {
      recentAnomalyC: recent.anomaly,
      recentBasisMonths: recent.basisMonths,
      perMonthShiftHl,
      totalShiftHl,
    },
  };
}
