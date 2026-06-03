# MarketPulse UK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MarketPulse UK monthly commercial cockpit per the design spec — decomposition, on-track-vs-target, margin-aware promo effectiveness, and a promo simulator, with an AI Analyst side panel — fed by the delivered UK DATA + trade-plan workbooks.

**Architecture:** All work lives in the existing Next.js 16 app. Data pipeline parses Excel on cold start and caches in memory. A TypeScript forecast engine produces monthly projections at `(brand, channel)` granularity with promo-lift coefficients tracking both volume (Hl) and margin (Margen Bruto). One `/api/forecast` route serves the dashboard; the existing `/api/chat` route gains six MarketPulse-specific tools alongside the existing Cala MCP tools. Frontend swaps from chat-only to a 3-column cockpit with the chat as the AI Analyst side rail.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + AI SDK v6 + **Claude Sonnet 4.6 via Vercel AI Gateway** (`anthropic/claude-sonnet-4.6`). `xlsx` for Excel parsing at build time only. `recharts` for charts. `vitest` for unit tests. `tsx` for one-shot scripts.

> The model was briefly swapped to Llama 3.3 via HF Router (PR #11, merged) and is being reverted to Sonnet 4.6 in a follow-up PR — see the Status section. Treat Sonnet 4.6 as the model of record from this PR onward.

**Source spec:** [`docs/superpowers/specs/2026-05-23-marketpulse-uk-design.md`](../specs/2026-05-23-marketpulse-uk-design.md)

## Status — revised after PR #10 + #11

- **PR #10 (merged)** landed a build-time data pipeline (`scripts/build-data.ts`) that already emits `meta.json`, `uk-monthly.json` (aggregated to month × brand × channel), and `customers.json` (anonymized customer dimension) under `app/lib/data/__generated__/`. *Original Tasks 2 and 3 are obsolete — Eddie did that work.*
- **PR #11 (merged, being reverted)** swapped the chat route to **Llama 3.3 70B Instruct via the Hugging Face Inference Router**. Decision (Eddie + Roberto, kickoff): revert back to `anthropic/claude-sonnet-4.6` via the Vercel AI Gateway in a follow-up PR — we already had it deployed and working, HF is unproven for our use case, and the new env var (`HF_TOKEN`) adds risk for no clear benefit. The npm deps (`@ai-sdk/openai-compatible`, `vitest`, `tsx`, `xlsx`) that landed with PR #11 stay — they are needed downstream. *Original Task 1's "install deps" step is therefore done; its model-swap step is reverted out.*
- **Original Task 4 (runtime Tesco parser)** is replaced by an extension of `scripts/build-data.ts` that parses the trade-plan workbook at build time — see the new Task 2 below. Original Task 17 (additional retailer parsers) folds into the same task.
- **Tasks 5–18** (forecast engine, UI panels, AI Analyst tools, stretch goals) still apply, but they now consume the build-time JSON via typed loaders (new Task 3) instead of the runtime Excel parser the original plan assumed.
- **Active execution order:** new Task 2 → new Task 3 → original Tasks 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18. Original Tasks 1–4 and 17 are subsumed by the items above.

## Slice split — execution ownership

Per CLAUDE.md's two-person rule ("split work in vertical slices, not frontend vs backend"), agreed at kickoff:

**Eddie — logic slice (data → forecast → API → AI tools):**
- New Task 2: extend `scripts/build-data.ts` with customer + SKU aggregates + trade-plan parser.
- New Task 3: typed JSON loaders (`app/lib/data/loaders.ts`).
- Task 5: baseline projection (YoY × trend).
- Task 6: promo lift coefficients (Hl + margin).
- Task 7: promo effectiveness + ROI proxy.
- Task 8: `/api/forecast` route + cold-start cache.
- Task 15: MarketPulse AI Analyst tools + system prompt rewrite.
- Sonnet-4.6 revert PR (small, lands first to unblock the chat path).

**Roberto — UI slice (shell + panels + polish):**
- Task 9: cockpit shell + AI Analyst side-rail refactor.
- Task 10: KPI strip.
- Task 11: forecast chart.
- Task 12: decomposition panel (channel / brand / top customers).
- Task 13: promo effectiveness panel.
- Task 14: promo simulator panel.
- Task 18: README + demo script.

**Shared / stretch:** Task 16 (external regressors) — whoever lands their slice first picks it up.

**The one shared file is `app/page.tsx`.** To avoid collisions:
- Roberto owns the JSX.
- Eddie exports page-data helpers from `app/lib/page-data.ts` (or directly from `loaders.ts` + `forecast/`) and Roberto imports them.
- The props interfaces in Tasks 10–14 (`KpiStripProps`, `ChartPoint`, `Decomposition.Props`, `PromoEffectiveness.Row`, `SimulatorProps`) are the contract. **Do not change those interfaces without a heads-up to the other person.**

**Coordination cadence:** open one PR per task (or per pair of tasks where they're tightly coupled), squash-merge, delete branch. If a task takes >2 hours, split it.

---

## File Structure

**Files to create**

- `app/lib/types.ts` — shared types.
- `app/lib/data/months.ts` — Spanish month abbreviation parser.
- `app/lib/data/excel.ts` — xlsx loaders.
- `app/lib/data/normalize.ts` — joins (sales × customers × materials), UK filter, anonymizer.
- `app/lib/data/promos.ts` — per-retailer trade-plan parsers.
- `app/lib/forecast/baseline.ts` — baseline projection (YoY × trend) + monthly utilities.
- `app/lib/forecast/lift.ts` — promo lift coefficients (Hl + margin) + `inferCoefficients` helper.
- `app/lib/forecast/effectiveness.ts` — observed lift + ROI proxy.
- `app/lib/forecast/index.ts` — forecaster entry point.
- `app/lib/cache.ts` — cold-start cache.
- `app/api/forecast/route.ts` — JSON endpoint for the cockpit.
- `app/components/cockpit/Shell.tsx` — 3-column cockpit shell.
- `app/components/cockpit/KpiStrip.tsx`
- `app/components/cockpit/ForecastChart.tsx`
- `app/components/cockpit/Decomposition.tsx`
- `app/components/cockpit/PromoEffectiveness.tsx`
- `app/components/cockpit/Simulator.tsx`
- `app/components/chat/AiAnalystPanel.tsx` — re-positioned chat scaffold.
- `scripts/validate-data.ts` — one-shot data sanity check.
- `scripts/regressor-analysis.ts` — stretch goal.
- `app/lib/external/holidays.ts`, `app/lib/external/weather.ts` — stretch goal.
- `tests/data/months.test.ts`, `tests/data/normalize.test.ts`, `tests/data/promos.test.ts`
- `tests/forecast/baseline.test.ts`, `tests/forecast/lift.test.ts`, `tests/forecast/effectiveness.test.ts`

**Files to modify**

- `app/api/chat/route.ts` — swap model provider (HF/Llama 3.3), add MarketPulse tools alongside Cala MCP, update system prompt.
- `app/page.tsx` — replace chat-only page with cockpit dashboard.
- `package.json` — add `xlsx`, `@ai-sdk/openai-compatible`, `recharts`, `vitest`, `tsx`.
- `README.md` — update env vars and run instructions.
- `.env.example` — add `HF_TOKEN`.
- `.gitignore` — add `data/`.

---

## Phase 0 (revised) — Data pipeline extension + typed loaders

These two tasks replace the original Tasks 1–4. They produce the artifacts and accessors that every later task depends on.

### New Task 2: Extend `scripts/build-data.ts` with customer + SKU aggregates + trade plan parser

**Files:**
- Modify: `scripts/build-data.ts`
- Create: `app/lib/data/__generated__/uk-monthly-by-customer.json` (generated)
- Create: `app/lib/data/__generated__/uk-monthly-by-sku.json` (generated)
- Create: `app/lib/data/__generated__/promos.json` (generated)
- Modify: `app/lib/data/__generated__/meta.json` (add new artifact paths + counts)
- Modify: `data/raw/anonymization-map.json` (extend with retailer mappings — gitignored)

**Goal:** emit three additional JSON artifacts so the dashboard can do top-customer decomposition (block 1 of §1) and SKU-level promo effectiveness matching (block 3 of §1). Per-retailer trade-plan parsers run at build time and write into a single normalized `promos.json`.

- [ ] **Step 1: Inspect each retailer sheet in `Damm Trade Plan - promotions.xlsx`**

For each priority retailer, run:

```bash
npx tsx -e "import * as X from 'xlsx'; import fs from 'node:fs'; const wb = X.read(fs.readFileSync('data/raw/Damm Trade Plan - promotions.xlsx'), { cellDates: true }); console.log(JSON.stringify(X.utils.sheet_to_json(wb.Sheets['Tesco'], { header: 1 }).slice(0, 7), null, 2));"
```

(Repeat for `'Sainsbury\\'s'` and `'Asda'` as the priority set.) Confirm: which row holds period start dates, which row holds week numbers, and which row(s) hold SKU labels. Each retailer layout is different and the parser must adapt.

- [ ] **Step 2: Add the customer-level aggregate to `build-data.ts`**

After the existing `uk-monthly.json` write, add an aggregation step that groups the joined sales rows by `(month, anon_id, brand, channel)`. Output shape:

```ts
type MonthlyByCustomer = {
  month: string;          // "2026-04"
  anon_id: string;        // "Convenience & wholesale #3"
  brand: string;
  channel: string;
  hl: number;
  margen_bruto: number;
  mktg_fund: number;
};
```

Write to `app/lib/data/__generated__/uk-monthly-by-customer.json`. Include `anon_id` so the dashboard can join back to `customers.json` for sub-channel labels.

- [ ] **Step 3: Add the SKU-level aggregate**

Group joined sales rows by `(month, sku_descr, channel)`. Output:

```ts
type MonthlyBySku = {
  month: string;
  sku_descr: string;      // from MaterialData.Material precio or SKU DESCRIPTION
  channel: string;
  hl: number;
  margen_bruto: number;
  mktg_fund: number;
};
```

Write to `app/lib/data/__generated__/uk-monthly-by-sku.json`.

- [ ] **Step 4: Trade-plan parser — Tesco first**

Add a helper at the bottom of `build-data.ts`:

```ts
type Promo = {
  retailer: string;       // anonymized: "Retailer 1"
  retailer_raw: string;   // "Tesco" — kept here for the anonymization map, but stripped before write
  sku_descr: string;
  start_date: string;     // ISO
  end_date: string;       // ISO
  promo_price: number | null;
  mechanic: string | null;
  depth_pct: number | null;
};

function parseTesco(wb: XLSX.WorkBook): Omit<Promo, 'retailer'>[] {
  const ws = wb.Sheets['Tesco'];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  const dateRow = (rows[3] ?? []) as unknown[];
  const periods: Array<{ col: number; start: Date; end: Date }> = [];
  for (let col = 3; col < dateRow.length; col++) {
    const v = dateRow[col];
    if (v instanceof Date) {
      const start = v;
      const end = new Date(start.getTime() + 6 * 86_400_000);
      periods.push({ col, start, end });
    }
  }
  const out: Omit<Promo, 'retailer'>[] = [];
  for (let r = 5; r < rows.length; r++) {
    const row = (rows[r] ?? []) as unknown[];
    const sku = row[0];
    if (typeof sku !== 'string' || sku.trim().length === 0) continue;
    for (const p of periods) {
      const v = row[p.col];
      const isPrice = typeof v === 'number' && v > 0 && v < 1000;
      const isMech = typeof v === 'string' && v.trim().length > 0;
      if (isPrice || isMech) {
        out.push({
          retailer_raw: 'Tesco',
          sku_descr: sku.trim(),
          start_date: p.start.toISOString().slice(0, 10),
          end_date: p.end.toISOString().slice(0, 10),
          promo_price: isPrice ? (v as number) : null,
          mechanic: isMech ? String(v).trim() : null,
          depth_pct: null,
        });
      }
    }
  }
  return out;
}
```

Add equivalent stubs `parseSainsburys` and `parseAsda` (return `[]` for now, fill in once the inspection step has confirmed each layout). Iterate them all and concatenate.

- [ ] **Step 5: Compute `depth_pct` and anonymize retailers**

After collecting all promos:

```ts
const promosRaw = [...parseTesco(wb), ...parseSainsburys(wb), ...parseAsda(wb)];

// depth_pct = (base price - promo price) / base price, where base = highest observed price per (retailer, sku)
const basePrices = new Map<string, number>();
for (const p of promosRaw) {
  if (p.promo_price == null) continue;
  const key = `${p.retailer_raw}::${p.sku_descr}`;
  basePrices.set(key, Math.max(basePrices.get(key) ?? 0, p.promo_price));
}

// Stable retailer anonymization (alpha order of raw names)
const retailerNames = [...new Set(promosRaw.map((p) => p.retailer_raw))].sort();
const retailerLabel = new Map<string, string>(retailerNames.map((n, i) => [n, `Retailer ${i + 1}`]));

const promos: Promo[] = promosRaw.map((p) => {
  const base = basePrices.get(`${p.retailer_raw}::${p.sku_descr}`);
  const depth = base != null && p.promo_price != null ? (base - p.promo_price) / base : null;
  return { ...p, retailer: retailerLabel.get(p.retailer_raw)!, depth_pct: depth };
});

// Strip retailer_raw before persisting (anonymization)
const promosOut = promos.map(({ retailer_raw, ...rest }) => rest);
writeFileSync(join(OUT_DIR, 'promos.json'), JSON.stringify(promosOut, null, 2));

// Append retailer entries to the anonymization map for local reference (gitignored file)
const existingMap = existsSync(ANON_MAP_PATH) ? JSON.parse(readFileSync(ANON_MAP_PATH, 'utf-8')) : {};
existingMap.retailers = Object.fromEntries(retailerLabel);
writeFileSync(ANON_MAP_PATH, JSON.stringify(existingMap, null, 2));
```

- [ ] **Step 6: Update `meta.json` with the new artifact paths + counts**

In the meta-writing block, add:

```ts
counts.uk_monthly_by_customer_rows = byCustomer.length;
counts.uk_monthly_by_sku_rows = bySku.length;
counts.promos_rows = promosOut.length;
counts.distinct_retailers = retailerNames.length;
```

- [ ] **Step 7: Run the pipeline + smoke-check**

```bash
npm run data:build
ls -la app/lib/data/__generated__/
```

Expected: five JSON files (`meta.json`, `customers.json`, `uk-monthly.json`, `uk-monthly-by-customer.json`, `uk-monthly-by-sku.json`, `promos.json`). Eyeball the head of each.

- [ ] **Step 8: Commit on the right branch**

Verify you are NOT on `main`:

```bash
git branch --show-current
```

If `main`, create a feature branch first (`git checkout -b feature/marketpulse-data-extension`). Then:

```bash
git add scripts/build-data.ts app/lib/data/__generated__/*.json
git commit -m "feat(data): customer + SKU aggregates + trade plan parser (Tesco, Sainsbury's, Asda)"
```

Push and open a PR. Do NOT push to main directly.

---

### New Task 3: Typed JSON loaders

**Files:**
- Create: `app/lib/data/loaders.ts`
- Create: `tests/data/loaders.test.ts`

**Goal:** typed accessors over the five generated JSON files. No I/O at runtime — every loader is a synchronous import + cast. This is the single place every later task touches the data layer.

- [ ] **Step 1: Write the failing test**

Create `tests/data/loaders.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getMeta, getMonthlyByBrandChannel, getMonthlyByCustomer, getMonthlyBySku, getCustomers, getPromos } from '../../app/lib/data/loaders';

describe('loaders', () => {
  it('getMeta returns months sorted ascending and a non-empty brands list', () => {
    const m = getMeta();
    expect(m.months.length).toBeGreaterThan(0);
    expect(m.brands.length).toBeGreaterThan(0);
    expect([...m.months].sort()).toEqual(m.months);
    expect(m.last_closed_month).toBe(m.months[m.months.length - 1]);
  });
  it('getMonthlyByBrandChannel returns rows with the documented shape', () => {
    const rows = getMonthlyByBrandChannel();
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0];
    expect(typeof r.month).toBe('string');
    expect(typeof r.brand).toBe('string');
    expect(typeof r.channel).toBe('string');
    expect(typeof r.hl).toBe('number');
    expect(typeof r.margen_bruto).toBe('number');
  });
  it('getCustomers returns anonymized labels', () => {
    const cs = getCustomers();
    expect(cs.length).toBeGreaterThan(0);
    for (const c of cs.slice(0, 5)) {
      expect(c.anon_id).toMatch(/#\d+$/);
    }
  });
  it('getPromos returns rows with anonymized retailers', () => {
    const promos = getPromos();
    if (promos.length === 0) return; // promos.json may be empty until Task 2 ships
    for (const p of promos.slice(0, 5)) {
      expect(p.retailer).toMatch(/^Retailer \d+$/);
    }
  });
});
```

- [ ] **Step 2: Run, observe failure**

Run: `npx vitest run tests/data/loaders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the loaders**

Create `app/lib/data/loaders.ts`:

```ts
import metaJson from './__generated__/meta.json';
import monthlyJson from './__generated__/uk-monthly.json';
import customersJson from './__generated__/customers.json';
// The following imports may not yet exist if Task 2 has not landed — guard at runtime.
import byCustomerJson from './__generated__/uk-monthly-by-customer.json' assert { type: 'json' };
import bySkuJson from './__generated__/uk-monthly-by-sku.json' assert { type: 'json' };
import promosJson from './__generated__/promos.json' assert { type: 'json' };

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

export function getMeta(): DataMeta { return metaJson as DataMeta; }
export function getMonthlyByBrandChannel(): MonthlyByBrandChannel[] { return monthlyJson as MonthlyByBrandChannel[]; }
export function getCustomers(): AnonCustomer[] { return customersJson as AnonCustomer[]; }
export function getMonthlyByCustomer(): MonthlyByCustomer[] { return byCustomerJson as MonthlyByCustomer[]; }
export function getMonthlyBySku(): MonthlyBySku[] { return bySkuJson as MonthlyBySku[]; }
export function getPromos(): PromoEntry[] { return promosJson as PromoEntry[]; }
```

If the JSON files for the new artifacts don't exist yet (Task 2 not landed), the `import ... assert` lines will fail typecheck. Stub the missing files with `[]` temporarily — `echo '[]' > app/lib/data/__generated__/uk-monthly-by-customer.json` (and the same for the other two) — and remove the stubs the moment Task 2 lands.

- [ ] **Step 4: Run, see green**

Run: `npx vitest run tests/data/loaders.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Type-check**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit on the right branch**

Verify branch:

```bash
git branch --show-current
```

Must not be `main`. Then:

```bash
git add app/lib/data/loaders.ts tests/data/loaders.test.ts
git commit -m "feat(data): typed JSON loaders for the generated artifacts"
```

---

## Phase 0 (original) — obsolete

The sections below are the original Tasks 1–4. They are kept for historical reference. **Do not execute them**; the new Phase 0 above replaces them.

### Task 1: Install dependencies + swap model provider to HF/Llama 3.3

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install xlsx @ai-sdk/openai-compatible recharts
npm install -D vitest tsx
```

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Add `HF_TOKEN` to `.env.example`**

Append to `.env.example`:

```
# Hugging Face Inference Router token for Llama 3.3 70B
HF_TOKEN=
```

- [ ] **Step 4: Swap model provider in `app/api/chat/route.ts`**

Add imports near the top:

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
```

Replace the `streamText({ model: 'anthropic/claude-sonnet-4.6', ... })` call's `model` field. Before the `streamText` call, insert:

```ts
if (!process.env.HF_TOKEN) {
  await mcpClient.close();
  return new Response('HF_TOKEN is not set on the server', { status: 500 });
}

const hf = createOpenAICompatible({
  name: 'huggingface',
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_TOKEN,
});
```

Then in `streamText({ ... })` use:

```ts
model: hf('meta-llama/Llama-3.3-70B-Instruct'),
```

- [ ] **Step 5: Type-check + build**

Run: `npm run typecheck && npm run build`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json app/api/chat/route.ts .env.example
git commit -m "feat: swap chat provider to Llama 3.3 via Hugging Face Inference Router"
```

---

## Phase 1 — Data layer

### Task 2: Excel loaders + Spanish month parser

**Files:**
- Create: `app/lib/types.ts`
- Create: `app/lib/data/months.ts`
- Create: `app/lib/data/excel.ts`
- Create: `tests/data/months.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Place data files locally (gitignored)**

```bash
mkdir -p data
cp "$HOME/Descargas/MarketPulse UK/Repte internacional/UK DATA.xlsx" data/UK_DATA.xlsx
cp "$HOME/Descargas/MarketPulse UK/Repte internacional/Damm Trade Plan - promotions.xlsx" data/Damm_Trade_Plan_promotions.xlsx
```

Append to `.gitignore`:

```
data/
```

- [ ] **Step 2: Write the failing month-parser test**

Create `tests/data/months.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSpanishMonthCode } from '../../app/lib/data/months';

describe('parseSpanishMonthCode', () => {
  it('parses Abr.25 as April 2025', () => {
    const d = parseSpanishMonthCode('Abr.25');
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(3);
  });
  it('parses Ene.26 as January 2026', () => {
    const d = parseSpanishMonthCode('Ene.26');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(0);
  });
  it('parses Dic.24 as December 2024', () => {
    const d = parseSpanishMonthCode('Dic.24');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(11);
  });
  it('throws on unknown month abbrev', () => {
    expect(() => parseSpanishMonthCode('Xyz.25')).toThrow();
  });
});
```

- [ ] **Step 3: Run, observe failure**

Run: `npx vitest run tests/data/months.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the parser**

Create `app/lib/data/months.ts`:

```ts
const ABBREV: Record<string, number> = {
  Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5,
  Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11,
};

export function parseSpanishMonthCode(code: string): Date {
  const m = /^([A-Za-z]+)\.(\d{2})$/.exec(code.trim());
  if (!m) throw new Error(`Unrecognised month code: ${code}`);
  const monthIdx = ABBREV[m[1]];
  if (monthIdx === undefined) throw new Error(`Unknown month abbrev: ${m[1]}`);
  const year = 2000 + parseInt(m[2], 10);
  return new Date(Date.UTC(year, monthIdx, 1));
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
```

- [ ] **Step 5: Run, see green**

Run: `npx vitest run tests/data/months.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Define shared types**

Create `app/lib/types.ts`:

```ts
export interface RawSalesRow {
  monthCode: string;
  customerCode: string;
  materialCode: string;
  hl: number;
  ventaNeta: number;
  margenBruto: number;
  mktgFund: number;
}

export interface Customer {
  code: string;
  name: string;
  country: string;
  channel: string;
  subChannel: string;
}

export interface Material {
  code: string;
  description: string;
  brand: string;
  packType: string;
  packSize: string;
}

export interface SalesFact {
  month: Date;
  customer: Customer;
  material: Material;
  hl: number;
  ventaNeta: number;
  margenBruto: number;
  mktgFund: number;
}

export interface PromoEntry {
  retailer: string;
  skuDescription: string;
  startDate: Date;
  endDate: Date;
  promoPrice: number | null;
  mechanic: string | null;
  depthPct: number | null;
}
```

- [ ] **Step 7: Implement Excel loaders**

Create `app/lib/data/excel.ts`:

```ts
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RawSalesRow, Customer, Material } from '../types';

const DATA_DIR = process.env.MARKETPULSE_DATA_DIR ?? join(process.cwd(), 'data');

function loadWorkbook(filename: string) {
  return XLSX.read(readFileSync(join(DATA_DIR, filename)), { type: 'buffer', cellDates: true });
}

export function loadRawSales(): RawSalesRow[] {
  const wb = loadWorkbook('UK_DATA.xlsx');
  const ws = wb.Sheets['DATABASE'];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return rows.map((r) => ({
    monthCode: String(r['AÑO CALENDARIO']),
    customerCode: String(r['Cod. Cliente']),
    materialCode: String(r['Cod. Material']),
    hl: Number(r['Hl'] ?? 0),
    ventaNeta: Number(r['Venta Neta'] ?? 0),
    margenBruto: Number(r['Margen Bruto'] ?? 0),
    mktgFund: Number(r['Mktg Fund'] ?? 0),
  }));
}

export function loadCustomers(): Customer[] {
  const wb = loadWorkbook('UK_DATA.xlsx');
  const ws = wb.Sheets['CUSTOMERS'];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return rows.map((r) => ({
    code: String(r['Cod. Cliente'] ?? ''),
    name: String(r['Beneficiario Vistex'] ?? ''),
    country: String(r['Pais'] ?? ''),
    channel: String(r['Sales Channel'] ?? ''),
    subChannel: String(r['SubChannel'] ?? ''),
  }));
}

export function loadMaterials(): Material[] {
  const wb = loadWorkbook('UK_DATA.xlsx');
  const ws = wb.Sheets['MaterialData'];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return rows.map((r) => ({
    code: String(r['Cod. Material'] ?? ''),
    description: String(r['Material precio'] ?? r['SKU DESCRIPTION'] ?? ''),
    brand: String(r['Marca'] ?? ''),
    packType: String(r['PACK TYPE'] ?? r['Tipo Envase'] ?? ''),
    packSize: String(r['PACK SIZE'] ?? ''),
  }));
}
```

- [ ] **Step 8: Commit**

```bash
git add app/lib/data/excel.ts app/lib/data/months.ts app/lib/types.ts tests/data/months.test.ts .gitignore package.json package-lock.json
git commit -m "feat: Excel loaders + Spanish month parser + shared types"
```

---

### Task 3: Normalize sales (join + UK filter + anonymize)

**Files:**
- Create: `app/lib/data/normalize.ts`
- Create: `tests/data/normalize.test.ts`
- Create: `scripts/validate-data.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/data/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { anonymizeCustomers, joinSales, filterUk } from '../../app/lib/data/normalize';
import type { Customer, Material, RawSalesRow } from '../../app/lib/types';

describe('filterUk', () => {
  it('keeps only Reino Unido customers', () => {
    const customers: Customer[] = [
      { code: '1', name: 'A', country: 'Reino Unido', channel: '', subChannel: '' },
      { code: '2', name: 'B', country: 'Spain', channel: '', subChannel: '' },
    ];
    expect(filterUk(customers)).toHaveLength(1);
    expect(filterUk(customers)[0].code).toBe('1');
  });
});

describe('anonymizeCustomers', () => {
  it('maps each unique name to Cliente A/B/C in stable order', () => {
    const customers: Customer[] = [
      { code: '1', name: 'CARLSBERG', country: 'Reino Unido', channel: '', subChannel: '' },
      { code: '2', name: 'CMBC', country: 'Reino Unido', channel: '', subChannel: '' },
      { code: '3', name: 'CARLSBERG', country: 'Reino Unido', channel: '', subChannel: '' },
    ];
    const out = anonymizeCustomers(customers);
    expect(out[0].name).toBe('Cliente A');
    expect(out[1].name).toBe('Cliente B');
    expect(out[2].name).toBe('Cliente A');
  });
});

describe('joinSales', () => {
  it('joins raw rows with customers and materials', () => {
    const raw: RawSalesRow[] = [{ monthCode: 'Abr.25', customerCode: '1', materialCode: 'K1', hl: 100, ventaNeta: 50, margenBruto: 20, mktgFund: 5 }];
    const customers: Customer[] = [{ code: '1', name: 'C', country: 'Reino Unido', channel: 'Off', subChannel: 'Grocery' }];
    const materials: Material[] = [{ code: 'K1', description: 'D', brand: 'EstrellaDamm', packType: 'CAN', packSize: '330' }];
    const result = joinSales(raw, customers, materials);
    expect(result).toHaveLength(1);
    expect(result[0].customer.name).toBe('C');
    expect(result[0].material.brand).toBe('EstrellaDamm');
    expect(result[0].month.getUTCMonth()).toBe(3);
  });

  it('drops rows where customer or material is missing', () => {
    const raw: RawSalesRow[] = [{ monthCode: 'Abr.25', customerCode: 'missing', materialCode: 'K1', hl: 100, ventaNeta: 0, margenBruto: 0, mktgFund: 0 }];
    expect(joinSales(raw, [], [])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, observe failure**

Run: `npx vitest run tests/data/normalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/lib/data/normalize.ts`:

```ts
import type { Customer, Material, RawSalesRow, SalesFact } from '../types';
import { parseSpanishMonthCode } from './months';

export function filterUk(customers: Customer[]): Customer[] {
  return customers.filter((c) => c.country === 'Reino Unido');
}

export function anonymizeCustomers(customers: Customer[]): Customer[] {
  const seen = new Map<string, string>();
  let i = 0;
  for (const c of customers) {
    if (!seen.has(c.name)) {
      seen.set(c.name, `Cliente ${String.fromCharCode(65 + i)}`);
      i++;
    }
  }
  return customers.map((c) => ({ ...c, name: seen.get(c.name) ?? c.name }));
}

export function anonymizeRetailers(retailers: string[]): Map<string, string> {
  const m = new Map<string, string>();
  retailers.forEach((r, i) => m.set(r, `Retailer ${i + 1}`));
  return m;
}

export function joinSales(
  raw: RawSalesRow[],
  customers: Customer[],
  materials: Material[],
): SalesFact[] {
  const cMap = new Map(customers.map((c) => [c.code, c]));
  const mMap = new Map(materials.map((m) => [m.code, m]));
  const out: SalesFact[] = [];
  for (const r of raw) {
    const c = cMap.get(r.customerCode);
    const m = mMap.get(r.materialCode);
    if (!c || !m) continue;
    out.push({
      month: parseSpanishMonthCode(r.monthCode),
      customer: c,
      material: m,
      hl: r.hl,
      ventaNeta: r.ventaNeta,
      margenBruto: r.margenBruto,
      mktgFund: r.mktgFund,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run tests, see green**

Run: `npx vitest run tests/data/normalize.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Validate against real data**

Create `scripts/validate-data.ts`:

```ts
import { loadRawSales, loadCustomers, loadMaterials } from '../app/lib/data/excel';
import { filterUk, anonymizeCustomers, joinSales } from '../app/lib/data/normalize';

const ukCustomers = anonymizeCustomers(filterUk(loadCustomers()));
const materials = loadMaterials();
const sales = joinSales(loadRawSales(), ukCustomers, materials);

console.log('UK customers:', ukCustomers.length);
console.log('Materials:', materials.length);
console.log('Joined sales rows:', sales.length);
const months = new Set(sales.map((s) => s.month.toISOString().slice(0, 7)));
console.log('Distinct months:', months.size, [...months].sort());
console.log('Distinct brands:', new Set(sales.map((s) => s.material.brand)).size);
console.log('Distinct channels:', new Set(sales.map((s) => s.customer.channel)).size);
console.log('Sample row:', sales[0]);
```

Run: `npx tsx scripts/validate-data.ts`
Expected: non-zero counts; sample row carries plausible UK customer (anonymized), brand, and a parsed `month` Date. If `Joined sales rows` is 0, the customer/material code formats don't match between fact and dim sheets — inspect a few raw codes and adjust the loader extraction (it's likely the codes carry trailing descriptions and need stripping).

- [ ] **Step 6: Commit**

```bash
git add app/lib/data/normalize.ts tests/data/normalize.test.ts scripts/validate-data.ts
git commit -m "feat: sales normalization (join + UK filter + anonymizer)"
```

---

### Task 4: Tesco trade-plan parser + depth_pct

**Files:**
- Create: `app/lib/data/promos.ts`
- Create: `tests/data/promos.test.ts`

- [ ] **Step 1: Inspect the Tesco sheet structure once**

Run:

```bash
npx tsx -e "import * as X from 'xlsx'; import fs from 'node:fs'; const wb = X.read(fs.readFileSync('data/Damm_Trade_Plan_promotions.xlsx'), { cellDates: true }); const arr = X.utils.sheet_to_json(wb.Sheets['Tesco'], { header: 1 }); console.log(JSON.stringify(arr.slice(0, 7), null, 2));"
```

Confirm: row 3 holds period start dates; row 4 holds week numbers; rows 5+ are SKU rows with promo prices per period column.

- [ ] **Step 2: Write the depth_pct test**

Create `tests/data/promos.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeDepthPct } from '../../app/lib/data/promos';
import type { PromoEntry } from '../../app/lib/types';

const d = new Date();

describe('computeDepthPct', () => {
  it('uses the highest observed price as the base and computes (base - promo)/base', () => {
    const entries: PromoEntry[] = [
      { retailer: 'Tesco', skuDescription: 'Estrella 12x330', startDate: d, endDate: d, promoPrice: 13.5, mechanic: null, depthPct: null },
      { retailer: 'Tesco', skuDescription: 'Estrella 12x330', startDate: d, endDate: d, promoPrice: 12, mechanic: null, depthPct: null },
    ];
    const out = computeDepthPct(entries);
    expect(out[0].depthPct).toBeCloseTo(0, 4);
    expect(out[1].depthPct).toBeCloseTo((13.5 - 12) / 13.5, 4);
  });
});
```

- [ ] **Step 3: Run, observe failure**

Run: `npx vitest run tests/data/promos.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the Tesco parser + depth helper**

Create `app/lib/data/promos.ts`:

```ts
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PromoEntry } from '../types';

const DATA_DIR = process.env.MARKETPULSE_DATA_DIR ?? join(process.cwd(), 'data');

function loadTradePlan() {
  return XLSX.read(readFileSync(join(DATA_DIR, 'Damm_Trade_Plan_promotions.xlsx')), {
    type: 'buffer',
    cellDates: true,
  });
}

function isPriceLike(v: unknown): v is number {
  return typeof v === 'number' && v > 0 && v < 1000;
}

function isMechanicLike(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function parseTesco(): PromoEntry[] {
  const wb = loadTradePlan();
  const ws = wb.Sheets['Tesco'];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  const dateRow = (rows[3] ?? []) as unknown[];
  const periods: Array<{ col: number; start: Date; end: Date }> = [];
  for (let col = 3; col < dateRow.length; col++) {
    const v = dateRow[col];
    if (v instanceof Date) {
      const start = v;
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      periods.push({ col, start, end });
    }
  }

  const out: PromoEntry[] = [];
  for (let r = 5; r < rows.length; r++) {
    const row = (rows[r] ?? []) as unknown[];
    const sku = row[0];
    if (typeof sku !== 'string' || sku.trim().length === 0) continue;
    for (const p of periods) {
      const v = row[p.col];
      if (isPriceLike(v) || isMechanicLike(v)) {
        out.push({
          retailer: 'Tesco',
          skuDescription: sku.trim(),
          startDate: p.start,
          endDate: p.end,
          promoPrice: isPriceLike(v) ? v : null,
          mechanic: isMechanicLike(v) ? v.trim() : null,
          depthPct: null,
        });
      }
    }
  }
  return out;
}

export function computeDepthPct(entries: PromoEntry[]): PromoEntry[] {
  const prices = new Map<string, number[]>();
  for (const e of entries) {
    if (e.promoPrice == null) continue;
    const key = `${e.retailer}::${e.skuDescription}`;
    const arr = prices.get(key) ?? [];
    arr.push(e.promoPrice);
    prices.set(key, arr);
  }
  const base = new Map<string, number>();
  for (const [k, arr] of prices) base.set(k, Math.max(...arr));
  return entries.map((e) => {
    if (e.promoPrice == null) return { ...e, depthPct: null };
    const b = base.get(`${e.retailer}::${e.skuDescription}`);
    if (!b) return { ...e, depthPct: null };
    return { ...e, depthPct: (b - e.promoPrice) / b };
  });
}
```

- [ ] **Step 5: Run, see green**

Run: `npx vitest run tests/data/promos.test.ts`
Expected: PASS.

- [ ] **Step 6: Smoke-test against the real file**

Append to `scripts/validate-data.ts`:

```ts
import { parseTesco, computeDepthPct } from '../app/lib/data/promos';

const promos = computeDepthPct(parseTesco());
console.log('Tesco promo entries:', promos.length);
console.log('With depth_pct:', promos.filter((p) => p.depthPct != null).length);
console.log('Sample:', promos[0]);
```

Run: `npx tsx scripts/validate-data.ts`
Expected: non-zero count, plausible sample with a computed depth.

- [ ] **Step 7: Commit**

```bash
git add app/lib/data/promos.ts tests/data/promos.test.ts scripts/validate-data.ts
git commit -m "feat: Tesco trade-plan parser + depth_pct calculation"
```

---

## Phase 2 — Forecast engine

### Task 5: Baseline projection (YoY × trend)

**Files:**
- Create: `app/lib/forecast/baseline.ts`
- Create: `app/lib/forecast/index.ts`
- Create: `tests/forecast/baseline.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/forecast/baseline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { project } from '../../app/lib/forecast/baseline';

function s(year: number, month0: number, hl: number, margin = hl * 0.4) {
  return { month: new Date(Date.UTC(year, month0, 1)), hl, margenBruto: margin };
}

describe('project', () => {
  it('projects next month using prior-year-same-month × trailing trend', () => {
    const history = [
      s(2024, 3, 100), s(2024, 4, 110), s(2024, 5, 120),
      s(2024, 6, 100), s(2024, 7, 100), s(2024, 8, 100),
      s(2024, 9, 100), s(2024, 10, 100), s(2024, 11, 100),
      s(2025, 0, 105), s(2025, 1, 115), s(2025, 2, 125),
    ];
    const out = project(history, new Date(Date.UTC(2025, 2, 1)), 1);
    expect(out).toHaveLength(1);
    expect(out[0].month.getUTCMonth()).toBe(3);
    // Trend = (105+115+125+100*6+...)/(prior 12) — magnitude isn't the point;
    // verify the projection is in the same neighbourhood as prior-year same month.
    expect(out[0].hl).toBeGreaterThan(80);
    expect(out[0].hl).toBeLessThan(150);
  });

  it('includes a confidence band', () => {
    const history = [s(2024, 0, 100), s(2025, 0, 110)];
    const out = project(history, new Date(Date.UTC(2025, 0, 1)), 1);
    expect(out[0].low).toBeLessThan(out[0].hl);
    expect(out[0].high).toBeGreaterThan(out[0].hl);
  });
});
```

- [ ] **Step 2: Run, observe failure**

Run: `npx vitest run tests/forecast/baseline.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement baseline**

Create `app/lib/forecast/baseline.ts`:

```ts
export interface MonthlyValue {
  month: Date;
  hl: number;
  margenBruto: number;
}

export interface Projected {
  month: Date;
  hl: number;
  margenBruto: number;
  low: number;
  high: number;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function sumWindow(series: MonthlyValue[], end: Date, monthsBack: number, key: 'hl' | 'margenBruto'): number {
  const cutoff = addMonths(end, -monthsBack + 1);
  return series.filter((v) => v.month >= cutoff && v.month <= end).reduce((acc, v) => acc + v[key], 0);
}

function findSameMonthLastYear(series: MonthlyValue[], target: Date): MonthlyValue | undefined {
  const prior = addMonths(target, -12);
  return series.find((v) => v.month.getTime() === prior.getTime());
}

export function project(history: MonthlyValue[], asOf: Date, horizonMonths: number): Projected[] {
  const recent12 = sumWindow(history, asOf, 12, 'hl');
  const prior12 = sumWindow(history, addMonths(asOf, -12), 12, 'hl');
  const trend = prior12 > 0 ? recent12 / prior12 : 1;
  const avgMargin = sumWindow(history, asOf, 12, 'margenBruto') / 12;
  const avgHl = recent12 / 12;

  const out: Projected[] = [];
  for (let h = 1; h <= horizonMonths; h++) {
    const target = addMonths(asOf, h);
    const prev = findSameMonthLastYear(history, target);
    const hl = prev ? prev.hl * trend : avgHl;
    const margin = prev ? prev.margenBruto * trend : avgMargin;
    const band = 0.1 * Math.max(hl, 1);
    out.push({ month: target, hl, margenBruto: margin, low: hl - band, high: hl + band });
  }
  return out;
}
```

- [ ] **Step 4: Run, see green**

Run: `npx vitest run tests/forecast/baseline.test.ts`
Expected: PASS.

- [ ] **Step 5: Forecaster entry point**

Create `app/lib/forecast/index.ts`:

```ts
import type { SalesFact } from '../types';
import { project, type MonthlyValue, type Projected } from './baseline';

export interface ForecastInput {
  sales: SalesFact[];
  asOf: Date;
  horizonMonths: number;
  filter?: { brand?: string; channel?: string };
}

export interface Forecast {
  asOf: Date;
  history: MonthlyValue[];
  projection: Projected[];
}

export function forecast(input: ForecastInput): Forecast {
  const filtered = input.sales.filter((s) => {
    if (input.filter?.brand && s.material.brand !== input.filter.brand) return false;
    if (input.filter?.channel && s.customer.channel !== input.filter.channel) return false;
    return true;
  });

  const byMonth = new Map<string, MonthlyValue>();
  for (const s of filtered) {
    const key = s.month.toISOString();
    const prev = byMonth.get(key) ?? { month: s.month, hl: 0, margenBruto: 0 };
    prev.hl += s.hl;
    prev.margenBruto += s.margenBruto;
    byMonth.set(key, prev);
  }
  const history = [...byMonth.values()].sort((a, b) => a.month.getTime() - b.month.getTime());
  const projection = project(history, input.asOf, input.horizonMonths);
  return { asOf: input.asOf, history, projection };
}
```

- [ ] **Step 6: Commit**

```bash
git add app/lib/forecast/baseline.ts app/lib/forecast/index.ts tests/forecast/baseline.test.ts
git commit -m "feat: baseline monthly forecast (YoY × trailing trend)"
```

---

### Task 6: Promo lift coefficients (Hl + margin) + `inferCoefficients` helper

**Files:**
- Create: `app/lib/forecast/lift.ts`
- Create: `tests/forecast/lift.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/forecast/lift.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeLiftCoefficients, depthBucket } from '../../app/lib/forecast/lift';

describe('depthBucket', () => {
  it('buckets to 5-percent ranges up to 25%, then "25+"', () => {
    expect(depthBucket(0.04)).toBe('0-5');
    expect(depthBucket(0.08)).toBe('5-10');
    expect(depthBucket(0.30)).toBe('25+');
  });
});

describe('computeLiftCoefficients', () => {
  it('averages lift in each (mechanic, depth bucket)', () => {
    const samples = [
      { retailer: 'R1', mechanic: 'MTB', depthPct: 0.10, actualHl: 110, baselineHl: 100, actualMargin: 40, baselineMargin: 40 },
      { retailer: 'R1', mechanic: 'MTB', depthPct: 0.11, actualHl: 120, baselineHl: 100, actualMargin: 35, baselineMargin: 40 },
    ];
    const coeffs = computeLiftCoefficients(samples);
    const bucket = coeffs.find((c) => c.mechanic === 'MTB' && c.depthBucket === '10-15');
    expect(bucket).toBeDefined();
    expect(bucket!.hlLift).toBeCloseTo(0.15, 2);
    expect(bucket!.marginLift).toBeCloseTo(-0.0625, 3);
  });
});
```

- [ ] **Step 2: Run, observe failure**

Run: `npx vitest run tests/forecast/lift.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `app/lib/forecast/lift.ts`:

```ts
import type { PromoEntry, SalesFact } from '../types';
import { addMonths } from './baseline';

export interface LiftSample {
  retailer: string;
  mechanic: string;
  depthPct: number;
  actualHl: number;
  baselineHl: number;
  actualMargin: number;
  baselineMargin: number;
}

export interface LiftCoefficient {
  mechanic: string;
  depthBucket: string;
  n: number;
  hlLift: number;
  marginLift: number;
}

export function depthBucket(pct: number): string {
  const p = Math.round(pct * 100);
  if (p < 5) return '0-5';
  if (p < 10) return '5-10';
  if (p < 15) return '10-15';
  if (p < 20) return '15-20';
  if (p < 25) return '20-25';
  return '25+';
}

function pctChange(actual: number, baseline: number): number {
  return baseline === 0 ? 0 : (actual - baseline) / baseline;
}

export function computeLiftCoefficients(samples: LiftSample[]): LiftCoefficient[] {
  const groups = new Map<string, { hl: number[]; margin: number[]; mechanic: string; bucket: string }>();
  for (const s of samples) {
    const bucket = depthBucket(s.depthPct);
    const key = `${s.mechanic}::${bucket}`;
    const g = groups.get(key) ?? { hl: [], margin: [], mechanic: s.mechanic, bucket };
    g.hl.push(pctChange(s.actualHl, s.baselineHl));
    g.margin.push(pctChange(s.actualMargin, s.baselineMargin));
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    mechanic: g.mechanic,
    depthBucket: g.bucket,
    n: g.hl.length,
    hlLift: g.hl.reduce((a, b) => a + b, 0) / g.hl.length,
    marginLift: g.margin.reduce((a, b) => a + b, 0) / g.margin.length,
  }));
}

export function buildLiftSamples(sales: SalesFact[], promos: PromoEntry[], asOf: Date): LiftSample[] {
  const closed = promos.filter((p) => p.endDate <= asOf && p.depthPct != null);
  const out: LiftSample[] = [];
  for (const p of closed) {
    const tag = p.skuDescription.toLowerCase().slice(0, 10);
    const matched = sales.filter((s) =>
      s.material.description.toLowerCase().includes(tag) &&
      s.month >= p.startDate && s.month <= p.endDate,
    );
    if (matched.length === 0) continue;
    const priorMonth = addMonths(new Date(Date.UTC(p.startDate.getUTCFullYear(), p.startDate.getUTCMonth(), 1)), -12);
    const baseline = sales.filter((s) =>
      s.material.description.toLowerCase().includes(tag) &&
      s.month.getTime() === priorMonth.getTime(),
    );
    const actualHl = matched.reduce((a, s) => a + s.hl, 0);
    const baselineHl = baseline.reduce((a, s) => a + s.hl, 0);
    if (baselineHl === 0) continue;
    out.push({
      retailer: p.retailer,
      mechanic: p.mechanic ?? 'PRICE',
      depthPct: p.depthPct!,
      actualHl,
      baselineHl,
      actualMargin: matched.reduce((a, s) => a + s.margenBruto, 0),
      baselineMargin: baseline.reduce((a, s) => a + s.margenBruto, 0),
    });
  }
  return out;
}

export function inferCoefficients(sales: SalesFact[], promos: PromoEntry[], asOf: Date): LiftCoefficient[] {
  return computeLiftCoefficients(buildLiftSamples(sales, promos, asOf));
}

export function lookupCoefficient(
  coeffs: LiftCoefficient[],
  mechanic: string,
  depthPct: number,
): LiftCoefficient | undefined {
  const bucket = depthBucket(depthPct);
  return coeffs.find((c) => c.mechanic === mechanic && c.depthBucket === bucket);
}
```

- [ ] **Step 4: Run, see green**

Run: `npx vitest run tests/forecast/lift.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/forecast/lift.ts tests/forecast/lift.test.ts
git commit -m "feat: promo lift coefficients (mechanic × depth bucket, Hl + margin)"
```

---

### Task 7: Promo effectiveness (observed lift + ROI proxy)

**Files:**
- Create: `app/lib/forecast/effectiveness.ts`
- Create: `tests/forecast/effectiveness.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/forecast/effectiveness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeEffectiveness } from '../../app/lib/forecast/effectiveness';

describe('computeEffectiveness', () => {
  it('returns volume + margin lift + ROI proxy', () => {
    const r = computeEffectiveness({
      retailer: 'Tesco',
      skuDescription: 'Estrella 12x330',
      actualHl: 120,
      baselineHl: 100,
      actualMargin: 35,
      baselineMargin: 40,
      mktgFund: 4,
    });
    expect(r.observedHlLift).toBeCloseTo(0.20, 2);
    expect(r.observedMarginLift).toBeCloseTo(-5 / 40, 3);
    expect(r.roiProxy).toBeCloseTo((-5 - 4) / 4, 2);
  });

  it('handles zero baseline gracefully', () => {
    const r = computeEffectiveness({
      retailer: 'R', skuDescription: 'S',
      actualHl: 10, baselineHl: 0,
      actualMargin: 5, baselineMargin: 0,
      mktgFund: 0,
    });
    expect(r.observedHlLift).toBe(0);
    expect(r.observedMarginLift).toBe(0);
  });
});
```

- [ ] **Step 2: Run, observe failure**

Run: `npx vitest run tests/forecast/effectiveness.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `app/lib/forecast/effectiveness.ts`:

```ts
export interface EffectivenessInput {
  retailer: string;
  skuDescription: string;
  actualHl: number;
  baselineHl: number;
  actualMargin: number;
  baselineMargin: number;
  mktgFund: number;
}

export interface EffectivenessResult {
  retailer: string;
  skuDescription: string;
  observedHlLift: number;
  observedMarginLift: number;
  marginDelta: number;
  mktgFund: number;
  roiProxy: number;
}

export function computeEffectiveness(i: EffectivenessInput): EffectivenessResult {
  const observedHlLift = i.baselineHl === 0 ? 0 : (i.actualHl - i.baselineHl) / i.baselineHl;
  const marginDelta = i.actualMargin - i.baselineMargin;
  const observedMarginLift = i.baselineMargin === 0 ? 0 : marginDelta / i.baselineMargin;
  const denom = Math.max(Math.abs(i.mktgFund), 1e-6);
  const roiProxy = (marginDelta - i.mktgFund) / denom;
  return {
    retailer: i.retailer,
    skuDescription: i.skuDescription,
    observedHlLift,
    observedMarginLift,
    marginDelta,
    mktgFund: i.mktgFund,
    roiProxy,
  };
}
```

- [ ] **Step 4: Run, see green**

Run: `npx vitest run tests/forecast/effectiveness.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/forecast/effectiveness.ts tests/forecast/effectiveness.test.ts
git commit -m "feat: margin-aware promo effectiveness with ROI proxy"
```

---

## Phase 3 — API + UI shell

### Task 8: Cold-start cache + `/api/forecast` route

**Files:**
- Create: `app/lib/cache.ts`
- Create: `app/api/forecast/route.ts`

- [ ] **Step 1: Implement the cache**

Create `app/lib/cache.ts`:

```ts
import { loadRawSales, loadCustomers, loadMaterials } from './data/excel';
import { parseTesco, computeDepthPct } from './data/promos';
import { anonymizeCustomers, filterUk, joinSales } from './data/normalize';
import { inferCoefficients } from './forecast/lift';
import type { PromoEntry, SalesFact } from './types';
import type { LiftCoefficient } from './forecast/lift';

interface DataCache {
  sales: SalesFact[];
  promos: PromoEntry[];
  asOf: Date;
  coeffs: LiftCoefficient[];
}

let _cache: DataCache | undefined;

export function getData(): DataCache {
  if (_cache) return _cache;
  const customers = anonymizeCustomers(filterUk(loadCustomers()));
  const materials = loadMaterials();
  const sales = joinSales(loadRawSales(), customers, materials);
  const promos = computeDepthPct(parseTesco());
  const asOf = new Date(Math.max(...sales.map((s) => s.month.getTime())));
  const coeffs = inferCoefficients(sales, promos, asOf);
  _cache = { sales, promos, asOf, coeffs };
  return _cache;
}
```

- [ ] **Step 2: Forecast route**

Create `app/api/forecast/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getData } from '@/app/lib/cache';
import { forecast } from '@/app/lib/forecast';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const brand = url.searchParams.get('brand') ?? undefined;
  const channel = url.searchParams.get('channel') ?? undefined;
  const horizon = Number(url.searchParams.get('horizon') ?? 3);

  const { sales, asOf } = getData();
  const result = forecast({ sales, asOf, horizonMonths: horizon, filter: { brand, channel } });
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Smoke-test**

Start dev server: `npm run dev`
In another terminal: `curl -s 'http://localhost:3000/api/forecast?horizon=3' | head -200`
Expected: JSON with `asOf`, `history` (array of monthly history), `projection` (3 forecasted months).

- [ ] **Step 4: Commit**

```bash
git add app/lib/cache.ts app/api/forecast/route.ts
git commit -m "feat: /api/forecast route + cold-start data cache"
```

---

### Task 9: Cockpit page shell + AI Analyst side rail

**Files:**
- Create: `app/components/cockpit/Shell.tsx`
- Create: `app/components/chat/AiAnalystPanel.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Move the existing chat block into a panel component**

Read the current `app/page.tsx`. Identify the chat block (uses `useChat` from `@ai-sdk/react`, message list, input). Move it verbatim into `app/components/chat/AiAnalystPanel.tsx` as a default-exported client component:

```tsx
'use client';

// Paste the chat JSX from the current app/page.tsx here.
// Keep the existing useChat hook, message rendering, and any tool-call chips.

export default function AiAnalystPanel() {
  // ...existing chat implementation
  return (
    <div className="flex flex-col h-full bg-white">
      {/* messages list */}
      {/* input box */}
    </div>
  );
}
```

- [ ] **Step 2: Create the cockpit shell**

Create `app/components/cockpit/Shell.tsx`:

```tsx
'use client';
import { ReactNode } from 'react';
import AiAnalystPanel from '../chat/AiAnalystPanel';

interface ShellProps {
  asOf: string;
  kpi: ReactNode;
  forecast: ReactNode;
  decomposition: ReactNode;
  effectiveness: ReactNode;
  simulator: ReactNode;
}

export default function Shell(p: ShellProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-screen">
      <div className="flex flex-col overflow-auto p-4 gap-4 bg-slate-50">
        <header className="text-sm text-gray-500">As of <span className="font-mono">{p.asOf}</span></header>
        {p.kpi}
        {p.forecast}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {p.decomposition}
          {p.effectiveness}
        </div>
        {p.simulator}
      </div>
      <aside className="hidden lg:block border-l">
        <AiAnalystPanel />
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `app/page.tsx` to render the shell with placeholders**

Replace `app/page.tsx`:

```tsx
import Shell from './components/cockpit/Shell';
import { getData } from './lib/cache';
import { forecast } from './lib/forecast';

export default function CockpitPage() {
  const { sales, promos, asOf } = getData();
  const fc = forecast({ sales, asOf, horizonMonths: 3 });

  return (
    <Shell
      asOf={asOf.toISOString().slice(0, 7)}
      kpi={<div className="rounded border p-4 bg-white">KPI strip (Task 10) — history points: {fc.history.length}</div>}
      forecast={<div className="rounded border p-4 bg-white">Forecast chart (Task 11)</div>}
      decomposition={<div className="rounded border p-4 bg-white">Decomposition (Task 12)</div>}
      effectiveness={<div className="rounded border p-4 bg-white">Promo effectiveness (Task 13) — promos: {promos.length}</div>}
      simulator={<div className="rounded border p-4 bg-white">Simulator (Task 14)</div>}
    />
  );
}
```

- [ ] **Step 4: Eyeball**

Run: `npm run dev`. Open `http://localhost:3000`.
Expected: 3-column layout, "As of" date in header, placeholder cards, chat panel on the right.

- [ ] **Step 5: Commit**

```bash
git add app/components/cockpit/Shell.tsx app/components/chat/AiAnalystPanel.tsx app/page.tsx
git commit -m "feat: cockpit shell + repositioned AI Analyst side rail"
```

---

## Phase 4 — Dashboard panels

### Task 10: KPI strip

**Files:**
- Create: `app/components/cockpit/KpiStrip.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Build the component**

Create `app/components/cockpit/KpiStrip.tsx`:

```tsx
export interface KpiStripProps {
  lastMonthHl: number;
  lastMonthMargin: number;
  yoyDeltaPct: number;
  next3MonthsHl: number;
  next3MonthsMargin: number;
}

function fmt(n: number, suffix = '') {
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n)}${suffix}`;
}

function pct(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

export default function KpiStrip(p: KpiStripProps) {
  const yoyColor = p.yoyDeltaPct >= 0 ? 'text-green-600' : 'text-red-600';
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tile label="Last closed Hl" value={fmt(p.lastMonthHl)} />
      <Tile label="Last closed Margen Bruto" value={fmt(p.lastMonthMargin, ' €')} />
      <Tile label="YoY Δ (Hl)" value={pct(p.yoyDeltaPct)} valueClass={yoyColor} />
      <Tile label="Next 3 months Hl" value={fmt(p.next3MonthsHl)} sub={`Margen ≈ ${fmt(p.next3MonthsMargin, ' €')}`} />
    </div>
  );
}

function Tile({ label, value, valueClass, sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="rounded border p-4 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${valueClass ?? ''}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Wire**

In `app/page.tsx`, add imports + compute the numbers from `fc`:

```tsx
import KpiStrip from './components/cockpit/KpiStrip';

const last = fc.history[fc.history.length - 1];
const priorYearMonth = fc.history.find((h) =>
  h.month.getUTCFullYear() === last.month.getUTCFullYear() - 1 &&
  h.month.getUTCMonth() === last.month.getUTCMonth(),
);
const yoyDeltaPct = priorYearMonth && priorYearMonth.hl > 0 ? (last.hl - priorYearMonth.hl) / priorYearMonth.hl : 0;
const next3Hl = fc.projection.reduce((a, p) => a + p.hl, 0);
const next3Margin = fc.projection.reduce((a, p) => a + p.margenBruto, 0);
```

Replace the `kpi={...}` prop:

```tsx
kpi={<KpiStrip
  lastMonthHl={last.hl}
  lastMonthMargin={last.margenBruto}
  yoyDeltaPct={yoyDeltaPct}
  next3MonthsHl={next3Hl}
  next3MonthsMargin={next3Margin}
/>}
```

- [ ] **Step 3: Eyeball + commit**

```bash
git add app/components/cockpit/KpiStrip.tsx app/page.tsx
git commit -m "feat: KPI strip (last-closed-month + YoY + next-3-month projection)"
```

---

### Task 11: Forecast chart

**Files:**
- Create: `app/components/cockpit/ForecastChart.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Build the chart**

Create `app/components/cockpit/ForecastChart.tsx`:

```tsx
'use client';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export interface ChartPoint {
  month: string;
  hl?: number;
  projection?: number;
  low?: number;
  high?: number;
  yoy?: number;
}

export default function ForecastChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="rounded border p-4 bg-white h-72">
      <div className="text-sm font-medium mb-2">Hl: history vs next 3 months</div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area dataKey="high" stroke="none" fill="#cbd5e1" fillOpacity={0.4} name="upper band" />
          <Area dataKey="low" stroke="none" fill="#cbd5e1" fillOpacity={0.4} name="lower band" />
          <Line type="monotone" dataKey="hl" stroke="#0f172a" strokeWidth={2} dot={false} name="Actual" />
          <Line type="monotone" dataKey="projection" stroke="#0ea5e9" strokeDasharray="4 2" strokeWidth={2} dot={false} name="Projection" />
          <Line type="monotone" dataKey="yoy" stroke="#94a3b8" strokeWidth={1} dot={false} name="YoY" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Wire chart data**

In `app/page.tsx`, build the series:

```tsx
import ForecastChart, { type ChartPoint } from './components/cockpit/ForecastChart';

const histByKey = new Map(fc.history.map((h) => [h.month.toISOString().slice(0, 7), h]));
const chartData: ChartPoint[] = [
  ...fc.history.map((h) => {
    const prior = `${h.month.getUTCFullYear() - 1}-${String(h.month.getUTCMonth() + 1).padStart(2, '0')}`;
    return { month: h.month.toISOString().slice(0, 7), hl: h.hl, yoy: histByKey.get(prior)?.hl };
  }),
  ...fc.projection.map((p) => ({
    month: p.month.toISOString().slice(0, 7),
    projection: p.hl,
    low: p.low,
    high: p.high,
  })),
];
```

Replace the placeholder:

```tsx
forecast={<ForecastChart data={chartData} />}
```

- [ ] **Step 3: Eyeball + commit**

```bash
git add app/components/cockpit/ForecastChart.tsx app/page.tsx
git commit -m "feat: forecast chart (history + projection band + YoY)"
```

---

### Task 12: Decomposition panel (channel × brand × top customers)

**Files:**
- Create: `app/components/cockpit/Decomposition.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Compute decomposition aggregations**

In `app/page.tsx`, add:

```ts
import type { SalesFact } from './lib/types';

type Dimension = 'channel' | 'brand' | 'top_customers';
function decompose(sales: SalesFact[], month: Date, dim: Dimension) {
  const inMonth = sales.filter((s) => s.month.getTime() === month.getTime());
  const buckets = new Map<string, { hl: number; margin: number }>();
  for (const s of inMonth) {
    const key = dim === 'channel' ? s.customer.channel : dim === 'brand' ? s.material.brand : s.customer.name;
    const cur = buckets.get(key) ?? { hl: 0, margin: 0 };
    cur.hl += s.hl;
    cur.margin += s.margenBruto;
    buckets.set(key, cur);
  }
  const arr = [...buckets.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.hl - a.hl);
  return dim === 'top_customers' ? arr.slice(0, 5) : arr;
}
```

- [ ] **Step 2: Component**

Create `app/components/cockpit/Decomposition.tsx`:

```tsx
'use client';
import { useState } from 'react';

export interface DecomposedRow { label: string; hl: number; margin: number; }
export interface Props {
  byChannel: DecomposedRow[];
  byBrand: DecomposedRow[];
  byTopCustomers: DecomposedRow[];
}

export default function Decomposition({ byChannel, byBrand, byTopCustomers }: Props) {
  const [tab, setTab] = useState<'channel' | 'brand' | 'top_customers'>('channel');
  const rows = tab === 'channel' ? byChannel : tab === 'brand' ? byBrand : byTopCustomers;
  const total = rows.reduce((acc, r) => acc + r.hl, 0) || 1;

  return (
    <div className="rounded border p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Where demand came from</div>
        <div className="flex gap-1 text-xs">
          {(['channel', 'brand', 'top_customers'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2 py-1 rounded ${tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
            >{t}</button>
          ))}
        </div>
      </div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="text-xs">
            <div className="flex justify-between">
              <span className="truncate max-w-[14rem]" title={r.label}>{r.label}</span>
              <span>{Math.round(r.hl).toLocaleString()} Hl</span>
            </div>
            <div className="h-2 bg-slate-100 rounded">
              <div className="h-2 bg-slate-700 rounded" style={{ width: `${(r.hl / total) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Wire**

```tsx
import Decomposition from './components/cockpit/Decomposition';

decomposition={<Decomposition
  byChannel={decompose(sales, last.month, 'channel')}
  byBrand={decompose(sales, last.month, 'brand')}
  byTopCustomers={decompose(sales, last.month, 'top_customers')}
/>}
```

- [ ] **Step 4: Eyeball + commit**

```bash
git add app/components/cockpit/Decomposition.tsx app/page.tsx
git commit -m "feat: decomposition panel (channel / brand / top customers)"
```

---

### Task 13: Promo effectiveness panel

**Files:**
- Create: `app/components/cockpit/PromoEffectiveness.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Helper to assemble rows**

In `app/page.tsx`, add:

```ts
import { computeEffectiveness } from './lib/forecast/effectiveness';
import { addMonths } from './lib/forecast/baseline';
import type { PromoEntry } from './lib/types';

function effectivenessRows(sales: SalesFact[], promos: PromoEntry[], asOf: Date) {
  const closed = promos.filter((p) => p.endDate <= asOf && p.promoPrice != null).slice(0, 10);
  return closed.map((p) => {
    const tag = p.skuDescription.toLowerCase().slice(0, 10);
    const matched = sales.filter((s) =>
      s.material.description.toLowerCase().includes(tag) &&
      s.month >= p.startDate && s.month <= p.endDate,
    );
    const actualHl = matched.reduce((a, s) => a + s.hl, 0);
    const actualMargin = matched.reduce((a, s) => a + s.margenBruto, 0);
    const mktgFund = matched.reduce((a, s) => a + s.mktgFund, 0);
    const priorMonth = addMonths(new Date(Date.UTC(p.startDate.getUTCFullYear(), p.startDate.getUTCMonth(), 1)), -12);
    const baseline = sales.filter((s) =>
      s.material.description.toLowerCase().includes(tag) &&
      s.month.getTime() === priorMonth.getTime(),
    );
    return {
      promo: p,
      ...computeEffectiveness({
        retailer: p.retailer,
        skuDescription: p.skuDescription,
        actualHl,
        baselineHl: baseline.reduce((a, s) => a + s.hl, 0),
        actualMargin,
        baselineMargin: baseline.reduce((a, s) => a + s.margenBruto, 0),
        mktgFund,
      }),
    };
  });
}
```

- [ ] **Step 2: Component**

Create `app/components/cockpit/PromoEffectiveness.tsx`:

```tsx
export interface Row {
  retailer: string;
  skuDescription: string;
  observedHlLift: number;
  observedMarginLift: number;
  roiProxy: number;
}

function pct(n: number) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

export default function PromoEffectiveness({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded border p-4 bg-white">
      <div className="text-sm font-medium mb-3">Were our levers working?</div>
      <table className="w-full text-xs">
        <thead className="text-gray-500">
          <tr><th className="text-left">Promo</th><th>Hl</th><th>Margen</th><th>ROI</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-1 truncate max-w-[14rem]" title={r.skuDescription}>{r.retailer} · {r.skuDescription}</td>
              <td className={`text-right ${r.observedHlLift >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pct(r.observedHlLift)}</td>
              <td className={`text-right ${r.observedMarginLift >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pct(r.observedMarginLift)}</td>
              <td className={`text-right ${r.roiProxy >= 0 ? 'text-green-600' : 'text-red-600'}`}>{r.roiProxy.toFixed(2)}×</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Wire**

```tsx
import PromoEffectiveness from './components/cockpit/PromoEffectiveness';
effectiveness={<PromoEffectiveness rows={effectivenessRows(sales, promos, asOf)} />}
```

- [ ] **Step 4: Eyeball + commit**

```bash
git add app/components/cockpit/PromoEffectiveness.tsx app/page.tsx
git commit -m "feat: promo effectiveness panel (Hl + margin + ROI proxy)"
```

---

### Task 14: Promo simulator panel

**Files:**
- Create: `app/components/cockpit/Simulator.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Component**

Create `app/components/cockpit/Simulator.tsx`:

```tsx
'use client';
import { useState } from 'react';

export interface Lever {
  id: string;
  retailer: string;
  skuDescription: string;
  mechanic: string;
  startDate: string;
  endDate: string;
  currentDepthPct: number;
}

export interface SimulatorProps {
  levers: Lever[];
  estimateLift: (leverId: string, depthPct: number) => { hlLiftPct: number; marginLiftPct: number };
}

export default function Simulator({ levers, estimateLift }: SimulatorProps) {
  const [active, setActive] = useState(levers[0]?.id);
  const lever = levers.find((l) => l.id === active);
  const [depth, setDepth] = useState(lever?.currentDepthPct ?? 0);
  if (!lever) return <div className="rounded border p-4 bg-white">No planned promos available.</div>;
  const est = estimateLift(lever.id, depth);

  return (
    <div className="rounded border p-4 bg-white">
      <div className="text-sm font-medium mb-3">What if?</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {levers.map((l) => (
          <button
            key={l.id}
            onClick={() => { setActive(l.id); setDepth(l.currentDepthPct); }}
            className={`text-xs px-2 py-1 rounded border ${l.id === active ? 'bg-slate-900 text-white' : 'bg-white'}`}
            title={`${l.skuDescription} · ${l.startDate} → ${l.endDate}`}
          >
            {l.retailer} · {l.skuDescription.slice(0, 18)}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mb-1">Depth: {(depth * 100).toFixed(0)}% (mechanic: {lever.mechanic})</div>
      <input
        type="range"
        min={0}
        max={0.4}
        step={0.01}
        value={depth}
        onChange={(e) => setDepth(Number(e.target.value))}
        className="w-full"
      />
      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div>Estimated Hl lift: <span className={est.hlLiftPct >= 0 ? 'text-green-600' : 'text-red-600'}>{(est.hlLiftPct * 100).toFixed(1)}%</span></div>
        <div>Estimated margin lift: <span className={est.marginLiftPct >= 0 ? 'text-green-600' : 'text-red-600'}>{(est.marginLiftPct * 100).toFixed(1)}%</span></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire (uses cached coefficients)**

In `app/page.tsx`:

```tsx
import Simulator, { type Lever } from './components/cockpit/Simulator';
import { lookupCoefficient } from './lib/forecast/lift';

const { sales, promos, asOf, coeffs } = getData();
// (replace the existing destructuring of getData() with this one)

const openPromos = promos.filter((p) => p.endDate > asOf && p.promoPrice != null);
const levers: Lever[] = openPromos.slice(0, 6).map((p, i) => ({
  id: String(i),
  retailer: p.retailer,
  skuDescription: p.skuDescription,
  mechanic: p.mechanic ?? 'PRICE',
  startDate: p.startDate.toISOString().slice(0, 10),
  endDate: p.endDate.toISOString().slice(0, 10),
  currentDepthPct: p.depthPct ?? 0,
}));

function estimateLift(leverId: string, depth: number) {
  const lever = openPromos[Number(leverId)];
  const c = lookupCoefficient(coeffs, lever.mechanic ?? 'PRICE', depth);
  return { hlLiftPct: c?.hlLift ?? 0, marginLiftPct: c?.marginLift ?? 0 };
}
```

Replace the placeholder:

```tsx
simulator={<Simulator levers={levers} estimateLift={estimateLift} />}
```

- [ ] **Step 3: Eyeball + commit**

```bash
git add app/components/cockpit/Simulator.tsx app/page.tsx
git commit -m "feat: promo simulator (depth slider, lift estimate from coefficients)"
```

---

## Phase 5 — AI Analyst tools

### Task 15: Add MarketPulse tools to `/api/chat` + rewrite system prompt

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Add tool imports + module-scope helpers**

At the top of `app/api/chat/route.ts`, add:

```ts
import { tool } from 'ai';
import { z } from 'zod';
import { getData } from '@/app/lib/cache';
import { forecast } from '@/app/lib/forecast';
import { computeEffectiveness } from '@/app/lib/forecast/effectiveness';
import { lookupCoefficient } from '@/app/lib/forecast/lift';
import { addMonths } from '@/app/lib/forecast/baseline';
```

- [ ] **Step 2: Define `marketpulseTools`**

Insert a constant just above the `POST` function:

```ts
const marketpulseTools = {
  get_last_closed_month_summary: tool({
    description: 'Returns total Hl + Margen Bruto for the latest closed month, YoY delta, and next-3-month projection totals.',
    inputSchema: z.object({}),
    execute: async () => {
      const { sales, asOf } = getData();
      const fc = forecast({ sales, asOf, horizonMonths: 3 });
      const last = fc.history.at(-1)!;
      const prior = fc.history.find((h) =>
        h.month.getUTCFullYear() === last.month.getUTCFullYear() - 1 &&
        h.month.getUTCMonth() === last.month.getUTCMonth(),
      );
      const yoy = prior && prior.hl > 0 ? (last.hl - prior.hl) / prior.hl : 0;
      return {
        asOf: asOf.toISOString().slice(0, 7),
        lastMonthHl: last.hl,
        lastMonthMargin: last.margenBruto,
        yoyDeltaPct: yoy,
        next3MonthsHl: fc.projection.reduce((a, p) => a + p.hl, 0),
        next3MonthsMargin: fc.projection.reduce((a, p) => a + p.margenBruto, 0),
      };
    },
  }),

  get_decomposition: tool({
    description: 'Decomposition of the last closed month by channel | brand | top_customers.',
    inputSchema: z.object({ dimension: z.enum(['channel', 'brand', 'top_customers']) }),
    execute: async ({ dimension }) => {
      const { sales, asOf } = getData();
      const inMonth = sales.filter((s) => s.month.getTime() === asOf.getTime());
      const m = new Map<string, { hl: number; margin: number }>();
      for (const s of inMonth) {
        const k = dimension === 'channel' ? s.customer.channel : dimension === 'brand' ? s.material.brand : s.customer.name;
        const cur = m.get(k) ?? { hl: 0, margin: 0 };
        cur.hl += s.hl; cur.margin += s.margenBruto;
        m.set(k, cur);
      }
      const all = [...m.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.hl - a.hl);
      return dimension === 'top_customers' ? all.slice(0, 5) : all;
    },
  }),

  get_promo_effectiveness: tool({
    description: 'Observed Hl lift, Margen Bruto lift, and ROI proxy for promos that have closed.',
    inputSchema: z.object({}),
    execute: async () => {
      const { sales, promos, asOf } = getData();
      const closed = promos.filter((p) => p.endDate <= asOf && p.promoPrice != null).slice(0, 10);
      return closed.map((p) => {
        const tag = p.skuDescription.toLowerCase().slice(0, 10);
        const matched = sales.filter((s) => s.material.description.toLowerCase().includes(tag) && s.month >= p.startDate && s.month <= p.endDate);
        const actualHl = matched.reduce((a, s) => a + s.hl, 0);
        const actualMargin = matched.reduce((a, s) => a + s.margenBruto, 0);
        const mktgFund = matched.reduce((a, s) => a + s.mktgFund, 0);
        const priorMonth = addMonths(new Date(Date.UTC(p.startDate.getUTCFullYear(), p.startDate.getUTCMonth(), 1)), -12);
        const baseline = sales.filter((s) => s.material.description.toLowerCase().includes(tag) && s.month.getTime() === priorMonth.getTime());
        return computeEffectiveness({
          retailer: p.retailer,
          skuDescription: p.skuDescription,
          actualHl,
          baselineHl: baseline.reduce((a, s) => a + s.hl, 0),
          actualMargin,
          baselineMargin: baseline.reduce((a, s) => a + s.margenBruto, 0),
          mktgFund,
        });
      });
    },
  }),

  simulate_promo: tool({
    description: 'Simulate the impact on Hl and Margen Bruto of activating a promo at a given depth (0-0.4). Returns coefficient-backed estimates.',
    inputSchema: z.object({ mechanic: z.string(), depthPct: z.number().min(0).max(0.6) }),
    execute: async ({ mechanic, depthPct }) => {
      const { coeffs } = getData();
      const c = lookupCoefficient(coeffs, mechanic, depthPct);
      return {
        mechanic,
        depthPct,
        hlLiftPctEstimate: c?.hlLift ?? 0,
        marginLiftPctEstimate: c?.marginLift ?? 0,
        sampleSize: c?.n ?? 0,
      };
    },
  }),

  suggest_lever: tool({
    description: 'Suggest one currently-planned promo lever ranked by expected margin impact, with rationale.',
    inputSchema: z.object({}),
    execute: async () => {
      const { promos, coeffs, asOf } = getData();
      const candidates = promos.filter((p) => p.endDate > asOf && p.depthPct != null);
      if (candidates.length === 0) return { suggestion: null, rationale: 'No planned promos in the window.' };
      const scored = candidates.map((p) => {
        const c = lookupCoefficient(coeffs, p.mechanic ?? 'PRICE', p.depthPct ?? 0);
        return { p, marginLift: c?.marginLift ?? -1 };
      }).sort((a, b) => b.marginLift - a.marginLift);
      const best = scored[0];
      return {
        suggestion: {
          retailer: best.p.retailer,
          sku: best.p.skuDescription,
          mechanic: best.p.mechanic ?? 'PRICE',
          depthPct: best.p.depthPct,
        },
        expectedMarginLiftPct: best.marginLift,
        rationale: `Of the planned levers, ${best.p.retailer} · ${best.p.skuDescription} at depth ${((best.p.depthPct ?? 0) * 100).toFixed(0)}% has the highest historical margin lift for its mechanic/depth bucket.`,
      };
    },
  }),

  compare_yoy: tool({
    description: 'Compare last closed month to same month last year, broken down by channel | brand | top_customers.',
    inputSchema: z.object({ dimension: z.enum(['channel', 'brand', 'top_customers']) }),
    execute: async ({ dimension }) => {
      const { sales, asOf } = getData();
      const priorMonth = new Date(Date.UTC(asOf.getUTCFullYear() - 1, asOf.getUTCMonth(), 1));
      function bucketize(rows: typeof sales) {
        const m = new Map<string, number>();
        for (const s of rows) {
          const k = dimension === 'channel' ? s.customer.channel : dimension === 'brand' ? s.material.brand : s.customer.name;
          m.set(k, (m.get(k) ?? 0) + s.hl);
        }
        return m;
      }
      const cur = bucketize(sales.filter((s) => s.month.getTime() === asOf.getTime()));
      const prev = bucketize(sales.filter((s) => s.month.getTime() === priorMonth.getTime()));
      const keys = new Set([...cur.keys(), ...prev.keys()]);
      const out = [...keys].map((k) => ({
        label: k,
        current: cur.get(k) ?? 0,
        prior: prev.get(k) ?? 0,
        deltaPct: ((cur.get(k) ?? 0) - (prev.get(k) ?? 0)) / Math.max(prev.get(k) ?? 1, 1),
      })).sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
      return dimension === 'top_customers' ? out.slice(0, 10) : out;
    },
  }),
};
```

- [ ] **Step 3: Merge MarketPulse tools with Cala MCP tools**

In the existing `streamText({ ... })` call, replace the `tools: tools,` (or equivalent) with:

```ts
tools: { ...tools, ...marketpulseTools },
```

- [ ] **Step 4: Replace the system prompt**

Replace the `SYSTEM_PROMPT` constant entirely:

```ts
const SYSTEM_PROMPT = `You are the AI Analyst on the MarketPulse UK cockpit for Damm's UK commercial team.

Your primary source of truth is the MarketPulse tools, which read directly from Damm's UK sales, promo plan, and forecast engine:

- get_last_closed_month_summary: total Hl + Margen Bruto for the latest closed month, YoY delta, next-3-month projection.
- get_decomposition: where the month's volume came from (channel | brand | top_customers).
- get_promo_effectiveness: observed Hl + Margen Bruto lift and ROI proxy for closed promos.
- simulate_promo: coefficient-backed estimate of Hl + margin impact at a given mechanic + depth.
- suggest_lever: one currently-planned promo lever ranked by expected margin impact, with rationale.
- compare_yoy: last closed month vs same month a year ago, by dimension.

The Cala MCP tools (knowledge_search, knowledge_query, retrieve_entity, entity_introspection) remain available for *external* questions only — market context, retailer news, competitor moves. Default to the MarketPulse tools for any internal-data answer; reach for Cala only when the question explicitly needs market context.

Framing rules:

1. Margin first, volume second. A promo that lifts volume but destroys margin is a loss — surface that.
2. Tie every answer to a tool result. Quote the numbers; don't invent.
3. Recommendations name one of four levers: brand, channel, promotion, or commercial effort. Be specific (which brand, which retailer, which depth).
4. Be tight. One direct answer line, 2-3 supporting numbers from tools, one suggested action. No transcripts.
5. Customers and retailers are anonymized (Cliente A, Retailer 1). Never invent or restore real names.
`;
```

- [ ] **Step 5: Smoke-test**

Run: `npm run dev`. Open the cockpit. In the AI Analyst panel, ask:

- "How did last month close?" → expect `get_last_closed_month_summary` tool call + answer.
- "Which brand drove most of last month's volume?" → expect `get_decomposition` with dimension `brand`.
- "What should we do?" → expect `suggest_lever`.

- [ ] **Step 6: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: MarketPulse AI Analyst tools + margin-first system prompt"
```

---

## Phase 6 — Stretch goals

### Task 16: External regressors — correlation analysis

Only run if Phases 0–5 are complete before end of Day 1.

**Files:**
- Create: `app/lib/external/holidays.ts`
- Create: `app/lib/external/weather.ts`
- Create: `scripts/regressor-analysis.ts`
- Create: `docs/regressor-findings.md`

- [ ] **Step 1: UK bank holidays loader**

Download:

```bash
curl -s https://www.gov.uk/bank-holidays.json > data/bank-holidays.json
```

Create `app/lib/external/holidays.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface HolidayJson { events: Array<{ date: string }>; }

export function loadUkHolidaysPerMonth(): Map<string, number> {
  const path = process.env.UK_HOLIDAYS_PATH ?? join(process.cwd(), 'data', 'bank-holidays.json');
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, HolidayJson>;
  const region = raw['england-and-wales'];
  const m = new Map<string, number>();
  for (const e of region.events) {
    const key = e.date.slice(0, 7);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}
```

- [ ] **Step 2: Open-Meteo monthly temperature loader**

Create `app/lib/external/weather.ts`:

```ts
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface OpenMeteoResp { daily: { time: string[]; temperature_2m_mean: number[] } }

export async function loadMonthlyMeanTemperatureBedford(
  start = '2023-01-01',
  end = '2026-04-30',
): Promise<Map<string, number>> {
  const cachePath = join(process.cwd(), 'data', 'weather-bedford.json');
  let data: OpenMeteoResp;
  if (existsSync(cachePath)) {
    data = JSON.parse(readFileSync(cachePath, 'utf-8'));
  } else {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=52.138&longitude=-0.466&start_date=${start}&end_date=${end}&daily=temperature_2m_mean&timezone=Europe%2FLondon`;
    const r = await fetch(url);
    data = await r.json();
    writeFileSync(cachePath, JSON.stringify(data));
  }
  const grouped = new Map<string, number[]>();
  for (let i = 0; i < data.daily.time.length; i++) {
    const k = data.daily.time[i].slice(0, 7);
    const arr = grouped.get(k) ?? [];
    arr.push(data.daily.temperature_2m_mean[i]);
    grouped.set(k, arr);
  }
  const out = new Map<string, number>();
  for (const [k, arr] of grouped) out.set(k, arr.reduce((a, b) => a + b, 0) / arr.length);
  return out;
}
```

- [ ] **Step 3: Correlation analysis script**

Create `scripts/regressor-analysis.ts`:

```ts
import { getData } from '../app/lib/cache';
import { loadUkHolidaysPerMonth } from '../app/lib/external/holidays';
import { loadMonthlyMeanTemperatureBedford } from '../app/lib/external/weather';

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

const { sales } = getData();
const monthly = new Map<string, number>();
for (const s of sales) {
  const k = s.month.toISOString().slice(0, 7);
  monthly.set(k, (monthly.get(k) ?? 0) + s.hl);
}
const months = [...monthly.keys()].sort();
const hls = months.map((m) => monthly.get(m)!);

const hols = loadUkHolidaysPerMonth();
const holArr = months.map((m) => hols.get(m) ?? 0);
console.log('Bank holidays vs Hl  ρ =', pearson(holArr, hls).toFixed(3));

const weather = await loadMonthlyMeanTemperatureBedford();
const wArr = months.map((m) => weather.get(m) ?? 0);
console.log('Mean temperature vs Hl  ρ =', pearson(wArr, hls).toFixed(3));
```

- [ ] **Step 4: Run + document**

Run: `npx tsx scripts/regressor-analysis.ts`

Record results in `docs/regressor-findings.md`:

```markdown
# Regressor correlation findings — 2026-05-23

UK monthly Hl vs candidate signals (Pearson ρ over the available month range):

- Bank holidays per month: ρ = [value from script]
- Bedford mean monthly temperature: ρ = [value from script]

Decision: signals with |ρ| ≥ 0.3 are wired into the forecast engine as additive regressors; the rest are dropped.
```

Wiring the surviving regressors into the baseline is a follow-on task once we see the numbers.

- [ ] **Step 5: Commit**

```bash
git add app/lib/external/holidays.ts app/lib/external/weather.ts scripts/regressor-analysis.ts docs/regressor-findings.md
git commit -m "feat: external regressor correlation analysis (holidays + temperature)"
```

---

### Task 17: Sainsbury's + Asda trade-plan parsers

Each is its own function in `app/lib/data/promos.ts`, following the same shape as `parseTesco`. Each retailer sheet's layout differs; inspect first, then write a parser that reads the date row, then iterates SKU rows.

- [ ] **Step 1: Inspect each sheet**

For each retailer:

```bash
npx tsx -e "import * as X from 'xlsx'; import fs from 'node:fs'; const wb = X.read(fs.readFileSync('data/Damm_Trade_Plan_promotions.xlsx'), { cellDates: true }); console.log(JSON.stringify(X.utils.sheet_to_json(wb.Sheets['Sainsbury\\'s'], { header: 1 }).slice(0, 7), null, 2));"
```

(Repeat with `"Asda"`.)

- [ ] **Step 2: Implement `parseSainsburys` and `parseAsda`**

Add to `app/lib/data/promos.ts`, modeled on `parseTesco` but with the correct row indices and column scan for the retailer's layout (the row containing `Date` objects identifies the period row).

- [ ] **Step 3: Wire into the cache**

In `app/lib/cache.ts`, change `parseTesco()` to `[...parseTesco(), ...parseSainsburys(), ...parseAsda()]`.

- [ ] **Step 4: Smoke-test + commit**

`npx tsx scripts/validate-data.ts` should show a higher promo count.

```bash
git add app/lib/data/promos.ts app/lib/cache.ts
git commit -m "feat: Sainsbury's + Asda trade-plan parsers"
```

---

### Task 18: Demo polish

- [ ] **Step 1: README update**

Edit `README.md`:
- Setup: `npm install`, copy data into `data/`, set env (`HF_TOKEN`, `CALA_API_KEY`), `npm run dev`.
- Architecture summary (one paragraph, link to spec).
- Run `npm test` to validate the data pipeline.

- [ ] **Step 2: Anonymization sweep**

Open the running cockpit. Verify no real customer or retailer names appear in:
- KPI strip, forecast chart tooltips, decomposition list, promo effectiveness rows, simulator buttons, AI Analyst replies.

If any leak, trace back to the anonymizer (customers) or `anonymizeRetailers` (apply to promos when assembling the cache).

- [ ] **Step 3: Demo script**

Create `docs/demo-script.md` with the ~3-minute walkthrough:

```markdown
# MarketPulse UK — demo script

1. Open cockpit. Point at the "as of" header — anchored to the last closed month, not "today."
2. KPI strip: last-closed Hl + Margen Bruto, YoY Δ in red/green, next 3-month projection.
3. Forecast chart: history vs YoY line vs next-3-month projection band.
4. Decomposition: click "channel," then "brand," then "top customers." Note one over-performer and one drag.
5. Promo effectiveness: scroll to a promo with red ROI. "This one lifted volume but destroyed margin."
6. AI Analyst: ask "Why is [brand] under YoY?" → tool call, grounded answer.
7. AI Analyst: ask "What should we do?" → suggest_lever, then click the suggested promo in the simulator.
8. Simulator: adjust depth slider. "10% depth gains +X% Hl but -Y% margin."
9. Close: "Same pipeline points at any other Damm market — UK is the pilot, not the ceiling."
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/demo-script.md
git commit -m "docs: README + demo script"
```

---

## Self-Review

- **Spec coverage:** §1 four blocks → Tasks 10 (KPI) / 11 (forecast) / 12 (decomposition) / 13 (effectiveness) / 14 (simulator). §2 stack → Task 1. §2 data shapes → Tasks 2-4. §2 forecast engine → Tasks 5-7. §2 AI Analyst tool surface → Task 15. §3 UI layout → Task 9. §4 cuts honored throughout (no DB, no SKU UI, no weekly, single market). §5 open items left as runtime checks: UK filter validation surfaces in Task 3 Step 5; budget/rolling-forecast absent — falls back to YoY (compare_yoy tool + chart YoY line). §6 evaluation alignment: margin-first is wired into effectiveness math, simulator output, suggest_lever ranking, and the system prompt; repointable architecture is realized by separating the data layer (`app/lib/data/*`) from forecast (`app/lib/forecast/*`) — a future market only swaps the loaders.
- **Placeholder scan:** no TBDs. Stretch tasks (16-18) describe complete work, not deferred details. Task 17's per-retailer parsers reuse the Tesco code path with retailer-specific row indices that the engineer determines from the one-shot inspection step.
- **Type consistency:** `MonthlyValue` (baseline.ts) reused in forecast.ts; `LiftSample`/`LiftCoefficient` (lift.ts) consumed by cache.ts + simulator wiring + simulate_promo tool; `EffectivenessInput`/`EffectivenessResult` (effectiveness.ts) consumed by page.ts + chat route; `Customer`, `Material`, `SalesFact`, `PromoEntry` (types.ts) used across all data + forecast modules. `addMonths` exported from baseline.ts and used in lift.ts + page.tsx + chat route. `lookupCoefficient` exported from lift.ts and used in simulator wiring + simulate_promo + suggest_lever.

