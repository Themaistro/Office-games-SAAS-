# Deployment Guide

The application is a Next.js App Router project using PostgreSQL and a standalone Docker image.

## Environment variables

Required at runtime:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NEXT_PUBLIC_SITE_URL=https://office-games-saas.vercel.app
```

Local Docker development uses the PostgreSQL service from `docker-compose.yml`. Vercel Production and Preview use the connected Neon PostgreSQL database.

## Docker Compose

Create a local `.env` file with `POSTGRES_PASSWORD` and, when needed, an explicit `DATABASE_URL`, then run:

```bash
docker compose up -d --build
```

## Database migrations

Apply the numbered SQL migrations and seeds to every environment. The verified migration runner is:

```bash
node scripts/apply-neon-migrations.cjs
```

Use a production-only connection string when running it against Neon. Do not commit `.env` files or connection strings.

## Vercel

Vercel should have `DATABASE_URL` connected through the Neon integration and `NEXT_PUBLIC_SITE_URL` set to the production domain. A normal deployment uses the standard `npm run build` command; migrations are run separately when the schema changes.

The application containers are stateless. Persistent data lives in PostgreSQL, so take database backups before destructive migrations or resets.
