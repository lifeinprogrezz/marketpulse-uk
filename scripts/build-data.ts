/**
 * Build-time data pipeline for MarketPulse UK.
 *
 * Reads `data/raw/UK DATA.xlsx`, joins dimensions, filters to UK
 * commercial demand (excluding copackers), parses the Spanish month
 * code, anonymizes customer names, and writes JSON artifacts under
 * `app/lib/data/__generated__/`.
 *
 * The runtime bundle never imports `xlsx` or sees real customer names.
 * The customer-id ↔ anonymized-label map is written to
 * `data/raw/anonymization-map.json` (gitignored — local reference only).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import * as XLSX from 'xlsx';

const REPO_ROOT = resolve(__dirname, '..');
const RAW_XLSX = join(REPO_ROOT, 'data/raw/UK DATA.xlsx');
const TRADE_PLAN_XLSX = join(REPO_ROOT, 'data/raw/Damm Trade Plan - promotions.xlsx');
const OUT_DIR = join(REPO_ROOT, 'app/lib/data/__generated__');
const ANON_MAP_PATH = join(REPO_ROOT, 'data/raw/anonymization-map.json');

// --- Types -----------------------------------------------------------------

type RawDatabaseRow = {
  'AÑO CALENDARIO': string;
  'Cod. Cliente': string;
  'Cod. Material': string;
  Hl: number | null;
  'Venta Neta': number | null;
  'Margen Bruto': number | null;
  'Mktg Fund': number | null;
};

type RawCustomerRow = {
  'Cod. Cliente': string | number;
  Pais: string;
  SubChannel: string;
  'Sales Channel': string;
  BDM: string;
};

type RawMaterialRow = {
  'Cod. Material': string | number;
  Marca: string;
  'Línea Negocio': string;
  'Material precio': string | null;
};

export type MonthlyAggregate = {
  /** ISO month, e.g. "2026-04". */
  month: string;
  brand: string;
  channel: string;
  hl: number;
  venta_neta: number;
  margen_bruto: number;
  mktg_fund: number;
};

export type MonthlyByCustomer = {
  month: string;
  anon_id: string;
  brand: string;
  channel: string;
  hl: number;
  margen_bruto: number;
  mktg_fund: number;
};

export type MonthlyBySku = {
  month: string;
  /** Human-readable SKU label, from MaterialData.`Material precio`. */
  sku_descr: string;
  channel: string;
  hl: number;
  margen_bruto: number;
  mktg_fund: number;
};

export type Promo = {
  /** Anonymized: "Retailer 1", "Retailer 2", … */
  retailer: string;
  /** SKU label as it appears in the trade-plan workbook (retailer-specific). */
  sku_descr: string;
  /** Promo window start, ISO date. */
  start_date: string;
  /** Promo window end (inclusive), ISO date. */
  end_date: string;
  /** Cell value if numeric, or extracted from a mechanic string like "WIGIG £13". */
  promo_price: number | null;
  /** Raw mechanic text if the cell is a string (e.g. "MTB", "2 for £20"). */
  mechanic: string | null;
  /** (max_observed_price − promo_price) / max_observed_price for this (retailer, SKU). */
  depth_pct: number | null;
};

export type AnonCustomer = {
  /** Stable anonymized label, e.g. "Major grocer #1". */
  anon_id: string;
  /** Sales channel of the original customer. */
  channel: string;
  /** Sub-channel of the original customer. */
  sub_channel: string;
};

export type DataMeta = {
  generated_at: string;
  months: string[];
  last_closed_month: string;
  brands: string[];
  channels: string[];
  /** Row counts after each filter step — for sanity checks. */
  counts: {
    raw_database_rows: number;
    after_uk_filter: number;
    after_copacker_exclusion: number;
    distinct_customers_uk: number;
    distinct_skus: number;
    uk_monthly_by_customer_rows: number;
    uk_monthly_by_sku_rows: number;
    promos_rows: number;
    distinct_retailers: number;
  };
};

// --- Spanish month parser --------------------------------------------------

const MONTH_MAP: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04',
  may: '05', jun: '06', jul: '07', ago: '08',
  sep: '09', oct: '10', nov: '11', dic: '12',
};

