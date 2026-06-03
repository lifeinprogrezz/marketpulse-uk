# Regressor correlation findings

**Date:** 2026-05-23
**Script:** [`scripts/regressor-analysis.ts`](../scripts/regressor-analysis.ts)
**Sample:** 40 monthly observations, **2023-01 → 2026-04** (UK total Hl + Margen Bruto, all brands × channels)

## TL;DR

**Temperature is the only external signal worth wiring in.** UK bank holidays and Easter don't move monthly Hl in our 40-month window. The seasonality the temperature captures is already partially encoded in the baseline forecast's prior-year-same-month anchor, but temperature lets the model react when a given month is warmer or cooler than its YoY counterpart.

## Pearson ρ vs UK monthly totals

| Signal | ρ vs Hl | ρ vs Margen | Verdict |
|---|---:|---:|---|
| **Bedford mean temperature (°C)** | **+0.507** | +0.418 | ★ wire in |
| Month-of-year cos (12-month cycle) | -0.581 | -0.425 | proxy for temperature; collinear, skip |
| Bedford days ≥ 20 °C | +0.320 | +0.209 | weaker form of temperature; skip in favor of mean |
| Easter-month flag | +0.129 | +0.019 | too weak |
| UK bank holidays per month | +0.005 | +0.010 | no signal |
| Month-of-year sin (12-month cycle) | -0.138 | -0.145 | too weak |

Threshold for wiring into the forecast engine: **|ρ| ≥ 0.3 vs Hl** with the constraint that we pick one representative per cluster of collinear signals.

## What we'd add to the baseline

A single additive regressor on monthly mean temperature for Bedford:

```
projected_hl[t] = baseline[t] * (1 + beta * (temperature[t] - temperature[YoY same month]))
```

`beta` would be fit once over the 40-month history. Cosine of month-of-year is collinear with temperature (they both encode "summer"), so we keep one — temperature, because it lets the model react to anomalous weather years instead of locking in an average seasonal shape.

**Not in this PR.** The wire-up is a small follow-up on top of `app/lib/forecast/baseline.ts`; the current PR is the analysis + the loader scaffolding so that follow-up is one or two function calls away.

## Things the analysis explicitly *didn't* find

- **UK bank holidays** show no correlation. Plausible reasons: every year has the same nominal count, the moveable ones (Easter) only shift one month earlier or later, and beer's consumption pattern in the UK is closer to "weekend / weather / occasion" than "bank-holiday weekday." Confirmed flat across the dataset.
- **Sine of month-of-year** is weak because beer demand isn't sinusoidal — it's mostly a single summer peak with a secondary December bump, which the cosine + temperature capture more cleanly.

## What's *not* tested (out of scope for the stretch)

- ONS UK CPI / retail sales index / household disposable income — would test macroeconomic pressure on beer demand. Pulling them needs an API call to ONS or a one-off CSV download; not blocked, just deferred.
- Premier League fixture density, Euros / World Cup flags, Six Nations — sport events shift on-trade demand more than off-trade, and our data is overwhelmingly off-trade in the post-PR-#10 UK aggregate.
- Google Trends for `beer` / `BBQ` / brand names — same story as macro: not blocked, deferred.

## Cached data files

Both committed under `data/` (small, public, deterministic — same pattern as the raw workbook files in PR #10):
- `bank-holidays.json` — `curl https://www.gov.uk/bank-holidays.json` (England & Wales, 2019–2028, 83 events). ~22 KB.
- `nasa-temperature-bedford.json` — NASA POWER daily T2M for Bedford (52.138 N, 0.466 W), 2023-01-01 → 2026-04-30 (1,216 days). ~73 KB. NASA POWER was the fallback after Open-Meteo's ERA5 archive returned 504s during this run; same data shape (daily mean temperature), same coordinates, free, no API key. To refresh end-date later: re-run the URL in `app/lib/external/weather.ts`'s header comment.
