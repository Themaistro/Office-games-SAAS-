# Architecture verification — 2026-11-02

Local work only. Existing player accounts were preserved; disposable HTTP fixtures, databases, roles and containers were removed after testing.

| Area | Verified result |
| --- | --- |
| Source structure | 298 source modules checked for cycles, client/server imports, presentation database access and type-check bypasses |
| Database ownership | 48 public tables assigned one owner; 55 foreign keys connect owned tables |
| Build quality | Formatting, lint, TypeScript and optimized production build pass |
| Gameplay | 237 PostgreSQL/server-action scenarios across 15 games and three difficulties |
| Multiplayer | 14 shared integrity checks, nine Connect Four scenarios, 18 party scenarios and three registration-invitation checks |
| Content generators | 2,405 checks plus 180 interactive Sudoku boards verified by an independent solver |
| Rotation | Earlier deterministic run verified 2,190 user-days; scheduling rules were preserved |
| Database pressure | 24 simultaneous workflows with a two-connection pool; mutual exclusion, failure cleanup and nested/outer rollback pass |
| Fresh installation | Empty PostgreSQL bootstrap, migrations twice, content installation twice, company provisioning and restricted runtime role pass |
| Authorization | Anonymous/employee admin redirects, admin page loading, administrator profile-view context and private invitation access pass over HTTP |
| Social writes | Authenticated presence/message writes, unread persistence, unauthorized read-receipt denial and recipient read acknowledgement pass over HTTP |
| Invite/lobby state | Finished matches excluded, public second-seat hosts visible, private invitations hidden, account-level activity detection and concurrent cancel/accept checks pass |
| Container deployment | Actual Node 24 production image built and started against a fresh database with the restricted runtime role; required PostgreSQL/migration assets are present |

The HTTP suite loads player pages and admin sections, but does not claim a human clicked every control or that a screenshot/pixel audit was performed. Service/SQL mutation tests cover the specified state changes separately.

The native production read run completed 1,125 requests with zero errors and 69 ms p95 at 50 concurrent clients. The isolated Docker/runtime-role run completed another 1,125 requests with zero errors and 108 ms p95 at 50 clients. These are bounded local read workloads plus specific mutation/privacy cases, with small datasets. They do not establish hosted concurrency limits, long-running reliability or websocket fan-out capacity.

Detailed measurements are in `output/local-capacity.json` and `output/container-capacity.json`. Test commands and future extension rules are documented in `architecture.md` and `deployment-runbook.md`. The GitHub workflow has been added locally; remote CI execution and branch protection were not changed.

Content factual review and real-player difficulty are separate from this architecture work. The production dependency audit reported zero advisories in this run; development-only lint dependencies still report a minimatch advisory. The automated breaking downgrade was not applied.
