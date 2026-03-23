-- Innova Suites (Customer-facing) schema (PostgreSQL)
-- Depends on: `vision_suites.sql` (vision_rooms) and `schema.sql` (customers)
-- Run inside `innovahmsdb`:
--   psql -h localhost -U postgres -d innovahmsdb -f innova_suites.sql

CREATE TABLE IF NOT EXISTS customer_loyalty (
  customer_id INTEGER PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
  points_this_month INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_preferences (
  customer_id INTEGER PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  preferred_view VARCHAR(60),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional offers per room + tier (discount and points redemption cost)
CREATE TABLE IF NOT EXISTS room_member_offers (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES vision_rooms(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  points_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_room_member_offers ON room_member_offers(room_id, tier);

-- Optional: initialize loyalty rows for existing customers
INSERT INTO customer_loyalty (customer_id, points, tier, points_this_month)
SELECT c.id, 0, 'STANDARD', 0
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM customer_loyalty cl WHERE cl.customer_id = c.id);

ALTER TABLE reservations
ADD COLUMN check_in_time TIME WITHOUT TIME ZONE,
ADD COLUMN check_out_time TIME WITHOUT TIME ZONE;
