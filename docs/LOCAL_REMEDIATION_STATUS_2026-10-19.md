# Local remediation status — 19 October 2026

This updates the historical findings in `PLATFORM_AUDIT_2026-10-16.md`. Changes are local only. No GitHub push, Vercel deployment, or Neon migration was performed. This is not a claim that the entire product is bug-free or production-certified.

## Implemented

- Shared registered-game creation, participant locking, acceptance, availability checks, and transactional result/rank settlement.
- Concurrent duplicate direct invitations rejected; repeated identical public-lobby creation reuses the lobby. Public-lobby replacement preserves private incoming/outgoing invitations.
- Confirmed acceptance can atomically resign the receiver's old match. Completed games cannot reopen. Chess clock, checkmate, bilateral draw, and resignation settlement are server-validated.
- Shared match toolbar/player/result presentation for Tic-Tac-Toe and Connect Four; named board controls, winning/last-move states, unobstructed final boards, real rematch invitations, and shared resignation confirmations. Chess presentation partially aligned.
- Short-lived, match-scoped, subscribe-only realtime tokens. Polling reconciliation ignores stale responses and pauses during local move submission.
- Server challenge validators; no preloaded textual answer keys; explicit outcomes; persisted hints; deterministic shared procedural rules/Sudoku generation; transactional mission assignment and completion.
- Resumed mission statistics restored; wall-clock deadline countdown; failed final saves can retry without displaying a confirmed win; expired hints rejected; repeated completion cannot duplicate XP.
- Corrected daily availability/cooldown display and repeated refresh loop; availability checks cover registered Lounge games rather than chess alone. Production self-service test resets disabled.
- Explicit chat receipts for returned messages only, focus/minimize/scroll-position gating, recent-message retrieval with an authorized older-message cursor, draft/send-error handling, and stale-response protection. The popup still needs older-history pagination controls.
- Activity feed no longer duplicates actor names in full result sentences. Loading/failure states are distinct from an empty feed; hidden-page polling is avoided.
- Shared admin desktop/mobile navigation; corrected reporting definitions and complete eligible-player department aggregation; season snapshots preserve lifetime data instead of wiping it.
- Admin roster invitations now provide copyable seven-day links, bind signup to the invited email, consume exactly once in the account transaction, and report existing accounts/skipped rows. Administrators explicitly approve an invitation domain rather than inheriting their own login domain. No email delivery is claimed or configured.
- Unimplemented Google sign-in removed from login; legacy OAuth callback does not treat an arbitrary code as authentication or use forwarded-host/next input for redirects.
- Production PostgreSQL pools reused per worker; explicit TLS configuration validates certificates.
- Versioned/checksummed upgrade runner, no seed replay in the legacy upgrade entry point, matching Docker mounts, and additive local migrations through 23. The legacy standalone per-date unique index is removed while retaining the active-attempt index.
- Tutorial timers/requests are cleaned up, duplicate overlays avoided, tours closable, and misleading timer/skip copy corrected. Confirmation dialogs render outside transformed parents with labeled/focus-trapped content. Reduced-motion preferences cover celebratory effects.

## Verification

- `npx tsc --noEmit`: passed after the implementation changes.
- `npm run lint -- --quiet`: passed (no lint errors; this command does not certify zero warnings).
- `npm run test:matches`: 13 local PostgreSQL integration cases covering concurrency, authorization, game end conditions, exactly-once LP/XP, mission ownership/hints/expiry, and invitation/public-lobby behavior.
- `npm run test:invitations`: expired/wrong-email rejection and concurrent single-use redemption passed.
- `npm run test:rules`: timing/forged interaction results and 60 deterministic Sudoku puzzles passed.
- Earlier browser checks verified dashboard, a single closable tutorial, return-to-match navigation, and a Tic-Tac-Toe move/turn switch. This was not a full two-browser or mobile acceptance run.
- Temporary UI test accounts and their three matches were removed. Integration-test scripts clean up their own fixtures.

## Unresolved verification blockers

Update after the desktop visual pass on 19 October: the full production build now passes, and in-app localhost browser verification is working again. The errors below describe earlier attempts, not current blockers. See `DESKTOP_GAME_VISUAL_SYSTEM.md` for the new scoped visual checks. Full multi-organization and two-browser acceptance work remains separate.

The production build compiled and type-checked during one attempt, but Windows denied directory creation in generated `.next` output (`EPERM`), including during static page generation. Retrying with fewer workers did not resolve it. A completed production build is not confirmed.

The current in-app browser reports localhost connection refused, although the local server responds with HTTP 200 to a shell health check. Remaining visual/two-browser tests must be rerun once browser connectivity is restored. Do not replace these checks with a claim of full end-to-end success.

## Remaining architecture/acceptance work

1. True organization/membership isolation, scoped queries and realtime, explicit cross-company competition enrollment, and automated two-company access tests. Current implementation is a single workplace; email domains are not tenant isolation.
2. Unified global social connection/notification overlay ownership, full invitation lifecycle history without deletion, event revisions/idempotent commands, durable outbox/retry delivery, and measured two-browser latency/reconnect tests. Several global surfaces still poll.
3. Mission configuration/scoring snapshots, stronger server timing/anti-cheat evidence for interactive challenges, timezone/daily-budget boundary tests, and review of legacy generated-content fallback behavior.
4. Complete browser coverage of every game, admin changes, invitation redemption, active-game replacement warnings, spectator permissions, reload/reconnect, mobile widths, keyboard navigation, and message-history pagination.
5. Clean-database bootstrap/upgrade CI, backup restore testing, load testing, explicit season-delta standings, moderation and repeated-opponent/rank-farming policy.

## Next multiplayer candidates

Recommended order after the remaining acceptance gates:

1. Reversi: deliberate strategy, clear legal-move markers and score, reuses turn-based match infrastructure.
2. Battleship: distinct visual experience, but requires server-private board projections and information-leak tests before spectators or realtime publication.
3. Trivia Duel: accessible office competition, using a frozen shared question pack and server timing; requires genuinely comparable scoring and simultaneous-round orchestration.

These are proposals, not newly implemented games. Adding another game must include registry integration, authoritative rules, availability/locking, acceptance/resignation, result settlement, spectator policy, reconnect behavior, and shared presentation tests.
