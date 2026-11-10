# Office Games architecture

Structural baseline updated 2026-11-05 and published to GitHub. Deployment verification is separate; dated reports record local validation at the time of each change.

## Shape

The platform is a modular monolith with one application/database boundary per company. Keep features together and put network-service boundaries in only when operational measurements justify them.

```
src/app/                       Routing, authentication, input handling, page composition
src/features/<feature>/
  domain/                      Framework-independent rules, types and calculations
  application/                 Workflows and repository/adapter interfaces
  infrastructure/              PostgreSQL, authentication and external adapters
  composition.ts               Server-only public entry point and dependency wiring
src/components/                React presentation and interaction
src/components/ui/             Shared buttons, surfaces, dialogs and feedback
src/styles/                    Theme tokens and overlay layers
src/server/database/           Pool, transaction context and SQL executor
src/server/http/               JSON error responses and request IDs
src/server/realtime/           Server-only Ably publisher
src/lib/                       Small shared utilities and configuration
```

Features cover identity, companies, players, content, missions, Lounge, social features, administration, reporting and the workspace. `db/table-ownership.json` gives every public table one owner. Reporting may read other domains; it should not reimplement their mutations.

Domain code has no React, Next, PostgreSQL or transport dependencies. Application code consumes domain rules and interfaces; another feature's published domain contract is allowed, its persistence implementation is not. Composition wires adapters into workflows. UI/routes/actions call feature entry points. SQL and table builders no longer live in pages, components, hooks or route/action adapters.

Simple read/administration operations remain repository calls through feature entry points. State-sensitive mission workflows and chess-turn evaluation have explicit application/domain boundaries. PostgreSQL match/party services retain transaction-local persistence invariants within Lounge infrastructure. This is pragmatic layering: it does not pretend every row needs an entity or that all explicit `any` types have been removed.

Feature imports resolve directly to their canonical owners. The former `src/lib` compatibility exports and Supabase-style query adapter have been removed. `src/lib` contains only shared utilities and configuration. Profile pages share one query module; mission pool persistence uses explicit parameterized PostgreSQL queries. Historical migrations remain because existing installations and fresh database bootstrap depend on them.

Presentation code imports published server operations through `public-server.ts` (named operations) or `composition.ts` (wired workflows and repository namespaces). It may import framework-free domain contracts directly. Architecture verification rejects direct infrastructure imports from pages, components and hooks. Question content and options are validated when saved mission questions are read; game-specific payload types are available through `QuestionFor`. Invitation acceptance/decline and interruption confirmation live in `useInvitationActions`, separate from notification presentation. See `adding-a-game.md` for the expansion checklist.

## Gameplay contracts

Mission startup, answers, hints and final settlement are separate typed workflows. Content assembly is a server data pipeline; rotation, XP, settlement/date calculations, challenge validation and board rules can be tested without the UI/database. Existing attempts retain saved questions/order when settings change.
All challenge components use `GameProps.onAnswer(answer, options)`; elapsed time belongs in `options.customTimeSpent`. Daily Mission and party rooms consume the same contract. New components must not add positional result arguments or alternate boolean signatures.

Mission size and game deactivation serialize against settings. The default catalog never overwrites administrator availability or rounds. Generated games are described as generated rounds, and the admin content count excludes a legacy catalog mirror that the mission engine does not consume.

The game registry owns board-game routes, seats, tables and lifecycle capabilities. Common lobby reads iterate it, include either public host seat, exclude finished games and protect private waiting invitations. Participant locks, availability checks and idempotent settlement stay shared across board games and parties. New games must reuse those services.

Invite warnings inspect account activity, including another tab, rather than guessing from the URL. Merely reviewing a finished board does not imply an active game. Actual state remains authoritative when acceptance runs.

## Company and authorization boundaries

Isolation is **database per company**, covering accounts, administration, messages, overrides and future tables. This is not partial row filtering presented as shared-schema tenancy. Each company needs a distinct database, server credential and deployment identity.

Server `OFFICE_GAMES_COMPANY_ID`, build-time `NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID` and `deployment_identity` must agree. Connections check identity before application SQL. Verification is refreshed periodically and when the expected ID changes. Provisioning refuses to reassign a database that contains accounts. Do not change identity while the application runs.

