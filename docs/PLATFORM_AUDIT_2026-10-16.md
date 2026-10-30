# Office Games: product, design, and architecture audit

Date: 16 October 2026

## Scope and evidence

Repository source audit covering multiplayer clients/actions, invites, realtime, Daily Mission generation/scoring, profiles/leaderboards, messaging, administration, onboarding, database provisioning, and design primitives. Existing local edits were preserved. No gameplay, database, deployment, or account changes were made for this audit.

Validation: ESLint and TypeScript checks passed. This is not a completed browser, load, penetration, or production audit. Findings below distinguish directly traceable defects from risks requiring runtime verification. Deployed schemas, database triggers, Ably capabilities, and concurrent two-browser scenarios were not inspected. A source audit cannot certify that there are no remaining bugs.

## Product direction

Build a workplace recreation platform with three distinct systems:

1. Daily Missions: accessible individual challenges, personal improvement, XP, streaks, and company content.
2. Office Lounge: reliable head-to-head matches, spectators, friendly competition, and a clearly explained competitive rank.
3. Company competitions, later: opt-in events between organizations, with explicit rosters, schedules, scoring, and visibility policies.

The current application is one shared workplace, not an implemented multi-company system. A separately deployed app/database for each company is a possible initial delivery model. Sharing one deployment between companies requires explicit isolation first; email domains and department names are not company boundaries.

## Prioritized findings

### 1. Critical competitive integrity: client-controlled Daily Mission success

`src/app/play/actions.ts:758–934` accepts browser-supplied `customIsCorrect`, elapsed time, hint use, perfect result, and combo information. At line 853, interaction games are successful when `customIsCorrect === true`. The list includes logic and arithmetic, not only reaction games. A modified request can claim success/bonuses without the corresponding interaction.

`fetchSessionQuestions`, line 708, exports a server action that reads a session by ID without checking session ownership and sends `correct_answer` to the client. Knowing an ID can expose another session's question payload; the ordinary player already receives their answers before attempting them.

Recommendation: server-owned challenge payloads and answer validators; separate public puzzle data from private solutions; authorized session reads; derive combos/hints/bonuses from persisted events. For reaction/typing games, distinguish approximate browser-measured performance from verifiable server state. Do not promise cheating is impossible.

### 2. Critical multiplayer authority: arbitrary chess completion

`src/app/dashboard/chess/actions.ts:506` exports `processChessGameEnd(gameId, result)` without authentication or participant/result validation. It accepts a winner supplied by its caller. `drawChessGame:482` checks membership but does not verify a mutually accepted draw offer.

Recommendation: private settlement function; authenticated commands for resign/draw offer/accept; determine legal terminal outcomes on the server. A client cannot select the match result.

### 3. High: chess checkmate/timeout skips settlement

Chess move handling at lines 395–405 saves a terminal status before calling settlement. Settlement at line 514 returns unless the status is still `in_progress`. Timeout handling at lines 430–435 has the same ordering. Winner bookkeeping, rating updates, and completion events can therefore be skipped.

Recommendation: one transaction writes final board, result, winner, rating ledger, and durable event exactly once. Test checkmate, draw, resignation, timeout, repeated completion, and interrupted persistence separately.

### 4. High: completed chess matches can be reopened

Chess acceptance at lines 155–161 updates by game ID and participant but omits `status = 'waiting'`. Replaying acceptance can reactivate a completed board.

Recommendation: conditional pending-to-active transition; verify recipient, expiry, and both participants' availability under lock. Repeated acceptance should return the existing result, not restart a match.

### 5. High: multiple-active-game rule has bypasses

`src/app/dashboard/ttt/actions.ts:17` joins without the shared active-game guard. Line 22 creates an active rematch without checking that the old game ended, both players are available, or the opponent accepted. Invite acceptance checks the receiver but can leave the challenger playing another match. `src/lib/game-presence.ts` performs a separate availability read, which alone cannot prevent concurrent accepts.

Recommendation: lock both memberships/participants in stable order; allocate one active participation slot per person in a shared transaction. Enforce one-game-at-a-time at the database/service layer across all game types.

### 6. High: clock and terminal-transition races

