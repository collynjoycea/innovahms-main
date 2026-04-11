
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owners (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    business_permit_path TEXT,
    bir_certificate_path TEXT,
    fire_safety_certificate_path TEXT,
    valid_id_path TEXT,
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    approval_status VARCHAR(20) DEFAULT 'PENDING',
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hotel management
CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
    hotel_name VARCHAR(150) NOT NULL,
    hotel_address TEXT,
    hotel_code VARCHAR(20),
    hotel_email VARCHAR(100),
    contact_number VARCHAR(20),
    hotel_logo TEXT,
    hotel_building_image TEXT,
    hotel_description TEXT,
    check_in_policy TEXT,
    check_out_policy TEXT,
    cancellation_policy TEXT,
    total_rooms INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Maintenance')),
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_hotel_code UNIQUE (hotel_code)
);

-- Rooms and reservations
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    room_name VARCHAR(100),
    room_type VARCHAR(50) CHECK (room_type IN ('Single', 'Double', 'Suite', 'Deluxe')),
    description TEXT,
    amenities TEXT[],
    images TEXT[],
    max_adults INTEGER DEFAULT 2,
    max_children INTEGER DEFAULT 0,
    price_per_night DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance', 'Cleaning')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    guest_name VARCHAR(120),
    check_in DATE,
    check_out DATE,
    total_amount_php NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'paid', 'completed', 'cancelled')),
    origin_country VARCHAR(80),
    check_in_time TIME WITHOUT TIME ZONE,
    check_out_time TIME WITHOUT TIME ZONE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff and attendance
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'Hotel Manager',
        'Front Desk Operations',
        'Housekeeping & Maintenance',
        'Inventory & Supplies',
        'HR/Payroll Staff Management'
    )),
    employee_id VARCHAR(20) UNIQUE,
    hotel_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    date_hired DATE DEFAULT CURRENT_DATE,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    hotel_id INTEGER,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP WITHOUT TIME ZONE,
    clock_out TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200),
    comment TEXT,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'hidden')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_hotel_id ON staff(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_hotel_id ON reviews(hotel_id);


-- Customer loyalty and preferences
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

-- Room member offers
CREATE TABLE IF NOT EXISTS room_member_offers (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    points_cost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vision Suites (Guest-facing features)
CREATE TABLE IF NOT EXISTS vision_hotel_locations (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    label VARCHAR(120) NOT NULL DEFAULT 'Hotel Location',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS vision_room_tours (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES vision_rooms(id) ON DELETE CASCADE,
    panorama_url TEXT NOT NULL,
    initial_yaw DOUBLE PRECISION DEFAULT 0,
    initial_pitch DOUBLE PRECISION DEFAULT 0,
    initial_fov DOUBLE PRECISION DEFAULT 1.57079632679,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Room tours (360 tours)
CREATE TABLE IF NOT EXISTS room_tours (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    panorama_url TEXT NOT NULL,
    initial_yaw DOUBLE PRECISION DEFAULT 0,
    initial_pitch DOUBLE PRECISION DEFAULT 0,
    initial_fov DOUBLE PRECISION DEFAULT 1.57079632679,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Housekeeping & Maintenance
CREATE TABLE IF NOT EXISTS hk_tasks (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    room_label VARCHAR(20),
    task_type VARCHAR(50),
    assigned_to INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(30) DEFAULT 'Pending',
    notes TEXT,
    scheduled_time TIME,
    completed_at TIMESTAMP,
    time_spent_mins INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hk_room_status (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    room_label VARCHAR(20) NOT NULL,
    room_type VARCHAR(50),
    status VARCHAR(30) DEFAULT 'Available',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, room_label)
);

CREATE TABLE IF NOT EXISTS hk_maintenance_reports (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_label VARCHAR(20),
    issue TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'Medium',
    is_out_of_order BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Pending',
    reported_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hk_inventory (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    unit VARCHAR(50) DEFAULT 'pcs',
    supplier VARCHAR(200),
    last_restocked DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Management
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    sku_id VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    unit VARCHAR(50) DEFAULT 'pcs',
    supplier VARCHAR(200),
    stock_level INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    max_stock INTEGER DEFAULT 100,
    reorder_point INTEGER DEFAULT 10,
    unit_cost NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'OPTIMAL',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST')),
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10,2) DEFAULT 0,
    department VARCHAR(100),
    reason VARCHAR(200),
    supplier VARCHAR(200),
    po_number VARCHAR(100),
    notes TEXT,
    performed_by VARCHAR(200),
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier VARCHAR(200) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    total_amount NUMERIC(12,2) DEFAULT 0,
    ordered_at TIMESTAMP DEFAULT NOW(),
    expected_delivery DATE,
    received_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_member_offers ON room_member_offers(room_id, tier);
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_tours_room_id ON room_tours(room_id);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_hotel_id ON hk_tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hk_room_status_hotel_id ON hk_room_status(hotel_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_hotel_id ON inventory_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_hotel_id ON purchase_orders(hotel_id);


-- Membership packages
CREATE TABLE IF NOT EXISTS membership_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    monthly_price NUMERIC(12, 2) DEFAULT 0,
    annual_price NUMERIC(12, 2) DEFAULT 0,
    max_rooms INTEGER DEFAULT 10,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hotel package subscriptions
CREATE TABLE IF NOT EXISTS hotel_package_subscriptions (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES membership_packages(id) ON DELETE RESTRICT,
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
    amount NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    payment_status VARCHAR(20) DEFAULT 'UNPAID',
    paymongo_payment_id TEXT,
    last_paid_at TIMESTAMP,
    starts_at DATE DEFAULT CURRENT_DATE,
    renewal_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_package_subscriptions_hotel_id ON hotel_package_subscriptions(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_package_subscriptions_owner_id ON hotel_package_subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_membership_packages_active ON membership_packages(is_active);


-- Notification types and templates
CREATE TABLE IF NOT EXISTS notification_types (
    id SERIAL PRIMARY KEY,
    type_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'SYSTEM', 'BOOKING', 'PAYMENT', 'MAINTENANCE', 'INVENTORY', 'STAFF', 'CUSTOMER'
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
    email_template TEXT,
    sms_template TEXT,
    push_template TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'admin', 'owner', 'customer', 'staff'
    notification_type_id INTEGER REFERENCES notification_types(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, user_type, notification_type_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'admin', 'owner', 'customer', 'staff'
    notification_type_id INTEGER REFERENCES notification_types(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional context data
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    expires_at TIMESTAMP, -- For time-sensitive notifications
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification logs for tracking delivery
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'failed'
    provider_response JSONB DEFAULT '{}',
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, user_type, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id);


-- Admin user
INSERT INTO admins (name, email, password_hash)
VALUES (
    'Admin',
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
  ON CONFLICT DO NOTHING;

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
  ON CONFLICT DO NOTHING;
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



-- Password reset OTP storage
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL,
    user_id INTEGER NOT NULL,
    email VARCHAR(120),
    contact_number VARCHAR(30),
    channel VARCHAR(10) NOT NULL DEFAULT 'email',
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_lookup ON password_reset_otps (user_type, user_id, created_at DESC);

