# MarketPulse UK

> Built for the **DAMM × Engineering Hub Hackathon** (Barcelona, May 2026) — track: **MarketPulse UK (sponsored by Cala)**.

A commercial cockpit for Damm UK's sales planning team. Answers a single question every month: **"Will we close above budget — and if not, what should we do?"**

The cockpit reads three years of UK trading data, runs a forecast, surfaces the brand × channel performance map, and lets the user simulate promotion changes against the next-month projection. An AI Analyst on the right rail (powered by **Cala**) answers free-text questions, citing internal numbers from MarketPulse tools and external market context from Cala — with publisher + date + URL on every external claim.

Bilingual (EN / ES) and unit-aware (Hl / L).

---

## What's inside the cockpit

| Section | What it answers |
|---|---|
| **KPI strip** | "Where are we vs budget next month?" Two tiles — user-owned budget, model-owned forecast — with the gap between them in % |
| **Where are we headed?** | 12-month history + 3-month projection with confidence band and a same-period-last-year reference line. Monthly / weekly toggle |
| **Inputs we use to forecast sales** | Every data source behind the forecast. Two-column card view: wired in (Internal + External signals adding value) vs not wired (tested & rejected, or candidates not yet tested). Colored credibility pills — Strong / Weak / Noise / Untested |
| **What moved and where** | 2×2 consulting matrix: volume Δ × margin Δ vs same month last year. Bubble size = share of last month's volume. Toggle dimension (channel / brand / customer). Auto-generated one-line summary |
| **What if?** | Brand-scoped trade-off simulator. Pick a brand + a past promotion scenario. Two output panels side-by-side: Adding this promo / Skipping this promo — each with volume Δ, margin Δ, and the next-month forecast with that change applied. Plain-English interpretation line below each |
| **AI Analyst (powered by Cala)** | Free-text Q&A. Internal numbers via MarketPulse tools, external claims via Cala — with mandatory inline citations. Hard scope restriction: refuses anything that can't be sourced from those two |

---

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (custom palette: crimson, gold, charcoal, cream)
- **Vercel AI SDK v6** + `@ai-sdk/react@4.0.0-canary.150` for the streaming chat surface
- **Claude Sonnet 4.6** via the Vercel **AI Gateway** (swap model by changing the string in `app/api/chat/route.ts`)
- **Cala MCP** for external market context — connected through `@ai-sdk/mcp` over HTTPS
- **Recharts** for the forecast line + 2×2 scatter
- **xlsx** for the build-time Excel pipeline; runtime reads pre-baked JSON

Architecture note: all Excel parsing happens in `scripts/build-data.ts` and writes JSON to `app/lib/data/__generated__/`. Runtime imports JSON only — `xlsx` never enters the bundle.

---

## Setup

```bash
git clone https://github.com/EddieAllbutt/hackathon-CeltasInProgress.git
cd hackathon-CeltasInProgress
npm install
cp .env.example .env   # then paste your keys into .env
```

### Required env vars

- `AI_GATEWAY_API_KEY` — Vercel AI Gateway (Claude routing)
- `CALA_API_KEY` — Cala MCP (external context)

Never commit `.env`. Hooks in `.claude/` block writes to `.env*`.

### Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## URL params

The cockpit reads four search params, all preserved across toggle clicks:

- `?unit=Hl|L` — volume unit (default `Hl`)
- `?granularity=monthly|weekly` — chart granularity (default `monthly`)
- `?lang=en|es` — language (default `en`)
- `?tab=forecast|playbook` — active cockpit section (default `forecast`)

Example: `localhost:3000/?lang=es&unit=L&tab=playbook`

---

## Data anonymization

The source workbook contains real customer and retailer names. Everything user-facing in the cockpit and in the AI Analyst's prompt context uses anonymized labels:

- **Customers** → `Convenience & wholesale #1`, `Off-licence #3` (sub-channel + index)
- **Retailers** → `Retailer 1`, `Retailer 2`, `Retailer 3`
- **Brands** are Damm's own (Estrella, San Marcos, etc.) — public, not anonymized

The AI Analyst's system prompt enforces this: *"Customers and retailers are anonymized in the data. Never invent or restore real names."*

---

## Demo

See **[DEMO_SCRIPT.md](./DEMO_SCRIPT.md)** for the 2-3 minute walkthrough.

---

## Team

- **Roberto** ([@lifeinprogrezz](https://github.com/lifeinprogrezz)) · MBA, sales planning lens
- **Eddie** ([@EddieAllbutt](https://github.com/EddieAllbutt)) · engineering
