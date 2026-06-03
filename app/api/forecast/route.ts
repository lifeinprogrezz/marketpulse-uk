/**
 * GET /api/forecast?brand=...&channel=...&horizon=N
 *
 * Serves the monthly forecast for the cockpit and any external integrator
 * (a sales-ops notebook, a Slack bot, etc). Anchored to `asOf` from the
 * cached snapshot (= `meta.last_closed_month`), so the answer is stable
 * across requests within the same server process.
 *
 * Query params:
 * - brand   — optional; filters the underlying brand × channel rows.
 * - channel — optional; same.
 * - horizon — months to project, clamped to [1, 12]; defaults to 3.
 *             Garbage values fall back to the default rather than 400 —
 *             this endpoint is meant for cockpit reads, not strict APIs.
 */

import { getData } from '../../lib/cache';
import { forecast } from '../../lib/forecast';

const MAX_HORIZON = 12;
const DEFAULT_HORIZON = 3;

export function parseHorizon(raw: string | null): number {
  if (raw == null) return DEFAULT_HORIZON;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_HORIZON;
  return Math.min(Math.floor(n), MAX_HORIZON);
}

export function GET(req: Request): Response {
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get('brand') ?? undefined;
  const channel = searchParams.get('channel') ?? undefined;
  const horizonMonths = parseHorizon(searchParams.get('horizon'));

  const { asOf } = getData();
  const result = forecast({ asOf, horizonMonths, filter: { brand, channel } });

  return Response.json({
    ...result,
    horizonMonths,
    filter: { brand: brand ?? null, channel: channel ?? null },
  });
}
