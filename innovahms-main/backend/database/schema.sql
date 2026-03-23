-- Innova-HMS Table Schema
-- Ensure you are connected to 'innovahmsdb' before running!

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE customers 
ADD COLUMN loyalty_points INTEGER DEFAULT 0,
ADD COLUMN membership_level VARCHAR(50) DEFAULT 'Gold',
ADD COLUMN tier_progress INTEGER DEFAULT 10


-- 2. Owners Table 
CREATE TABLE IF NOT EXISTS owners (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Hotels Table linked to the Owner
CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
    hotel_name VARCHAR(150) NOT NULL,
    hotel_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rewards (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0
);

-- 4. Rooms Table
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

CREATE TABLE IF NOT EXISTS room_tours (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    panorama_url TEXT NOT NULL,
    initial_yaw DOUBLE PRECISION DEFAULT 0,
    initial_pitch DOUBLE PRECISION DEFAULT 0,
    initial_fov DOUBLE PRECISION DEFAULT 1.57079632679,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure the schema can be applied safely to existing databases (migrations)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_name VARCHAR(100);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) CHECK (room_type IN ('Single', 'Double', 'Suite', 'Deluxe'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS amenities TEXT[];
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_adults INTEGER DEFAULT 2;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_children INTEGER DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS price_per_night DECIMAL(10, 2) NOT NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance', 'Cleaning'));

--ETO YUNG LUMANG SQL SA HOUSEKEEPING WAG NATO---NILAGAY KO LANG PARA HINDI AKO MALITO
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'Routine', -- Urgent, High, Routine
    staff_name VARCHAR(100),
    guest_arrival TIMESTAMP,
    task_status VARCHAR(20) DEFAULT 'Pending' -- Pending, Cleaning, Validated
);

-- Mag-insert ng sample para may makita ka sa UI agad:
INSERT INTO housekeeping_tasks (room_id, priority, guest_arrival)
SELECT id, 'Urgent', NOW() + interval '2 hours' 
FROM rooms LIMIT 1;

--ETO YUNG BAGONG QUERY SA HOUSEKEEPING--UPDATED TO
-- 1. Update/Create the table with all necessary fields
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'Routine', -- Urgent, High, Routine
    priority_reason VARCHAR(255),          -- Hal: "Guest Waiting", "Spill Reported"
    staff_name VARCHAR(100),
    guest_arrival TIMESTAMP,               -- Expected arrival ng guest
    special_instructions TEXT,             -- Bilin mula sa Front Desk
    task_status VARCHAR(20) DEFAULT 'Pending', -- Pending, Cleaning, Validated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- PARA SA ALERT TIMER (Start time)
);
--IALTER NYO YUNG TABLE PARA MAUPDATE YUNG IBANG WALA
ALTER TABLE housekeeping_tasks 
ADD COLUMN IF NOT EXISTS priority_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS inspected_by VARCHAR(100);

-- 2. Siguraduhin na ang 'rooms' table ay may floor_level at occupancy_status para sa Total Rooms view
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS floor_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS occupancy_status VARCHAR(20) DEFAULT 'Vacant',
ADD COLUMN IF NOT EXISTS amenities_list TEXT DEFAULT 'Standard Set, Towels, Toiletries';

-- 2. Mag-insert ng Sample Urgent Task para ma-test ang Alert Timer at Reason
INSERT INTO housekeeping_tasks (
    room_id, 
    priority, 
    priority_reason, 
    staff_name, 
    special_instructions, 
    guest_arrival
)
SELECT 
    id, 
    'Urgent', 
    'Guest Waiting for Check-in', 
    'Juan Dela Cruz', 
    'Sanitize high-touch surfaces immediately. Guest has allergies.',
    NOW() + interval '30 minutes'
FROM rooms 
WHERE status = 'vacant' -- Siguraduhin na vacant yung room na itetest natin
LIMIT 1;


-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(50), -- e.g., Toiletry, Bed Linens, Cleaning Chem.
    stock_level INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 100,
    unit_price DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'OPTIMAL', -- OPTIMAL, LOW STOCK, CRITICAL
    last_restock TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Performance (Optional for UI)
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    supplier_name VARCHAR(150),
    lead_time DECIMAL(3, 1), -- e.g., 2.4 days
    rating DECIMAL(2, 1) DEFAULT 5.0
);