/** Parse "Abr.25" → "2025-04". Returns null on bad input. */
function parseSpanishMonth(raw: string): string | null {
  const match = raw.trim().toLowerCase().match(/^([a-záéíóú]{3})\.?(\d{2})$/);
  if (!match) return null;
  const mm = MONTH_MAP[match[1]];
  if (!mm) return null;
  // 2-digit year: assume 20XX (data starts 2023, no rollover risk this decade).
  const yyyy = `20${match[2]}`;
  return `${yyyy}-${mm}`;
}

// --- ID extraction ---------------------------------------------------------

/**
 * DATABASE.Cod. Cliente arrives as "1/1/91/117738 CARLSBERG SUPPLY..." —
 * the numeric customer ID is the last path segment before the first space.
 * CUSTOMERS.Cod. Cliente is the bare numeric ID.
 */
function extractClientId(raw: string): string | null {
  const m = /^[\d/]+\/(\d+)\s/.exec(raw);
  return m ? m[1] : null;
}

/**
 * DATABASE.Cod. Material arrives as "K015600 CERVEZA CORRIENTE..." —
 * the material code is the first whitespace-delimited token.
 */
function extractMaterialId(raw: string): string | null {
  const m = /^(\S+)\s/.exec(raw);
  return m ? m[1] : null;
}

// --- Anonymization ---------------------------------------------------------

/** Role label inferred from (sales_channel, sub_channel). */
function roleLabel(salesChannel: string, subChannel: string): string {
  const sc = salesChannel?.trim().toUpperCase() ?? '';
  const sub = subChannel?.trim().toUpperCase() ?? '';
  if (sub.includes('GROCERY')) return 'Major grocer';
  if (sub.includes('CONVENIENCE') || sub.includes('WHOLESALE')) return 'Convenience & wholesale';
  if (sub.includes('NATIONAL ON TRADE')) return 'On-trade national';
  if (sub.includes('FREE TRADE CMBC')) return 'On-trade free-trade (CMBC)';
  if (sub.includes('FREE TRADE')) return 'On-trade free-trade';
  if (sub.includes('MDD')) return 'Copacker';
  if (sc.includes('ON TRADE')) return 'On-trade other';
  if (sc.includes('OFF TRADE')) return 'Off-trade other';
  return 'Other';
}

/**
 * Build a deterministic anon map keyed by customer ID.
 * Labels number within each role bucket sorted by total Hl desc, so
 * "Major grocer #1" is the biggest grocer by volume.
 */
function buildAnonMap(
  customers: Map<string, { sub: string; sales: string }>,
  hlByCustomer: Map<string, number>,
): Map<string, AnonCustomer> {
  const byRole: Map<string, string[]> = new Map();
  for (const [cid, info] of customers) {
    const role = roleLabel(info.sales, info.sub);
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(cid);
  }
  const result = new Map<string, AnonCustomer>();
  for (const [role, ids] of byRole) {
    ids.sort((a, b) => (hlByCustomer.get(b) ?? 0) - (hlByCustomer.get(a) ?? 0));
    ids.forEach((cid, i) => {
      const info = customers.get(cid)!;
      result.set(cid, {
        anon_id: `${role} #${i + 1}`,
        channel: info.sales,
        sub_channel: info.sub,
      });
    });
  }
  return result;
}

// --- Main ------------------------------------------------------------------

