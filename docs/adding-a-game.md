# Adding an Office Games game

## Ownership and dependencies

Put framework-free rules and payload contracts in the owning feature's `domain` directory. Add the workflow and repository interfaces under `application`, PostgreSQL/external adapters under `infrastructure`, and wire them through `composition.ts`. Presentation code may use `public-server.ts` or `composition.ts` for server operations and published domain contracts for browser-safe types. Never import an infrastructure file directly from a page/component/hook. Keep secrets and database access on the server.

## Daily Mission integration

1. Define the payload in `features/challenges/domain/question-content.ts`. Validate stored content at its read boundary; do not hide invalid content behind fabricated correct answers.
2. Add the canonical slug and explicit aliases to the shared game types and question renderer. Use `QuestionFor<slug>` when a component requires game-specific fields.
3. Implement `GameProps.onAnswer(answer, options)`. Put measured seconds in `options.customTimeSpent`. The server must independently validate answers/interactions and calculate XP; client correctness hints never authorize points.
4. Add generation, source availability, per-difficulty rounds, feedback, and timer behavior. Respect zero-round difficulties, mission size, user history, persisted order, hints, skip, and timeout behavior. Company trivia remains a separate bonus.
5. Reuse `GameShell`, shared controls, theme tokens and semantic overlay layers. Keep gameplay state in a focused hook or coordinator; rendering components should consume state and callbacks.
6. Verify valid/invalid answers, timing, duplicate submissions, resume, empty pools, and configured round counts. Run `npm run verify -- --database --build`; database tests require the local development database.

## Office Lounge integration

Register board games in `features/lounge/domain/game-registry.ts`, including routes, seat columns, statuses and lifecycle capabilities. Build on the shared match service for creation, availability locking, acceptance, cancellation, resignation and idempotent settlement. Reuse company-scoped realtime channel naming and shared synchronization. Do not duplicate lifecycle SQL in game actions.

For flat board snapshots, register `board.cells`, `board.symbols`, and `board.turns`; consume `useMatchSync` and `useMatchAction`. Keep clocks server-authoritative and calculate displays from elapsed time. Pause synchronization before a mutation, invalidate prior reads, and refresh after it. Extend validated event/snapshot contracts for new data rather than accepting untyped realtime messages. Specialized games may supply a dedicated coordinator while retaining these invariants.

Verify private invites cannot appear as public open games; accepting an invite moves both players into the match; a player cannot occupy concurrent games; spectators cannot mutate state; completed/reviewed boards stay out of open games; repeated cancellation or settlement stays safe. Parties use the shared party service and its participant/spectator contracts rather than pretending to be two-seat matches.

## Review before integrating

The game must work with both themes, invitation interruption, mission progress saving, lounge loss warnings, notification bubbles and finished-game navigation. Add behavior tests where the new rules differ, and let existing shared tests protect common lifecycle behavior. Run the architecture gate to catch cycles, server dependencies in browser code and imports into private infrastructure.