-- Reservations Table linked to your Rooms table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL, -- Naka-link sa rooms table mo
    customer_name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) DEFAULT 'Standard', -- VIP/Platinum, Premium, Standard
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Confirmed', 'Checked-in', 'Checked-out', 'Cancelled', 'Pending')),
    payment_status VARCHAR(50) DEFAULT 'Unpaid' CHECK (payment_status IN ('Full Paid', 'Partial', 'Unpaid')),
    total_amount_php DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample Data linked to your existing rooms
-- Siguraduhin na may laman na ang 'rooms' table bago ito i-run
INSERT INTO reservations (hotel_id, room_id, guest_name, guest_type, check_in, check_out, status, payment_status, total_amount_php)
SELECT 
    hotel_id, 
    id, 
    'Alexander Sterling', 'VIP / Platinum', '2023-10-24', '2023-10-28', 'Checked-in', 'Full Paid', 15000.00
FROM rooms WHERE room_number = '405' LIMIT 1;

-- 1. Inventory Table (Para sa Low Stock Alerts)
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    stock_left INT DEFAULT 0,
    unit VARCHAR(20),
    category VARCHAR(50),
    reorder_level INT DEFAULT 10 -- Kapag bumaba dito, mag-a-alert sa UI
);

-- 2. Staff & Payroll Table
CREATE TABLE staff_reports (
    id SERIAL PRIMARY KEY,
    staff_name VARCHAR(100),
    attendance_rate DECIMAL(5,2), -- e.g., 96.40
    overtime_hours DECIMAL(5,2),
    shifts_covered INT,
    est_total_payroll DECIMAL(12,2),
    report_month VARCHAR(20), -- Para sa monthly filtering
    next_payroll_date DATE
);

-- 3. Transaction Logs (Real-time feed)
CREATE TABLE transaction_logs (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100), -- e.g., 'New Reservation', 'Inventory Update'
    user_guest VARCHAR(100),
    value VARCHAR(50), -- e.g., '$840.00' o 'Cleaned'
    status VARCHAR(50), -- 'CONFIRMED', 'PENDING', 'ALERT'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. NEW: Analytics Summary (Dito kukunin yung data sa Top Cards)
-- Para hindi mabagal ang load, dito natin i-store yung mga "totals"
CREATE TABLE report_summary (
    id SERIAL PRIMARY KEY,
    total_reservations INT DEFAULT 0,
    res_change_percent VARCHAR(10), -- e.g., '+12.5%'
    today_checkins INT DEFAULT 0,
    pending_checkins INT DEFAULT 0,
    available_rooms INT DEFAULT 0,
    occupancy_percent DECIMAL(5,2),
    today_checkouts INT DEFAULT 0,
    forecasted_revenue DECIMAL(15,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    room_config JSONB NOT NULL, -- I-store dito yung rooms array
    priorities TEXT[],
    special_requests TEXT,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Confirmed'
);

--BAGO TO SA INVENTORY OWNDER DASHBOARD TO 
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone_number VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    sku_id VARCHAR(50) UNIQUE NOT NULL, -- Halimbawa: LIN-001
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- Housekeeping, Maintenance, etc.
    unit_of_measure VARCHAR(50), -- pieces, liters, boxes
    stock_level INT DEFAULT 0,
    reorder_level INT DEFAULT 10, -- Threshold para sa Low Stock
    max_stock INT DEFAULT 100,
    supplier_id INT REFERENCES suppliers(id),
    last_audit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'OPTIMAL', -- OPTIMAL, LOW, CRITICAL
    owner_id INT -- Para sa multi-user/owner setup mo
);

