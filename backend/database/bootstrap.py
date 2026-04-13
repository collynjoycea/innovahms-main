import uuid


def _savepoint_name(prefix="sp"):
    return f"{prefix}_{uuid.uuid4().hex}"


def _run_in_savepoint(cur, callback, ignore_errors=False, prefix="sp"):
    savepoint_name = _savepoint_name(prefix)
    cur.execute(f"SAVEPOINT {savepoint_name}")
    try:
        result = callback()
    except Exception:
        cur.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
        cur.execute(f"RELEASE SAVEPOINT {savepoint_name}")
        if ignore_errors:
            return None
        raise
    cur.execute(f"RELEASE SAVEPOINT {savepoint_name}")
    return result


def _execute_in_savepoint(cur, statement, params=None, ignore_errors=False, prefix="sp"):
    return _run_in_savepoint(
        cur,
        lambda: cur.execute(statement, params),
        ignore_errors=ignore_errors,
        prefix=prefix,
    )


def _table_has_column(cur, table_name, column_name):
    cur.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return cur.fetchone() is not None


def ensure_password_reset_tables(cur):
    cur.execute(
        """
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
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_password_reset_otps_lookup
        ON password_reset_otps (user_type, user_id, created_at DESC)
        """
    )


def ensure_api_integrations_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS api_integrations (
            id SERIAL PRIMARY KEY,
            slug VARCHAR(80) NOT NULL UNIQUE,
            name VARCHAR(120) NOT NULL,
            category VARCHAR(80) NOT NULL,
            description TEXT,
            service_tier VARCHAR(40) DEFAULT 'All',
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            last_disabled_reason TEXT,
            updated_by VARCHAR(160),
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    alter_statements = [
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS service_tier VARCHAR(40) DEFAULT 'All'",
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE",
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS last_disabled_reason TEXT",
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(160)",
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0",
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE api_integrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]
    for statement in alter_statements:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="api_integrations_alter")

    cur.execute("CREATE INDEX IF NOT EXISTS idx_api_integrations_order ON api_integrations(display_order, id)")