Chess lines 373–392 deduct elapsed time only for nonterminal submitted boards: a late checkmate/draw can bypass clock expiry. Timeout writes do not compare a revision. TTT resignation at line 21 updates by ID after an earlier status read and can overwrite a completed move. Connect Four resignation should only emit completion if its guarded update actually succeeds.

Recommendation: server clock validation before move resolution; locked or version-checked state transitions; authoritative deadline timestamps. Client animation and optimistic moves must reconcile with the accepted server revision.

### 7. High: rank promises lack a settlement implementation in source

`lounge_lp` exists, is displayed/sorted, and is reset, but no checked-in match completion service or migration trigger awards it. Chess changes `chess_elo`; TTT shows a rating-updated message without a corresponding rating update. An untracked deployed trigger could change this assessment and must be inspected before implementation.

Recommendation: one documented Lounge LP policy, transactional rating ledger, visible before/after result, and idempotent award per match. Keep hidden per-game skill ratings if needed for matchmaking. Define top-tier behavior: `getLoungeRank()` currently wraps displayed LP modulo 100 even after the last tier.

### 8. High for shared hosting: company boundaries do not exist

Profiles, departments, messages, activity, game records, and settings have no organization membership/scope model in the reviewed application. `/api/people`, `/api/activity`, `/api/lobbies`, and the leaderboard read a global workplace. Admin role is a global profile flag. `system_settings` uses singleton `id=1`.

Recommendation: organizations, organization memberships, organization roles, and company-owned settings/content. Scope all queries, server commands, channel authorization, jobs, exports, caches, and reporting. Test isolation with two organizations and users who belong to more than one. Treat this as a multi-company launch blocker, not evidence of a breach in a single-company deployment.

### 9. High: invitation creation is not a complete employee onboarding flow

`src/app/admin/onboarding/actions.ts:72–76` generates and stores a token hash but does not preserve/deliver the raw token or send a redeemable invitation. Registration does not consume an invitation. Domain checking during CSV upload cannot establish organization membership.

Recommendation: pending invitation with organization/role/expiry; deliver or copy a redeemable link; accept exactly once during signup/signin; record acceptance; support resend/revoke. Add SSO later behind a tested identity flow. The legacy callback currently redirects on `code` without doing a token exchange.

### 10. High: admin resets and analytics do not match business meaning

`src/app/admin/settings/actions.ts` season reset deletes questions, games, messages, activity, and history. That is broader than starting a competitive season and loses useful company records. Preserve history; create a new season and season standings instead. Reserve destructive wipe for an explicitly separate maintenance operation.

`src/app/admin/analytics/page.tsx:72` aliases `is_completed` as `is_correct`. Wrong/skipped attempts can count as correct. Line 37 uses the last available activity date as today's DAU. The match metric at line 64 counts chess only. Correct metric definitions before HR/company reporting.

`src/app/leaderboard/page.tsx:11–29` computes department averages from the top 100 Lounge-ranked profiles, not all eligible employees, and does not filter inactive profiles. Aggregate the full eligible population in SQL. Label XP/participation standings separately from competitive rank.

### 11. High: Daily Mission result and recovery state is under-modeled

`GameEngine.tsx:118–122` reconstructs results from XP sign: negative=skip, positive=correct. Correctness and score are different facts. Store explicit outcomes (`correct`, `incorrect`, `skipped`, `timed_out`, `completed`) and performance details.

Mission generation creates/deletes sessions and then inserts questions/history in separate operations (`play/actions.ts:572–700`), making failures/concurrent starts harder to recover. Freeze a session's game configuration/content/scoring version and create its assignments atomically. Review per-difficulty freshness fallback: some fresh questions in one difficulty can exclude otherwise usable questions in another and cause a capacity error.

`daily-mission/page.tsx` presents the latest completed/expired session without deriving availability from the elapsed cooldown in its own branch. Verify both old-completed and old-expired states after unlock, and remove fixed duration wording when admin settings differ.

### 12. High: rematch UI can wait forever

`TttBoardClient.tsx:99` changes local rematch state to requested without transmitting a request. The receive state has no corresponding realtime/polling handler. Implement a shared invitation handshake with decline, cancel, expiry, and bilateral acceptance before enabling Play Again.

