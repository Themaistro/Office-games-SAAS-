# Contributing to Office Games

Start with the [README](README.md), [development setup](docs/development.md) and [architecture guide](docs/architecture.md). For a new game, follow [Adding a game](docs/adding-a-game.md).

## Make a focused change

1. Create a branch from `main` with a descriptive name, such as `fix/rematch-expiry`.
2. Describe the player/admin problem and expected behavior before changing code. Include both participants when a multiplayer flow is involved.
3. Keep the change in its owning feature. Put rules in `domain`, workflows and ports in `application`, and persistence/external adapters in `infrastructure`.
4. Reuse shared game lifecycle, invitations, settlement, synchronization and UI components. Pages/components/hooks import published feature entry points rather than private infrastructure.
5. Add a migration for schema changes. Never rewrite a checksum-protected migration that has already been applied.
6. Add regression coverage for changed rules and important failure cases. Avoid tests that only repeat the implementation.

## Before opening a pull request

```bash
npm run verify
```

For database, gameplay, authentication or migration changes, also run:

```bash
npm run verify -- --database --build
npm run test:http
```

Use an isolated local database for fixture tests. Never point QA tools at a company production database. Include the commands that ran and any remaining manual checks in the pull request.

For visual changes, check both themes and include before/after screenshots without real player data. For multiplayer changes, cover both players, spectators, duplicate actions, reconnects, deadlines and final results as applicable.

## Pull request scope

Explain what changed, the user-visible result and how it was verified. Keep unrelated formatting and refactoring out of a behavior fix when practical. Use clear commit subjects such as `fix: restore sender navigation after rematch acceptance`.

Do not commit `.env.local`, access tokens, database exports, test-session cookies or generated files from `output/`. [.env.example](.env.example) contains development placeholders only. See [Security reporting](SECURITY.md) for sensitive findings.

No open-source license has been selected. Do not add or change licensing terms without the repository owner's decision.