function main() {
  console.log(`[build-data] reading ${RAW_XLSX}`);
  const buf = readFileSync(RAW_XLSX);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });

  const customersSheet = wb.Sheets['CUSTOMERS'];
  const materialsSheet = wb.Sheets['MaterialData'];
  const databaseSheet = wb.Sheets['DATABASE'];
  if (!customersSheet || !materialsSheet || !databaseSheet) {
    throw new Error('Missing one of CUSTOMERS / MaterialData / DATABASE sheets');
  }

  const customersRaw = XLSX.utils.sheet_to_json<RawCustomerRow>(customersSheet, { defval: null });
  const materialsRaw = XLSX.utils.sheet_to_json<RawMaterialRow>(materialsSheet, { defval: null });
  const databaseRaw = XLSX.utils.sheet_to_json<RawDatabaseRow>(databaseSheet, { defval: null });

  // Customer dim: id → {pais, sales channel, sub channel}
  const customerById = new Map<
    string,
    { pais: string; sales: string; sub: string }
  >();
  for (const row of customersRaw) {
    const id = String(row['Cod. Cliente']).trim();
    if (!id) continue;
    customerById.set(id, {
      pais: row.Pais,
      sales: row['Sales Channel'],
      sub: row.SubChannel,
    });
  }

  // Material dim: id → {brand, line, sku_descr}.
  // SKU DESCRIPTION column in the source workbook is empty for every row,
  // so we fall back to `Material precio` (e.g. "K015600 CERVEZA CORRIENTE
  // EXPORT DAMM A21"), which is populated and human-readable.
  const materialById = new Map<string, { brand: string; line: string; sku_descr: string }>();
  for (const row of materialsRaw) {
    const id = String(row['Cod. Material']).trim();
    if (!id) continue;
    materialById.set(id, {
      brand: row.Marca,
      line: row['Línea Negocio'],
      sku_descr: String(row['Material precio'] ?? id).trim() || id,
    });
  }

  // --- Pass 1: filter to UK, exclude copackers, sum hl per customer for anon ranking
  const ukRows: Array<{
    month: string;
    cid: string;
    mid: string;
    hl: number;
    venta_neta: number;
    margen_bruto: number;
    mktg_fund: number;
  }> = [];
  const hlByCustomer = new Map<string, number>();
  let postUkFilter = 0;
  let postCopackerExclusion = 0;

  for (const row of databaseRaw) {
    const month = parseSpanishMonth(row['AÑO CALENDARIO']);
    if (!month) continue;
    const cid = extractClientId(row['Cod. Cliente']);
    const mid = extractMaterialId(row['Cod. Material']);
    if (!cid || !mid) continue;
    const cust = customerById.get(cid);
    if (!cust || cust.pais !== 'Reino Unido') continue;
    postUkFilter++;
    if ((cust.sales ?? '').toUpperCase().includes('CO-PACKING')) continue;
    postCopackerExclusion++;
    const hl = Number(row.Hl ?? 0);
    // DATABASE money columns (Venta Neta, Margen Bruto, Mktg Fund) arrive in
    // thousands of euros — scale to raw EUR on ingest so every downstream
    // consumer (KPI strip, forecast, simulator, AI Analyst) sees one unit.
    ukRows.push({
      month,
      cid,
      mid,
      hl,
      venta_neta: Number(row['Venta Neta'] ?? 0) * 1000,
      margen_bruto: Number(row['Margen Bruto'] ?? 0) * 1000,
      mktg_fund: Number(row['Mktg Fund'] ?? 0) * 1000,
    });
    hlByCustomer.set(cid, (hlByCustomer.get(cid) ?? 0) + hl);
  }

  // Anon map (over the UK non-copacker customers that actually appear in DATABASE)
  const ukCustomers = new Map<string, { sales: string; sub: string }>();
  for (const cid of hlByCustomer.keys()) {
    const c = customerById.get(cid)!;
    ukCustomers.set(cid, { sales: c.sales, sub: c.sub });
  }
  const anonMap = buildAnonMap(ukCustomers, hlByCustomer);

  // --- Pass 2: aggregate by (brand, channel, month) + customer + SKU
  type Key = string;
  const keyOf = (brand: string, channel: string, month: string): Key =>
    `${brand}|${channel}|${month}`;
  const agg = new Map<Key, MonthlyAggregate>();
  const byCustomer = new Map<Key, MonthlyByCustomer>();
  const bySku = new Map<Key, MonthlyBySku>();
  const distinctSkus = new Set<string>();

  for (const r of ukRows) {
    const mat = materialById.get(r.mid);
    if (!mat) continue;
    distinctSkus.add(r.mid);
    const channel = customerById.get(r.cid)!.sales;
    const brand = mat.brand ?? 'UNKNOWN';
    const anonId = anonMap.get(r.cid)!.anon_id;
    const sku = mat.sku_descr;

    // brand × channel × month
    const k = keyOf(brand, channel, r.month);
    let cur = agg.get(k);
    if (!cur) {
      cur = {
        month: r.month,
        brand,
        channel,
        hl: 0,
        venta_neta: 0,
        margen_bruto: 0,
        mktg_fund: 0,
      };
      agg.set(k, cur);
    }
    cur.hl += r.hl;
    cur.venta_neta += r.venta_neta;
    cur.margen_bruto += r.margen_bruto;
    cur.mktg_fund += r.mktg_fund;

    // anon_customer × brand × channel × month
    const kc = `${r.month}|${anonId}|${brand}|${channel}`;
    let curC = byCustomer.get(kc);
    if (!curC) {
      curC = {
        month: r.month,
        anon_id: anonId,
        brand,
        channel,
        hl: 0,
        margen_bruto: 0,
        mktg_fund: 0,
      };
      byCustomer.set(kc, curC);
    }
    curC.hl += r.hl;
    curC.margen_bruto += r.margen_bruto;
    curC.mktg_fund += r.mktg_fund;

    // sku × channel × month
    const ks = `${r.month}|${sku}|${channel}`;
    let curS = bySku.get(ks);
    if (!curS) {
      curS = {
        month: r.month,
        sku_descr: sku,
        channel,
        hl: 0,
        margen_bruto: 0,
        mktg_fund: 0,
      };
      bySku.set(ks, curS);
    }
    curS.hl += r.hl;
    curS.margen_bruto += r.margen_bruto;
    curS.mktg_fund += r.mktg_fund;
  }

  const monthly = Array.from(agg.values()).sort(
    (a, b) =>
      a.month.localeCompare(b.month) ||
      a.brand.localeCompare(b.brand) ||
      a.channel.localeCompare(b.channel),
  );

  const monthlyByCustomer = Array.from(byCustomer.values()).sort(
    (a, b) =>
      a.month.localeCompare(b.month) ||
      a.anon_id.localeCompare(b.anon_id) ||
      a.brand.localeCompare(b.brand) ||
      a.channel.localeCompare(b.channel),
  );

  const monthlyBySku = Array.from(bySku.values()).sort(
    (a, b) =>
      a.month.localeCompare(b.month) ||
      a.sku_descr.localeCompare(b.sku_descr) ||
      a.channel.localeCompare(b.channel),
  );

  // --- Trade plan parsing
  console.log(`[build-data] reading ${TRADE_PLAN_XLSX}`);
  const tpBuf = readFileSync(TRADE_PLAN_XLSX);
  const tpWb = XLSX.read(tpBuf, { type: 'buffer', cellDates: true });
  const promosRaw = [
    ...parseTesco(tpWb),
    ...parseSainsburys(tpWb),
    ...parseAsda(tpWb),
  ];

  // base_price = max observed promo_price per (retailer, sku) — proxy for list price
  const basePrices = new Map<string, number>();
  for (const p of promosRaw) {
    if (p.promo_price == null) continue;
    const key = `${p.retailer_raw}::${p.sku_descr}`;
    basePrices.set(key, Math.max(basePrices.get(key) ?? 0, p.promo_price));
  }

  // Stable retailer anonymization (alpha order of raw names)
  const retailerNames = Array.from(new Set(promosRaw.map((p) => p.retailer_raw))).sort();
  const retailerLabel = new Map<string, string>(
    retailerNames.map((n, i) => [n, `Retailer ${i + 1}`]),
  );

  const promos: Promo[] = promosRaw
    .map((p) => {
      const base = basePrices.get(`${p.retailer_raw}::${p.sku_descr}`);
      const depth =
        base != null && base > 0 && p.promo_price != null
          ? (base - p.promo_price) / base
          : null;
      return {
        retailer: retailerLabel.get(p.retailer_raw)!,
        sku_descr: p.sku_descr,
        start_date: p.start_date,
        end_date: p.end_date,
        promo_price: p.promo_price,
        mechanic: p.mechanic,
        depth_pct: depth,
      };
    })
    .sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) ||
        a.retailer.localeCompare(b.retailer) ||
        a.sku_descr.localeCompare(b.sku_descr),
    );

  // --- Meta
  const months = Array.from(new Set(monthly.map((r) => r.month))).sort();
  // "Last closed month" = the latest month with non-trivial total Hl
  // (current month is often partial; we anchor to the latest fully-filled).
  // For now: take the latest month outright; refine when the actuals look thin.
  const lastClosedMonth = months[months.length - 1];
  const meta: DataMeta = {
    generated_at: new Date().toISOString(),
    months,
    last_closed_month: lastClosedMonth,
    brands: Array.from(new Set(monthly.map((r) => r.brand))).sort(),
    channels: Array.from(new Set(monthly.map((r) => r.channel))).sort(),
    counts: {
      raw_database_rows: databaseRaw.length,
      after_uk_filter: postUkFilter,
      after_copacker_exclusion: postCopackerExclusion,
      distinct_customers_uk: hlByCustomer.size,
      distinct_skus: distinctSkus.size,
      uk_monthly_by_customer_rows: monthlyByCustomer.length,
      uk_monthly_by_sku_rows: monthlyBySku.length,
      promos_rows: promos.length,
      distinct_retailers: retailerNames.length,
    },
  };

  // --- Anon customer list (no real names, just labels + channel)
  const anonCustomers: AnonCustomer[] = Array.from(anonMap.values()).sort((a, b) =>
    a.anon_id.localeCompare(b.anon_id),
  );

  // --- Write outputs
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'uk-monthly.json'), JSON.stringify(monthly, null, 2));
  writeFileSync(
    join(OUT_DIR, 'uk-monthly-by-customer.json'),
    JSON.stringify(monthlyByCustomer, null, 2),
  );
  writeFileSync(
    join(OUT_DIR, 'uk-monthly-by-sku.json'),
    JSON.stringify(monthlyBySku, null, 2),
  );
  writeFileSync(join(OUT_DIR, 'customers.json'), JSON.stringify(anonCustomers, null, 2));
  writeFileSync(join(OUT_DIR, 'promos.json'), JSON.stringify(promos, null, 2));
  writeFileSync(join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

  // Anon map (local-only). Gitignored. Holds the real-name lookups we
  // intentionally never ship in the bundle.
  mkdirSync(dirname(ANON_MAP_PATH), { recursive: true });
  const anonMapOut = {
    customers: Object.fromEntries(anonMap),
    retailers: Object.fromEntries(retailerLabel),
  };
  writeFileSync(ANON_MAP_PATH, JSON.stringify(anonMapOut, null, 2));

  console.log(`[build-data] meta:`, meta);
  console.log(`[build-data] wrote ${monthly.length} brand×channel rows`);
  console.log(`[build-data] wrote ${monthlyByCustomer.length} customer rows`);
  console.log(`[build-data] wrote ${monthlyBySku.length} sku rows`);
  console.log(`[build-data] wrote ${anonCustomers.length} anonymized customers`);
  console.log(`[build-data] wrote ${promos.length} promos across ${retailerNames.length} retailers`);
  console.log(`[build-data] wrote anon map → ${ANON_MAP_PATH} (gitignored)`);
}

