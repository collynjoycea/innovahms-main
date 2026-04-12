-- INNOVA HMS - Seed Data
-- Run this in the innovahmsdb database after all schema files

-- Admin user
INSERT INTO admins (name, email, password_hash)
VALUES (
    'Super Admin',
    'admin@gmail.com',
    'scrypt:32768:8:1$8kvkgaKL4ZsT4rK1$5715ae3f7af53642f92e7fdf71466a5e7a13f0943fbcbc30fc0ec82122a714ad342ae637f3e66906d8351ac956c09d578a5f9a951d001cb1abb05b32814214a4'
)
ON CONFLICT (email) DO NOTHING;

-- Membership packages
INSERT INTO membership_packages (name, slug, description, monthly_price, annual_price, max_rooms, features, is_active)
VALUES
    ('Starter', 'starter', 'Perfect for small hotels just getting started', 2999.00, 29990.00, 10,
     '{"dashboard": true, "room_management": true, "basic_reservations": true, "staff_management": true}',
     true),
    ('Professional', 'professional', 'Ideal for growing hotels with advanced needs', 5999.00, 59990.00, 50,
     '{"dashboard": true, "room_management": true, "advanced_reservations": true, "staff_management": true, "inventory": true, "housekeeping": true, "reports": true}',
     true),
    ('Enterprise', 'enterprise', 'Complete solution for large hotel chains', 9999.00, 99990.00, 200,
     '{"dashboard": true, "room_management": true, "advanced_reservations": true, "staff_management": true, "inventory": true, "housekeeping": true, "reports": true, "multi_property": true, "api_access": true}',
     true)
ON CONFLICT (slug) DO NOTHING;

-- Initialize loyalty for existing customers
INSERT INTO customer_loyalty (customer_id, points, tier, points_this_month)
SELECT c.id, 0, 'STANDARD', 0
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM customer_loyalty cl WHERE cl.customer_id = c.id);

-- Cebu landmarks (sample data for first hotel)
DO $$
DECLARE
  hid INTEGER;
BEGIN
  SELECT id INTO hid FROM hotels ORDER BY id ASC LIMIT 1;
  IF hid IS NULL THEN
    RAISE EXCEPTION 'No hotels found. Please create an owner/hotel first.';
  END IF;

  -- Hotel location (UCC Congressional / Cebu City area)
  INSERT INTO vision_hotel_locations (hotel_id, label, lat, lng)
  VALUES (hid, 'University of Cebu - Congressional Campus (Cebu City)', 10.3247, 123.9091)
  ON CONFLICT (hotel_id, label) DO NOTHING;

  -- Landmarks (name, category, lat, lng, sort_order)
  INSERT INTO vision_landmarks (hotel_id, name, category, lat, lng, sort_order)
  VALUES
    (hid,'SM City Cebu','Shopping',10.3110,123.9180,1),
    (hid,'Ayala Center Cebu','Shopping',10.3180,123.9049,2),
    (hid,'Cebu IT Park','District',10.3287,123.9067,3),
    (hid,'Sugbo Mercado','Food Market',10.3309,123.9060,4),
    (hid,'Waterfront Cebu City Hotel & Casino','Hotel',10.3302,123.9069,5),
    (hid,'Cebu Business Park','District',10.3189,123.9062,6),
    (hid,'Fuente Osmeña Circle','Landmark',10.3090,123.8910,7),
    (hid,'Colon Street','Landmark',10.2956,123.9012,8),
    (hid,'Magellan''s Cross','Historic',10.2929,123.9022,9),
    (hid,'Basilica Minore del Santo Niño','Historic',10.2934,123.9020,10),
    (hid,'Fort San Pedro','Historic',10.2933,123.9050,11),
    (hid,'Cebu Metropolitan Cathedral','Historic',10.2952,123.9025,12),
    (hid,'Cebu Taoist Temple','Temple',10.3340,123.8859,13),
    (hid,'Temple of Leah','Attraction',10.3727,123.8729,14),
    (hid,'Tops Lookout','Viewpoint',10.3725,123.8790,15),
    (hid,'Sirao Flower Garden','Attraction',10.3926,123.8681,16),
    (hid,'Casa Gorordo Museum','Museum',10.2966,123.9027,17),
    (hid,'Yap-Sandiego Ancestral House','Museum',10.2962,123.9022,18),
    (hid,'Cebu Ocean Park','Attraction',10.2797,123.8730,19),
    (hid,'Cebu Safari and Adventure Park','Attraction',10.7605,123.8950,20),
    (hid,'Mactan-Cebu International Airport','Airport',10.3094,123.9790,21),
    (hid,'Lapu-Lapu Shrine','Historic',10.2991,124.0054,22),
    (hid,'Mactan Newtown','District',10.2807,123.9788,23),
    (hid,'SkyPark at SM Seaside','Attraction',10.2819,123.8745,24),
    (hid,'SM Seaside City Cebu','Shopping',10.2810,123.8790,25)
  ON CONFLICT (hotel_id, name) DO NOTHING;
END $$;

-- Update all hotels to Metro Manila locations
UPDATE hotels SET
    hotel_address = 'Makati City, Metro Manila, Philippines',
    latitude = 14.5547,
    longitude = 121.0244
WHERE id = 1;

UPDATE hotels SET
    hotel_address = 'Ermita, Manila, Metro Manila, Philippines',
    latitude = 14.5794,
    longitude = 120.9755
WHERE id = 2;

UPDATE hotels SET
    hotel_address = 'Novaliches, Quezon City, Metro Manila, Philippines',
    latitude = 14.6760,
    longitude = 121.0320
WHERE id = 12;

UPDATE hotels SET
    hotel_address = 'Lagro, Quezon City, Metro Manila, Philippines',
    latitude = 14.6760,
    longitude = 121.0320
WHERE id = 13;
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


