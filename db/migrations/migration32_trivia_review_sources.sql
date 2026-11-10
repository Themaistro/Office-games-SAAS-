-- Make content-review provenance part of every installation, including fresh CI databases.
-- Existing development databases may already contain the same table from review tooling.
CREATE TABLE IF NOT EXISTS trivia_review_sources (
  question_id uuid PRIMARY KEY REFERENCES master_trivia_bank(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