// --- Trade-plan parsers ----------------------------------------------------

type PromoRaw = {
  /** Real retailer name; stripped from the JSON artifact, kept only in the gitignored anon map. */
  retailer_raw: string;
  sku_descr: string;
  start_date: string;
  end_date: string;
  promo_price: number | null;
  mechanic: string | null;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Cell can be a price number, a mechanic string ("MTB", "WIGIG £13"), or empty. */
function coercePromoCell(v: unknown): { price: number | null; mechanic: string | null } {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1000) {
    return { price: v, mechanic: null };
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return { price: null, mechanic: null };
    const m = /£\s*(\d+(?:\.\d+)?)/.exec(trimmed);
    return { price: m ? Number(m[1]) : null, mechanic: trimmed };
  }
  return { price: null, mechanic: null };
}

/**
 * Tesco layout: row 3 = start dates (one per week), row 5+ = SKU rows
 * with SKU description at col 2 and weekly prices from col 3.
 */
function parseTesco(wb: XLSX.WorkBook): PromoRaw[] {
  const ws = wb.Sheets['Tesco'];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  const dateRow = (rows[3] ?? []) as unknown[];
  const periods: Array<{ col: number; start: Date; end: Date }> = [];
  for (let col = 3; col < dateRow.length; col++) {
    const v = dateRow[col];
    if (v instanceof Date) {
      periods.push({ col, start: v, end: new Date(v.getTime() + 6 * 86_400_000) });
    }
  }
  const out: PromoRaw[] = [];
  for (let r = 5; r < rows.length; r++) {
    const row = (rows[r] ?? []) as unknown[];
    const sku = row[2];
    if (typeof sku !== 'string' || !sku.trim()) continue;
    for (const p of periods) {
      const { price, mechanic } = coercePromoCell(row[p.col]);
      if (price == null && mechanic == null) continue;
      out.push({
        retailer_raw: 'Tesco',
        sku_descr: sku.trim(),
        start_date: isoDate(p.start),
        end_date: isoDate(p.end),
        promo_price: price,
        mechanic,
      });
    }
  }
  return out;
}

