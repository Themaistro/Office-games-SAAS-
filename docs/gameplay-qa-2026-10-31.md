# Local gameplay audit — 2026-10-31

## Accounts and isolation

Four accounts were created: `qa-gameplay-a@office.test` through `qa-gameplay-d@office.test`. They are labelled Local QA. A and B have synthetic coverage fixtures; those questions are inactive in normal content pools. C and D exercised the actual mission generator without replacing the administrator's settings. The solo difficulty report excludes synthetic fixture questions. These attempts must not be presented as human difficulty data.

## Bugs fixed

1. GameEngine rebuilt the question object on every render. Several game initialization effects treated it as a new question, resetting boards and timers. The active question is memoized; initialization follows question identity rather than the object reference.
2. GameEngine recreated its answer callback on each clock render. Child effects could restart their intervals before counting down. Children now receive a stable callback that delegates to the current handler.
3. Restoring an all-answered session before final settlement could show the first question again. PlayPage now settles such sessions and provides a save retry on failure.
4. Answer submissions could target a later unanswered challenge. The server now requires previous challenges to be completed.
5. Unsupported games could consume hints through direct calls. The server now rejects them and rejects hints for later questions.
6. Saved combo state was lost on refresh. Current and maximum combos are reconstructed from recorded outcomes.
7. Sudoku cells were clickable divs without meaningful keyboard-accessible controls. They are named buttons with row/column labels. Sudoku initialization now also tracks question ID.
8. Hidden sequence tiles had no useful accessible names. Tile positions now have labels without exposing hidden values.
9. The card-match timer displayed 00:60. It now formats minutes and seconds correctly.
10. Login copy claimed 3,000+ Trivia questions without supporting inventory. The unverified number was removed. Dashboard copy now describes a personal route rather than an office-wide first-player route.
11. Reaction early-click feedback blamed slow reactions, and Odd Object feedback conflated wrong selections with timeouts. Those failure messages now distinguish the recorded action.

## Automated coverage

- `test-gameplay-matrix.cjs`: 237 PostgreSQL/server-action scenarios across 15 Daily Mission types and three difficulties. Correct answers, forged wrong answers, timeout markers, skips, concurrent duplicate submissions, ownership, question order, unsupported hints and the three-hint budget.
- `test-mission-start.cjs`: two real generated missions using current configuration (11 game types, 33 rounds), concurrent-start reuse, exact per-difficulty round counts, hidden answers and stable resume.
- Existing match integrity suite: 13 checks including concurrency, clocks, checkmate, resignation, settlement, invite replacement, mission ownership and expiry.
- Connect Four integrity suite: nine scenarios covering move bounds, spectator rejection, horizontal/vertical/both-diagonal wins, draw, full columns, duplicate moves and resignation settlement.
- Existing party suite: 18 checks including privacy, capacity, spectator restrictions, shared packs, duplicate answers, reveal/deadline transitions, forfeits and immutable results.
- Existing invitation suite: three checks including wrong email, expiration and concurrent consumption.
- Existing challenge-rule suite: answer validation and forged-interaction checks, with 60 deterministic Sudoku boards.

## Browser coverage

Chrome was used to sign in, open Daily Mission and play the fixture route. All 45 game/difficulty screens rendered. Easy-level flows exercised card pairs, multiple-choice answers, logic hints and timeout, target arithmetic, memory recall, mental-math auto-submit, Odd Object, reaction success, sequence recall, exact typing, Stroop, Sudoku, Trivia and both word games.

Sudoku was solved from its visible clues through the UI, including an intentionally wrong digit, keyboard entry and a hint. The hint filled a cell without resetting the board. The completed board was accepted by the server.

Medium and hard screens were primarily checked through render/skip/next transitions, with an additional hard unscramble completion. This is not a claim that every medium/hard interaction was manually solved in the browser.

Refresh preserved answered-question position, earned XP and hint usage. After the final answer was saved, reloading before pressing Finish successfully recovered and settled the mission. Database verification showed answer XP 430, session XP 430, profile XP 430, one completed game and one mission activity event.

Development hot refresh produced a temporary React dependency-array-size warning while hook dependencies were being edited. A full reload cleared it; it was not counted as a production failure. Development hot refresh can also reset local component state while props still contain the initially loaded question list; saved progress was recovered by a full reload.

## Limits

This is a finite, repeatable QA pass, not proof that every possible scenario is bug-free. It does not establish representative human difficulty, accessibility for every assistive technology, multi-device real-time latency, or a complete individual factual review of the Trivia bank. Browser network-failure recovery and every medium/hard interaction still require further targeted coverage. No production deployment was performed.
