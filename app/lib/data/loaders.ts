/**
 * Typed accessors over the build-time JSON artifacts in `__generated__/`.
 * Every later task (forecast engine, /api/forecast route, AI Analyst tools)
 * goes through this module — there are no other readers of the raw JSON.
 *
 * Runtime cost is a single JSON parse per import (Next.js bundles the JSON
 * into the server build). No I/O.
 */

import byCustomerJson from './__generated__/uk-monthly-by-customer.json';
import bySkuJson from './__generated__/uk-monthly-by-sku.json';
import customersJson from './__generated__/customers.json';
import metaJson from './__generated__/meta.json';
import monthlyJson from './__generated__/uk-monthly.json';
import promosJson from './__generated__/promos.json';

export interface DataMeta {
  generated_at: string;
  months: string[];
  last_closed_month: string;
  brands: string[];
  channels: string[];
  counts: Record<string, number>;
}

export interface MonthlyByBrandChannel {
  month: string;
  brand: string;
  channel: string;
  hl: number;
  venta_neta: number;
  margen_bruto: number;
  mktg_fund: number;
}

export interface MonthlyByCustomer {
  month: string;
  anon_id: string;
  brand: string;
  channel: string;
  hl: number;
  margen_bruto: number;
  mktg_fund: number;
}

export interface MonthlyBySku {
  month: string;
  sku_descr: string;
  channel: string;
  hl: number;
  margen_bruto: number;
  mktg_fund: number;
}

export interface AnonCustomer {
  anon_id: string;
  channel: string;
  sub_channel: string;
}

export interface PromoEntry {
  retailer: string;
  sku_descr: string;
  start_date: string;
  end_date: string;
  promo_price: number | null;
  mechanic: string | null;
  depth_pct: number | null;
}

export function getMeta(): DataMeta {
  return metaJson as DataMeta;
}

export function getMonthlyByBrandChannel(): MonthlyByBrandChannel[] {
  return monthlyJson as MonthlyByBrandChannel[];
}

export function getMonthlyByCustomer(): MonthlyByCustomer[] {
  return byCustomerJson as MonthlyByCustomer[];
}

export function getMonthlyBySku(): MonthlyBySku[] {
  return bySkuJson as MonthlyBySku[];
}

export function getCustomers(): AnonCustomer[] {
  return customersJson as AnonCustomer[];
}

export function getPromos(): PromoEntry[] {
  return promosJson as PromoEntry[];
}
