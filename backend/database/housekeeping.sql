-- ============================================================
-- INNOVA HMS — Housekeeping & Maintenance Schema
-- ============================================================

-- 1. Housekeeping Tasks (HKTasks, StaffDashboard)
CREATE TABLE IF NOT EXISTS hk_tasks (
    id              SERIAL PRIMARY KEY,
    hotel_id        INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_id         INTEGER REFERENCES rooms(id)  ON DELETE SET NULL,
    room_label      VARCHAR(20),          -- e.g. "Room 103"
    task_type       VARCHAR(50),          -- Full Clean, Linen Change, Turn-Down, etc.
    assigned_to     INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    staff_name      VARCHAR(100),
    priority        VARCHAR(20) DEFAULT 'NORMAL', -- URGENT, HIGH, NORMAL
    status          VARCHAR(30) DEFAULT 'Pending', -- Pending, In Progress, Completed
    notes           TEXT,
    scheduled_time  TIME,
    completed_at    TIMESTAMP,
    time_spent_mins INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Room Status (RoomStatusMap, StaffDashboard)
CREATE TABLE IF NOT EXISTS hk_room_status (
    id          SERIAL PRIMARY KEY,
    hotel_id    INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_id     INTEGER REFERENCES rooms(id)  ON DELETE CASCADE,
    room_label  VARCHAR(20) NOT NULL,
    room_type   VARCHAR(50),
    status      VARCHAR(30) DEFAULT 'Available', -- Available, Occupied, Dirty, Clean, InProgress, Maintenance
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, room_label)
);

-- 3. Maintenance Reports (MaintenanceReport)
CREATE TABLE IF NOT EXISTS hk_maintenance_reports (
    id              SERIAL PRIMARY KEY,
    hotel_id        INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_label      VARCHAR(20),
    issue           TEXT NOT NULL,
    severity        VARCHAR(20) DEFAULT 'Medium', -- High Priority, Medium Priority, Routine Check
    is_out_of_order BOOLEAN DEFAULT FALSE,
    status          VARCHAR(20) DEFAULT 'Pending', -- Pending, In Progress, Resolved
    reported_by     INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP
);

-- 4. Linen & Supplies Inventory (LinenInventory)
CREATE TABLE IF NOT EXISTS hk_inventory (
    id          SERIAL PRIMARY KEY,
    hotel_id    INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    category    VARCHAR(50) DEFAULT 'Linens', -- Linens, Toiletries
    item_name   VARCHAR(100) NOT NULL,
    current_qty INTEGER DEFAULT 0,
    max_qty     INTEGER DEFAULT 100,
    unit        VARCHAR(30) DEFAULT 'pcs',
    low_stock_threshold INTEGER DEFAULT 30,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. HK History / Completed Logs (HKHistory)
CREATE TABLE IF NOT EXISTS hk_history (
    id          SERIAL PRIMARY KEY,
    hotel_id    INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    task_id     INTEGER REFERENCES hk_tasks(id) ON DELETE SET NULL,
    room_label  VARCHAR(20),
    task_type   VARCHAR(50),
    staff_name  VARCHAR(100),
    status      VARCHAR(30) DEFAULT 'Completed',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes       TEXT
);

-- 6. HK Schedule / Shifts (HKSchedule)
CREATE TABLE IF NOT EXISTS hk_schedules (
    id          SERIAL PRIMARY KEY,
    hotel_id    INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    staff_id    INTEGER REFERENCES staff(id)  ON DELETE CASCADE,
    shift_date  DATE NOT NULL,
    shift_start TIME NOT NULL,
    shift_end   TIME NOT NULL,
    zone        VARCHAR(100),
    task_label  VARCHAR(100),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hk_tasks_hotel     ON hk_tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_status    ON hk_tasks(status);
CREATE INDEX IF NOT EXISTS idx_hk_room_status_hotel ON hk_room_status(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hk_maintenance_hotel ON hk_maintenance_reports(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hk_inventory_hotel  ON hk_inventory(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hk_history_hotel    ON hk_history(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hk_schedules_hotel  ON hk_schedules(hotel_id, shift_date);