def ensure_membership_tables(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS membership_packages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            slug VARCHAR(80),
            description TEXT,
            monthly_price NUMERIC(12, 2) DEFAULT 0,
            annual_price NUMERIC(12, 2) DEFAULT 0,
            max_rooms INTEGER,
            features TEXT[] DEFAULT ARRAY[]::TEXT[],
            is_popular BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    membership_package_alters = [
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS slug VARCHAR(80)",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS annual_price NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS max_rooms INTEGER",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT ARRAY[]::TEXT[]",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE membership_packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]
    for statement in membership_package_alters:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="membership_package_alter")

    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_packages_slug ON membership_packages(slug)")

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS hotel_package_subscriptions (
            id SERIAL PRIMARY KEY,
            hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
            package_id INTEGER REFERENCES membership_packages(id) ON DELETE RESTRICT,
            billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
            amount NUMERIC(12, 2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'PENDING',
            starts_at DATE DEFAULT CURRENT_DATE,
            renewal_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    hotel_subscription_alters = [
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES membership_packages(id) ON DELETE RESTRICT",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'MONTHLY'",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID'",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS paymongo_payment_id TEXT",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMP",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS starts_at DATE DEFAULT CURRENT_DATE",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS renewal_date DATE",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE hotel_package_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]
    for statement in hotel_subscription_alters:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="hotel_subscription_alter")

    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_package_subscriptions_hotel_id ON hotel_package_subscriptions(hotel_id)")
    _execute_in_savepoint(
        cur,
        "ALTER TABLE hotel_package_subscriptions ADD CONSTRAINT hotel_package_subscriptions_hotel_id_unique UNIQUE (hotel_id)",
        ignore_errors=True,
        prefix="hotel_subscription_constraint",
    )


def ensure_customer_privilege_tables(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_loyalty (
            customer_id INTEGER PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
            points INTEGER NOT NULL DEFAULT 0,
            tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
            points_this_month INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_privilege_packages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            slug VARCHAR(80) UNIQUE,
            description TEXT,
            monthly_price NUMERIC(12, 2) DEFAULT 0,
            annual_price NUMERIC(12, 2) DEFAULT 0,
            bonus_points INTEGER DEFAULT 0,
            perks TEXT[] DEFAULT ARRAY[]::TEXT[],
            is_popular BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    package_alters = [
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS slug VARCHAR(80)",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS annual_price NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS perks TEXT[] DEFAULT ARRAY[]::TEXT[]",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE customer_privilege_packages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]
    for statement in package_alters:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="customer_priv_package_alter")
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_privilege_packages_slug ON customer_privilege_packages(slug)")

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_privilege_subscriptions (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            package_id INTEGER REFERENCES customer_privilege_packages(id) ON DELETE RESTRICT,
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
        )
        """
    )

    subscription_alters = [
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES customer_privilege_packages(id) ON DELETE RESTRICT",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'MONTHLY'",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID'",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS paymongo_payment_id TEXT",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMP",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS starts_at DATE DEFAULT CURRENT_DATE",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS renewal_date DATE",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE customer_privilege_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]
    for statement in subscription_alters:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="customer_priv_sub_alter")
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_privilege_subscriptions_customer_id ON customer_privilege_subscriptions(customer_id)")
    _execute_in_savepoint(
        cur,
        "ALTER TABLE customer_privilege_subscriptions ADD CONSTRAINT customer_privilege_subscriptions_customer_id_unique UNIQUE (customer_id)",
        ignore_errors=True,
        prefix="customer_priv_sub_constraint",
    )

    customer_alters = [
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS membership_level VARCHAR(20) DEFAULT 'STANDARD'",
    ]
    for statement in customer_alters:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="customer_priv_customer_alter")


def ensure_reservation_pricing_columns(cur):
    statements = [
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12, 2)",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS privilege_discount_percent INTEGER DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS privilege_discount_amount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vat_percent NUMERIC(6, 2) DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(6, 2) DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS applied_privilege_slug VARCHAR(80)",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS applied_privilege_name VARCHAR(80)",
    ]
    for statement in statements:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="reservation_pricing_alter")


def ensure_reservation_time_columns(cur):
    cur.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='reservations' AND column_name='check_in_time'
            ) THEN
                ALTER TABLE reservations ADD COLUMN check_in_time TIME DEFAULT '14:00:00';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='reservations' AND column_name='check_out_time'
            ) THEN
                ALTER TABLE reservations ADD COLUMN check_out_time TIME DEFAULT '12:00:00';
            END IF;
        END$$;
        """
    )


def ensure_about_page_table(cur, about_page_default):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS site_about_content (
            id INTEGER PRIMARY KEY,
            hero_eyebrow TEXT,
            hero_title TEXT,
            hero_highlight TEXT,
            hero_subtitle TEXT,
            story_eyebrow TEXT,
            story_title TEXT,
            story_body TEXT,
            network_eyebrow TEXT,
            network_title TEXT,
            network_body TEXT,
            cta_title TEXT,
            cta_body TEXT,
            cta_button_label TEXT,
            contact_phone TEXT,
            hero_image_url TEXT,
            story_image_url TEXT,
            network_image_url TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    alter_statements = [
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS hero_eyebrow TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS hero_title TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS hero_highlight TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS hero_subtitle TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS story_eyebrow TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS story_title TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS story_body TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS network_eyebrow TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS network_title TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS network_body TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS cta_title TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS cta_body TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS cta_button_label TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS contact_phone TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS hero_image_url TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS story_image_url TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS network_image_url TEXT",
        "ALTER TABLE site_about_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]
    for statement in alter_statements:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="about_content_alter")

    cur.execute(
        """
        INSERT INTO site_about_content (
            id, hero_eyebrow, hero_title, hero_highlight, hero_subtitle,
            story_eyebrow, story_title, story_body,
            network_eyebrow, network_title, network_body,
            cta_title, cta_body, cta_button_label, contact_phone,
            hero_image_url, story_image_url, network_image_url, updated_at
        )
        VALUES (
            1, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, NOW()
        )
        ON CONFLICT (id) DO NOTHING
        """,
        (
            about_page_default["hero_eyebrow"],
            about_page_default["hero_title"],
            about_page_default["hero_highlight"],
            about_page_default["hero_subtitle"],
            about_page_default["story_eyebrow"],
            about_page_default["story_title"],
            about_page_default["story_body"],
            about_page_default["network_eyebrow"],
            about_page_default["network_title"],
            about_page_default["network_body"],
            about_page_default["cta_title"],
            about_page_default["cta_body"],
            about_page_default["cta_button_label"],
            about_page_default["contact_phone"],
            about_page_default["hero_image_url"],
            about_page_default["story_image_url"],
            about_page_default["network_image_url"],
        ),
    )

    _execute_in_savepoint(
        cur,
        """
        UPDATE site_about_content
        SET contact_phone = %s
        WHERE id = 1 AND COALESCE(TRIM(contact_phone), '') = ''
        """,
        (about_page_default["contact_phone"],),
        ignore_errors=True,
        prefix="about_content_seed",
    )


def ensure_profile_media_columns(cur):
    statements = [
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS profile_image TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS business_permit_path TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS bir_certificate_path TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS fire_safety_certificate_path TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS valid_id_path TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS bank_name TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS bank_account_name TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS bank_account_number TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20)",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS review_notes TEXT",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP",
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_image TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS hotel_logo TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS hotel_building_image TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS hotel_description TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS contact_phone TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS check_in_policy TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS check_out_policy TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS cancellation_policy TEXT",
    ]
    for statement in statements:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="profile_media_alter")

    if _table_has_column(cur, "owners", "approval_status"):
        _execute_in_savepoint(
            cur,
            "UPDATE owners SET approval_status = 'APPROVED' WHERE COALESCE(TRIM(approval_status), '') = ''",
            ignore_errors=True,
            prefix="owner_approval_seed",
        )


def ensure_notification_tables(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS notification_types (
            id SERIAL PRIMARY KEY,
            type_key VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) DEFAULT 'NORMAL',
            email_template TEXT,
            sms_template TEXT,
            push_template TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_notification_preferences (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_type VARCHAR(20) NOT NULL,
            notification_type_id INTEGER REFERENCES notification_types(id) ON DELETE CASCADE,
            email_enabled BOOLEAN DEFAULT TRUE,
            sms_enabled BOOLEAN DEFAULT FALSE,
            push_enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, user_type, notification_type_id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_type VARCHAR(20) NOT NULL,
            notification_type_id INTEGER REFERENCES notification_types(id) ON DELETE SET NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            data JSONB DEFAULT '{}',
            is_read BOOLEAN DEFAULT FALSE,
            email_sent BOOLEAN DEFAULT FALSE,
            sms_sent BOOLEAN DEFAULT FALSE,
            push_sent BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP,
            read_at TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS notification_logs (
            id SERIAL PRIMARY KEY,
            notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
            channel VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL,
            provider_response JSONB DEFAULT '{}',
            error_message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, user_type, is_read) WHERE is_read = FALSE")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id)")


def seed_notification_types(cur):
    ensure_notification_tables(cur)

    notification_types = [
        ("system_maintenance", "System Maintenance", "Scheduled system maintenance notifications", "SYSTEM", "HIGH"),
        ("admin_user_registration", "New User Registration", "New user registration alerts for admins", "SYSTEM", "NORMAL"),
        ("admin_payment_received", "Payment Received", "Payment received notifications for admins", "PAYMENT", "HIGH"),
        ("owner_subscription_expiring", "Subscription Expiring", "Subscription renewal reminders for owners", "PAYMENT", "HIGH"),
        ("owner_new_booking", "New Booking", "New booking notifications for owners", "BOOKING", "NORMAL"),
        ("owner_staff_task_completed", "Staff Task Completed", "Task completion notifications for owners", "STAFF", "NORMAL"),
        ("owner_low_inventory", "Low Inventory Alert", "Low inventory alerts for owners", "INVENTORY", "HIGH"),
        ("owner_api_disabled", "Service Unavailable", "Integration outage alerts for owners", "SYSTEM", "HIGH"),
        ("owner_api_restored", "Service Restored", "Integration restoration alerts for owners", "SYSTEM", "NORMAL"),
        ("customer_booking_confirmed", "Booking Confirmed", "Booking confirmation for customers", "BOOKING", "HIGH"),
        ("customer_checkin_reminder", "Check-in Reminder", "Check-in reminders for customers", "BOOKING", "NORMAL"),
        ("customer_payment_due", "Payment Due", "Payment due notifications for customers", "PAYMENT", "HIGH"),
        ("customer_loyalty_points", "Loyalty Points Earned", "Loyalty points notifications for customers", "CUSTOMER", "NORMAL"),
        ("staff_task_assigned", "Task Assigned", "New task assignments for staff", "STAFF", "HIGH"),
        ("staff_shift_reminder", "Shift Reminder", "Shift schedule reminders for staff", "STAFF", "NORMAL"),
        ("staff_inventory_alert", "Inventory Alert", "Inventory alerts for staff", "INVENTORY", "HIGH"),
        ("staff_maintenance_due", "Maintenance Due", "Maintenance reminders for staff", "MAINTENANCE", "NORMAL"),
    ]

    for type_key, name, description, category, priority in notification_types:
        cur.execute(
            """
            INSERT INTO notification_types (type_key, name, description, category, priority)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (type_key) DO NOTHING
            """,
            (type_key, name, description, category, priority),
        )


def ensure_guest_offers_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS guest_offers (
            id SERIAL PRIMARY KEY,
            hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            subtitle VARCHAR(200),
            description TEXT,
            original_price NUMERIC(12,2) DEFAULT 0,
            discounted_price NUMERIC(12,2) DEFAULT 0,
            discount_percentage INTEGER DEFAULT 0,
            offer_type VARCHAR(50) DEFAULT 'seasonal',
            image_url TEXT,
            badge_text VARCHAR(120),
            expiry_date DATE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        """
    )

    alter_statements = [
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS title VARCHAR(200)",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS subtitle VARCHAR(200)",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(12,2) DEFAULT 0",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS offer_type VARCHAR(50) DEFAULT 'seasonal'",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS image_url TEXT",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS badge_text VARCHAR(120)",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS expiry_date DATE",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
        "ALTER TABLE guest_offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
    ]
    for statement in alter_statements:
        cur.execute(statement)
