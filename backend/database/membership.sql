-- INNOVA HMS - Membership Schema
-- Run this in the innovahmsdb database after schema.sql

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