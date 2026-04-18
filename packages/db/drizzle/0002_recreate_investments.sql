-- Drop old investments table and recreate with new schema
DROP TABLE IF EXISTS investments CASCADE;

CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_name VARCHAR(255) NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
