---
marp: true
theme: damm
paginate: true
size: 16:9
footer: 'MarketPulse UK'
---

<!-- _class: cover -->
<!-- _paginate: false -->
<!-- _footer: '' -->

# MarketPulse UK

<div class="meta">

Roberto Quintero · Eddie Allbutt
DAMM × EHUB Hackathon · 2026

</div>

---

#### The problem

# The monthly close is built by hand.

Every commercial team at Damm UK — like every drinks company — answers two questions each month:

- **How are we tracking vs. budget?**
- **What's the fastest way to close the gap?**

Today, the answer means pulling data from five different tools, joining it in spreadsheets, and waiting on the analyst. By the time it lands, half the month is gone.

> The point isn't a better forecast. It's a faster decision.

---

#### The product

# One screen. Three sections.

- **Forecast** — *Where are we headed?* The model's number for next month vs. the team's target. The inputs are visible — click any to see exactly how it moves the number.
- **Playbook** — *What moved, what can we move?* A map of how every brand and channel is doing, plus a simulator for promotions.
- **AI Analyst** — *Ask anything.* A Cala-powered assistant that only answers from your data and Cala's market signals.

Bilingual English / Spanish, every screen, every answer.

---

#### Forecast

# Your number vs. the model's number.

Two tiles, side by side — designed to force the conversation no spreadsheet does:

- **Your sales target.** Typed in by the team. **Starts blank.** The gap is never fake.
- **Forecasted sales.** Built from the same month last year plus how the last 12 months are trending — and adjusted for how Bedford's weather is doing vs. normal.

> Bedford has been +0.6 °C warmer than usual.
> That shifts next month's number by **+139 Hl**.

The kind of sentence a sales director can read out loud.

---

#### Playbook

# A map of what's moving — and a way to move it.

**The matrix.** Every brand, channel, and top customer plotted by volume change × margin change vs. last year. Four quadrants tell the story instantly:

- **Winning Both** — protect & scale
- **Underperforming** — investigate fast
- **Margin Defence** — won volume at a cost
- **Volume Push** — gained margin, losing share

**The simulator.** Pick a brand and a past promo scenario. See what **adding vs. skipping** would do to volume and margin — with stated confidence (*e.g. "27 past promotions · high confidence"*).

Promo choices stop being gut calls.

---

#### AI Analyst

# Powered by Cala. Answers only from your data.

The assistant in the right rail has two sources — and only two:

1. **MarketPulse's internal data** — every company number (volume, margin, promos, customers, channels).
2. **Cala's market signals** — news, competitors, retailer events, weather, regulation.

Anything outside that, it refuses:

> "That's outside what I can verify from MarketPulse internal data or Cala. I'm not equipped to answer that here."

**One click from the simulator hands the scenario over** to the Analyst, ready to weigh the four levers — brand, channel, promo, sales effort — against your latest data and what's happening in the market.

---

#### Why it holds up

# Honest where it matters.

- **No fake confidence band.** One projection line. We removed the ±10% halo because it wasn't based on real math.
- **Weather actually moves the forecast.** The Bedford temperature effect is calculated from years of past data, and applied to next month's number based on what's happening right now.
- **Every simulation shows its evidence.** Few past examples? We tell you so you don't over-trust it.
- **Refusal is a feature.** The Analyst saying *"I can't answer that"* when it can't — that's how trust gets built.
- **English and Spanish, throughout.** Every screen, every Analyst answer.

---

#### Built in a weekend

# Two people. A real product.

- **Next.js 16** + **React 19** + **TypeScript** (the modern web stack)
- **Tailwind v4** with a custom palette — **Cream · Charcoal · Crimson** (Damm-native)
- **Vercel AI SDK** + **Claude Sonnet 4.6** through the **Vercel AI Gateway**
- **Cala MCP** for the external market data
- Damm UK workbook loaded at build time — the app opens instantly

67 pull requests. About 36 hours of work. `main` was demo-ready every step.

---

#### Where this goes

# What we'd ship next.

- **A real weather forecast.** Plug a Met Office feed into the model — the math is already in place.
- **More levers in the simulator.** Beyond brand, channel, and promo type — add sales-effort levers (account visits, activations, distribution).
- **Per-user target memory.** Today the target resets each session. Saving it means the cockpit starts the conversation, not the user.
- **Live data feeds.** Wire SAP, Salesforce, and retailer feeds into the same loaders the workbook uses today.

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: '' -->

# Thank you.

### **Demo:** [hackathon-celtas-in-progress.vercel.app](https://hackathon-celtas-in-progress.vercel.app)
### **Repo:** [github.com/EddieAllbutt/hackathon-CeltasInProgress](https://github.com/EddieAllbutt/hackathon-CeltasInProgress)

**Roberto Quintero** · **Eddie Allbutt**
DAMM × EHUB Hackathon · Pier01 Barcelona · 2026
