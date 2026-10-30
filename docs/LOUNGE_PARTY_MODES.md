# Lounge party modes

Local implementation: Trivia Duel, Trivia Group, Mixed Challenges Duel, and Mixed Challenges Group.

## Rules

- Duel seats two players; group seats up to twelve. The host starts with at least two joined players.
- Public rooms are discoverable; private rooms require invitations. Hosts can cancel pending invitations.
- All players receive the same frozen question pack. Mixed mode selects supported Daily Mission game types, respecting disabled types/difficulty quotas, without consuming solo attempts.
- The first round has a shared five-second countdown. Server deadlines close rounds, followed by a six-second reveal. Room requests reconcile deadlines; no client controls advancement.
- Correct answers earn 100 points plus up to 20 speed points. Only server-validated answers count. One answer per player per round.
- Current answers and correctness remain private until the round closes. Spectators see the shared stimulus, not another player's private inputs or future answers.
- Leaving an active room resigns the seat. Accepting a board-game invitation with confirmation forfeits the old seat atomically. An active party blocks starting a separate match or solo mission.
- Points are practice-only: no Lounge LP, XP, streak, or solo history changes. Equal score and accuracy share first place.
- Waiting rooms expire after thirty minutes. Inactive live rooms expire after two hours.
- A player can occupy only one waiting room. Finished results are immutable; leaving/reviewing them cannot change the winner or roster.
- Round-close windows account for challenge-specific preparation/play timers and a small delivery allowance. The challenge's own interaction limit still applies. The UI distinguishes round close, next round, and final standings countdowns.

## Architecture

Party contracts/service are separate from the two-seat board-game registry. Room, roster, round, answer, invitation, and spectator records have dedicated tables. Profile identity locks serialize cross-mode activation; room locks serialize submissions and phase changes.

Snapshots expose only the current round. Realtime uses authorized room channels with polling fallback; changes trigger authoritative snapshot refreshes. Clients retain question identity across refreshes to avoid restarting memory games.

Apply runtime migrations 24 and 25 before enabling these routes on another database. This work has only been applied locally; no production deployment is included.

## Verification

- `node scripts/test-parties.cjs`: access protection, simultaneous-round privacy, duplicate scoring, deadlines, cross-mode exclusion/replacement, and mixed packs.
- `node scripts/test-match-integrity.cjs`: existing board and solo integrity regression checks.
- Browser smoke test: create room, second fixture player joins, host starts, synchronized question, answer saved while other player is thinking.

## Follow-up local audit

Regression coverage expanded to 18 party scenarios: multiple waiting seats, a twelve-seat race, immutable finished results, own-answer visibility, expired/reissued invitations, preserving submitted points when resigning or switching to a board match, and revealing actual generated mental-math answers. Shared contract tests cover coding prompts and interaction windows.

Fixed unstable answer callbacks that could continually restart child timers; polling no longer overlaps on slow connections. Native challenge renderers keep stable question identity. Coding content is selected only when a playable multiple-choice prompt exists. Company questions require valid options/answer data before insertion.

UI improvements include wrapping lobby controls, saved-choice highlighting without correctness leakage, ties sharing scoreboard places, no-points results, success-tone invitations, contextual performance feedback, and final-round countdown wording.

Notification polls now preserve existing data on network failures instead of raising unhandled fetch errors. Failed declines keep the pending invitation and show actionable feedback. No live-service outage or offline browser emulation was performed; this fix was prompted by the observed localhost-restart failure and checked by lint, TypeScript, and build.

Browser coverage includes private invite bubble delivery and acceptance, sender accepted-state display, Trivia answer/reveal/scoring, resignation confirmation and return, and a Mixed Group timer smoke test. This is not a claim that every content-bank question has been fact-checked or that every Daily Mission renderer has had an exhaustive browser playthrough. Only the currently active game types can be exercised against the local bank; others retain shared validator/contract coverage.

Company tenancy and inter-company competition are not introduced by this feature. Existing platform access boundaries still apply.
