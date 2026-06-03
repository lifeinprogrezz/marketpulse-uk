# CeltasInProgress — hackathon repo

Two-person hackathon. Speed matters. `main` must always be demo-able.

## Most important rule

**Never push to `main` directly.** All work goes on a short-lived feature branch and merges via PR.

## Branch conventions

- Naming: `feature/<thing>`, `fix/<thing>`, `chore/<thing>` (e.g. `feature/auth-ui`, `fix/cors`).
- One branch per task. Delete after merge.
- Before pushing, rebase or merge `origin/main` so the branch isn't stale.

## Commit conventions

- Small, frequent, present tense: `add login form`, `fix env loading`.
- One logical change per commit. Don't batch unrelated edits.
- Don't commit `.env` or anything that looks like a secret. The hook in `.claude/hooks/protect-files.sh` blocks `.env*` writes; settings.json blocks reads.

## Pull requests

- Open a PR for anything non-trivial (typos on your own branch can be self-merged).
- Use **Squash and merge** to keep `main` history clean.

## Stack

- **Next.js 16** App Router + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4**
- **Vercel AI SDK v6** (`ai`) + `@ai-sdk/react@4.0.0-canary.150` (the v6-compatible React adapter — pin the canary, don't bump to ^4)
- **Claude Sonnet 4.6** via the Vercel **AI Gateway** — model string is `anthropic/claude-sonnet-4.6` in `app/api/chat/route.ts`. Swap by changing the string only.
- Env vars: `AI_GATEWAY_API_KEY` (required), `CALA_API_KEY` (used once Cala MCP tools land in the next PR)

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

## AI SDK v6 gotchas to avoid

- Use `messages: await convertToModelMessages(messages)` — `convertToModelMessages` returns a Promise in v6.
- Return `result.toUIMessageStreamResponse()` (not `toDataStreamResponse`) so `useChat` receives it correctly.
- On the client, manage input state with `useState` — `useChat` no longer manages it.
- In tool definitions, use `inputSchema` (not `parameters`); for step limits use `stopWhen: stepCountIs(n)`; for token limits use `maxOutputTokens`.

## Files you should not touch

- `.env`, `.env.*` — secrets, hook-blocked
- `.git/`, `node_modules/`, `dist/`, `build/`, `.next/`, `.venv/` — hook-blocked
- `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md` — only edit if explicitly asked

## Common mistakes to avoid

- Force-pushing — blocked by settings.json deny list.
- `rm -rf` on broad paths — blocked by `.claude/hooks/guard-bash.sh`.
- Pushing a stale branch — rebase `origin/main` first.
- Editing files the other person owns without a heads-up — split work vertically (UI slice vs logic slice), not by layer.

## Reminder

`main` must stay demo-able. Never push to it directly.