### 13. Medium: realtime is fragmented and configuration-dependent

Each match uses an independent Ably connection and browser-visible `NEXT_PUBLIC_ABLY_KEY`. Actual publishing permissions were not inspected. A subscribe-only key does not by itself provide per-company/per-match privacy. Clients apply incoming payloads as match state.

Messages poll every five seconds; notification surfaces poll three endpoints every three seconds; activity polls every second. `GlobalRealtimeSync` returns null. Several live features are polling rather than push.

Recommendation: authenticated short-lived channel tokens, server-authorized subscriptions, a shared connection, versioned events, reconnect reconciliation, and backoff polling as fallback. Persist commands/results before publication; use an outbox for retryable events. Promise responsive local feedback and measured latency, not literally zero network delay.

### 14. Medium: messages and presence have user-visible correctness gaps

`api/messages/route.ts` returns the oldest 100 messages and then marks all incoming messages read, including newer messages not returned. A GET mutates read state. Use recent-message pagination and explicit read receipts through the last displayed message while the conversation is visible.

`DirectMessagePopup.tsx` lacks adequate loading/send-error handling and can remain sending after rejected fetch. Chess/TTT infer opponent presence from filled player seats. Use recent heartbeat/connection evidence with a grace period and distinguish offline, reconnecting, and active.

### 15. Medium: database setup paths drift

`scripts/apply-neon-migrations.cjs` includes lounge rank/integrity migrations that `docker-compose.yml` does not mount. Docker initialization only runs on empty volumes, not existing databases. The deployment script reapplies a file list/seeds without a migration ledger/checksum mechanism.

Recommendation: one versioned migration runner for local/staging/production, recorded application status, separate seed tasks, and a clean-database CI check. Do not run the existing seed/reset pipeline against production merely to compare environments.

## Unified design and graphical improvements

Keep the existing palette for now. Establish semantic roles for typography, spacing, surface, elevation, status, focus, motion, and sound. Board/piece colors can differ; controls and state meaning should not.

Create reusable `MatchLayout`, `PlayerCard`, `TurnIndicator`, `ConnectionStatus`, `MatchActions`, `ResultPanel`, `SpectatorBanner`, and accessible dialog primitives. Daily Mission and multiplayer should share basic controls/status language, but have different orchestration: a timed mission is not a two-player match.

### Shared match structure

- Top: game name, back destination, match mode, connection state.
- Players: consistent avatar/name/rank/side, active-turn marker, clocks where applicable.
- Center: fluid board, clear last action, unobstructed decision area.
- Secondary panel: moves/chat/spectators; collapsible below the board on smaller screens.
- Actions: consistent resign, sound, board settings, and help positions.
- Result: actual winner or draw, reason, rank delta, accepted rematch invitation, review board, and exit.
- Global messaging: one overlay owner/stack, drawers/dialogs do not cover each other or boards; consistent focus behavior.

### Chess

Retain legal-move hints and arrows. Unify board framing/piece set, improve captured-piece readability, clock hierarchy, last-move/check highlights, and review/live state. Preserve right-drag annotation and left-click clearing. Correct result/time logic first. Avoid a decorative effect that delays the clock or obscures the board.

### Connect Four

Currently renders 42 cell buttons with seven repeated column names, instant tokens, emoji player markers, and saturated blue framing. Add seven named drop controls, hover/keyboard landing preview, short token drop animation, last-move ring, winning-four line, consistent player cards, and spectator-specific winner/turn copy. Keep animation separate from the accepted board state.

### Tic-Tac-Toe

Use a fluid board instead of fixed 300/400px sizes, deliberate X/O stroke animation, winning-line treatment, quieter active-player state, named squares, visible board review after result, and a working rematch handshake. Remove misleading ratings/presence labels.

### Other surfaces

- Shared buttons/status chips/dialogs; minimum readable metadata sizes instead of 9px labels.
- One admin navigation configuration for desktop/mobile; mobile currently omits Onboarding and renames sections.
- Correct destination labels: TTT Back to Lounge currently routes to dashboard; chess Return to Dashboard routes to Lounge.
- Replace Connect Four native confirm with an accessible shared dialog. Current shared modal still needs focus trapping/restoration and dialog naming.
- Replace clickable creation-card divs with native buttons. Add keyboard board controls, live status announcements, sufficient target sizes, and reduced-motion/sound preferences.
- TTT uses `rgba(var(--primary),0.1)` while the token is hex, so that shadow color is invalid.

