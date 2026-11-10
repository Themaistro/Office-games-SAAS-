# API and database request budget — 10 November 2026

## Implemented locally

Repeated requests cost more than response bandwidth: each authenticated API call can require a session lookup and feature queries. These changes reduce request ownership and database work instead of only compressing the response.

| Surface                             | Current behavior                                                                                                                                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sent invitations                    | One root provider serves all challenge buttons and sender navigation. Idle recovery reads every 15 seconds; pending invitations receive a shared one-second refresh. Sending/cancelling and opening a menu trigger fresh reads. There is no separate timer per player button.                   |
| Incoming messages and challenges    | Existing shared three-second checks remain responsive. Contacts reuse the same unread-message source as notifications rather than adding another one. Private data is not cached on the server.                                                                                                 |
| Contact directory                   | Loads while open, not continually behind the launcher. Opening it obtains current data. Presence and unread counts keep the closed launcher useful.                                                                                                                                             |
| Presence                            | One POST returns the online snapshot; the old separate GET is no longer needed by the provider. Ordinary authenticated page navigation no longer restarts its heartbeat. Hidden tabs skip work; focus refreshes. Server heartbeat writes are throttled to one update per player per 15 seconds. |
| Activity                            | Both widgets share a browser read. The server shares a two-second, company-keyed snapshot and concurrent loader per worker. Authentication still runs before cache access. The cache is bounded and does not retain errors.                                                                     |
| Lobbies, party listings and history | Shared request owners add hidden-tab suspension, coalescing, cancellation and recovery instead of independent interval fetches. History uses a 15-second cadence. Active gameplay remains on its dedicated synchronization path.                                                                |
| Open conversations                  | Poll only when expanded/visible; read receipts contain only unread incoming message IDs. Idle open chats no longer repeatedly PATCH already-read messages or cause repeated notification-refresh events. Minimized chats retain the global unread check.                                        |
| Failures and mutations              | Shared polling backs off after failures, capped around one minute plus jitter, and recovers on focus/online. Mutation invalidation discards reads started before the mutation and follows them with a fresh request.                                                                            |

The earlier authoritative game validation, transactions, company checks, bounded pool and database timeouts remain. No caching is added to authentication, permission checks, moves, scoring, acceptance, private messages or read receipts.

## Request arithmetic

For five visible challenge buttons, the old per-button three-second timers represented about 100 invitation requests per minute before sender navigation. The shared source now needs about four per minute while idle, excluding initial load, focus and explicit actions. While waiting for acceptance it refreshes approximately 60–64 times per minute in total, regardless of button count. This is nominal cadence arithmetic, not a captured real-browser traffic measurement or a hosting-bill guarantee.

Presence's steady heartbeat falls from four HTTP requests/minute to two. A closed contacts directory falls from two directory requests/minute to zero. An expanded conversation without new incoming messages no longer needs periodic read-receipt writes.

For shared activity, concurrent requests to one worker within the two-second freshness window reuse one feed query. Unit tests verify that 100 simultaneous same-company calls invoke the loader once. Those calls still require their own authentication checks; this does not mean 100 HTTP requests perform only one total database query.

## Cache scope and future scale

The activity cache is deliberately small, process-local and short-lived. Multiple Vercel instances each have their own cache; cold starts lose it. It is not a global cache or a durable event bus. A shared cache/pubsub service can be added behind this read boundary when measured traffic justifies the infrastructure. Do not put sensitive results into a company-only key.

Polling still consumes resources. User-scoped realtime invalidation for messages/invitations is a later improvement if usage warrants it: authorized private channels, post-commit delivery and reconnect snapshots must be designed together. Reducing polling blindly would risk the notification problems already encountered. The current shared checks preserve that behavior without a new external service.

## Verification

Regression checks cover shared in-flight reads, hidden/unmounted consumers, post-mutation stale-response rejection, cache concurrency, TTL expiry, company key isolation, bounded entries and failure retry. The production HTTP suite checks that cached activity remains unauthorized without a valid session, along with messaging privacy, invitation visibility, read receipts and player/admin routes. Full verification/build and local HTTP results are recorded with this change; automated HTTP load does not simulate all browser event ordering or establish a production player limit.

`npm run verify -- --database --build` passed, including 317 source modules in the structure check. The subsequent HTTP suite completed 1,125 requests without errors; its 50-client stage observed 96 ms p95. This run verifies behavior under a bounded workload, not a latency improvement over earlier runs on the same development machine. Request reductions above follow from eliminated timers/shared ownership; cache loader reduction is covered by a separate concurrent test.

All changes are local. Existing migrations and credentials are unchanged by this request-optimization pass. No GitHub push, hosted database change or Vercel deployment is included.