CREATE TABLE consumption_analytics (
    id SERIAL PRIMARY KEY,
    inventory_id INT REFERENCES inventory(id) ON DELETE CASCADE,
    avg_daily_usage DECIMAL(10,2) DEFAULT 0.00,
    avg_weekly_usage DECIMAL(10,2) DEFAULT 0.00,
    wastage_percentage DECIMAL(5,2) DEFAULT 0.00,
    occupancy_correlation_score DECIMAL(3,2), -- Relation sa hotel occupancy
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL, -- Halimbawa: PO-2026-001
    supplier_id INT REFERENCES suppliers(id),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    total_quantity INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, In Transit, Partially Received, Completed
    partial_received_logs TEXT, -- Dito ilalagay kung ilan na ang dumating
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Extend the Loyalty/Analytics Table
CREATE TABLE IF NOT EXISTS customer_analytics (
    customer_id INTEGER PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    total_bookings INTEGER DEFAULT 0,
    total_revenue_php DECIMAL(12, 2) DEFAULT 0.00,
    avg_spend_per_stay DECIMAL(12, 2) DEFAULT 0.00,
    cancellation_rate DECIMAL(5, 2) DEFAULT 0.00, -- Percentage (0-100)
    no_show_count INTEGER DEFAULT 0,
    late_payment_logs INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0, -- Scale 0-100 (Higher is riskier)
    clv_score DECIMAL(12, 2) DEFAULT 0.00, -- Customer Lifetime Value
    last_visit_date TIMESTAMP,
    preferred_room_type VARCHAR(50),
    current_market_status VARCHAR(20) DEFAULT 'Active' -- Active, Churned, At Risk
);

-- 2. Loyalty Points Table (Para sa VIP tracking)
CREATE TABLE IF NOT EXISTS customer_loyalty (
    customer_id INTEGER PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'Standard', -- Standard, Silver, Gold, VIP
    points_this_month INTEGER DEFAULT 0,
    member_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---ETO NAMAN YUNG PARA SA STAFF HINDI KO NARRUN TO SA POSTGRE FOR NOW DITO MUNA -ABBY MARCH 18,2026 SA OWNER DASHBOARD
-- 1. Siguraduhin na may enumeration tayo para sa roles at status (Optional but recommended for data integrity)
CREATE TYPE staff_status AS ENUM ('On Shift', 'Delayed', 'Offline');

-- 2. Ang main Staff Table
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL, -- Link sa hotel owner
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(100) DEFAULT 'Housekeeping',
    status staff_status DEFAULT 'Offline',
    
    -- Analytics & Performance Data
    rating DECIMAL(3, 2) DEFAULT 0.0, -- Halimbawa: 4.85
    base_salary DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Attendance/Efficiency Tracking
    avg_cleaning_speed_min INTEGER DEFAULT 0, -- Store as minutes (e.g., 45)
    tardiness_count INTEGER DEFAULT 0,
    overtime_hours INTEGER DEFAULT 0,
    
    -- Metadata
    image_url TEXT, -- URL para sa avatar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexing para mabilis ang search sa Dashboard
CREATE INDEX idx_staff_owner ON staff(owner_id);
CREATE INDEX idx_staff_status ON staff(status);

--ETO NAMAN YUNG TABLE FOR REVIEWS SA OWNER SIDE 
-- Table for Guest Feedback
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    guest_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    food_rating INTEGER CHECK (food_rating >= 1 AND cleanliness_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND cleanliness_rating <= 5),
    review_content TEXT,
    sentiment_score DECIMAL(3,2), -- e.g., 0.85 for 85% positive
    sentiment_category VARCHAR(20), -- 'Positive', 'Neutral', 'Negative'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'REPLIED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Smart Correlation & AI Insights
CREATE TABLE reputation_insights (
    id SERIAL PRIMARY KEY,
    insight_type VARCHAR(100), -- e.g., 'Staff Correlation'
    description TEXT,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---ETO YUNG TABLE PARA SA GUEST OFFERS
CREATE TABLE guest_offers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    original_price DECIMAL(10, 2),
    discounted_price DECIMAL(10, 2),
    discount_percentage INT,
    offer_type VARCHAR(50), -- 'seasonal', 'flash_deal', 'holiday_package'
    image_url TEXT,
    badge_text VARCHAR(50), -- 'Smart Pick', 'Best Value', 'Limited Edition'
    expiry_date TIMESTAMP, -- Para sa countdown timer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
