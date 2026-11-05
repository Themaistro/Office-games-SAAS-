# Multiplayer foundation — 5 November 2026

## Shared invariants

Server transactions own match availability, move legality, clock expiration and settlement. Browser optimism never awards points or overrides settlement. Every registered board game uses the participant locks and shared lifecycle service. Registration supplies board size/symbols/turns for snapshot validation, avoiding another game-specific synchronization implementation.

`snapshot-sync.ts` serializes authoritative reads, coalesces requests arriving during a read, invalidates reads when a mutation begins, aborts on disposal, and resolves callers per read. Continued background polling cannot hold a completed action's busy state indefinitely. `useMatchSync` binds that controller to authenticated API reads, bounded request timeouts, focus/visibility/online recovery, and realtime reconnects. Older server revisions cannot replace newer ones. This hook currently drives Tic-Tac-Toe and Connect Four.

`useMatchAction` provides one duplicate-action lock, busy state, synchronization pause/resume, error feedback and final authoritative refresh for those games. Chess retains its specialized live coordinator, now with effect-scoped cancellation and in-flight protection, immediate focus/online recovery, position-change protection against stale reads, validated realtime events and validated API snapshots.

Chess clocks use actual elapsed milliseconds and server last-move timestamps. Zero stays zero; inactive clocks stay fixed. Background timer throttling no longer makes the displayed clock run slowly. The server remains the authority on timeout outcomes.

The real API contract test exposed PostgreSQL `bigint` clock values arriving as strings. Snapshot/event parsing now normalizes numeric strings, and published chess move clocks are numeric. The initial display accepts PostgreSQL clock values as well. A zero clock triggers guarded timeout settlement with retry while the server remains authoritative.

## Verification

Recovery regressions cover overlapping reads, invalidation during a move, pause/resume, late unmount responses, retry after failure, invalid identity/board/turn/event data and elapsed/zero clocks. Real HTTP tests validate chess and Tic-Tac-Toe API snapshots, including a stored zero clock. Existing database integration tests cover cross-game acceptance races, repeated cancellation, cancellation against acceptance, idempotent settlement, duplicate moves, Connect Four and party workflows. Authentication stubs now follow both direct and published feature entry points.

These tests cover local behavior and simulated response ordering; real browser network-cut/reconnect sessions and hosted websocket soak testing are separate verification work. They do not certify zero latency or every possible failure. Future games should use the shared coordinator and action hook where their state model fits, extending registry contracts and behavior tests for genuinely new rules.
