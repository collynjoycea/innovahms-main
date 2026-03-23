-- Cebu seed for OpenStreetMap landmarks (VisionSuites + InnovaSuites)
-- Sets the first hotel as being near "University of Cebu - Congressional Campus"
-- and inserts real Cebu landmarks/POIs.
--
-- Run inside `innovahmsdb`:
--   psql -h localhost -U postgres -d innovahmsdb -f cebu_landmarks_seed.sql

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
  SELECT hid, 'University of Cebu - Congressional Campus (Cebu City)', 10.3247, 123.9091
  WHERE NOT EXISTS (SELECT 1 FROM vision_hotel_locations WHERE hotel_id = hid);

  -- Landmarks (name, category, lat, lng, sort_order)
  -- Coordinates are real-world approximations for Cebu City / nearby areas.
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
    (hid,'SM Seaside City Cebu','Shopping',10.2810,123.8790,25),
    (hid,'Carbon Public Market','Market',10.2950,123.9058,26),
    (hid,'Cebu Normal University','School',10.2956,123.8896,27),
    (hid,'University of San Carlos - Talamban','School',10.3540,123.9136,28),
    (hid,'Cebu Doctors'' University Hospital','Hospital',10.3057,123.8899,29),
    (hid,'Chong Hua Hospital','Hospital',10.3126,123.8907,30)
  ON CONFLICT DO NOTHING;
END $$;