## Target architecture: shared infrastructure, game-specific rules

Start with a modular monolith in the existing application, not premature microservices.

`identity/organizations` → membership context and policy

`competition` → scoped seasons, rosters, eligibility, standings

`matches` → invitations, player slots, lifecycle, clocks, results, rating ledger

`games/<game>` → legal commands, rule validation, board state, renderer

`missions` → schedule, configured difficulty quotas, company trivia, content history, scoring

`social` → conversations, receipts, presence, notification delivery

`reporting` → explicitly defined aggregate metrics and exports

`platform` → data access, migration runner, event outbox, logging

The existing registry supplies labels/capability flags but does not enforce services. Define a game adapter contract: validate command, apply command, derive outcome, public snapshot, private state, spectator policy, supported features, and renderer. Common services must handle authentication, organization policy, participant locks, versions, settlement, and event delivery. Adding a game should not require rewriting lobby unions, invitation switches, and presence scans throughout the application.

Use explicit match lifecycle states: pending → active → finished, with declined/cancelled/expired terminal invitation states. Store result separately (win/draw/resign/timeout) rather than encoding winner colors into generic state. Add match revision, command idempotency key, server timestamp, and unique result/rating entries. Game-specific detail tables may remain; normalization need not be a big-bang rewrite.

## Company-first, global-later model

Introduce organizations and memberships now as a planned foundation. Start company-private by default: people, messages, departments, content, admin reports, activity, and internal competitions stay within the organization.

Later add explicit competitions with scope `company` or `inter_company`, enrolled organizations, employee/team rosters, eligibility rules, start/end dates, scoring version, and opt-in public profiles. A cross-company match should authorize its participants through that competition; do not make all people/chat/activity globally visible.

Separate company standings, personal progression, per-game skill, and inter-company season points. For fair global comparisons, use the same puzzle pack, difficulty distribution, scoring version, and timing policy within a competition. Raw scores from differently configured company missions cannot be directly compared fairly.

For differently sized employers, prefer capped rosters, equal-size teams, normalized participation, and explicit eligibility rather than total company XP. Plan repeated-opponent abuse prevention, moderation/reporting, fair disconnect rules, and forfeits before offering prizes or meaningful rankings.

## Delivery sequence and acceptance gates

1. **Make outcomes trustworthy:** authenticated/guarded transitions; both-player active-game invariant; server validation; idempotent result/rating ledger; explicit mission outcomes; rematch/clock fixes. Gate: repeat/concurrent requests cannot grant multiple results or active seats.
2. **Deliver one polished match experience:** shared shell/player/status/result/dialog primitives, then chess, Connect Four, and TTT presentation. Gate: matching controls/states at desktop, narrow mobile, keyboard, spectator, and reduced-motion settings.
3. **Make company administration credible:** metric corrections, complete invitations, non-destructive seasons, migration parity, failure/recovery handling, audit logs and export boundaries. Gate: company admin changes are visible to the correct employees and don't alter unrelated history.
4. **Pilot one workplace:** invitation → login → mission → invite → accept → match → result → rematch → reporting. Gate: real two-browser acceptance, reload/resume, disconnection, timeout, simultaneous commands, and all end reasons pass against a disposable database.
5. **Introduce company isolation:** scoped data/services/realtime with automated two-organization permission tests. Gate: no cross-company listing/message/report access without explicit competition authorization.
6. **Run opt-in inter-company seasons:** equal rules, trustworthy standings, measured latency/availability, moderation and backups restored successfully. Gate: staging pilot with multiple organizations before broad release.

Do not use lint/build success as evidence for these gates. Add automated rule/state-machine tests, database concurrency/integration tests, migration-from-empty and upgrade tests, and a small meaningful browser regression suite. Track invite delivery/accept-to-board latency, reconnect failures, failed commands, mission completion, rank settlement failures, participation and voluntary return rates. Explain participation data responsibly: gameplay metrics are not measures of employee productivity or intelligence.
