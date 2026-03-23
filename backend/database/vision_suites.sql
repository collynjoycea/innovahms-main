-- Vision Suites (Guest-facing) schema (PostgreSQL)
-- Run inside `innovahmsdb`:
--   psql -h localhost -U postgres -d innovahmsdb -f vision_suites.sql

-- Hotel location used by the Neighborhood Discovery map
CREATE TABLE IF NOT EXISTS vision_hotel_locations (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL DEFAULT 'Hotel Location',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room cards shown in "The Vision Collection"
CREATE TABLE IF NOT EXISTS vision_rooms (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  tagline VARCHAR(120),
  capacity INTEGER NOT NULL DEFAULT 2,
  base_price_php NUMERIC(12,2) NOT NULL DEFAULT 0,
  view_preference VARCHAR(60),
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 360 tour config per room (Marzipano expects an equirect panorama URL)
CREATE TABLE IF NOT EXISTS vision_room_tours (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES vision_rooms(id) ON DELETE CASCADE,
  panorama_url TEXT NOT NULL,
  initial_yaw DOUBLE PRECISION DEFAULT 0,
  initial_pitch DOUBLE PRECISION DEFAULT 0,
  initial_fov DOUBLE PRECISION DEFAULT 1.57079632679, -- ~90deg in radians
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Landmarks used by the OpenStreetMap section
CREATE TABLE IF NOT EXISTS vision_landmarks (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Landmark',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vision_rooms_hotel ON vision_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_vision_landmarks_hotel ON vision_landmarks(hotel_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vision_landmarks_hotel_name ON vision_landmarks(hotel_id, name);

-- Optional seed (adjust hotel_id if needed)
-- INSERT INTO vision_hotel_locations (hotel_id, label, lat, lng)
-- VALUES (1, 'Manila, Philippines', 14.5995, 120.9842)
-- ON CONFLICT DO NOTHING;
--
-- INSERT INTO vision_rooms (hotel_id, name, tagline, capacity, base_price_php, view_preference, image_url, sort_order)
-- VALUES
--   (1,'Standard Suite','Essential Luxury',2,3500,'City View','/images/room-1.jpg',1),
--   (1,'Deluxe Panorama','Elevated Comfort',3,5200,'Park View','/images/room-2.jpg',2),
--   (1,'Vision VIP Loft','Ultimate Prestige',4,8900,'City View','/images/room-3.jpg',3)
-- ;
--
-- INSERT INTO vision_room_tours (room_id, panorama_url)
-- VALUES
--   (1,'/tours/standard-suite/panorama.jpg'),
--   (2,'/tours/deluxe-panorama/panorama.jpg'),
--   (3,'/tours/vip-loft/panorama.jpg')
-- ;
--
-- INSERT INTO vision_landmarks (hotel_id, name, category, lat, lng, sort_order)
-- VALUES
--   (1,'SM Mall of Asia','Shopping',14.5350,120.9822,1),
--   (1,'Rizal Park','Cultural Landmark',14.5826,120.9797,2),
--   (1,'Intramuros','Historic District',14.5896,120.9740,3)
-- ;
