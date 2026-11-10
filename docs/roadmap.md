# Office Games roadmap

This is a direction for development, not a release-date commitment. See the [documentation hub](index.md) for implementation details and dated evidence.

## Current foundation

- Feature-owned domain, application and persistence modules with automated dependency checks.
- Configurable Daily Missions and shared content/history selection.
- Board-game invitations, spectators, settlement, recovery and rematch lifecycle.
- Trivia and Mixed Challenges party rooms with server-managed rounds and answers.
- Administration, messaging, company identity and versioned database tooling.

## Next validation priorities

- Give group-room host changes, late joins, disconnects, deadlines and scoring the same depth of lifecycle review as board games.
- Add a group “Play again” flow with individual accept/decline states and minimum-player rules.
- Run real multi-browser disconnect/reconnect sessions alongside the automated regression suites.
- Continue content fact-checking and genuine player difficulty evaluation.

## Longer-term direction

- Extend the game catalog through shared contracts and reusable presentation.
- Measure hosted capacity and recovery before expanding deployment scale.
- Introduce cross-company competition through an explicit integration boundary. Current company isolation is one database per installation.

Propose a focused improvement through the repository's feature-request form. Include the player/company need and the scenarios that would demonstrate success.
