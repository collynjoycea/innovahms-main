-- INNOVA HMS - Features Schema
-- Run this in the innovahmsdb database after schema.sql

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