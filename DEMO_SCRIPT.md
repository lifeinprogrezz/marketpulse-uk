# MarketPulse UK — Demo Script

**Audience:** judges who haven't seen the dashboard before.
**Time target:** 2:30 – 3:00 minutes for the walkthrough, 1 minute for the AI Analyst demo. Total ≈ 4 minutes.
**Driver:** one person clicks. Other person answers questions.

---

## Setup (before you start)

- [ ] `npm run dev` running on `localhost:3000`
- [ ] Browser tab open, full-screen, no other tabs visible
- [ ] Terminal hidden, notifications off
- [ ] Cala API key valid (test one Cala question 30 seconds before going on stage)
- [ ] Have `/?lang=es` as a bookmark in case a judge asks for Spanish
- [ ] Backup: screenshot of the matrix + a working AI Analyst answer, in case of network failure

---

## Opening (15s)

> *"We picked the MarketPulse UK track, sponsored by Cala. The problem: every month Damm UK's sales planning team has to answer one question — **will we close above budget, and if not what should we change?** That's a slow, manual process across Excel tabs and Slack threads. We built a cockpit that answers it in one screen."*

---

## Section 1 — KPI strip + forecast chart (30s)

**Click target:** top of the page. Point at the two tiles.

> *"Top left: the team's budget for next month. They click the number to edit it — it defaults to the model's forecast, so the gap reads 0% until they set a real target. Top right: the model's forecast — and the gap between the two."*
>
> *"Right now the model is saying we'll come in 11.6% ABOVE budget. That's the headline."*

Scroll to the chart.

> *"The chart shows 12 months of actuals plus the next 3 months projected. The projection has a confidence band and a same-period-last-year reference line so you can sanity-check whether the model's pulling toward the typical seasonal shape or deviating from it."*

---

## Section 2 — Inputs we use to forecast sales (20s)

Scroll down.

> *"Every signal behind the forecast is here, transparently. Left column: what's wired in — internal data plus one external signal (Bedford temperature). Right column: what we tested and rejected, plus candidates we'd test next iteration."*

Hover one of the Weak (yellow) cards.

> *"Each card has a credibility pill — Strong / Weak / Noise / Untested. Click any of them to see the source and the ρ value. We're honest about which signals matter: the temperature regressor is in, but ρ is +0.03 — it nudges, doesn't drive."*

---

## Section 3 — What moved and where (30s)

Scroll to the matrix.

> *"This is the analytical heart of the dashboard. A 2×2 matrix: volume change on the X, margin change on the Y — both vs the same month last year. Bubble size is the brand's share of last month's volume."*
>
> *"Top-right is winning on both. Top-left is defending margin. Bottom-right is buying volume by sacrificing margin. Bottom-left needs a fix."*

Toggle to By customer.

> *"Same matrix at the customer level — top 10 customers by current month volume. The story changes by dimension."*

Toggle back to By brand. Hover a bubble.

> *"Hover shows the brand, the deltas, and its share of the month."*

Point at the summary line below.

> *"Auto-generated summary — names how many brands are growing on both metrics and which one is dragging the most."*

---

## Section 4 — What if? simulator (40s)

Scroll to the simulator.

> *"This is where it gets actionable. The dashboard tells you the forecast is 11.6% over budget — which means we're already going to outperform. So the question isn't 'can we close the gap.' The question is: **given we're already winning on volume, should we be trading some of that margin back?**"*

Pick a brand from the dropdown.

> *"Pick a brand. Pick a past promotion scenario — these are real historical buckets from our trade plan, sample size visible up front."*

Click a chip.

> *"Two outputs side by side. **Adding this promo** would push volume up by X Hl but cost Y in margin. **Skipping this promo** does the opposite — saves the margin, gives back some volume. Each panel shows what next month's forecast becomes with that change applied."*

Point at the plain-English line.

> *"And a one-sentence interpretation under each panel, so you don't have to do the math in your head."*

---

## Section 5 — AI Analyst, powered by Cala (45s)

Point at the right rail.

> *"Right rail: the AI Analyst. It uses two sources only — our internal MarketPulse tools for company numbers, and **Cala** for everything external. Cala is sponsoring this track."*

Type a question:

> **"How did last month close?"**

While it runs:

> *"It's calling our internal tools — get_last_closed_month_summary, compare_yoy — and answering with the numbers. Margin-first framing, one suggested action."*

When the answer is back, type a second question:

> **"What's the UK consumer confidence trend?"**

While Cala runs:

> *"This one needs external context — it's hitting Cala. Notice the inline citation right next to each claim — publisher, date, URL. There's a Sources footer at the bottom too. If a claim isn't backed by a Cala result, it doesn't make the claim."*

If time permits, type a deliberately out-of-scope question:

> **"What's the capital of France?"**

> *"Refuses. The system prompt has a hard scope restriction — only MarketPulse internal data or Cala. No training-memory fallbacks. That's what makes it trustworthy for a commercial team."*

---

## Closing (15s)

> *"Bilingual EN / ES, unit-aware Hl / L, fully responsive. The whole pipeline is build-time — Excel goes in once, JSON comes out, runtime is fast. Built for the analyst, not the engineer."*

---

## If something goes wrong

| Symptom | What to do |
|---|---|
| Cala slow / no response | Talk while it loads. If 15+ seconds, say *"Cala's slow today — let me show another query"* and switch to an internal-only question |
| AI Analyst error | Click the ↻ New chat button, try again. Have backup screenshot |
| Browser freezes | Refresh; URL params persist the state |
| Hostile question on accuracy | Be honest: *"R² on the temperature regressor is 0.001 — it's nudging, not driving. We flag that on the Inputs card."* That IS the answer |

---

## Talking points (memorize)

- **"Margin first, volume second."** — every recommendation prioritizes margin
- **"Honest analytics, no fake numbers."** — untested signals are labeled, low samples flagged
- **"Cala is the only acceptable source for external claims."** — sponsor visibility
- **"Customers and retailers are anonymized."** — security/IP awareness
- **"We're MBAs — the edge is the framing, not the algorithm."** — strength play
