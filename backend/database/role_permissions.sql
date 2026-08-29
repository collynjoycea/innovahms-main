-- Role-based access control: which admin/staff modules each role can access
CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(50) PRIMARY KEY,
    permissions JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150)
);

-- Seed sensible defaults for the 5 existing staff roles.
-- Keys correspond to functional modules across the system.
INSERT INTO role_permissions (role, permissions) VALUES
    ('Hotel Manager', '{
        "dashboard": true,
        "reservations": true,
        "checkin_checkout": true,
        "room_management": true,
        "housekeeping": true,
        "maintenance": true,
        "inventory": true,
        "staff_attendance": true,
        "payroll": false,
        "reports": true
    }'),
    ('Front Desk Operations', '{
        "dashboard": true,
        "reservations": true,
        "checkin_checkout": true,
        "room_management": true,
        "housekeeping": false,
        "maintenance": false,
        "inventory": false,
        "staff_attendance": false,
        "payroll": false,
        "reports": false
    }'),
    ('Housekeeping & Maintenance', '{
        "dashboard": true,
        "reservations": false,
        "checkin_checkout": false,
        "room_management": false,
        "housekeeping": true,
        "maintenance": true,
        "inventory": false,
        "staff_attendance": false,
        "payroll": false,
        "reports": false
    }'),
    ('Inventory & Supplies', '{
        "dashboard": true,
        "reservations": false,
        "checkin_checkout": false,
        "room_management": false,
        "housekeeping": false,
        "maintenance": false,
        "inventory": true,
        "staff_attendance": false,
        "payroll": false,
        "reports": false
    }'),
    ('HR/Payroll Staff Management', '{
        "dashboard": true,
        "reservations": false,
        "checkin_checkout": false,
        "room_management": false,
        "housekeeping": false,
        "maintenance": false,
        "inventory": false,
        "staff_attendance": true,
        "payroll": true,
        "reports": false
    }')
ON CONFLICT (role) DO NOTHING;
