# Timer audit — 10 November 2026

## Rules

Leaving a game does not pause the Daily Mission deadline, the active chess player's clock, or a party round deadline. A saved mission route/answers does not imply a saved allocation of unused time. Waiting board-game lobbies do not run a chess clock until activation. Completed results must remain immutable and cannot pay rewards twice.

Server timestamps decide mission and multiplayer eligibility. A visible countdown is feedback, not permission to submit after expiry. There is no requirement for a background process to decrement a database field every second: elapsed time is derived from timestamps. If every player leaves, settlement/reveal may be reconciled on the next server request rather than by a continuous worker; the deadline is not extended.

## Bugs corrected locally

1. Individual countdown games used callback counts, granting extra displayed time when the browser throttled timers. All interval-based challenge countdowns now use a common deadline clock, including trivia, logic, math, missing letters, odd object, Stroop, typing, card match, memory and sequence phases.
2. A resumed mission could reset an individual challenge's clock in the same tab. Start time is now retained by session-question identity in session storage, including preparation/preview phases. A different attempt does not inherit that clock. Overall mission deadlines were already persisted server-side.
3. Delayed preparation callbacks could start a new full play period after a sleeping tab resumed. Preparation and play now share the original start with explicit phase offsets. Sequence hints no longer grant extra time by stopping its play countdown.
4. Default answer telemetry previously accumulated time by reusable question ID and omitted time spent away. It now uses the current session-question start. Typing/sequence/card-match telemetry also uses the same elapsed countdown shown to the player.
5. An answer validated just before expiry could wait on database work and save after settlement or expiry. Answer persistence now locks the mission in the same order as settlement/hints, checks its current status and database deadline at the write, and rejects out-of-order/repeated saves. Deadline checks use `clock_timestamp()` after lock acquisition rather than a transaction-start timestamp.
6. Delayed callbacks from a discarded question could reach the next question's answer handler. Callbacks are now tied to the originating attempt and ignored after unmount or an attempt change.
7. Reaction clicks could race the timeout callback. A local settlement guard prevents duplicate handling, and a click at/after the actual target window is treated as missed even if its timeout callback was delayed. Repeated start clicks cannot schedule multiple flash sequences.
8. The cooldown rounded down, showing an unlock up to one second early. It now rounds up and catches up on focus/visibility changes.

## Automated evidence

| Scenario | Evidence |
| --- | --- |
| Exact deadline, one millisecond before, after sleep, no negative countdown | `test-timer-boundaries.cjs` |
| Resume same attempt; isolate different attempts; invalid/blocked storage | `test-timer-boundaries.cjs` |
| Sleep across preparation and most/all of play | Shared phase deadline boundary tests |
| Early mission completion/expiry rejected | Finisher boundary tests and match-integrity tests |
| Final answer already saved when expiry arrives | Finisher completes rather than discarding saved results |
| Answer waits for a lock while session is settled | Real PostgreSQL concurrency test rejects the write |
| Answer waits for a lock across the deadline | Real PostgreSQL concurrency test rejects the write |
| Simultaneous answer submissions | Exactly one database write succeeds |
| Repeated mission settlement | Integrity tests verify one XP award/activity |
| Browser recovery and elapsed chess clock | Match-recovery tests |
| Checkmate submitted after clock expiry | Match-integrity test gives timeout precedence |
| Party deadline/reveal and late-answer rejection | Party integration tests |
| Duplicate party answers and final settlement | Party integration tests |

The new timer suites run within `verify` (database races require `--database`). Test accounts and fixtures are disposable and cleaned after each run.

## Scope limits

These are automated deadline, application and database tests, plus source review. They are not a claim that every browser/device/network scenario has been exercised. Real-browser sleep/wake and multi-device display checks remain useful follow-up testing.

The individual solo-challenge resume timestamp is browser-tab storage, not a server-issued per-question deadline. Opening a new tab/device or clearing/denying storage can reset that individual display; it does **not** reset the server-held overall mission deadline. Tamper-resistant per-question timing across devices would require server-side attempt activation/deadlines. Client-reported interaction timing is not proof against cheating. This audit does not claim otherwise.

No push, hosted deployment or hosted database change was performed for these timer fixes.
