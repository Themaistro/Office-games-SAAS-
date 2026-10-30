CREATE TABLE IF NOT EXISTS lounge_rooms (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), host_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
 format text NOT NULL CHECK(format IN ('trivia','mixed')), mode text NOT NULL CHECK(mode IN ('duel','group')),
 visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','in_progress','finished','cancelled')),
 phase text NOT NULL DEFAULT 'question' CHECK(phase IN ('question','reveal')),
 capacity integer NOT NULL CHECK(capacity BETWEEN 2 AND 12), round_count integer NOT NULL CHECK(round_count BETWEEN 3 AND 20),
 current_round integer NOT NULL DEFAULT 0, round_started_at timestamptz, deadline_at timestamptz, advance_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz,
 config_version integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS lounge_room_players (
 room_id uuid REFERENCES lounge_rooms(id) ON DELETE CASCADE, user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'joined' CHECK(state IN ('joined','left','resigned')), score integer NOT NULL DEFAULT 0,
 correct_count integer NOT NULL DEFAULT 0, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id,user_id)
);
CREATE INDEX IF NOT EXISTS lounge_room_players_user_idx ON lounge_room_players(user_id,room_id);
CREATE TABLE IF NOT EXISTS lounge_room_rounds (
 room_id uuid REFERENCES lounge_rooms(id) ON DELETE CASCADE, position integer NOT NULL, question jsonb NOT NULL,
 duration_seconds integer NOT NULL CHECK(duration_seconds BETWEEN 10 AND 180), PRIMARY KEY(room_id,position)
);
CREATE TABLE IF NOT EXISTS lounge_room_answers (
 room_id uuid NOT NULL, position integer NOT NULL, user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
 answer text NOT NULL, correct boolean NOT NULL, points integer NOT NULL, elapsed_ms integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id,position,user_id),
 FOREIGN KEY(room_id,position) REFERENCES lounge_room_rounds(room_id,position) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS lounge_room_invites (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), room_id uuid REFERENCES lounge_rooms(id) ON DELETE CASCADE,
 sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE, recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled','expired')),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',
 UNIQUE(room_id,recipient_id)
);
CREATE INDEX IF NOT EXISTS lounge_room_invites_recipient_idx ON lounge_room_invites(recipient_id,status);
