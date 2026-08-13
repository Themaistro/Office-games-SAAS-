# Daily Brain Arena

Daily Brain Arena is a corporate game platform designed to offer employees a fun, competitive, and time-boxed daily challenge. The platform strictly limits gameplay to 15 minutes per day per user, ensuring a healthy balance while providing an engaging break.

## Architecture

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, custom HSL theme, Framer Motion for tasteful animations
- **Backend**: Next.js Server Actions & API Routes for secure, server-authoritative logic
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth (Email/Password & Google OAuth)
- **Hosting**: Vercel ready

## Core Mechanics
- **15-Minute Rule**: A strictly enforced server-side timer ensures employees cannot play longer than 15 minutes a day.
- **Fair Play**: Timer cannot be manipulated client-side, closing the browser does not pause the session, and questions are randomized.
- **Progression**: XP, Levels, and Streaks to reward consistency.
- **Monthly Seasons**: Leaderboards reset at the beginning of the month.

## Installation & Setup

1. **Clone the repository** (or download the source).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up Environment Variables**:
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Supabase & Database Setup

1. Create a new Supabase project.
2. Go to the SQL Editor in your Supabase dashboard.
3. Run the SQL script located at `schema.sql` to generate all tables, relationships, and RLS policies.
4. Set up Auth providers (Email/Password, Google) in the Supabase Auth settings.

## Seed Data (Coming Soon)
A seed script will be provided to automatically generate teams, game types, and 100+ sample questions.

## Running Locally

Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing (Planned)
- Unit tests via Vitest/Jest for XP/Streak calculation.
- E2E tests for the 15-minute lockout logic.

## Deployment to Vercel
1. Push your code to a Git repository.
2. Import the project in Vercel.
3. Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Environment Variables.
4. Deploy!

## Admin Setup
To create an admin account, sign up normally via the UI, then manually update your role in the Supabase `profiles` table to `'admin'`.
