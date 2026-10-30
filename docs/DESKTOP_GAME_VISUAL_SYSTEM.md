# Desktop multiplayer visual system

Implemented locally on 19 October 2026. Mobile redesign is explicitly out of scope.

## Shared contract

`MatchPresentation.tsx` owns the match header, player cards, result panel, spectator notice, and rules panel. The `match-*` classes in `globals.css` own their surface, border, radius, typography, action, focus, clock, and connection-state styling.

- Indigo is the shared interaction accent. Red/yellow discs and chess-square colors retain game-rule meaning; decorative game-card colors no longer create three unrelated themes.
- All matches use a single desktop content width, heading hierarchy, back destination, button language, and player identity/rank treatment.
- Tic-Tac-Toe and Connect Four have consistent board/rules columns. Chess retains the familiar opponent–board–player arrangement and clock/moves/chat column, using the same player-card and panel primitives.
- Finished boards remain visible. Chess no longer obscures its final position with a separate full-board celebration modal. The shared result panel provides review context and Lounge/rematch actions.
- Draw offers sit in the chess side panel rather than covering the playing surface. Spectators do not receive draw-decision controls.
- Chess coordinates, legal-move hints, right-drag arrows, left-click clearing, clocks, and promotion controls are preserved.
- The Lounge uses matching game-selection cards, icon treatment, action placement, and lobby rows. Container-aware row layout prevents narrow dashboard cards from inheriting wide desktop-row assumptions.
- Metadata no longer relies on tiny uppercase game timestamps, and Connect Four displays the same Lounge-rank treatment as the other games.

## Desktop verification performed

- Browser-rendered inspection: Lounge, Tic-Tac-Toe, Connect Four spectator view, chess spectator view, resignation confirmation and resulting inline result panel.
- A real Tic-Tac-Toe move switched turns; resignation produced the expected result and LP delta with the final board visible.
- Captures in `docs/visuals/` use disposable local accounts. Those accounts and matches were removed after testing.
- TypeScript and lint-error checks passed. The existing 13-case database integration suite passed after the presentation changes.
- A complete local production build (`next build --webpack`) passed, including static generation and route/build trace collection.

## Extending the design

New games should consume these shared match primitives, not recreate navigation, player identity, reconnect copy, result screens, or confirmation controls. A game-specific board can look distinct while retaining the shared frame and state semantics. This visual pass does not certify completion of the separate organization-isolation or global realtime architecture work.

## Proposed next games — not implemented

1. Reversi: the next turn-based strategy game. Disc flipping, legal-move dots, last-move treatment, and an animated score balance offer strong graphical payoff while reusing the shared match service.
2. Battleship: a different, more graphical experience with private fleet placement and attack feedback. Build server-private player/spectator projections first; never transmit the opponent's hidden fleet through shared events.
3. Trivia Duel: the most accessible knowledge competition for coworkers. Reuse curated content, but freeze equal question packs and use server round deadlines before ranking players on speed.

For a broader office audience, prioritize Trivia Duel commercially; for the lowest-risk next extension of the current turn-based board engine, implement Reversi first. These are product-design recommendations, not claims that new games have been added.
