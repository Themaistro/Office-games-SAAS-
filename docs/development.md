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

| Variable                              | Purpose                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                        | Local PostgreSQL connection. Use a dedicated application credential in deployed environments. |
| `OFFICE_GAMES_COMPANY_ID`             | Server company UUID matching the database identity.                                           |
| `NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID` | Same UUID for the browser bundle; configure before building.                                  |
| `DATABASE_POOL_MAX`                   | Pool size per process, default `10`.                                                          |
| `ABLY_API_KEY`                        | Optional server-only publisher key. Scoped browser tokens come from `/api/realtime`.          |

The development UUID in the example matches local migrations. For another company installation, follow [identity provisioning](deployment-runbook.md). Keep real environment files, publisher keys and database credentials out of Git.

## Start and verify

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), register a local account, and use separate browser profiles or private windows for multiplayer testing. There are no universal test/admin passwords. To assign an administrator in your own local database, identify the intended account and update only its profile role to `admin` using your database client; sign in again afterward.

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
