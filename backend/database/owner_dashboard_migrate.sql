-- Dashboard schema migration helper (PostgreSQL)
-- Use this if you already have existing tables (rooms/staff/reservations) but they don't have `hotel_id`.
-- It will add `hotel_id` columns where missing and backfill from `hotels` using `owner_id` if present.
-- Run inside `innovahmsdb`:
--   psql -h localhost -U postgres -d innovahmsdb -f owner_dashboard_migrate.sql

DO $$
BEGIN
  -- ROOMS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rooms') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rooms' AND column_name='hotel_id') THEN
      ALTER TABLE rooms ADD COLUMN hotel_id INTEGER;
    END IF;

    -- If rooms already keyed by owner_id, backfill hotel_id from hotels(owner_id)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rooms' AND column_name='owner_id') THEN
      UPDATE rooms r
      SET hotel_id = h.id
      FROM hotels h
      WHERE r.owner_id = h.owner_id
        AND r.hotel_id IS NULL;
    END IF;

    -- Add FK if not present (best-effort)
    BEGIN
      ALTER TABLE rooms
        ADD CONSTRAINT rooms_hotel_id_fkey
        FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;

  -- STAFF
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='staff') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff' AND column_name='hotel_id') THEN
      ALTER TABLE staff ADD COLUMN hotel_id INTEGER;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff' AND column_name='owner_id') THEN
      UPDATE staff s
      SET hotel_id = h.id
      FROM hotels h
      WHERE s.owner_id = h.owner_id
        AND s.hotel_id IS NULL;
    END IF;

    BEGIN
      ALTER TABLE staff
        ADD CONSTRAINT staff_hotel_id_fkey
        FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;

  -- RESERVATIONS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reservations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reservations' AND column_name='hotel_id') THEN
      ALTER TABLE reservations ADD COLUMN hotel_id INTEGER;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reservations' AND column_name='owner_id') THEN
      UPDATE reservations r
      SET hotel_id = h.id
      FROM hotels h
      WHERE r.owner_id = h.owner_id
        AND r.hotel_id IS NULL;
    END IF;

    BEGIN
      ALTER TABLE reservations
        ADD CONSTRAINT reservations_hotel_id_fkey
        FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_hotel_id ON staff(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations(hotel_id);
