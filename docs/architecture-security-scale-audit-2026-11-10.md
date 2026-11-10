# Architecture, security and scaling audit — 10 November 2026

This is the initial audit record. See [local remediation and verification](security-scale-remediation-2026-11-10.md) for the subsequent fixes and remaining validation boundaries.

## Assessment

The project has a useful modular-monolith foundation, but passing structure tests does not mean all workflows follow those boundaries or that the system is ready for large concurrent play. Retain the feature modules, shared PostgreSQL transaction context, authoritative game rules and common multiplayer lifecycle. Improve the hot paths and security boundaries incrementally rather than introduce microservices.

This review examined local source and configuration. It ran regression tests against the local database and a local production server. It did not inspect hosted credentials, certify penetration resistance, test a large historical dataset or exercise real multi-browser websocket failure scenarios. Findings below are source-confirmed unless explicitly described as a local configuration observation or a risk requiring measurement. No application fixes or production changes were made in this audit.

## Verification performed

- `npm run verify`: formatting, lint, TypeScript, dependency boundaries, gameplay/content and recovery contracts passed. The structure check covered 300 source modules and found no dependency cycles, UI database calls, server modules entering client imports or type-check bypasses.
- `npm run verify -- --database`: passed, including 48 owned public tables, 55 foreign keys, transaction/lock cleanup, mission configuration, 15 match integrity cases, 34 rematch cases, nine Connect Four cases, invitations and 18 party cases. Migration runner reported all current migrations unchanged.
- `npm run build`: passed.
- `npm run test:http`: 1,125 requests, zero errors. At 50 concurrent clients, 750 requests had 87 ms p95 and 100 ms p99. This bounded read workload is not a live chess, connection-fan-out or sustained capacity result. Temporary fixtures were removed by the suite.
- `npm audit --omit=dev --json`: zero reported production dependency advisories at review time. This does not detect application authorization flaws.
- Local database observations: four profiles, four sessions, no expired sessions and six activity events. This dataset is too small to validate historical-query performance. The current connection role is a superuser; database statement, lock and idle-in-transaction timeouts are all zero.

## Prioritized findings

### 1. Authentication lacks abuse controls — high priority

[Login](../src/app/login/actions.ts) performs password comparison without attempt throttling; [signup](../src/app/register/actions.ts) hashes passwords without a shared registration throttle. An unknown account skips bcrypt entirely, whereas an existing account performs it, introducing a potential account-existence timing signal. There is no application rate-limit implementation in the inspected source.

Introduce shared, atomic attempt limits across application instances, account-oriented login throttling with a separate network-level abuse budget, bounded registration requests and a consistent password-comparison path. Do not use a process-local map as the only limiter when deploying multiple workers. Preserve generic login errors and ensure throttling cannot permanently lock another user's account. Test repeated failures, success/recovery, concurrency and multiple workers. External hosting protections were not evaluated. Reference: [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### 2. Local runtime database credential has excessive privileges — high priority

The local application connection can bypass RLS, create databases/roles and administer the database. The existing [runtime-role installer](../scripts/provision-runtime-role.cjs) is already designed to create a restricted server role, so use that boundary instead of designing another adapter. Keep migration credentials separate. Check equivalent hosted privileges separately; this review does not establish which role production uses.

The restricted role deliberately has trusted-server access to company records; its RLS policy is not per-player authorization. Server ownership/role checks remain essential. Test normal workflows and denied DDL/metadata mutations using the actual runtime credential before switching it.

### 3. Challenge reads perform uncoordinated company-wide expiry writes — high priority

[The challenges GET handler](../src/app/api/challenges/route.ts) selects expired waiting games across the company, inserts expiry events in loops, then deletes expired games through separate queries. Every receiving client's poll repeats these scans even when no invitation belongs to that user. Two concurrent readers can both select the same expired record before either deletes it; this path does not atomically claim rows or coordinate with participant lifecycle locks.

Move expiry into a Lounge application operation with atomic claiming/deletion and event recording in one transaction, using the same concurrency discipline as acceptance/cancellation. Run cleanup through bounded scheduled work or a throttled shared operation, rather than every reader. Reads must still hide expired invitations even when cleanup is delayed. Test overlapping cleanup, acceptance versus expiry, rollback and exactly one terminal history entry.

### 4. Chess polling remains a major load multiplier — high priority for scale

