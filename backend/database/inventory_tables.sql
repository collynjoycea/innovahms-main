-- ============================================================
-- INNOVA HMS — Inventory Management Tables
-- Run this in your PostgreSQL database: innovahmsdb
-- ============================================================

-- 1. INVENTORY ITEMS (master list of all stock items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id              SERIAL PRIMARY KEY,
    hotel_id        INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    sku_id          VARCHAR(50) UNIQUE NOT NULL,
    item_name       VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(100) DEFAULT 'General',
    unit            VARCHAR(50)  DEFAULT 'pcs',
    supplier        VARCHAR(200),
    stock_level     INTEGER      DEFAULT 0,
    min_stock       INTEGER      DEFAULT 10,   -- reorder point
    max_stock       INTEGER      DEFAULT 100,
    reorder_point   INTEGER      DEFAULT 10,
    unit_cost       NUMERIC(10,2) DEFAULT 0,
    status          VARCHAR(20)  DEFAULT 'OPTIMAL', -- OPTIMAL | LOW | CRITICAL
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
);

-- 2. STOCK MOVEMENTS (every IN/OUT transaction)
CREATE TABLE IF NOT EXISTS stock_movements (
    id              SERIAL PRIMARY KEY,
    hotel_id        INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    item_id         INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type   VARCHAR(10)  NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST')),
    quantity        INTEGER      NOT NULL,
    unit_cost       NUMERIC(10,2) DEFAULT 0,
    department      VARCHAR(100),
    reason          VARCHAR(200),
    supplier        VARCHAR(200),
    po_number       VARCHAR(100),
    notes           TEXT,
    performed_by    VARCHAR(200),
    staff_id        INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at      TIMESTAMP    DEFAULT NOW()
);

-- 3. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id              SERIAL PRIMARY KEY,
    hotel_id        INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    po_number       VARCHAR(100) UNIQUE NOT NULL,
    supplier        VARCHAR(200) NOT NULL,
    status          VARCHAR(30)  DEFAULT 'PENDING', -- PENDING | ORDERED | IN_TRANSIT | RECEIVED | CANCELLED
    total_amount    NUMERIC(12,2) DEFAULT 0,
    expected_date   DATE,
    received_date   DATE,
    notes           TEXT,
    created_by      VARCHAR(200),
    staff_id        INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
);

-- 4. PURCHASE ORDER ITEMS (line items per PO)
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id              SERIAL PRIMARY KEY,
    po_id           INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id         INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity        INTEGER      NOT NULL,
    unit_cost       NUMERIC(10,2) DEFAULT 0,
    total_cost      NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- 5. INVENTORY SETTINGS (per hotel thresholds & config)
CREATE TABLE IF NOT EXISTS inventory_settings (
    id                  SERIAL PRIMARY KEY,
    hotel_id            INTEGER REFERENCES hotels(id) ON DELETE CASCADE UNIQUE,
    critical_threshold  INTEGER DEFAULT 15,   -- % of max_stock
    low_threshold       INTEGER DEFAULT 30,   -- % of max_stock
    overstock_threshold INTEGER DEFAULT 95,   -- % of max_stock
    auto_po_enabled     BOOLEAN DEFAULT TRUE,
    email_alerts        BOOLEAN DEFAULT TRUE,
    sms_alerts          BOOLEAN DEFAULT FALSE,
    storage_location    VARCHAR(200) DEFAULT 'Basement Level B1',
    capacity_sqm        INTEGER DEFAULT 280,
    manager_name        VARCHAR(200),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_items_hotel    ON inventory_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item     ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_hotel    ON stock_movements(hotel_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date     ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_hotel    ON purchase_orders(hotel_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status   ON purchase_orders(status);

-- ── TRIGGER: auto-update inventory_items.status after movement ──
CREATE OR REPLACE FUNCTION update_item_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory_items
    SET
        status = CASE
            WHEN stock_level <= 0                          THEN 'CRITICAL'
            WHEN stock_level <= reorder_point              THEN 'CRITICAL'
            WHEN stock_level <= (max_stock * 0.30)         THEN 'LOW'
            ELSE 'OPTIMAL'
        END,
        updated_at = NOW()
    WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_item_status ON stock_movements;
CREATE TRIGGER trg_update_item_status
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_item_status();

-- ── SEED: default settings for hotel 1 ──────────────────────
INSERT INTO inventory_settings (hotel_id, manager_name)
VALUES (1, 'Inventory Manager')
ON CONFLICT (hotel_id) DO NOTHING;

-- ── SEED: sample items for hotel 1 ──────────────────────────
INSERT INTO inventory_items (hotel_id, sku_id, item_name, category, unit, supplier, stock_level, min_stock, max_stock, reorder_point, unit_cost) VALUES
(1, 'LIN-001', 'Bath Towels (Standard)',   'Linens',      'pcs',  'LuxLinen Philippines',    12,  80, 200, 80,  450.00),
(1, 'LIN-002', 'Hand Towels',              'Linens',      'pcs',  'LuxLinen Philippines',    95,  80, 200, 80,  250.00),
(1, 'LIN-003', 'Bed Sheets (King)',        'Linens',      'pcs',  'LuxLinen Philippines',    48,  30, 120, 30,  850.00),
(1, 'TOI-001', 'Shampoo 100ml',            'Toiletries',  'pcs',  'PH Amenities Corp.',      42,  80, 400, 80,   45.00),
(1, 'TOI-002', 'Conditioner 100ml',        'Toiletries',  'pcs',  'PH Amenities Corp.',      38,  80, 400, 80,   45.00),
(1, 'TOI-003', 'Toothbrush Set',           'Toiletries',  'sets', 'PH Amenities Corp.',      95,  60, 300, 60,   35.00),
(1, 'CLN-001', 'Multipurpose Cleaner',     'Cleaning',    'btl',  'CleanPro Supplies Co.',    8,  12,  60, 12,  180.00),
(1, 'CLN-002', 'Disinfectant Spray',       'Cleaning',    'btl',  'CleanPro Supplies Co.',   22,  15,  80, 15,  220.00),
(1, 'FNB-001', 'Coffee Pods',              'F&B',         'box',  'Brewline Global',         180,  50, 400, 50,   25.00),
(1, 'FNB-002', 'Mini Bar Soda',            'F&B',         'pcs',  'Beverages PH',             6,  24, 120, 24,   35.00),
(1, 'SAF-001', 'First Aid Kit',            'Safety',      'kits', 'MedSupply PH',             8,   4,  16,  4, 1200.00),
(1, 'SAF-002', 'Fire Extinguisher Refill', 'Safety',      'pcs',  'SafetyFirst Corp.',        5,   3,  12,  3, 2500.00),
(1, 'MNT-001', 'AC Filter Set',            'Maintenance', 'set',  'HVAC Core',               12,  15,  60, 15,  850.00),
(1, 'PPR-001', 'Toilet Paper (bulk)',       'Paper',       'roll', 'Office Depot PH',        240,  80, 500, 80,   18.00)
ON CONFLICT (sku_id) DO NOTHING;
