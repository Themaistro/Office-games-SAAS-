# Local PostgreSQL

Docker Compose includes PostgreSQL 16 at `localhost:5433` by default.

Connection string:

```text
postgresql://brain_arena:change-me-local-only@localhost:5433/daily_brain_arena
```

This is the first migration step. The application uses PostgreSQL for
authentication, realtime, and current data access until those boundaries are
migrated deliberately. The existing Supabase schema cannot be applied directly
yet because it references the legacy auth schema's `auth.users` table and identity
functions.

Set `POSTGRES_PASSWORD` and `DATABASE_URL` in a local `.env` file before using
this outside development. Do not commit that file.

