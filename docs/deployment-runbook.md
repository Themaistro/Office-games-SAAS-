# Deployment and database runbook

Source publication and deployment are separate operations. Do not treat a successful build or GitHub push as verification of a hosted deployment.

## Per-company configuration

Use a separate database and credential for each company installation. Generate a unique company UUID. Existing Office Games local data uses `00000000-0000-4000-8000-000000000001`; do not reuse that ID for another company.

- `DATABASE_URL`: company-scoped application runtime credential.
- `MIGRATION_DATABASE_URL`: operator/migration credential, kept out of the application runtime where possible.
- `OFFICE_GAMES_COMPANY_ID`: server identity, matching `deployment_identity`.
- `NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID`: same ID, set **before building** the browser bundle.
- `OFFICE_GAMES_COMPANY_NAME`: display label for provisioning.
- `DATABASE_POOL_MAX`: connection budget per worker/instance, default 10.
- `ABLY_API_KEY`: server publisher key with the required channel capabilities; never a public environment variable.
- `RUNTIME_DATABASE_ROLE` / `RUNTIME_DATABASE_PASSWORD`: dedicated role and random 40-128 character URL-safe password for the optional runtime-role provisioning step. These are migration-tool inputs, not browser settings.

Changing the public company ID requires rebuilding. Identity provisioning is offline: the CLI refuses to reassign a database containing accounts. Never solve an identity mismatch by editing the application to bypass the check.

## Fresh local installation

1. Start an empty PostgreSQL database and put its connection in `.env.local`.
2. Run `npm run db:bootstrap -- --local`. It refuses an existing application database.
3. Run `npm run db:migrate -- --local`.
4. Run `npm run db:seed-content -- --local` for the checked-in non-personal master banks.
5. Run `npm run verify -- --database --build` and `npm run test:http`.

The bootstrap manifest separates legacy initialization from checksum-protected runtime migrations. Both fresh creation and repeated migration/content installation have been rehearsed in a temporary local database. No test requires wiping existing players.

## Existing production upgrade

1. Review the exact code revision, migration list and content release. Back up schema/data using the provider's backup mechanism and verify a restore in an isolated database. No production backup or restore was performed by this local task.
2. Run automated verification locally/CI. Check production connection capacity and set instance limits.
3. Use the migration credential to run `node scripts/migrate.cjs` with explicitly supplied `DATABASE_URL`. Do not pass `--local` for production. A checksum mismatch stops the upgrade; never edit an applied migration to work around it.
4. Verify the deployment's company identity. `scripts/provision-company.cjs` accepts explicit connection/configuration; remote operation additionally requires `--allow-remote`. It refuses reassignment when accounts exist.
5. If a content update is intended, review and run `scripts/seed-content.cjs` with explicit connection/configuration and `--allow-remote`. It inserts missing source items, not employee/company records, and does not overwrite existing bank entries.
6. With a database administrator, provision a dedicated runtime role using `scripts/provision-runtime-role.cjs`. It refuses an administrator role or an existing role not marked for this company. Managed providers may require their operator console/privileges for role creation. Re-run after new tables, then test the runtime credential. Keep the migration credential separate.
7. Build with the correct public company ID and deploy with the matching server ID/runtime connection. Check `/api/health`, login, admin/player authorization, mission resume/start/finish, invitations and messages before directing users to it.
8. Watch errors, connection queueing, query latency and realtime failures. Promote gradually; do not infer hosted capacity from local benchmark numbers.

## Docker/server deployment

Compose starts only PostgreSQL by default. To run the serving application and the one-shot migration job, explicitly enable `docker compose --profile app up -d --build` with the intended configuration. PostgreSQL's published port is loopback-only; remote applications should use a managed database or a deliberately configured private network, not expose this local port publicly.

The `runner` image serves requests as a non-root user and excludes SQL/content installation tools. The `operator` image contains those tools and is used by the `migrate` job with `restart: no`. Supply a restricted `DATABASE_URL` to the app and an operator `MIGRATION_DATABASE_URL` only to the job. There is no fallback to a database owner credential in the serving service. Changing configuration does not erase existing volumes; never use `down -v` as an upgrade step.

Use `/api/live` for frequent process probes; it performs no database work. `/api/health` checks database identity, runtime permission policy and required migrations. Use readiness at promotion/recovery rather than constantly waking a scale-to-zero database just to check process liveness. Docker's healthcheck is process liveness, not proof of application readiness.

Docker uses Node 24 and excludes local environment files, scratch work and test output from the image. Set the build-time public company ID. The Compose migration job runs migrations, company verification and content installation before starting the application. If runtime-role inputs are supplied, it also provisions table access. Use separate migration/runtime connections outside local development.

The Compose PostgreSQL initialization is for a new local/server database; an existing managed database should be upgraded through the migration runner. Provider-specific bootstrap/role privileges must be confirmed by its operator. The actual Docker production image was built and started locally against an isolated fresh database and restricted runtime role. Player/admin HTTP checks and a bounded workload passed; details are in `architecture-verification-2026-11-02.md`.

## Rollback and release gates

Before promotion, run the read-only `node scripts/deployment-preflight.cjs --strict` with the explicit application environment (`--local` for a local rehearsal; `--allow-remote` is required for a hosted target). It does not change accounts, settings or data. The local review setup intentionally has open registration/test accounts and no chosen hosted connection budget, so a strict local run is expected to fail those launch gates. Review the report in ignored `output/deployment-preflight.json`; a pass is still not a security/capacity certificate.

For Vercel, the server reuses one pool per worker and attaches the [Vercel pool lifecycle helper](https://vercel.com/kb/guide/connection-pooling-with-functions) only on that platform. Idle connections close after five seconds, and connections have a bounded lifetime. For Neon runtime traffic use a pooled endpoint; operator migrations/backups use a direct connection as described in [Neon's connection guidance](https://neon.com/docs/connect/connection-pooling). `-pooler` endpoints select transaction mode automatically; other transaction proxies can set `DATABASE_CONNECTION_MODE=transaction`.

Transaction mode does not send per-session timeout settings. Provision runtime-role defaults with the operator tool and verify their effective values through the actual endpoint before rollout. Production connections reject database administrators/table owners. Public database hosts require certificate-verified TLS; loopback and the documented private Docker hostnames are supported without requiring TLS on a private local server.

Application pool size is per worker. Set and verify `EXPECTED_MAX_INSTANCES` and `DATABASE_CONNECTION_BUDGET` against the chosen deployment limits, reserving capacity for rolling releases/operator work. These values document the intended budget; they do not configure Vercel scaling by themselves. Keep development/staging isolated from production databases and realtime applications/company identities.

Prefer additive migrations and maintain compatibility with the previous application release. Roll back application code first when safe. Destructive schema/data rollback requires an operator-reviewed restore plan; a forward migration is usually safer. Never automatically run down-migrations against employee data.

Configure branch protection to require the `Verify platform` workflow after pushing/reviewing it. That GitHub setting was not changed locally. Review `output/local-capacity.json`, architecture checks and content-review status before a production release. The current benchmark is bounded and local; hosted soak/realtime fan-out and human usability tests remain separate release evidence.
