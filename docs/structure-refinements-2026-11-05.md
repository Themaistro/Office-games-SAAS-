# Structure refinements — 5 November 2026

Pages, components and hooks now access infrastructure through explicit feature entry points. Three `public-server.ts` files expose named identity, administration and lounge operations; existing `composition.ts` files continue to expose wired workflows and query namespaces. Architecture verification rejects direct presentation imports into feature infrastructure and still verifies dependency cycles and client/server separation.

`Question.content` now uses `QuestionContent` rather than `any`, and options use `string[]`. Stored mission content/options are validated before presentation. `ChallengePayloads` and `QuestionFor` let new components require their own fields. The common payload retains optional fields for existing renderers; converting every existing component to a discriminated per-game union remains an incremental refinement, not a completed claim.

`useInvitationActions` owns invitation acceptance/decline and interruption confirmation. The notification component consumes its handlers and state. Existing game/feedback rendering is already separated from mission orchestration. Large chess/profile presentation components remain candidates for further extraction when their behavior changes.

`adding-a-game.md` describes placement, payload contracts, generation, server validation/scoring, timing, rounds/history, invitations, spectators, settlement and required verification. Generated reports under `output/` are ignored; environment files remain ignored.

Validation passed: formatting, lint, strict/unused TypeScript checks, 283-module structure check, architecture rules, invalid/valid question contract tests, gameplay rules, 2,405 generator checks, 180 independent Sudoku validations, content history checks and optimized build. Database regression assembled all 15 active games, read their validated playable questions with answers withheld, and rolled back its fixtures. Final HTTP checks passed authorization/lobby/privacy regressions and 1,125 requests with zero errors. These are local checks.

The accumulated implementation and its checks are saved as a local baseline commit; documentation is a separate commit. This preserves the earlier uncommitted work together rather than claiming artificial feature-by-feature history. No remote push or deployment was performed.
