/**
 * Cold-start data cache.
 *
 * The JSON loaders in `./data/loaders` are already memoized via ES module
 * semantics (Next.js bundles each JSON artifact once per server process),
 * but `inferCoefficients` walks every closed promo against the monthly
 * brand × channel aggregate — a few ms each call. Without a cache the
 * AI Analyst tool (Task 15) would re-derive that on every tool invocation
 * and the cockpit's server render would re-derive it on every request.
 * Cache the derived result alongside the raw handles so every reader
 * uses the same snapshot.
 */

import {
  getMeta,
  getMonthlyByBrandChannel,
  getPromos,
  type DataMeta,
  type MonthlyByBrandChannel,
  type PromoEntry,
} from './data/loaders';
import { inferCoefficients, type LiftCoefficient } from './forecast/lift';

export interface DataCache {
  meta: DataMeta;
  monthly: MonthlyByBrandChannel[];
  promos: PromoEntry[];
  asOf: string;
  coeffs: LiftCoefficient[];
}

let _cache: DataCache | undefined;

export function getData(): DataCache {
  if (_cache) return _cache;
  const meta = getMeta();
  const monthly = getMonthlyByBrandChannel();
  const promos = getPromos();
  const asOf = meta.last_closed_month;
  const coeffs = inferCoefficients(promos, monthly, meta.brands, asOf);
  _cache = { meta, monthly, promos, asOf, coeffs };
  return _cache;
}

/** Test-only: drop the memoized snapshot so the next getData() rebuilds it. */
export function __resetCache(): void {
  _cache = undefined;
}
