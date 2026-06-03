# Session log — CeltasInProgress

## 2026-05-22 — open threads + decisions

### Decided
- **PR #2 (scaffold) merged** by Eddie at 11:27 UTC.
- **PR #3 — `feat: wire Cala MCP tools into chat agent`** opened. Used `@ai-sdk/mcp@1.0.43` (v6-compatible line, not the canary that ships transitively with `@ai-sdk/react@4.0.0-canary.150` — that one targets `ai@7` tool types and breaks typecheck). HTTP transport, `X-API-KEY` header, schema discovery exposes all 5 Cala tools. System prompt teaches the canonical 4-step forecast flow. `stopWhen: stepCountIs(10)`, `maxDuration: 300`. Verified live against Cala — agent chains `knowledge_query → entity_search → entity_introspection → retrieve_entity` cleanly.
- **PR #4 — `feat: render assistant messages as markdown`** opened, stacked on #3. `react-markdown` + `remark-gfm` with custom Tailwind classes via the `components` prop (no `@tailwindcss/typography` plugin — kept dep surface small). User messages stay plain-text. `.gitignore` updated for `.playwright-mcp/` and stray `*.png`.
- **PR #5 — `feat: error banner, tool-call chips, new-chat reset`** opened, stacked on #4. Three demo-readiness items: dismissible error banner driven by `useChat`'s `error`/`clearError`, `dynamic-tool` message parts rendered as live `⋯/✓/✗` chips with toolName, "New chat" button that stops any stream + clears messages + clears error. Also added `vercel.json` declaring `"framework": "nextjs"` so the deploy detects the framework correctly.
- **Vercel deploy live** at https://hackthon-bcn1-h50qfzrhn-quinterostudio3-7315s-projects.vercel.app/ — preview, public (Vercel Authentication disabled in deployment-protection settings). End-to-end verified via Playwright (Microsoft revenue query, tool chips fire, markdown table renders). Env vars `AI_GATEWAY_API_KEY` + `CALA_API_KEY` set on Vercel (Production + Preview, Sensitive). Project: `quinterostudio3-7315s-projects/hackthon-bcn1`, IDs in `memory/vercel_deploy.md`.
- **Eddie has the demo URL + keys + PR links** (sent via Roberto's chat).

### In the air
- PRs #3, #4, #5 all open, awaiting Eddie's review. Merge order matters: 3 → 4 → 5 (GitHub auto-retargets bases as each lands).
- System prompt is generic — will need tuning once the Cala brief drops Saturday morning.

### Next session
- First thing: `gh pr list` to check merge status. If #3 merged, GitHub will have auto-retargeted #4 to `main`; same for #5 after #4. If anything stuck, ping Eddie.
- Then: open the Cala brief, decide track-specific features. Likely candidates if Sales Forecasting is confirmed: suggested-question chips, forecast-chart visualization (recharts/visx), multi-entity comparison flow.

---

## 2026-05-23 — Saturday build day (post-brief), end of session

### Decided

**Track + framing locked.** Took the **MarketPulse UK** track (Cala-sponsored). Business framing: *"will we close above budget next month, and if not, what should we change?"* Current data shows forecast at **+11.6% over budget**, which reframes the demo: it's not "close the gap" — it's "trade volume surplus for margin protection."

**18 PRs landed today (PRs #38–#56)**, taking the app from rough scaffold to demo-ready. Key shape decisions:

- **KPI strip** — two-tile design: user-owned budget (click-to-edit, defaults to forecast) + model-owned forecast. The gap reads % between them. Click-to-edit pattern with dotted-underline affordance and a `✎ Edit` hint.
- **Forecast chart** — title "Where are we headed?" (outcome-led, mirrors the page tagline). Compact `Mar 25` axis ticks (localized: `Ene/Feb/Abr/Ago/Dic` in ES). Confidence band + same-period-last-year reference line. Drop the "Confidence band" entry from legend and tooltip (noise). Drop the date header from tooltip (X-axis already shows it).
- **Inputs panel** — 2-column card view ("Wired into the forecast" / "Not wired"). Credibility pills: **Strong** 🟢 / **Weak** 🟡 / **Noise** 🔴 / **Untested** ⚪. Click any card to expand for description + source link. ρ used as the single statistical metric throughout (not mixing ρ and R²) — Bedford temp description says `ρ ≈ +0.03`, derived from `√R²`.
- **Performance matrix** — REPLACED the old Decomposition + PromoEffectiveness side-by-side panels with one 2×2 consulting matrix: volume Δ × margin Δ vs same month last year. Bubble size = share of last month's volume. Quadrant tints + corner labels (Margin defence / Winning both / Underperforming / Volume push) — NO corner arrows. Dimension toggle (channel / brand / customer). Auto-generated one-line summary.
- **Simulator** — rebuilt as brand-scoped trade-off tool. Brand dropdown (no longer pre-filled by matrix click — removed that feature per Roberto). Scenario chips collapsed from mechanic+depth into ONE picker (`PRICE · 5–10% off / 27 promos`). Two output panels side-by-side: **Adding this promo** / **Skipping this promo** — each with volume Δ, margin Δ, new forecast, plus a plain-English interpretation line. Compact magnitudes (`£8.4k`, `47k Hl`). Chips ordered: PRICE → "3 for…" → RB, shallow → deep within each group.
- **AI Analyst** — header `AI ANALYST  powered by Cala` (Cala attribution inline). Subtitle slimmed to "Ask anything about your data and the market around it." Stale "Try: …" examples removed. New chat button cleaned up (text-only with `↻` glyph, no border). **HARD scope restriction in the system prompt** — only MarketPulse internal tools or Cala MCP. Out-of-scope questions get a standard refusal: *"That's outside what I can verify from MarketPulse internal data or Cala. I'm not equipped to answer that here."*
- **Full bilingual support** (EN ↔ ES) wired through every panel via `messagesFor(lang)`.
- **DEMO_SCRIPT.md** written — 2:30–3:00 walkthrough with talking points per section, AI Analyst demo sequence (internal → Cala with citations → deliberate refusal), troubleshooting table, memorized talking points.

**Workflow notes** — discovered the hard way that pushing commits to a branch AFTER a PR is merged strands them. Pattern: when Eddie merges a PR while I'm still polishing, the follow-up commits need a NEW branch with a NEW PR. Happened twice today (PRs #45, #47 were rescue PRs).

### In the air
- Nothing pending. `main` is at `e2ec2a4` (PR #56 merged), demo-ready. Working tree clean.

### Next session (Sunday demo day)
- Walk through DEMO_SCRIPT.md once before going on stage.
- Test Cala MCP 30 seconds before — it's the demo's external surface, easiest to break.
- Have a backup screenshot of the matrix + a working AI Analyst answer in case of network failure.
- Drive plan: one person clicks (Roberto), other handles questions (Eddie).

---

_Redeploy trigger: 2026-05-23._

## 2026-05-24 — Sunday: demo-day polish + AI Gateway unblock

### Decided
- **Cockpit split into Forecast / Playbook tabs** (PR #60). URL-driven via `?tab=`. Forecast tab = KPI + chart + inputs; Playbook tab = matrix + simulator. Avoids the "single long scroll" feel and gives the demo a natural pivot.
- **Estimated-sales tile defaults to blank** (PR #61). Matching defaults (`66,969 Hl` in both tiles) read as a duplicate stat. Empty state now shows a dashed "+ Enter your target" CTA; forecast-tile gap reads "—" until a target is entered.
- **Bedford temperature regressor actually shifts the forecast now** (PR #63). Previously fitted-and-displayed but with a fixed zero-anomaly assumption — the "Wired into the forecast" claim was only true in spirit. Forecast now carries the last 3 months' observed anomaly forward and shifts central projection by `β · anomaly` per month. Live numbers shown inside the Bedford card expansion (green "Live impact" callout), chart stays clean. Defensible framing: "we project the recent climate anomaly to persist — most parsimonious without a real weather forecast."
- **Removed the ±10% confidence band** (PR #63). Was a flat heuristic, visually read as random uncertainty. Single projection line is cleaner and avoids implying a calibrated CI.
- **"What if?" renamed to Simulator / Simulador** (PR #66). Simulator handoff prompt opens with natural "I'm considering a …" instead of robotic "[From the simulator] I'm modeling a …".
- **User chat messages now render markdown** (PR #66). Previously routed through `whitespace-pre-wrap`, so the simulator handoff's `**brand**` showed as literal asterisks. Both roles now use ReactMarkdown.
- **Demo URL `hackathon-celtas-in-progress.vercel.app` is on Roberto's Vercel team** — empirically verified via `mcp__claude_ai_Vercel__list_projects`. The GitHub-repo-style name was misleading; do not assume URL pattern reveals ownership.
- **AI Gateway abuse restriction resolved by Roberto topping up $5 in AI credits.** Pro tier doesn't include AI credits; they're a separate billing track. Documented in [[vercel-deploy]].
- **UI polish pass** (PR #66): "Data through" chip moved from Bebas → Inter and consolidated next to Upload files; "vs your budget" → "vs your sales target"; KPI tiles vertically aligned (CTA/number share centre, footers flush bottom); weekly X-axis drops W#; matrix Y-axis label gets breathing room; analyst chat markdown spacing relaxed; "Ask the analyst" button drops the trailing arrow.
- **Submission deck built** with Marp (this PR). Lives in `deck/` — `deck.md` (markdown source), `damm.css` (custom Damm-branded theme mirroring `app/globals.css`: Cream + Charcoal + Crimson, Bebas Neue + Inter), and the generated `deck.pdf` / `deck.pptx`. 10 slides, plain-English copy (jargon-stripped after Roberto's review). Initially tried Gamma — hit "insufficient credits" on Roberto's account, switched to free local generation with `npx @marp-team/marp-cli` (no auth, no credits, fully reproducible). To regenerate: `cd deck && npx @marp-team/marp-cli --theme damm.css --pdf --allow-local-files deck.md` (swap `--pdf` for `--pptx` for the PowerPoint).

### Workflow notes
- Multiple force-pushes today (PRs #61, #63) when rebasing on top of new main was cleaner than merging-from-main. Guard-bash blocks force-push by default; Roberto runs them via `!` prefix in his shell — clean handoff pattern.
- Reaffirmed branch-hygiene rule: when Eddie merges a PR mid-session, the open branches need to be rebased onto new main before the next commit. Did this 3x today without incident.

### In the air
- Nothing pending. Main at `c779b58` (PR #66 merged), demo-ready. Submission deck shipped under `deck/`. Working tree clean. All 16 stale local feature branches cleaned up.

### Next session (post-demo or follow-ups)
- If demo URL gets heavy post-event traffic and hits the AI restriction again, fastest fix is another $5 top-up; medium-term, consider swapping `'anthropic/claude-sonnet-4.6'` gateway string for `@ai-sdk/anthropic` direct (code change at `app/api/chat/route.ts:102` + new `ANTHROPIC_API_KEY` env var).
- Open Q during the demo: if asked "where does the band come from?" — there is no band anymore; if asked "what's the forecast uncertainty?", the honest answer is "single point projection, the ±10% heuristic we had earlier was removed because it wasn't calibrated."