Realtime channels include the company ID. Only server modules hold publisher credentials; clients receive channel naming and subscribe-only token requests. A single installation does not switch companies within one browser session. Future global competition must exchange explicit competition records through authenticated company APIs, not broad player access to company databases.

Admin pages protect their own reads as well as inheriting a protected layout. Settings/onboarding use server permission wrappers around client forms. Admin actions authenticate before accessing data. Request-scoped authentication caching does not cache roles across HTTP requests. Player contacts/presence are not mounted for administrators.

The runtime-role installer creates a dedicated non-administrative server role and trusted-server RLS policies for legacy tables. This credential stays on the server, cannot alter schema/roles, and cannot change company/migration metadata. Migration credentials belong to deployment tooling. Re-run role provisioning after adding tables; do not grant schema ownership to fix application permissions.

## Database lifecycle

One bounded pool is reused per execution context (including a separately hosted proxy); default maximum 10. Budget maximum instances times pool size plus operator connections against the database plan. `DATABASE_POOL_MAX` accepts 1-100.

Mission locks are transaction-scoped PostgreSQL advisory locks; work uses the same connection and locks release at commit/rollback. This removes the session-affinity requirement through a transaction-pooling proxy. Async transaction context propagates the connection; nested transactions use savepoints and statements are queued explicitly. Await nested workflows sequentially and never detach database work inside a transaction/lock.

Runtime migrations are append-only and checksummed. Empty-database bootstrap is separate and ordered. Migration 29 adds player-seat/latest-session indexes, 30 adds company identity, and 31 supplies a missing fresh-install game catalog. Existing player data is preserved.

Content installation is separate from schema changes and preserves existing items. `db/content/release.json` packages only master-bank content, not accounts or company trivia. It makes a fresh installation reproducible; it does not certify all facts or human difficulty.

`GET /api/health` checks database identity and required migrations, returning no connection details. It is not a capacity/content-quality certificate.

## Visual structure

Palettes live in `src/styles/tokens.css`. `src/styles/layers.css` defines navigation, contacts, chat, bubbles, notification panels, dialogs, confirmations and toast priorities. Confirmations use body portals instead of inheriting navbar clipping/stacking.

GameShell, GameQuestion, ChallengeFeedback and shared match presentation separate layout, component selection, interaction and feedback. Reuse semantic colors, focus/disabled states, stable question-instance keys and constrained layouts. Game-piece colors may retain their game meaning. Prettier supplies one source-formatting convention.

## Safe expansion and verification

Use `npm run verify -- --database --build` for formatting, lint, TypeScript, architecture, content/rule tests, migrations, company/schema/transaction tests, multiplayer regressions and production build. Database tests refuse remote targets. `npm run test:bootstrap` rehearses an empty database, repeatable installation and restricted runtime role, then removes temporary resources. `npm run test:http` starts a local production server, checks player/admin page loading and privacy cases, then runs a bounded authenticated HTTP read workload with disposable accounts.

The GitHub workflow uses an isolated PostgreSQL service. Configure repository branch protection to require it after reviewing/pushing; adding a workflow does not configure GitHub branch rules. Migrations must precede application promotion. See `docs/deployment-runbook.md` for backups, configuration and rollback.

Checks reject dependency cycles, server code in client graphs, presentation database calls, misplaced framework directives and type-check bypasses. New tables need ownership entries. Every stateful feature should test success, invalid input, unauthorized access, duplicate requests, concurrent mutation and failure cleanup.

## Evidence and limits

Local checks include 237 gameplay scenarios over 15 games/three difficulties, multiplayer/invitation/party regressions, 2,405 generator checks, 180 independently solved Sudoku boards and 2,190 simulated user-days. These are software checks, not human difficulty trials.

The native local production benchmark completed 1,125 authenticated requests without errors; at 50 concurrent clients the latest native run observed 69 ms p95. An isolated Docker production run using a restricted database role completed a further 1,125 requests without errors, with 108 ms p95 at 50 clients. A small local database is not a hosted concurrency guarantee, websocket fan-out test or soak test. `output/local-capacity.json` records the latest run; results vary by machine. Re-run realistic workloads on chosen hosting before setting a player-capacity promise.

Content fact-checking remains separately tracked in `docs/content-review-status.md`. The dependency audit reported no production-package advisories in this run; development lint dependencies still report a minimatch advisory whose automatic recommendation would downgrade/break the toolchain. It was not force-applied. This is not a penetration-test certification.
