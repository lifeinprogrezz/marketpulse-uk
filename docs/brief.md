# MarketPulse UK — Project Brief

> Damm x Engineering HUB Hackathon · International Challenge
> Source: `MarketPulse_UK_Internacional_EN.pdf` (confidential — participants briefing)

## 1. Challenge in one sentence

Build a tool that uses **UK sales history**, **monthly budget**, and the **promotion plan** to:

1. Forecast sales evolution
2. Detect deviations against target
3. Identify commercial actions that could close the gap

## 2. Business context

- Damm's international business: demand depends on customers, channels, promotions, seasonality, consumer trends, external factors.
- Today's tracking is partly Excel + manual + YoY comparisons.
- Pilot scope: **UK only**. Sales data available since 2023; current-year promo plan available.
- Bedford is an important factory, but this is framed as an **international commercial case for UK**, not a supply/factory problem.
- The tool must answer two questions:
  - Will the month close **above or below budget**?
  - If below, **what should the commercial team change** to move closer to target?

## 3. Objectives

- Forecast **weekly and monthly** sales from history + budget + planned promos.
- Compare forecast vs. budget / target estimate.
- Detect deviations and explain possible causes.
- Simulate or estimate the impact of different promotions.
- Recommend commercial actions: prioritize **brand**, **channel**, **promotion**, or **commercial effort** to reach target.

## 4. Data

### Provided datasets

- Current-year promotion plan
- UK sales data since 2023
- Sales by **anonymized customer**
- Sales by **brand**
- Sales by **SKU**
- Sales by **channel / sub-channel**
- Monthly budget / target estimate
- Available promotional calendar

> ⚠️ Dataset not yet received at time of writing. Architecture decisions deferred until granularity, schema, and volume are known.

### External enrichment (expected, not provided)

Teams are expected to include relevant external data, e.g.:

- Market trends, off-trade channel trends
- Seasonality, holidays
- Weather
- Consumption indicators
- Search trends
- Events

**Cala.ai** is mentioned as a potential helper for providing/structuring external signals — aligns with the Cala MCP work flagged in `CLAUDE.md`.

### Anonymization rule

Specific supermarket / customer names **must not appear** in the demo unless fully anonymized.

## 5. What we must build

- Weekly and/or monthly sales **forecasting model**
- **Dashboard**: forecast vs. budget with clear deviations
- **Promotion impact analysis**
- **Actionable recommendations** for commercial team / International Management / UK office
- **Code repository + real working demo** (static mockup or slide-only is not enough)

## 6. Working rules

- Damm data is confidential — only usable within the hackathon weekend, no exfiltration.
- External public sources are encouraged; document each one and how it was integrated.
- Allowed: GenAI, LLMs, AutoML, APIs, no-code/low-code, notebooks, Streamlit, Power BI, etc.
- Solution must include repo + real working demo.
- Document how to run the solution and its dependencies.

## 7. Judging criteria

| Criterion | What it means |
|---|---|
| **Actionability** | Drives a real business decision, not just a dashboard. |
| **Technical robustness** | Real analysis / models / optimization logic / evidence. |
| **Data usage** | Cleaning, integration, and enrichment of Damm data with external sources. |
| **Explainability** | Recommendations are understandable and justifiable to a business user. |
| **Working demo** | End-to-end flow visible to jury with real or representative data. |

Prizes: one per challenge + one overall.

## 8. FAQ highlights

- **Scope**: UK only.
- **Customer names**: anonymized in the demo.
- **Time horizon**: week and month.
- **Rolling forecast**: not provided — work with sales, budget, promo plan.
- **Accuracy vs. recommendation**: both matter; recommendation is the differentiator.
- **External data**: encouraged, document sources.
- **GenAI**: allowed for analysis, dev, extraction, insight generation, conversational interfaces.
- **Data exfiltration**: not allowed.
- **Noisy/incomplete data**: part of the challenge — document assumptions and cleaning.
- **Final deliverable**: code repo + working demo.

## 9. Submission checklist

- [ ] Repository includes clear run instructions
- [ ] Demo shows weekly or monthly forecast
- [ ] Solution compares forecast against budget or target
- [ ] Solution includes promotions in the analysis
- [ ] Tool explains why deviations happen
- [ ] Demo recommends actions to move closer to target
- [ ] External sources used are documented

## 10. Final mindset (from the brief)

> Build something **real, executable and explainable**. Prioritize a working end-to-end flow over a broad but superficial solution.

## 11. Open questions (to revisit once dataset lands)

- Granularity of sales data (daily? weekly?) and timestamp coverage.
- Number of distinct customers, brands, SKUs, channels — drives modeling approach.
- Promo plan schema: what fields describe a promotion (mechanic, depth, duration, customer scope)?
- Budget granularity: per channel? per brand? per month only?
- Currency, units (volume vs. value), and whether revenue is gross/net.
- Data quality: missing weeks, returns, corrections.
- Whether SKU/brand hierarchy is provided or must be inferred.
