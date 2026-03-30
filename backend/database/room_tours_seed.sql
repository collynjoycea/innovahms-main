-- Room tour seed for Explore 360
-- Run after schema.sql
-- Example:
--   psql -h localhost -U postgres -d innovahmsdb -f room_tours_seed.sql

CREATE TABLE IF NOT EXISTS room_tours (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    panorama_url TEXT NOT NULL,
    initial_yaw DOUBLE PRECISION DEFAULT 0,
    initial_pitch DOUBLE PRECISION DEFAULT 0,
    initial_fov DOUBLE PRECISION DEFAULT 1.57079632679,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_room_tours_room_id ON room_tours(room_id);

INSERT INTO room_tours (room_id, panorama_url, initial_yaw, initial_pitch, initial_fov)
SELECT
    r.id,
    COALESCE(
        NULLIF(r.images[1], ''),
        CASE
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%single%' THEN '/images/standard-room.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%standard%' THEN '/images/standard-room.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%double%' THEN '/images/my-room-360.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%deluxe%' THEN '/images/deluxe-room.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%executive%' THEN '/images/executive-penthouse.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%penthouse%' THEN '/images/executive-penthouse.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%ocean%' THEN '/images/ocean-suite.jpg'
            WHEN LOWER(COALESCE(r.room_name, '') || ' ' || COALESCE(r.room_type, '')) LIKE '%suite%' THEN '/images/ocean-suite.jpg'
            ELSE '/images/deluxe-room.jpg'
        END
    ) AS panorama_url,
    0,
    0,
    1.57079632679
FROM rooms r
ON CONFLICT (room_id) DO UPDATE
SET
    panorama_url = EXCLUDED.panorama_url,
    initial_yaw = EXCLUDED.initial_yaw,
    initial_pitch = EXCLUDED.initial_pitch,
    initial_fov = EXCLUDED.initial_fov;

-- Optional verification
-- SELECT r.id, r.room_number, r.room_name, r.room_type, rt.panorama_url
-- FROM rooms r
-- LEFT JOIN room_tours rt ON rt.room_id = r.id
-- ORDER BY r.id;
