# Deployment Guide for IT Team

This application is a Next.js 15 (App Router) project integrated with Supabase. It has been pre-configured with a multi-stage Dockerfile using Next.js `standalone` mode to keep the production image as small and secure as possible.

## ⚠️ CRITICAL: Build-Time Environment Variables

Because this is a Next.js application, client-side environment variables (anything starting with `NEXT_PUBLIC_`) **MUST be present during the build step** (`docker build`). If they are only provided at runtime, the frontend browser code will not have access to them and the application will fail to connect to Supabase.

### Required Environment Variables

You must supply these three variables:
1. `NEXT_PUBLIC_SUPABASE_URL` (Required at build-time & runtime)
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Required at build-time & runtime)
3. `SUPABASE_SERVICE_ROLE_KEY` (Required at runtime only - for backend API routes)

---

## Option 1: Deploying with Docker Compose (Recommended)

We have provided a `docker-compose.yml` that handles passing the build arguments automatically.

1. Create a `.env` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
2. Run Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

---

## Option 2: Deploying with standard Docker commands

If you are using a CI/CD pipeline (like GitHub Actions, Jenkins, or AWS CodeBuild) and building the image manually, you must pass the `NEXT_PUBLIC_` variables as `--build-arg`.

1. **Build the Image:**
   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL="your_supabase_url_here" \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here" \
     -t daily-brain-arena:latest .
   ```

2. **Run the Container:**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL="your_supabase_url_here" \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here" \
     -e SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here" \
     --name daily-brain-arena \
     daily-brain-arena:latest
   ```

## Architecture Notes
- **Port:** The Node.js server inside the container exposes port `3000`.
- **Stateless:** The Docker container is completely stateless. All persistent data and user sessions are managed securely by Supabase.
- **Cache:** Next.js uses `.next/cache` inside the container. The Dockerfile correctly sets up a non-root user (`nextjs:nodejs`) with permissions to write to this cache.
