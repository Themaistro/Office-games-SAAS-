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
- **Database**: PostgreSQL (via Supabase) with Row Level Security (RLS)
- **Real-time**: Supabase Realtime Channels (for multiplayer sync and live activity feeds)
- **Authentication**: Supabase Auth (Email/Password & Google OAuth)
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
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Database Setup (Automated)

The project includes an automated setup script that applies all schema migrations, RLS policies, and populates the database with hundreds of starter trivia questions and words.

1. Ensure your `.env.local` is fully configured.
2. Run the database setup script:
   ```bash
   node db/scripts/setup_db.js
   ```

## Running Locally

Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin Setup

By default, all new users are employees. To create an admin account:
1. Sign up normally via the UI.
2. Either manually update your role in the Supabase `profiles` table to `'admin'`, OR run the included helper script:
   ```bash
   node db/scripts/make_admin.js your-email@example.com
   ```

## Deployment to Vercel

1. Push your code to your GitHub repository.
2. Import the project in Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to your Vercel Environment Variables.
4. Deploy!
