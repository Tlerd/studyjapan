# Học tiếng Nhật (StudyJapan)

Web app to learn Japanese by Kanji, a context graph, and FSRS spaced repetition. Next.js 15, React 19, Dexie (local data), Firebase sync, Vitest. One developer builds it with coding agents. This file is the map for every agent.

## Commands

- `pnpm install`: installs the tools and turns on the git hook (`prepare` sets `core.hooksPath`).
- `pnpm check`: runs the tests and the type-check. It prints one line when all pass, and the failing lines when one fails.
- `pnpm dev`: starts the app on port 3000.
- `pnpm build`: builds the app. CI runs it. Run it before a change to routes, config, or data loading.

Work is done when `pnpm check` passes. The git hook and CI run the same command. Do not run `pnpm lint`: the project has no ESLint config, so it asks questions and hangs.

## Layout

```
app/          Next.js routes
components/   React components
lib/          logic: SRS, graph, lookup, quiz, sync
data/         built data files; data/raw is local only
scripts/      data builders (`tsx`), `check.mjs`
tests/        Vitest tests, one file for each area of `lib/`
docs/         study notes
```

`PLAN.md` holds the product plan. Read the section a task names before you code.

## Rules

- Write a test for new logic in `lib/`. Put it in `tests/`.
- Reply in the language the user writes. Keep code, commands, and paths unchanged.
- Never commit `.env*` (except `.env.example`), API keys, or `data/raw/`.
- Never edit `pnpm-lock.yaml` by hand. Use `pnpm add`.
- Never weaken a check (`pnpm check`, CI, the git hook) to make work pass.
- Do not create `CLAUDE.md`. Put agent rules in this file.
- Use `node`, `pnpm`, and `git` in commands. They work the same in PowerShell and in Git Bash.

## Workflow

1. Run `git status` first. Finish work in progress before anything new.
2. Branch from `main`: `feat/<slug>`, `fix/<slug>`, or `chore/<slug>`.
3. Run `pnpm check` before each commit. The hook runs it again.
4. Never push to `main` with a failing check. Never force push.
