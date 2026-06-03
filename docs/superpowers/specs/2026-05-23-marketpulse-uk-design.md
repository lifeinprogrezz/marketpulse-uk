# MarketPulse UK — Design

**Date:** 2026-05-23
**Source of requirements:** [`docs/brief.md`](../../brief.md)
**Status:** updated after first data drop (`UK DATA.xlsx`, `Damm Trade Plan - promotions.xlsx`)

## 1. Value proposition

MarketPulse UK is a **monthly commercial cockpit for the UK team** that turns *"what happened"* into *"what do we do now."* The cockpit is anchored to the last closed month and answers four questions on one screen:

1. **Where is demand coming from this month?** — decomposition by channel × brand × top anonymized customers, on monthly Hl and Margen Bruto.
2. **Are we on track to target?** — last-closed-month actuals + our forecast for the next 1–3 months plotted against the target. Budget is the target when delivered; prior-year same-month is the fallback. Team's rolling forecast layered next to ours when delivered. One gap number.
3. **Are our levers working — in volume *and* margin?** — promotion effectiveness tracker: for each historical and recently-ended promo, observed Hl lift, observed Margen Bruto lift, and an ROI proxy `(ΔMargen Bruto − Mktg Fund) / Mktg Fund`. A promo can lift volume but destroy margin; this view surfaces that.
4. **What changes the picture?** — promo simulator: pick a planned promo from the trade plan, toggle on/off or adjust depth, see the forecast curve, gap-to-target, and margin update.

The AI Analyst plays a narrow role: it **explains** the gap from blocks 2/3 and **suggests one lever** to try in the simulator, ranked by expected margin impact. Full AI-ranked action lists are a stretch goal.

**Business framing.** The user is Damm's UK commercial lead. The tool's job is to help the UK office make more money next month, with explanations a non-technical commercial leader can defend internally. The engine is built so the same pipeline can be repointed at another market's data later (Spain, Portugal, France) — UK is the pilot, not the ceiling.

## 2. Technical architecture

### Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- AI SDK v6 + `@ai-sdk/react@4.0.0-canary.150`
- **Llama 3.3 70B Instruct via Hugging Face Inference Router** (OpenAI-compatible at `https://router.huggingface.co/v1`), through AI SDK v6's `openai-compatible` provider. Env var: `HF_TOKEN`. Existing `AI_GATEWAY_API_KEY` + Claude path stays commented as a fallback in case HF rate-limits during the demo.

No database, no auth, single page. Excel files parsed once on cold start (`xlsx` npm package), in-memory cache, no persistence layer.

### Data — actual shapes from the delivered workbook

**`UK DATA.xlsx`**

- Sheet `DATABASE` (25,715 rows) — monthly fact table at `(Cod. Cliente, Cod. Material, AÑO CALENDARIO)`. Columns of interest: `Hl`, `Venta Neta`, `Margen Bruto`, `Mktg Fund`, `MB Comercial + Mkt Fund`. Month encoded in Spanish abbreviation + two-digit year (e.g. `Abr.25`, `Ene.26`) — needs a parser.
- Sheet `CUSTOMERS` (233 rows) — customer dimension. Join key: `Cod. Cliente`. Brings `Pais`, `SubChannel`, `Sales Channel`, BDM. UK pilot filter: `Pais = 'Reino Unido'` (validate at first contact; some UK customers may be copackers, e.g. CMBC).
- Sheet `MaterialData` (2,986 rows) — SKU dimension. Join key: `Cod. Material`. Brings `Marca` (brand), `Línea Negocio`, pack info, alcohol %.

**`Damm Trade Plan - promotions.xlsx`**

