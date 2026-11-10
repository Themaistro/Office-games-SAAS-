# Production preparation audit — 10 November 2026

## Outcome and scope

Implemented and verified locally. No GitHub push, Vercel deployment or hosted database change was performed in this audit. This report complements the architecture/security remediation and API request-budget reports; it is not a production launch approval.

## Improvements

- Party rooms now use the shared company-scoped realtime channel builder. The previous unscoped subscription could miss server events while frequent polling concealed the problem. Finished/cancelled party rooms stop their subscriptions and periodic refreshes. Active party polling remains intentional: it reconciles authoritative question deadlines and reveal transitions.
- Shared polling coalesces duplicate consumers, pauses hidden-page work, bounds requests, backs off after failures and invalidates stale reads after mutations. People and conversation screens use it too. Message sending always releases its pending state after a timeout/network failure and retains the draft.
- Tutorials load their JavaScript only when an eligible tutorial is needed. Decorative background animation stops when hidden or reduced motion is requested and runs at a bounded frame rate. Removed the unused jose dependency.
- Database connections have bounded lifetimes, idle periods and query/lock/transaction timeouts. Public database connections require verified TLS. Transaction pooling uses provisioned role defaults instead of unsupported startup session settings. Vercel uses its pool lifecycle helper.
- Production startup rejects a privileged runtime database role or an application-table owner. Migration/operator credentials are kept separate from application credentials.
- The production application image excludes migration scripts and content tooling. A separate operator image performs one-shot migrations. Fixed operator TLS handling for the private Docker database hostname and verified both images against a fresh database.
- Default Compose startup runs PostgreSQL only; the application/migration services require the app profile. Database publishing is restricted to loopback. Applied this binding to the local database container while retaining its named volume and existing four accounts. Other projects' containers were not changed.
- Added a database-free `/api/live` endpoint for routine container liveness. `/api/health` remains readiness. Restricted the proxy matcher to admin routes, avoiding needless middleware work for public pages and frequent API requests.
- Added a read-only deployment preflight for company identity, migration state, runtime permissions, role timeouts, registration policy, test accounts and total hosting connection budget. Architecture checks also cover dynamic imports and reject hardcoded unscoped game realtime channels.
- Dependency audit reports zero known advisories across production and development dependencies. A scoped minimatch override resolves the affected tooling dependency; lint, type checks and build passed with it.

Board-game realtime and rematch recovery remain active where they support post-game interactions. Do not disable those indiscriminately merely because the board has a final result.

## Verification

- `npm run verify -- --database --build`: all requested stages passed, including lint, types, architecture and database/gameplay checks and the production build.
- Mixed HTTP workload: 4,500 requests across 5, 20 and 50 concurrent clients, including presence writes and private fixture messages; zero errors. At the 50-client stage, p95 was 50 ms.
- Final native production HTTP regression: 1,125 requests, zero errors; 50-client p95 79 ms. Included the database-free liveness endpoint, lobby/privacy checks and fixture cleanup.
- Current-source runner/operator container rehearsal: fresh database migration and safe rerun, restricted runtime role, operator-tool exclusion and HTTP regressions passed. 1,125 requests, zero errors; 50-client p95 75 ms. Temporary databases, roles, containers and fixtures were removed.
- Local database remained reachable after its loopback-only port change. Existing account/profile counts remained four each.

Machine-readable evidence and logs are generated under ignored `output/`: `verify-production-audit.log`, `mixed-capacity.json`, `final-http-production-audit.log`, `container-production-audit.log`, `dependency-audit-production-prep.json` and `deployment-preflight.json`.

These are short local workloads on a small database. Their timings are observations, not hosted capacity guarantees, browser rendering measurements, websocket fanout measurements or sustained soak results. The separate runs use different workloads and must not be compared as a before/after speed claim.

## Before a production launch

Strict local preflight deliberately reports three unresolved launch decisions: open registration, four test-style accounts and no hosting instance/connection budget. Local test accounts and access policies were preserved for ongoing development.

Also required on the intended hosting: backup/restore rehearsal, production configuration and migration verification, real-browser cross-account realtime delivery/capability tests, sustained load with representative data and monitoring/alert checks. This local audit does not establish those results.

Use the [deployment runbook](deployment-runbook.md) for the preflight and operator/runtime deployment sequence. Official references: [Vercel pool lifecycle](https://vercel.com/kb/guide/connection-pooling-with-functions) and [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).
