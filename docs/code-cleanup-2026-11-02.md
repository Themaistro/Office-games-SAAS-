# Code cleanup — 2 November 2026

Removed 17 compatibility re-export modules and migrated source and test imports to their canonical feature/server owners. Removed unused mock questions, duplicate chess cancellation helpers, retired Tic Tac Toe/Connect Four cancellation queries, and an obsolete generator demonstration with a broken import.

The Supabase-style PostgreSQL adapter is fully retired. Mission content queries now use explicit parameterized SQL in `content-pool-queries.ts`; batch JSON insertion preserves nested content and answer options. Both profile pages share `profile-read.ts` with descriptive operations and parameterized player IDs rather than string-built filter expressions. Relation hydration and development resets use direct PostgreSQL queries, with resets retaining transactional row locking.

Challenge components, Daily Mission, and party rooms share `onAnswer(answer, options)`. Timing belongs in `options.customTimeSpent`; the old boolean and third positional arguments are removed. Unused declarations/imports were removed, and TypeScript now enforces `noUnusedLocals` and `noUnusedParameters`. Architecture checks reject retired adapters/wrappers and obsolete answer signatures.

Validation: formatting, lint, strict TypeScript including unused declarations, architecture boundaries, source dependency cycles/client-server separation, challenge rules, 2,405 generator checks, 180 independently validated Sudoku boards, content history tests, and optimized application build passed. A database regression test verifies JSON inserts, empty results, profile/ranking reads, and actual content assembly for all 15 active game types inside a transaction that rolls back its fixtures. The regression test is included in database verification.

The final local HTTP suite also passed page/API authorization and lobby/privacy regressions, plus 1,125 requests across 5/20/50 concurrent clients with zero errors. Temporary identities and games were removed by the test.

Historical migrations/bootstrap/seed assets remain because they require dependency-aware handling; this cleanup does not discard database history. Shared question payloads and some larger UI/state components still use broad types, so this is not a claim that every type/component is maximally refined. The empty `src/lib/supabase` directory remains after machine policy rejected directory removal; no application code uses it. All changes are local.