- One sheet per retailer (Tesco, Sainsbury's, Waitrose, Morrisons, Asda, …). Each layout differs. Cell values are **promo prices** during a (SKU, period) cell; some encode mechanic codes (`MTB`, `WIGIG`, `RB`, `"2 for £27"`). Plan year is 2026.
- A per-retailer parser is required. Priority retailers for the MVP: Tesco, Sainsbury's, Asda. Output is a normalized long table: `retailer, sku_descr, start_date, end_date, promo_price, mechanic, depth_pct` (depth computed against the modal non-promo price for the SKU at the retailer).
- Retailer names → customer IDs by name matching against the `CUSTOMERS` sheet.

**Anonymization.** Customer codes carry real names (CMBC, EVOCA, CARLSBERG, BELIV) and retailers carry real brand names (Tesco, Sainsbury's). An anonymization layer maps both to `Cliente A/B/C` and `Retailer 1/2/3` before any value reaches the UI.

### Forecast engine

TypeScript, in-process, under `app/lib/forecast/`. Granularity: **monthly**, at `(brand, channel)` level.

- **Baseline** = prior-year same-month × trailing 12-month trend ratio.
- **Seasonal index** from rolling 12-month history; corrects for predictable month-of-year variation.
- **Promo lift coefficients** = regression of sales-during-promo months vs baseline, grouped by `(retailer, mechanic, depth_pct_bucket)`. Lift tracked in **both Hl and Margen Bruto** so the simulator returns margin deltas, not only volume.
- **External regressors are selected, not assumed.** A one-shot correlation-analysis script (`scripts/regressor-analysis.ts`) tests each candidate against historical monthly Hl and Margen Bruto and outputs effect sizes. Only signals with meaningful correlation get wired into the engine. Candidates to test:
  - Number of UK bank holidays per month + Easter-month flag
  - Mean monthly temperature, days above 20 °C (Open-Meteo, free)
  - ONS UK CPI, retail sales index, household disposable income (free)
  - Football fixture density per month + Euros/World Cup flags + Six Nations
  - Google Trends: `beer`, `BBQ`, `pub`, Damm brand names
  - Daylight hours per month
- **Output**: month-by-month projection for the next 1–6 months in both Hl and Margen Bruto, with a confidence band.

### Promo effectiveness — first-class margin view

For each historical and currently active promo window:

- `observed_hl_lift` = actual Hl − baseline Hl during the window
- `observed_margin_lift` = actual Margen Bruto − baseline Margen Bruto
- `mktg_fund_used` from the `DATABASE` row
- `roi_proxy` = `(observed_margin_lift − mktg_fund_used) / max(mktg_fund_used, ε)`

This surfaces the case where volume rises and margin falls — the most actionable insight for a commercial lead and the differentiator vs a volume-only tracker.

### AI Analyst tools

Added to the existing `app/api/chat/route.ts` alongside the already-wired Cala MCP tools (kept wired but not part of the MarketPulse demo flow):

- `get_last_closed_month_summary()` — Hl, Margen Bruto, gap to target/YoY, next-3-month projection.
- `get_decomposition(month, dimension)` — `channel` | `brand` | `top_customers`.
- `get_promo_effectiveness(period)` — promos in the period with volume lift, margin lift, ROI proxy.
- `simulate_promo(promo_id, depth_pct)` — forecast delta in **both Hl and Margen Bruto**.
- `suggest_lever(month)` — one suggested lever ranked by expected margin impact, with a one-line rationale.
- `compare_yoy(month, dimension)` — used as the budget proxy until a real budget file lands.

### Component map

- `app/lib/data/excel.ts` — xlsx parsing.
- `app/lib/data/normalize.ts` — Spanish month parser, customer/material joins, anonymizer.
- `app/lib/data/promos.ts` — per-retailer trade plan parsers (one function per retailer layout).
- `app/lib/forecast/baseline.ts` — baseline + seasonal + promo coefficients.
- `app/lib/forecast/index.ts` — projection at a given as-of month.
- `app/lib/forecast/promo-effectiveness.ts` — margin-aware lift + ROI proxy.
- `app/lib/external/*` — per-source loaders for the regressors that survive the correlation analysis.
- `scripts/regressor-analysis.ts` — one-shot script that picks the regressors.
- `app/api/forecast/route.ts` — forecast + KPIs as JSON for the client.
- `app/api/chat/route.ts` — existing route, extended with the 6 tools above + HF/Llama provider config.
- `app/page.tsx` — cockpit dashboard (single route).
- `app/components/cockpit/*` — KPI strip, decomposition panel, promo effectiveness panel, forecast chart, simulator panel.
- `app/components/chat/*` — existing chat scaffold becomes the AI Analyst side panel.

## 3. UI layout

Single route, 3-column desktop grid, stacks on narrower viewports. Header surfaces **"as of <last closed month>"** so the jury sees the anchor date.

```
+--------------------------------+-------------+
| KPI strip (Hl, Margen Bruto,   |             |
| gap vs YoY/budget, next-3-mo)  | AI Analyst  |
+--------------------------------+ (chat panel,|
| Forecast vs YoY/Budget (chart, | existing    |
| past 12mo + next 3mo proj.)    | scaffold,   |
+----------------+---------------+ swapped to  |
| Decomposition  | Promo         | Llama 3.3)  |
| (channel/brand)| Effectiveness |             |
|                | (vol + margin)|             |
+----------------+---------------+             |
| Simulator (promo cards + depth slider,       |
| shows Hl + margin delta)                     |
+----------------------------------------------+
```

## 4. Cut list

Explicitly out for the MVP:

- No database. Excel parsed on cold start, cached in memory.
- No auth.
- No SKU-level UI — aggregations stop at brand × channel.
- No weekly granularity — monthly only, matches delivered data.
- No multi-market — UK only. Architecture is repointable to other markets but the demo is UK.
- No pricing-only simulator — pricing surfaces inside promo effectiveness.
- No AI-ranked multi-action list — only `suggest_lever` returns one card.
- Cala MCP stays wired but is not part of the MarketPulse demo flow.
- Only the first three retailer trade-plan layouts ship in the demo (Tesco, Sainsbury's, Asda); others land if time allows.

## 5. Open items

- **Budget file not delivered.** Using prior-year-same-month as the gap baseline. Architecture is one CSV/sheet away from real budget; nothing else changes when it arrives.
- **Rolling forecast file not delivered.** Same situation.
- **Data granularity is monthly**, despite the master deck mentioning "datos diarios o periódicos". Weekly forecast is not deliverable from this data.
- **Per-retailer trade plan sheets vary widely** — parser coverage is per retailer; only the ones we parse make it into the demo.
- **UK filter validation** — `Pais = 'Reino Unido'` is the working filter; some UK customers may be copackers serving other markets (e.g. CMBC) and should probably be excluded from "UK commercial demand" aggregations. Confirm on first run.
- **Team split** is deliberately not committed in this design. Both members work shared/overlapping until one of them decides to split a vertical.

## 6. Evaluation alignment

Mapping to the hackathon's stated valuation criteria:

- **Impacto comercial** — margin-aware promo effectiveness + simulator + `suggest_lever` make a margin-first "what do we do now" loop visible. Volume-only competitors miss this.
- **Calidad analítica** — forecast engine is a real regression-backed model with a correlation-validated regressor set; assumptions documented in §2.
- **Simulación** — first-class block in the UI and as an LLM tool, returns both volume and margin deltas.
- **Recomendaciones** — thin (one-card `suggest_lever`) but present and explainable.
- **Explicabilidad** — every AI answer is anchored to a chart or number on the dashboard via the tool calls.
- **Demo** — single-page cockpit, no setup at demo time.

**Strategic angle.** The other participants are largely engineering teams. The MBA / ESADE perspective of this team is the differentiator. Two design choices reflect that and are worth pointing at in the demo: (a) framing every recommendation through margin, not just volume, and (b) building the engine so the same UK pipeline is repointable at another Damm market without rewriting the model.
