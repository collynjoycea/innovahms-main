select * from admins;
select * from customers;
select * from hotels;
select * from owners;
select * from rooms;
select * from staff;
select * from reservations;
select * from attendance;

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admins (name, email, password_hash) 
VALUES (
    'Super Admin', 
    'admin@gmail.com', 
    'scrypt:32768:8:1$uY6oV9Wp$78417d476643928123847db95f7783935824987'
);
-- Siguraduhin na i-paste mo yung bagong hash sa loob ng quotes
UPDATE admins 
SET password_hash = 'scrypt:32768:8:1$8kvkgaKL4ZsT4rK1$5715ae3f7af53642f92e7fdf71466a5e7a13f0943fbcbc30fc0ec82122a714ad342ae637f3e66906d8351ac956c09d578a5f9a951d001cb1abb05b32814214a4' 
WHERE email = 'admin@gmail.com';


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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE hotels ALTER COLUMN hotel_code DROP NOT NULL;

CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
    hotel_name VARCHAR(150) NOT NULL,
    hotel_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE hotels 
ADD COLUMN hotel_code VARCHAR(20);
UPDATE hotels 
SET hotel_code = 'INNOVAHMS-' || id 
ALTER TABLE hotels 
ALTER COLUMN hotel_code SET NOT NULL;
ALTER TABLE hotels 
ADD CONSTRAINT unique_hotel_code UNIQUE (hotel_code);
SELECT * FROM hotels;

ALTER TABLE hotels 
ADD COLUMN IF NOT EXISTS hotel_email VARCHAR(100),
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS hotel_logo TEXT,
ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active' 
    CHECK (status IN ('Active', 'Inactive', 'Maintenance')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;



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

-- 1. Burahin ang maling jsonb column
ALTER TABLE rooms DROP COLUMN amenities;

-- 2. Idagdag ulit bilang text array
ALTER TABLE rooms ADD COLUMN amenities text[];

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

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    hotel_id INTEGER,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP WITHOUT TIME ZONE,
    clock_out TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20), -- Present, Late, Absent, etc.
    remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE reservations
ADD COLUMN check_in_time TIME WITHOUT TIME ZONE,
ADD COLUMN check_out_time TIME WITHOUT TIME ZONE;

