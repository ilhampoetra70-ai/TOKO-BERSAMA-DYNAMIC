# Repository Guidelines

## Context7
Use Context7 MCP for library, framework, SDK, API, CLI, and cloud docs, even if familiar. Steps: 1) resolve library id, 2) query docs with the full question, 3) answer from those docs. Skip for refactoring, scripts from scratch, business-logic debugging, code review, or general concepts.

## RTK
- Before running shell commands in this repository, use `scripts/rtk-run <cmd>` so RTK is active even in non-interactive shells.
- Do not fall back to raw commands unless `scripts/rtk-run` itself is being created, repaired, or diagnosed.
- If RTK fails because the command needs unfiltered behavior, use `scripts/rtk-run proxy <cmd>`.
- For RTK diagnostics, use `scripts/rtk-run --version` and `scripts/rtk-run gain`.

## Structure
- `pos-react-canvas/`: React + Vite desktop UI. `src/components/views/`, `services/`, `domain/`, `price-checker/`.
- `local-api/`: Fastify backend. `src/routes/`, `src/repositories/`, `src/http/`, `src/db/migrations/`.
- `apps/pos-desktop/`: Electron shell and portable entry.
- `packages/contracts/`, `packages/sdk/`: shared packages.
- `scripts/`: packaging and smoke tools.
- Treat `dist/`, `release/`, `.runtime/`, and `logs/` as generated.

## Commands
- `npm run dev:desktop`: Vite UI on `127.0.0.1:5173`
- `npm run dev:local-api`: backend with `tsx`
- `npm run migrate:local-api`: compiled migrations
- `npm run build:desktop`, `npm run build:local-api`: workspace builds
- `npm run build:electron`: UI + API for desktop packaging
- `npm run package:portable-exe`: local API bundle + portable EXE
- `npm run smoke:final`, `npm run smoke:portable`: workflow checks

## Style
2-space indent, semicolons, single quotes. `PascalCase` React components, `camelCase` functions/vars, `*.routes.ts` route files, `*.module.css` near scoped UI. No repo-wide formatter; match nearby code and verify with TypeScript builds.

## Testing
No unit runner. For backend or packaging work, run the relevant build plus the matching smoke script. Keep temporary SQLite data under runtime/test paths.

## PR
No `.git` here, so do not infer commit history. Use short imperative subjects. PRs should note affected workspace, migration or packaging impact, commands run, issue link if any, and screenshots for visible UI changes.

@RTK.md
