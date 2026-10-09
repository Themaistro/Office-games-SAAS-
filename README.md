# Daily Brain Arena

Daily Brain Arena is a corporate gamification platform designed to offer employees a fun, competitive, and time-boxed daily challenge. It provides a healthy break for teams, boosts morale, and fosters friendly competition across departments.

## Features

- **Daily Missions (13 Mini-games)**: A rich catalog of brain-training games including:
  - **Memory & Focus**: Card Match, Memory Game, Sequence Game, Odd Object.
  - **Speed & Reaction**: Reaction Time, Stroop Effect, Target Number.
  - **Math & Logic**: Mental Math, Sudoku Lite, Logic Puzzles.
  - **Word & Knowledge**: Word Scramble, Missing Letters, Company/IT Trivia.
- **Real-Time Multiplayer**: 
  - Challenge colleagues to live **Chess** and **Tic-Tac-Toe** matches.
  - Spectate live ongoing matches from the Office Lounge.
- **Strict Timeboxing**: A server-enforced daily time limit ensures employees only play for a healthy, configurable duration (e.g., 15 minutes) per day.
- **Progression System**: Earn XP for performance, build daily streaks, level up, and compete on the global leaderboard.
- **Admin Dashboard**: 
  - Real-time participation analytics and heatmaps.
  - Player roster management and bulk time-limit configuration.
  - Game rotation and trivia question management.
  - Global announcement broadcasting (Info, Success, Warning, Urgent).
  - One-click Season Reset and Factory Wipes.
- **Interactive Onboarding**: Integrated `driver.js` product tours guide new users through their first mission, navigating the leaderboard, and challenging coworkers.

## Architecture

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, custom HSL theme, Framer Motion for tasteful animations
- **Backend**: Next.js Server Actions & API Routes for secure, server-authoritative logic
- **Database**: PostgreSQL with server-authoritative access
- **Real-time**: PostgreSQL-backed polling and API updates
- **Authentication**: Provider-neutral PostgreSQL sessions
- **Hosting**: Optimized for Vercel

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Themaistro/Office-games-SAAS-.git
   cd Office-games-SAAS-
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up Environment Variables**:
   Copy `.env.example` to `.env.local` and add your PostgreSQL connection:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   # Optional: enables instant Chess events; polling remains as a fallback.
   ABLY_API_KEY=your_server_key
NEXT_PUBLIC_ABLY_KEY=your_public_key
```

Realtime is deliberately game-agnostic. New live games should use the shared
`publishGameEvent(gameType, gameId, event)` helper and the matching channel
`game:{gameType}:{gameId}`. Keep the database as the source of truth and use
Ably only for low-latency UI updates, with polling as a fallback when Ably is
not configured.

## Database Setup

Run the SQL files in PostgreSQL (or use `node scripts/apply-neon-migrations.cjs`) in this order:

1. `db/migrations/schema.sql`
2. Existing migrations `migration.sql` through `migration6_security_hardening.sql`
3. `db/migrations/migration7_runtime_schema_reconciliation.sql`
4. `db/migrations/migration8_question_history.sql`
5. `db/migrations/migration9_question_pool_date.sql`
6. `db/migrations/migration9_connect_four.sql`
7. `db/migrations/migration10_game_spectators.sql`
8. `db/migrations/migration11_game_rounds.sql`

Then load the required seed files from `db/seeds/`. The latest migrations are
idempotent, but the original schema and seed files should only be applied to a
new database or a database that has not already received them.

## Running Locally

Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin Setup

By default, all new users are employees. To create an admin account:
1. Sign up normally via the UI.
2. Manually update the user's role in the PostgreSQL `profiles` table to `'admin'`.

## Deployment to Vercel

1. Push your code to your GitHub repository.
2. Import the project in Vercel.
3. Add `DATABASE_URL` and `NEXT_PUBLIC_SITE_URL` to your Vercel Environment Variables.
   Add `ABLY_API_KEY` as a server-only variable and `NEXT_PUBLIC_ABLY_KEY` as a client-visible variable to enable instant Chess synchronization.
4. Deploy!