[ChessBoardClient](../src/app/dashboard/chess/[id]/ChessBoardClient.tsx) fetches every 200 ms while active even when realtime delivery works. [The snapshot endpoint](../src/app/api/chess/[id]/route.ts) performs authentication plus board, spectators, events, presence and result reads; spectator requests also write presence. Each visible client can generate up to five snapshot requests per second. For illustration, 100 active viewers could generate about 500 requests/second before global UI polling; this is a request-rate estimate, not a measured capacity limit.

Make realtime connection health drive adaptive recovery polling, retain immediate initial/focus/reconnect snapshots and keep clocks local between authoritative updates. Separate spectator heartbeat cadence from snapshot reads. Measure moves and clock correctness under dropped events before reducing recovery frequency. Do not remove fallback just to reduce requests.

### 5. No shared browser-origin policy for API writes — medium priority

[The API wrapper](../src/server/http/api.ts) standardizes errors and caching but does not validate mutation origins. Message, presence, challenge and reset handlers do not provide a common Origin/Fetch Metadata check. Server Actions have framework protections, but ordinary route handlers need their own policy. The existing HttpOnly, SameSite=Lax cookie provides useful protection; this is a defense-in-depth gap, not a demonstrated cross-site exploit.

Introduce one tested policy for cookie-authenticated unsafe API methods, preserving valid local/hosted same-origin requests and explicitly handling missing headers, trusted proxies and any intentional non-browser clients. Do not trust arbitrary forwarded host headers. Reference: [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

### 6. Transport input validation is inconsistent — medium priority

[Login](../src/app/login/actions.ts) casts FormData fields to strings then calls `.trim()` without validating their runtime type. Missing fields or file-valued inputs can throw instead of producing a controlled validation response. Signup also trusts casts and has no upper password/email bound; bcrypt has a byte-length limitation that deserves an explicit policy. [Profile updates](../src/app/profile/actions.ts) validate department membership but do not consistently bound or validate the name/avatar URL at the server boundary.

Use reusable, feature-owned runtime parsers with explicit length/type limits and canonical values. Validate before database reads or expensive password work. Define allowed avatar schemes and the intended handling of external image URLs. Cover missing fields, files, objects, whitespace, Unicode and oversized input. Do not change existing test passwords as part of an audit.

### 7. Missing profiles are treated as active identities — medium priority

[Session lookup](../src/features/identity/infrastructure/session-identity.ts) left-joins profiles and uses `COALESCE(p.is_active,true)`; [login lookup](../src/features/identity/infrastructure/login-actions-queries.ts) makes the same default. A user row without a profile can authenticate, although many features require a complete employee/admin profile. This is an inconsistent fail-open identity boundary, not an observed administrator privilege escalation.

Require an existing active profile for authenticated application identity, define any onboarding exception explicitly and test orphaned/inactive/deleted profiles. Keep role checks authoritative on the server.

### 8. Independent UI polling repeats requests and can overlap — medium priority

[GlobalRealtimeSync](../src/components/GlobalRealtimeSync.tsx) checks sent invites every second; [NotificationBellClient](../src/components/layout/NotificationBellClient.tsx) checks three endpoints every three seconds, including history while closed. The dashboard's online widget and live activity feed independently fetch `/api/activity` every five seconds. Several loops lack abort, in-flight coalescing or hidden-tab suspension, unlike the shared match recovery controller.

Provide one authenticated social snapshot/query owner, share subscriptions, fetch history on demand and apply cancellation, visibility handling and jittered recovery. Keep unread state server-authoritative. Verify remounts, slow networks, concurrent incoming messages/invites and logout cleanup so performance changes do not revive duplicate popups or lost bubbles.

### 9. Activity reads grow with history — medium priority

[The activity query](../src/features/reporting/infrastructure/api-activity-route-queries.ts) combines the complete event feed, completed missions, three game histories and party results before a final newest-30 limit. It includes anti-joins against event metadata and correlated party winner aggregation. A small final result does not imply a bounded amount of database work. No large-history query plan was measured here.

First gather `EXPLAIN (ANALYZE, BUFFERS)` on a disposable representative dataset. Bound each indexed source before merging or maintain an append-only activity projection through transactional events/outbox processing, with deduplication and a backfill strategy. Do not add speculative indexes without plans or drop compatibility fallbacks before projection completeness is established.

### 10. Database timeout, failure cleanup and visibility need hardening — medium priority

[Connection management](../src/server/database/connection.ts) has a bounded shared pool, connection timeout, transaction context and tested lock release. However, it has no configured statement/lock/idle-transaction limits; those settings are also zero locally. A stalled database operation can occupy a pool connection indefinitely. General transaction rollback failures can mask the original error, and release does not explicitly discard a client after failed rollback as the dedicated lock helper does.

Introduce configurable, workload-appropriate server-side limits and failure-path tests. Preserve original errors, discard uncertain connections and measure pool wait/transaction durations and queue length. Account for every deployed instance: ten connections per worker is not ten connections across the whole deployment. Verify behavior with the intended Neon/pooling configuration instead of assuming local PostgreSQL timings transfer.

### 11. Some workflows still live in presentation adapters — medium priority for maintenance

Architecture tests correctly reject SQL in UI/routes and direct infrastructure imports. They cannot establish semantic separation: login/signup orchestration and the challenge expiry workflow still live in action/route files; several composition modules expose query namespaces instead of application use cases. Generic `QueryResultRow` and positional `unknown[]` interfaces allow callers to declare shapes the query does not guarantee. Large files remain, including a 1,233-line chess client and two roughly 700-line profile pages.

Extract authentication and invitation workflows first because they also carry security/concurrency rules. Replace opaque parameter arrays incrementally with named inputs and concrete result types at feature boundaries. Separate chess synchronization, interactions and presentation; reuse profile sections rather than duplicate orchestration. Keep infrastructure invariants close to their transactions and avoid creating layers that only rename a function.

### 12. Authentication lifecycle policy needs explicit company decisions — medium priority

Signup permits registration without an invitation and [account creation](../src/features/identity/infrastructure/authentication.ts) immediately sets `email_verified_at=now()` without an email-verification flow. Registration only enforces a six-character minimum. Sessions have a 30-day expiry, but no expired-session maintenance or session-cap policy was found in runtime code. These are not proof of an exploit, but they matter for a company product.

Choose open registration versus verified company-domain/invite-only registration. Record actual verification truthfully. Define password, administrator reauthentication and session revocation/retention policies. Test deactivation/reactivation and privilege changes, including whether old sessions should revive. Keep local QA credentials separate from any eventual production policy.

### 13. Error sanitization currently sacrifices diagnostic detail — medium priority

[API error logging](../src/server/http/api.ts) records request ID and error class but omits the underlying cause/code. Authentication database failures become anonymous sessions without structured diagnostics. Party snapshot errors are all returned as unavailable/private, including infrastructure failures. This protects secrets but makes database outages look like login or missing-room problems.

Introduce structured redacted server logs with operation names, safe error codes, cause categories and timings; preserve request correlation. Distinguish expected authorization/not-found failures from infrastructure errors. Never log session tokens, passwords, database URLs or message contents. Add dashboards/alerts only after these signals exist.

### 14. Latest activity selection is reversed — concrete UI logic bug

[OnlineUsersWidget](../src/components/dashboard/OnlineUsersWidget.tsx) constructs `new Map(activity.map(...))` from a feed returned newest first. Later duplicate user IDs overwrite earlier ones, so the widget can display an older activity for a coworker. Retain the first item per user or return an explicit latest-user activity projection. Test multiple events from the same player before changing the polling ownership.

## Recommended implementation order

1. Harden identity input parsing, active-profile requirements, registration policy and shared authentication abuse controls. Add adversarial tests before changing behavior.
2. Add a shared mutation-origin policy and use a restricted local runtime role with separate migration credentials. Keep reset workflows atomic and return proper post-redirect responses.
3. Make invite expiry atomic and bounded, then centralize social snapshot ownership. Preserve acceptance navigation and persistent unread alerts.
4. Make chess realtime-first with adaptive fallback; decouple spectator heartbeats. Re-run clock, reconnect, dropped-event and resignation/rematch tests.
5. Add database timeouts, redacted diagnostics and measurements. Rehearse representative historical queries and mixed move/read/write workloads.
6. Extract the remaining workflow-heavy adapters and large presentation components in small verified changes. Enforce concrete feature inputs/results at the public boundaries.

## Scaling shape

Keep a modular monolith with a separate database per company for now. Use stateless application instances, one bounded pool per worker, provider-compatible transaction pooling, a shared limiter and realtime transport. Introduce a durable outbox/job boundary for cleanup and projections when needed; game settlement remains synchronous and transactional. Choose caching only for data with explicit freshness/invalidation rules, never authoritative move validation or permission decisions.

Before promising a player count, measure actual deployment connection budgets, pool waits, p95/p99 move-to-opponent latency, realtime fan-out, dropped-event recovery, many spectators, history growth and a sustained mixed workload. The current local read benchmark cannot answer those questions. Cross-company competition remains a separate authenticated integration design; do not combine company databases without revisiting isolation.