/**
 * Sainsbury's layout: row 2 = start dates (one per week, starting col 1),
 * row 4+ = SKU rows with description at col 0 and weekly prices from col 1.
 */
function parseSainsburys(wb: XLSX.WorkBook): PromoRaw[] {
  const ws = wb.Sheets["Sainsbury's"];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  const dateRow = (rows[2] ?? []) as unknown[];
  const periods: Array<{ col: number; start: Date; end: Date }> = [];
  for (let col = 1; col < dateRow.length; col++) {
    const v = dateRow[col];
    if (v instanceof Date) {
      periods.push({ col, start: v, end: new Date(v.getTime() + 6 * 86_400_000) });
    }
  }
  const out: PromoRaw[] = [];
  for (let r = 4; r < rows.length; r++) {
    const row = (rows[r] ?? []) as unknown[];
    const sku = row[0];
    if (typeof sku !== 'string' || !sku.trim()) continue;
    for (const p of periods) {
      const { price, mechanic } = coercePromoCell(row[p.col]);
      if (price == null && mechanic == null) continue;
      out.push({
        retailer_raw: "Sainsbury's",
        sku_descr: sku.trim(),
        start_date: isoDate(p.start),
        end_date: isoDate(p.end),
        promo_price: price,
        mechanic,
      });
    }
  }
  return out;
}

