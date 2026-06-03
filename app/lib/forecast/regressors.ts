/**
 * External-data regressors plugged into the forecast.
 *
 * Task 16's correlation analysis (docs/regressor-findings.md) flagged
 * Bedford mean temperature as the only signal that cleared the
 * |ρ| ≥ 0.3 bar against UK monthly Hl. The raw correlation (+0.5) is
 * driven by seasonality — beer sales are higher in warm months, and
 * those months also have higher temperatures. Once you difference
 * both sides (YoY change vs YoY temp anomaly), the signal vanishes
 * — the YoY baseline has already absorbed the seasonality.
 *
 * The right way to isolate temperature's marginal contribution is the
 * "deviation from seasonal norm" approach:
 *
 *   seasonal_norm_temp[m]  = mean(temp[t]   over all years where month(t) = m)
 *   seasonal_norm_hl[m]    = mean(hl[t]     over all years where month(t) = m)
 *   temp_anomaly[t]        = temp[t] - seasonal_norm_temp[month(t)]
 *   hl_anomaly[t]          = hl[t]   - seasonal_norm_hl[month(t)]
 *
 *   hl_anomaly[t]          = α + β · temp_anomaly[t] + ε
 *
 * β is then "Hl per °C above (or below) the typical temperature for
 * this calendar month." This is what every consumer-goods company
 * means when they say "weather-adjusted demand."
 *
 * Applied to the projection as:
 *
 *   adjusted[t] = baseline[t] + β · temp_anomaly_assumption[t]
 *
 * For the future we don't have observed temperature, so the default
 * `temp_anomaly_assumption[t]` is 0 — the projection number is
 * unchanged but the elasticity is in the model and visible on the
 * dashboard. A future iteration can plug in a Met Office forecast
 * (or a user-supplied "expected anomaly") and the projection will
 * shift accordingly.
 */

import type { MonthlyValue } from './baseline';

export interface TemperatureElasticity {
  /** Absolute Hl change per +1°C above the seasonal norm. */
  betaHlPerCelsius: number;
  /** OLS intercept — captures any drift not explained by temperature. */
  alphaHl: number;
  /** Number of monthly observations used in the fit. */
  basisMonths: number;
  /** Explanatory power (0-1). */
  r2: number;
}

interface FitOLSResult {
  alpha: number;
  beta: number;
  r2: number;
}

/** Ordinary least squares: y = α + β·x + ε. */
function fitOLS(xs: number[], ys: number[]): FitOLSResult {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { alpha: 0, beta: 0, r2: 0 };

  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  let totVar = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
    totVar += (ys[i] - my) ** 2;
  }
  const beta = den === 0 ? 0 : num / den;
  const alpha = my - beta * mx;

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = alpha + beta * xs[i];
    sse += (ys[i] - pred) ** 2;
  }
  const r2 = totVar === 0 ? 0 : Math.max(0, 1 - sse / totVar);
  return { alpha, beta, r2 };
}

/** Group values by calendar month-of-year ("01" through "12") and average. */
function seasonalNorm<T>(
  rows: T[],
  monthOf: (r: T) => string,
  valueOf: (r: T) => number,
): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const moy = monthOf(r).slice(5); // "MM"
    const arr = groups.get(moy) ?? [];
    arr.push(valueOf(r));
    groups.set(moy, arr);
  }
  const out = new Map<string, number>();
  for (const [moy, arr] of groups) {
    out.set(moy, arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return out;
}

export function fitTemperatureElasticity(
  history: MonthlyValue[],
  temperatureByMonth: Map<string, number>,
): TemperatureElasticity {
  const hlNorm = seasonalNorm(
    history,
    (h) => h.month,
    (h) => h.hl,
  );
  const tempArray = [...temperatureByMonth.entries()].map(([month, t]) => ({
    month,
    t,
  }));
  const tempNorm = seasonalNorm(
    tempArray,
    (r) => r.month,
    (r) => r.t,
  );

  const xs: number[] = []; // temp anomaly °C from seasonal norm
  const ys: number[] = []; // Hl anomaly from seasonal norm

  for (const h of history) {
    const moy = h.month.slice(5);
    const currentTemp = temperatureByMonth.get(h.month);
    const normTemp = tempNorm.get(moy);
    const normHl = hlNorm.get(moy);
    if (currentTemp == null || normTemp == null || normHl == null) continue;
    xs.push(currentTemp - normTemp);
    ys.push(h.hl - normHl);
  }

  const fit = fitOLS(xs, ys);
  return {
    betaHlPerCelsius: fit.beta,
    alphaHl: fit.alpha,
    basisMonths: xs.length,
    r2: fit.r2,
  };
}

/** Apply the elasticity to a baseline projection value. */
export function applyTemperatureAdjustment(
  baselineHl: number,
  tempAnomalyAssumption: number,
  elasticity: TemperatureElasticity,
): number {
  return baselineHl + elasticity.betaHlPerCelsius * tempAnomalyAssumption;
}

/**
 * Average temperature anomaly (°C above the seasonal norm) over the
 * last N closed months up to and including `asOf`. Used as a default
 * forward-looking assumption when no explicit forecast is provided —
 * "the recent climate persists" is the most parsimonious guess.
 */
export function computeRecentTemperatureAnomaly(
  temperatureByMonth: Map<string, number>,
  asOf: string,
  windowMonths: number = 3,
): { anomaly: number; basisMonths: number } {
  const tempArray = [...temperatureByMonth.entries()].map(([month, t]) => ({
    month,
    t,
  }));
  const tempNorm = seasonalNorm(
    tempArray,
    (r) => r.month,
    (r) => r.t,
  );

  // Walk back from `asOf` and collect anomalies for the most recent
  // `windowMonths` months that have observed data.
  const anomalies: number[] = [];
  let cursor = asOf;
  for (let i = 0; i < windowMonths * 4 && anomalies.length < windowMonths; i++) {
    const observed = temperatureByMonth.get(cursor);
    const moy = cursor.slice(5);
    const norm = tempNorm.get(moy);
    if (observed != null && norm != null) {
      anomalies.push(observed - norm);
    }
    // step back one month
    const [yStr, mStr] = cursor.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const totalIdx = y * 12 + (m - 1) - 1;
    const ny = Math.floor(totalIdx / 12);
    const nm = (totalIdx % 12 + 12) % 12;
    cursor = `${ny}-${String(nm + 1).padStart(2, '0')}`;
  }

  if (anomalies.length === 0) return { anomaly: 0, basisMonths: 0 };
  const mean =
    anomalies.reduce((a, b) => a + b, 0) / anomalies.length;
  return { anomaly: mean, basisMonths: anomalies.length };
}
