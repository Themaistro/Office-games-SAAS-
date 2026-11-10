# Local development

## Requirements

Use Node.js 24, npm and PostgreSQL 16. The package supports Node versions `>=22 <25`; Node 24 matches CI. Docker Desktop/Engine is optional if PostgreSQL is already available.

Run `npm ci` after cloning, then copy the root `.env.example` to `.env.local`. The example matches the default PostgreSQL service in `docker-compose.yml`; it contains no deployed credentials.

## Database paths

### Docker Compose

```bash
docker compose up -d postgres
npm run db:migrate -- --local
npm run db:seed-content -- --local
```

On a fresh volume, Compose runs the bootstrap SQL automatically. Do not run `db:bootstrap` against that initialized database. `docker compose up -d postgres` starts just the database; Next.js can run directly on your computer. Keep the database volume when restarting Docker.

### Existing PostgreSQL server

Create an empty database using your PostgreSQL client, set its URL in `.env.local`, and run:

```bash
npm run db:bootstrap -- --local
npm run db:migrate -- --local
npm run db:seed-content -- --local
```

Bootstrap is for an empty database only. For an existing Office Games database, skip it and run the migration/content commands. Seeding installs missing non-personal master-bank content; it does not create employee logins.

## Environment reference

| Variable                               | Purpose                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | Local PostgreSQL connection. Use a dedicated application credential in deployed environments. |
| `OFFICE_GAMES_COMPANY_ID`              | Server company UUID matching the database identity.                                           |
| `NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID`  | Same UUID for the browser bundle; configure before building.                                  |
| `DATABASE_POOL_MAX`                    | Pool size per process, default `10`.                                                          |
| `DATABASE_STATEMENT_TIMEOUT_MS`        | Query execution bound, default `15000`.                                                       |
| `DATABASE_LOCK_TIMEOUT_MS`             | Database lock wait bound, default `5000`.                                                     |
| `DATABASE_IDLE_TRANSACTION_TIMEOUT_MS` | Idle transaction bound, default `15000`.                                                      |
| `REGISTRATION_MODE`                    | `open` or `invite`; example/production default is invite-only.                                |
| `REGISTRATION_PASSWORD_MIN_LENGTH`     | New registration minimum, example `12`; existing passwords are unchanged.                     |
| `ADMIN_SESSION_MAX_AGE_HOURS`          | Administrator login lifetime, default `8` (range 1–24).                                       |
| `ABLY_API_KEY`                         | Optional server-only publisher key. Scoped browser tokens come from `/api/realtime`.          |

The development UUID in the example matches local migrations. For another company installation, follow [identity provisioning](deployment-runbook.md). Keep real environment files, publisher keys and database credentials out of Git.

## Start and verify

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), register a local account, and use separate browser profiles or private windows for multiplayer testing. There are no universal test/admin passwords. To assign an administrator in your own local database, identify the intended account and update only its profile role to `admin` using your database client; sign in again afterward.

For a fresh installation using the invite-only example, temporarily set `REGISTRATION_MODE=open` in `.env.local` to register the first local account. Restore invite-only mode when required; an administrator can then create invitation links. Email verification is not implemented, so open registrations are not marked verified.

Use a restricted application role for `DATABASE_URL`. Store the local operator connection separately as `MIGRATION_DATABASE_URL=...` in ignored `.env.migrations.local`; Next.js does not load that file. The local migration and fresh-database test commands read it explicitly. Provision the runtime role with `scripts/provision-runtime-role.cjs` using operator-only environment variables as described in the deployment runbook. Do not put the operator credential in hosted application settings.

For a local database initially configured with its owner credential, run `node scripts/configure-local-runtime.cjs` after migrations/seeding. It provisions a random-password runtime role, saves the operator URL in `.env.migrations.local` and updates only the app's connection. Restart Next.js afterward. Re-running rotates the local runtime password and reapplies grants after new tables. It refuses nonlocal databases. CI uses the same setup before the full suite.

```bash
npm run verify
npm run verify -- --database --build
npm run test:http
```

`test:http` starts a temporary server on port `3100` using an existing build. The default review app can remain on port `3000`. Database QA creates temporary fixtures; read individual script notes before running older content trials or QA setup scripts that may keep test accounts. Reports under `output/` are ignored.

## Common problems

- **Database connection fails:** confirm PostgreSQL is running, the port matches `DATABASE_URL`, and the database/user exist. Docker's default mapped port is `5433`, not `5432`.
- **Bootstrap refuses to run:** the database already contains the application. Use migrations; do not reset data to bypass the refusal.
- **Company identity mismatch:** server, public build ID and database identity must match. Fix configuration/provisioning rather than disabling the guard.
- **Realtime is unavailable:** check server key configuration; authoritative polling supports recovery. A client-visible publisher key is never required.
- **HTTP test port is occupied:** stop your own test process or free port `3100`; the test refuses to replace an existing service.

For schema changes, backups, runtime roles and hosted deployment, use the [deployment runbook](deployment-runbook.md).
