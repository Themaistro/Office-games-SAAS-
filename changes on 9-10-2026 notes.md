# Changes on 9-10-2026 notes

## Product direction and user journey

- Repositioned the product around a focused daily Office Games habit: a short 10–15 minute mission followed by optional social play.
- Clarified the product hierarchy:
  - Office Games is the product.
  - Daily Mission is the structured solo experience.
  - Office Lounge is the multiplayer and social experience.
- Updated the landing page and dashboard language to emphasize team connection, healthy short breaks, participation, XP, streaks, and team engagement rather than only listing games.
- Replaced fake leaderboard/demo data with honest empty states and real database-backed content.
- Added a journey-oriented Office World entry experience so the dashboard begins to feel like a game hub instead of a conventional SaaS admin screen.
- Added the first journey route with a Daily Mission path, mission stops, progress language, and a separate Office Lounge destination.

## Daily Mission and gameplay improvements

- Improved the central Game Engine feedback loop.
- Added max-combo tracking and clearer live XP feedback.
- Progress now advances after answer feedback rather than before the player has seen the result.
- Updated completion language from “Time’s Up!” to “Mission Complete!” where appropriate.
- Added a clearer mission completion summary with score, XP, time, and combo feedback.
- Server-side answer correctness is now authoritative. Client-provided correctness can no longer override the result shown to the player or the score calculation.
- Added validation for answer timing and bounded timing input to prevent invalid values.
- Added server-side validation for skipped answers, hint usage, accuracy, mistakes, speed bonuses, and combo limits.
- Added conditional answer updates so duplicate submissions and double-click races are rejected safely.
- Added conditional session completion so XP and streak rewards cannot be awarded twice from repeated requests.
- Updated daily-session date handling to respect the player’s timezone instead of always using UTC.
- Added a one-year per-player question history system to prevent repeated questions.
- Question selection now prefers questions the current player has not seen in the previous year.
- The freshness preference is applied per game so one small question bank does not remove an entire game from a mission.
- Added a safe fallback when a game has exhausted its unseen question pool.

## Question history database work

- Added `db/migrations/migration8_question_history.sql`.
- Added the `question_history` table with player, question, session, and served timestamp fields.
- Added indexes for efficient per-player history lookups.
- Added a unique session/question index to prevent duplicate history rows for a single session.
- Added RLS policies so players can only read and insert their own history records.
- Added a one-year cleanup function for old history records.

## Multiplayer and Office Lounge

- Improved the unified multiplayer lobby so Chess and Tic-Tac-Toe appear together in one live-games surface.
- Added live realtime refreshes for lobby changes.
- Added clearer lobby states for open games, active games, returning players, spectators, and creators.
- Added Connect Four as a third multiplayer game.
- Connect Four includes:
  - Server-authoritative turns.
  - Server-side column validation.
  - Full-column validation.
  - Four-in-a-row detection in all directions.
  - Draw detection.
  - Optimistic concurrency checks to reject stale simultaneous moves.
  - Realtime board updates.
  - Create, join, cancel, and live-match flows.
- Added a responsive Connect Four board with player indicators, status states, and match completion feedback.
- Added Connect Four to the shared Office Lounge lobby and game creation area.
- Added `db/migrations/migration9_connect_four.sql` with the game table, indexes, and RLS policies.
- Connect Four was adjusted to use the authenticated user session with strict RLS rather than depending on the invalid server-role key currently configured locally.

## Security and data integrity

- Removed unauthenticated debug and wipe API routes.
- Converted destructive reset endpoints away from browser GET execution; reset operations now require POST.
- Hardened Tic-Tac-Toe move validation and stale-state protection.
- Hardened Chess challenge, decline, move-history, PGN, FEN, turn, and game-state validation.
- Added optimistic state conditions to multiplayer updates to prevent double moves and stale writes.
- Restricted profile updates to approved user-editable fields through the security migration.
- Added ownership policies for session questions and session data.
- Added runtime schema reconciliation in `db/migrations/migration7_runtime_schema_reconciliation.sql` for fields already used by the application for session completion, XP, time tracking, and activity.
- Moved player progress updates to the server-side admin path after ownership has been verified.
- Added a presence error boundary so realtime failures do not create unhandled browser rejections or take down the dashboard.
- Confirmed that the local service-role key is invalid; the new Connect Four flow does not depend on it, but the key should still be rotated and replaced before production.

## Onboarding and admin experience

- Added a real admin roster invitation action instead of a simulated import result.
- Added CSV validation for file size, row count, required fields, email format, duplicate rows, and corporate-domain restrictions.
- Added Supabase email invitations through the server-side admin client.
- Added invited, failed, and skipped result reporting.
- Improved destructive-action confirmation language and admin safety checks.

## UI and UX improvements

- Updated the brand language to consistently use Office Games, Daily Mission, and Office Lounge.
- Improved dashboard mission copy and the first-time product framing.
- Added responsive, visual multiplayer game cards and lobby actions.
- Added clearer active/inactive/locked/social journey states.
- Added mobile-friendly layouts for the journey hub and Connect Four board.
- Added accessible labels for Connect Four columns and clearer game status messaging.
- Added a cleaner Office World journey board after removing the earlier oversized decorative door concept.
- The current direction uses a focused mission hero, a compact mission route, and a secondary social-lounge destination.

## Build and validation

- TypeScript validation passes with `npx tsc --noEmit`.
- Production build passes with `npm run build` after the gameplay and journey changes.
- Lint was run with the existing repository configuration; the prior broad lint debt was reviewed separately from the new work.
- Local development server is running at `http://localhost:3000`.

## Required Supabase migrations

Apply these migrations in order in the Supabase SQL Editor:

1. `db/migrations/migration7_runtime_schema_reconciliation.sql`
2. `db/migrations/migration8_question_history.sql`
3. `db/migrations/migration9_connect_four.sql`

The local `.env.local` file is intentionally ignored and must never be committed. Rotate any Supabase service-role key that has been exposed and replace it locally before production deployment.