/** Asda layout: row 1 has period ranges as "DD/MM-DD/MM" strings, values on cols 1,3,5,7. */
function parseAsdaPeriod(s: string): { start: Date; end: Date } | null {
  const m = /^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  // Trade plan covers calendar 2026 (per design spec); year not in the cell.
  const year = 2026;
  const start = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1])));
  const end = new Date(Date.UTC(year, Number(m[4]) - 1, Number(m[3])));
  return { start, end };
}

function parseAsda(wb: XLSX.WorkBook): PromoRaw[] {
  const ws = wb.Sheets['Asda'];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  const headerRow = (rows[1] ?? []) as unknown[];
  const periods: Array<{ col: number; start: Date; end: Date }> = [];
  for (let col = 1; col < headerRow.length; col++) {
    const v = headerRow[col];
    if (typeof v !== 'string') continue;
    const range = parseAsdaPeriod(v);
    if (range) periods.push({ col, ...range });
  }
  const out: PromoRaw[] = [];
  for (let r = 2; r < rows.length; r++) {
    const row = (rows[r] ?? []) as unknown[];
    const sku = row[0];
    if (typeof sku !== 'string' || !sku.trim()) continue;
    for (const p of periods) {
      const { price, mechanic } = coercePromoCell(row[p.col]);
      if (price == null && mechanic == null) continue;
      out.push({
        retailer_raw: 'Asda',
        sku_descr: sku.trim(),
        start_date: isoDate(p.start),
        end_date: isoDate(p.end),
        promo_price: price,
        mechanic,
      });
    }
  }
  return out;
}

main();
