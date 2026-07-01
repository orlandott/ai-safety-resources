-- Ratings for the star-rating + recommendations feature.
-- Apply with: npx wrangler d1 execute ai-safety-ratings --file=migrations/0001_ratings.sql
-- (add --remote to apply to the production D1 database instead of the local one)

CREATE TABLE IF NOT EXISTS ratings (
  resource_link TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (resource_link, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_resource_link ON ratings (resource_link);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings (user_id);
