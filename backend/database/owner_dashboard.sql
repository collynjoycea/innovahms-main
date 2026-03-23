-- Owner Dashboard tables for Innova-HMS (PostgreSQL)
-- Run this inside the `innovahmsdb` database.
-- Example:
--   psql -h localhost -U postgres -d innovahmsdb -f owner_dashboard.sql

-- 1) Guests (minimal, used for Recent Bookings & Origins)
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120),
  contact_number VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Rooms (for occupancy + room status grid)
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  nightly_rate_php NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'vacant'
    CHECK (status IN ('vacant', 'occupied', 'dirty', 'maintenance')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (hotel_id, room_number)
);

-- 3) Staff (for roster widget)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  role VARCHAR(80) NOT NULL,
  is_on_duty BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4) Reservations (bookings + revenue + origins)
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
  guest_name VARCHAR(120), -- optional fallback if guest_id is null
  check_in DATE,
  check_out DATE,
  total_amount_php NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'paid', 'completed', 'cancelled')),
  origin_country VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_hotel ON staff(hotel_id);

-- OPTIONAL seed data (comment out if you don't want sample rows)
-- Note: update `hotel_id = 1` if your hotel id is different.
-- INSERT INTO rooms (hotel_id, room_number, nightly_rate_php, status)
-- VALUES
--   (1,'101',2500,'occupied'),
--   (1,'102',2500,'vacant'),
--   (1,'103',2600,'dirty'),
--   (1,'104',2600,'maintenance')
-- ON CONFLICT DO NOTHING;
--
-- INSERT INTO staff (hotel_id, full_name, role, is_on_duty)
-- VALUES
--   (1,'Elena Gomez','Concierge',TRUE),
--   (1,'Marco Rossi','Operations Manager',TRUE),
--   (1,'Sofia Chen','Housekeeping Supervisor',TRUE),
--   (1,'David Miller','Chef de Cuisine',TRUE)
-- ON CONFLICT DO NOTHING;
--
-- INSERT INTO guests (full_name, email) VALUES ('Juan Dela Cruz','juan@example.com') ON CONFLICT DO NOTHING;
-- INSERT INTO reservations (hotel_id, room_id, guest_name, total_amount_php, status, origin_country)
-- VALUES (1, NULL, 'Juan Dela Cruz', 45200, 'paid', 'Philippines');
