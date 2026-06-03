/**
 * Monthly mean temperature for Bedford UK (Damm's UK production base).
 *
 * Source: NASA POWER daily T2M (free, no auth, well-cached).
 * URL template:
 *   https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M
 *     &start=YYYYMMDD&end=YYYYMMDD
 *     &latitude=52.138&longitude=-0.466
 *     &format=JSON&community=ag
 * Snapshot committed locally at `data/nasa-temperature-bedford.json`
 * (gitignored). Refresh = re-run the URL above with new end-date.
 *
 * Original choice was Open-Meteo's ERA5 archive, but it was returning 504
 * during scaffolding so we fell back to NASA POWER. Same daily granularity,
 * same Bedford coordinates, free, no API key.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface NasaJson {
  properties: {
    parameter: {
      T2M: Record<string, number>; // "YYYYMMDD" → mean temperature °C
    };
  };
}

const DEFAULT_PATH = join(
  process.cwd(),
  'data',
  'nasa-temperature-bedford.json',
);

export function loadMonthlyMeanTemperatureBedford(
  path: string = DEFAULT_PATH,
): Map<string, number> {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as NasaJson;
  const t = raw.properties.parameter.T2M;

  const buckets = new Map<string, number[]>();
  for (const [yyyymmdd, value] of Object.entries(t)) {
    if (typeof value !== 'number' || value < -100) continue; // NASA uses -999 for missing
    const month = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}`;
    const arr = buckets.get(month) ?? [];
    arr.push(value);
    buckets.set(month, arr);
  }
  const out = new Map<string, number>();
  for (const [m, arr] of buckets) {
    out.set(m, arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return out;
}

/** Count of days in the month with mean temperature ≥ threshold °C. */
export function loadDaysAboveThresholdBedford(
  threshold = 20,
  path: string = DEFAULT_PATH,
): Map<string, number> {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as NasaJson;
  const t = raw.properties.parameter.T2M;

  const counts = new Map<string, number>();
  for (const [yyyymmdd, value] of Object.entries(t)) {
    if (typeof value !== 'number' || value < -100) continue;
    const month = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}`;
    counts.set(month, (counts.get(month) ?? 0) + (value >= threshold ? 1 : 0));
  }
  return counts;
}
