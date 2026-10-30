CREATE TABLE IF NOT EXISTS lounge_room_spectators (
 room_id uuid REFERENCES lounge_rooms(id) ON DELETE CASCADE,
 user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
 last_seen timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id,user_id)
);
