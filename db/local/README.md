# Local PostgreSQL

Docker Compose includes PostgreSQL 16 at `localhost:5433` by default.

Connection string:

```text
postgresql://brain_arena:change-me-local-only@localhost:5433/daily_brain_arena
```

This is the first migration step. The application uses PostgreSQL for
authentication, live updates, and all data access. The compatibility auth schema
is included so the database can be initialized consistently in local and hosted
PostgreSQL environments.

Set `POSTGRES_PASSWORD` and `DATABASE_URL` in a local `.env` file before using
this outside development. Do not commit that file.

