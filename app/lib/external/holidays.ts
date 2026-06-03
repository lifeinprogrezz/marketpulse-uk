/**
 * UK bank holidays (England & Wales) loader.
 *
 * Source: https://www.gov.uk/bank-holidays.json (free, no auth, official).
 * Snapshot is committed locally at `data/bank-holidays.json` and gitignored;
 * a refresh = `curl https://www.gov.uk/bank-holidays.json > data/bank-holidays.json`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface HolidayEvent {
  title: string;
  date: string; // "YYYY-MM-DD"
  notes: string;
  bunting: boolean;
}

interface HolidayJson {
  'england-and-wales': { events: HolidayEvent[] };
  scotland: { events: HolidayEvent[] };
  'northern-ireland': { events: HolidayEvent[] };
}

const DEFAULT_PATH = join(process.cwd(), 'data', 'bank-holidays.json');

export function loadUkHolidaysPerMonth(
  path: string = DEFAULT_PATH,
): Map<string, number> {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as HolidayJson;
  const per = new Map<string, number>();
  for (const e of raw['england-and-wales'].events) {
    const m = e.date.slice(0, 7);
    per.set(m, (per.get(m) ?? 0) + 1);
  }
  return per;
}

/** True if Easter Sunday (or Good Friday / Easter Monday) lands in `month`. */
export function isEasterMonth(
  month: string,
  path: string = DEFAULT_PATH,
): boolean {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as HolidayJson;
  return raw['england-and-wales'].events.some(
    (e) =>
      (e.title.includes('Easter') || e.title.includes('Good Friday')) &&
      e.date.slice(0, 7) === month,
  );
}
