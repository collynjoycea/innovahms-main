from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import json
import requests
import threading
import re
import uuid
from html import escape
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from flask import Flask, jsonify

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:
    pass

try:
    from prophet import Prophet  # type: ignore
    PROPHET_AVAILABLE = True
except Exception:
    Prophet = None
    PROPHET_AVAILABLE = False

app = Flask(__name__, static_folder='static')

# FIX 1: Mas malawak na CORS configuration para sa Vite (5173 at 5174) at Localhost
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:3000"]}})

# --- CONFIGURATION ---

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "innovahmsdb"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "lily1245"),
        port=os.getenv("DB_PORT", "5432"),
    )

UPLOAD_FOLDER = 'static/uploads/rooms'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _safe_close(conn=None, cur=None):
    try:
        if cur is not None:
            cur.close()
    finally:
        if conn is not None:
            conn.close()


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


def _table_exists(cur, table_name):
    cur.execute(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = %s
        LIMIT 1
        """,
        (table_name,),
    )
    return cur.fetchone() is not None


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


def _parse_text_array(value):
    if isinstance(value, list):
        return [str(item) for item in value if item is not None]
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed if item is not None]
            except Exception:
                pass
        return [part.strip() for part in raw.split(",") if part.strip()]
    return []


GENERIC_TOUR_IMAGE_PATHS = {
    "/images/my-room-360.jpg",
    "/images/standard-room.jpg",
    "/images/deluxe-room.jpg",
    "/images/executive-penthouse.jpg",
    "/images/ocean-suite.jpg",
    "/images/room1.jpg",
}


def _default_tour_image_for_room(room_name=None, room_type=None):
    label = f"{room_name or ''} {room_type or ''}".strip().lower()
    if "single" in label or "standard" in label:
        return "/images/standard-room.jpg"
    if "double" in label:
        return "/images/my-room-360.jpg"
    if "deluxe" in label:
        return "/images/deluxe-room.jpg"
    if "executive" in label or "penthouse" in label:
        return "/images/executive-penthouse.jpg"
    if "ocean" in label or "suite" in label:
        return "/images/ocean-suite.jpg"
    return "/images/deluxe-room.jpg"


def _room_preview_image_for_tour(cur, room_id):
    if not _table_exists(cur, 'rooms'):
        return None

    cur.execute(
        """
        SELECT room_name, room_type, images
        FROM rooms
        WHERE id = %s
        LIMIT 1
        """,
        (room_id,),
    )
    row = cur.fetchone()
    if not row:
        return None

    images = _parse_text_array(row.get("images"))
    if images:
        return images[0]

    return _default_tour_image_for_room(row.get("room_name"), row.get("room_type"))


def _serialize_date(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _to_int_or_none(value):
    try:
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _hotel_geocoding_enabled():
    raw = str(os.getenv("HOTEL_GEOCODING_ENABLED", "true")).strip().lower()
    return raw not in {"0", "false", "no", "off"}


def _geocode_hotel_address(address, hotel_name=""):
    if not _hotel_geocoding_enabled():
        return None

    normalized_address = str(address or "").strip()
    normalized_hotel_name = str(hotel_name or "").strip()
    if len(normalized_address) < 6:
        return None

    base_url = os.getenv("HOTEL_GEOCODER_URL", "https://nominatim.openstreetmap.org/search")
    user_agent = os.getenv("HOTEL_GEOCODER_USER_AGENT", "InnovaHMS/1.0 (hotel geocoding)")
    candidates = []
    if normalized_hotel_name:
        candidates.append(f"{normalized_hotel_name}, {normalized_address}")
    candidates.append(normalized_address)

    headers = {"User-Agent": user_agent}
    for query in candidates:
        try:
            response = requests.get(
                base_url,
                params={
                    "q": query,
                    "format": "jsonv2",
                    "limit": 1,
                },
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            rows = response.json() or []
            if not rows:
                continue

            top = rows[0] or {}
            latitude = _to_float(top.get("lat"), 0)
            longitude = _to_float(top.get("lon"), 0)
            if latitude == 0 and longitude == 0:
                continue

            return {
                "latitude": latitude,
                "longitude": longitude,
                "display_name": top.get("display_name") or query,
            }
        except Exception as exc:
            print(f"Hotel geocoding skipped for '{query}': {exc}")
            continue

    return None


def _normalize_tier(points):
    score = _to_int(points, 0)
    if score >= 25000:
        return "DIAMOND"
    if score >= 10000:
        return "PLATINUM"
    if score >= 3000:
        return "GOLD"
    if score >= 500:
        return "SILVER"
    return "STANDARD"


def _tier_target(tier):
    mapping = {
        "STANDARD": 500,
        "SILVER": 3000,
        "GOLD": 10000,
        "PLATINUM": 25000,
        "DIAMOND": 25000,
    }
    return mapping.get(str(tier or "STANDARD").upper(), 500)


def _progress_percent(points, tier):
    points_value = _to_int(points, 0)
    current_tier = str(tier or "STANDARD").upper()
    floor_by_tier = {
        "STANDARD": 0,
        "SILVER": 500,
        "GOLD": 3000,
        "PLATINUM": 10000,
        "DIAMOND": 25000,
    }
    floor = floor_by_tier.get(current_tier, 0)
    ceiling = _tier_target(current_tier)
    span = max(ceiling - floor, 1)
    if current_tier == "DIAMOND":
        return 100
    return max(0, min(100, round(((points_value - floor) / span) * 100)))


def _build_tour_payload(cur, room_id):
    fallback_panorama = _room_preview_image_for_tour(cur, room_id)

    if not _table_exists(cur, 'room_tours'):
        if not fallback_panorama:
            return None
        return {
            "roomId": room_id,
            "panoramaUrl": fallback_panorama,
            "initialYaw": 0,
            "initialPitch": 0,
            "initialFov": 1.5708,
        }

    cur.execute(
        """
        SELECT room_id, panorama_url, initial_yaw, initial_pitch, initial_fov
        FROM room_tours
        WHERE room_id = %s
        LIMIT 1
        """,
        (room_id,),
    )
    row = cur.fetchone()
    if not row:
        if not fallback_panorama:
            return None
        return {
            "roomId": room_id,
            "panoramaUrl": fallback_panorama,
            "initialYaw": 0,
            "initialPitch": 0,
            "initialFov": 1.5708,
        }

    panorama_url = row.get("panorama_url")
    if fallback_panorama and (not panorama_url or panorama_url in GENERIC_TOUR_IMAGE_PATHS):
        panorama_url = fallback_panorama

    return {
        "roomId": row.get("room_id"),
        "panoramaUrl": panorama_url,
        "initialYaw": _to_float(row.get("initial_yaw"), 0),
        "initialPitch": _to_float(row.get("initial_pitch"), 0),
        "initialFov": _to_float(row.get("initial_fov"), 1.5708),
    }


def _normalize_room_status(value):
    raw = str(value or "").strip().lower()
    if raw in {"occupied", "checked_in", "in_use"}:
        return "occupied"
    if raw in {"dirty", "cleaning"}:
        return "dirty"
    if raw in {"maintenance", "repair"}:
        return "maintenance"
    if raw in {"available", "vacant", "ready"}:
        return "vacant"
    return "vacant"


def _is_truthy(value):
    if isinstance(value, bool):
        return value
    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "active", "on", "online"}


def _extract_reservation_date(row):
    candidates = [
        row.get("created_at"),
        row.get("check_in_date"),
        row.get("check_in"),
        row.get("booking_date"),
    ]
    for candidate in candidates:
        if candidate is None:
            continue
        if hasattr(candidate, "date"):
            try:
                return candidate.date() if hasattr(candidate, "hour") else candidate
            except Exception:
                pass
        if isinstance(candidate, str):
            for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                try:
                    return datetime.strptime(candidate[:19], fmt).date()
                except Exception:
                    continue
    return datetime.utcnow().date()


def _extract_reservation_amount(row):
    return _to_float(
        row.get("total_amount")
        or row.get("total_amount_php")
        or row.get("amount")
        or row.get("grand_total")
        or 0,
        0,
    )


def _country_lat_lng(label):
    base = {
        "philippines": (14.5995, 120.9842),
        "manila": (14.5995, 120.9842),
        "cebu": (10.3157, 123.8854),
        "singapore": (1.3521, 103.8198),
        "japan": (35.6762, 139.6503),
        "united states": (40.7128, -74.0060),
        "usa": (40.7128, -74.0060),
        "uae": (25.2048, 55.2708),
        "dubai": (25.2048, 55.2708),
    }
    key = str(label or "").strip().lower()
    return base.get(key, (14.5995, 120.9842))


def _period_bucket_key(day_value, period):
    if period == "daily":
        return day_value.isoformat()
    return f"{day_value.year}-{str(day_value.month).zfill(2)}"


def _next_period_label(last_label, period, step):
    if period == "daily":
        try:
            base = datetime.strptime(last_label, "%Y-%m-%d").date()
        except Exception:
            base = datetime.utcnow().date()
        return (base + timedelta(days=step)).isoformat()

    # monthly
    try:
        year, month = [int(part) for part in str(last_label).split("-")[:2]]
    except Exception:
        now = datetime.utcnow()
        year, month = now.year, now.month

    month_index = month - 1 + step
    next_year = year + (month_index // 12)
    next_month = (month_index % 12) + 1
    return f"{next_year}-{str(next_month).zfill(2)}"


def _linear_project(values, horizon):
    numeric = [float(v or 0) for v in (values or [])]
    if not numeric:
        return [0.0 for _ in range(horizon)]
    if len(numeric) == 1:
        return [max(0.0, numeric[-1]) for _ in range(horizon)]

    slope = (numeric[-1] - numeric[0]) / max(len(numeric) - 1, 1)
    projected = []
    last = numeric[-1]
    for idx in range(1, horizon + 1):
        projected.append(max(0.0, last + (slope * idx)))
    return projected


def _slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower()).strip("-")


def _parse_date_input(value):
    if not value:
        return None
    if hasattr(value, "isoformat"):
        return value
    text = str(value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text[:19], fmt).date()
        except Exception:
            continue
    return None


def _default_renewal_date(cycle, anchor=None):
    base = _parse_date_input(anchor) or datetime.utcnow().date()
    cycle_name = str(cycle or "MONTHLY").upper()
    return base + timedelta(days=365 if cycle_name == "ANNUAL" else 30)


def _subscription_cycle_dates(row=None, cycle=None, carry_requires_payment_proof=False):
    today = datetime.utcnow().date()
    current_row = row or {}
    current_status = str(current_row.get("status") or "PENDING").upper()
    current_renewal = _parse_date_input(current_row.get("renewal_date"))
    has_prior_paid_period = bool(current_row.get("last_paid_at"))
    should_carry_remaining = bool(
        current_status == "ACTIVE"
        and current_renewal
        and current_renewal > today
        and (has_prior_paid_period or not carry_requires_payment_proof)
    )
    anchor_date = current_renewal if should_carry_remaining else today
    return today, _default_renewal_date(cycle or current_row.get("billing_cycle"), anchor_date)


def _days_until_date(value):
    target = _parse_date_input(value)
    if not target:
        return None
    return (target - datetime.utcnow().date()).days


def _package_amount_for_cycle(package_row, cycle):
    if not package_row:
        return 0.0
    cycle_name = str(cycle or "MONTHLY").upper()
    if cycle_name == "ANNUAL":
        annual = _to_float(package_row.get("annual_price"), 0)
        if annual > 0:
            return annual
        return round(_to_float(package_row.get("monthly_price"), 0) * 12, 2)
    return _to_float(package_row.get("monthly_price"), 0)


CUSTOMER_PRIVILEGE_PLAN_DEFINITIONS = {
    "silver": {
        "name": "Silver",
        "slug": "silver",
        "description": "Entry access to member pricing and elevated guest benefits.",
        "monthly_price": 399,
        "annual_price": 3990,
        "bonus_points": 500,
        "display_order": 1,
        "is_popular": False,
        "perks": [
            "Member-only room rate previews",
            "5% dining and add-on discount",
            "Priority support queue",
            "500 welcome points on activation",
        ],
    },
    "gold": {
        "name": "Gold",
        "slug": "gold",
        "description": "Balanced premium tier for frequent leisure and business travelers.",
        "monthly_price": 799,
        "annual_price": 7990,
        "bonus_points": 1500,
        "display_order": 2,
        "is_popular": True,
        "perks": [
            "Everything in Silver",
            "10% member booking discount",
            "Upgrade priority on eligible stays",
            "1,500 bonus points every successful renewal",
        ],
    },
    "platinum": {
        "name": "Platinum",
        "slug": "platinum",
        "description": "High-touch privileges with richer discounts and concierge-focused perks.",
        "monthly_price": 1499,
        "annual_price": 14990,
        "bonus_points": 4000,
        "display_order": 3,
        "is_popular": False,
        "perks": [
            "Everything in Gold",
            "15% member booking discount",
            "Late checkout priority requests",
            "Dedicated privilege support line",
            "4,000 bonus points every successful renewal",
        ],
    },
}


CUSTOMER_PRIVILEGE_BOOKING_DISCOUNTS = {
    "silver": 5,
    "gold": 10,
    "platinum": 15,
}


ABOUT_PAGE_DEFAULT = {
    "hero_eyebrow": "About Innova HMS",
    "hero_title": "Revolutionizing Hospitality through AI",
    "hero_highlight": "through AI",
    "hero_subtitle": "Empowering high-end hospitality management with intelligent automation and seamless guest experiences.",
    "story_eyebrow": "Our Story",
    "story_title": "Defining the Future of Luxury Service",
    "story_body": "Founded at the intersection of luxury hospitality and cutting-edge technology, Innova HMS was built to simplify complex operations while elevating the human touch across every stay.",
    "network_eyebrow": "Global Network Live",
    "network_title": "Our Global Footprint",
    "network_body": "Built for hospitality operations that need one connected platform across multiple properties, teams, and guest touchpoints.",
    "cta_title": "Partner with Innova HMS",
    "cta_body": "Bring your hotel operations, staff coordination, and guest experience workflows into one connected platform.",
    "cta_button_label": "Start with Innova",
    "contact_phone": "09605736024",
    "hero_image_url": "/images/hero-lobby.jpg",
    "story_image_url": "/images/about-story-staff.jpg",
    "network_image_url": "/images/global-network-map.jpg",
}


OWNER_PLAN_DEFINITIONS = {
    "starter": {
        "name": "Starter",
        "slug": "starter",
        "description": "Core owner tools for boutique and emerging hotel properties.",
        "monthly_price": 8000,
        "annual_price": 86400,
        "max_rooms": 30,
        "display_order": 1,
        "is_popular": False,
        "features": [
            "Dashboard overview",
            "Room management",
            "Reservations and customers",
            "Guest reviews",
            "Up to 30 rooms",
        ],
        "allowed_features": {"dashboard", "rooms", "reservations", "customers", "reviews"},
    },
    "pro": {
        "name": "Pro",
        "slug": "pro",
        "description": "Operational suite for growing hotels that need team and stock workflows.",
        "monthly_price": 25000,
        "annual_price": 270000,
        "max_rooms": 100,
        "display_order": 2,
        "is_popular": True,
        "features": [
            "Everything in Starter",
            "Housekeeping workspace",
            "Inventory monitoring",
            "Staff management",
            "Up to 100 rooms",
        ],
        "allowed_features": {"dashboard", "rooms", "reservations", "customers", "reviews", "housekeeping", "inventory", "staff"},
    },
    "enterprise": {
        "name": "Enterprise",
        "slug": "enterprise",
        "description": "Full management suite with analytics and premium operator controls.",
        "monthly_price": 50000,
        "annual_price": 540000,
        "max_rooms": None,
        "display_order": 3,
        "is_popular": False,
        "features": [
            "Everything in Pro",
            "Advanced reports",
            "Simulation tools",
            "Promotion management",
            "Unlimited rooms",
        ],
        "allowed_features": {"dashboard", "rooms", "reservations", "customers", "reviews", "housekeeping", "inventory", "staff", "reports", "promotions"},
    },
}


OWNER_FEATURE_CATALOG = {
    "dashboard": {"label": "Dashboard", "requiredPlan": "Starter"},
    "rooms": {"label": "Room Management", "requiredPlan": "Starter"},
    "reservations": {"label": "Reservations", "requiredPlan": "Starter"},
    "customers": {"label": "Customer Management", "requiredPlan": "Starter"},
    "reviews": {"label": "Reviews", "requiredPlan": "Starter"},
    "housekeeping": {"label": "Housekeeping", "requiredPlan": "Pro"},
    "inventory": {"label": "Inventory", "requiredPlan": "Pro"},
    "staff": {"label": "Staff Management", "requiredPlan": "Pro"},
    "reports": {"label": "Reports", "requiredPlan": "Enterprise"},
    "promotions": {"label": "Promotions", "requiredPlan": "Enterprise"},
}


def _owner_plan_definition(slug):
    return OWNER_PLAN_DEFINITIONS.get(str(slug or "").strip().lower(), {})


def _owner_plan_allowed_features(slug):
    return sorted(_owner_plan_definition(slug).get("allowed_features", set()))


def _ensure_membership_tables(cur):
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
        _execute_in_savepoint(
            cur,
            statement,
            ignore_errors=True,
            prefix="membership_package_alter",
        )

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
        _execute_in_savepoint(
            cur,
            statement,
            ignore_errors=True,
            prefix="hotel_subscription_alter",
        )

    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_package_subscriptions_hotel_id ON hotel_package_subscriptions(hotel_id)")
    # Ensure unique constraint exists (in case index was converted to constraint)
    _execute_in_savepoint(
        cur,
        "ALTER TABLE hotel_package_subscriptions ADD CONSTRAINT hotel_package_subscriptions_hotel_id_unique UNIQUE (hotel_id)",
        ignore_errors=True,
        prefix="hotel_subscription_constraint",
    )


def _seed_membership_packages(cur):
    _ensure_membership_tables(cur)

    for package in OWNER_PLAN_DEFINITIONS.values():
        cur.execute(
            """
            INSERT INTO membership_packages (
                name, slug, description, monthly_price, annual_price,
                max_rooms, features, is_popular, is_active, display_order
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                monthly_price = EXCLUDED.monthly_price,
                annual_price = EXCLUDED.annual_price,
                max_rooms = EXCLUDED.max_rooms,
                features = EXCLUDED.features,
                is_popular = EXCLUDED.is_popular,
                is_active = TRUE,
                display_order = EXCLUDED.display_order,
                updated_at = NOW()
            """,
            (
                package["name"],
                package["slug"],
                package["description"],
                package["monthly_price"],
                package["annual_price"],
                package["max_rooms"],
                package["features"],
                package["is_popular"],
                package["display_order"],
            ),
        )

    cur.execute(
        """
        SELECT id, monthly_price
        FROM membership_packages
        WHERE slug = 'starter'
        LIMIT 1
        """
    )
    starter = cur.fetchone() or {}
    return _to_int(starter.get("id"), 0), _to_float(starter.get("monthly_price"), 0)


def _ensure_hotel_subscription(cur, hotel_id, package_id, amount, status="ACTIVE", cycle="MONTHLY"):
    if not hotel_id or not package_id:
        return

    normalized_cycle = str(cycle or "MONTHLY").upper()
    normalized_status = str(status or "PENDING").upper()
    cur.execute(
        """
        INSERT INTO hotel_package_subscriptions (
            hotel_id, package_id, billing_cycle, amount, status, starts_at, renewal_date
        )
        VALUES (%s, %s, %s, %s, %s, CURRENT_DATE, %s)
        ON CONFLICT (hotel_id) DO NOTHING
        """,
        (
            hotel_id,
            package_id,
            normalized_cycle,
            amount,
            normalized_status,
            _default_renewal_date(normalized_cycle),
        ),
    )


def _backfill_hotel_subscriptions(cur):
    starter_id, starter_amount = _seed_membership_packages(cur)
    if not starter_id:
        return

    cur.execute(
        """
        UPDATE hotel_package_subscriptions s
        SET owner_id = h.owner_id
        FROM hotels h
        WHERE s.hotel_id = h.id
          AND s.owner_id IS NULL
          AND h.owner_id IS NOT NULL
        """
    )

    cur.execute(
        """
        INSERT INTO hotel_package_subscriptions (
            owner_id, hotel_id, package_id, billing_cycle, amount, status, payment_status, starts_at, renewal_date
        )
        SELECT
            h.owner_id,
            h.id,
            %s,
            'MONTHLY',
            %s,
            'PENDING',
            'UNPAID',
            CURRENT_DATE,
            NULL
        FROM hotels h
        LEFT JOIN hotel_package_subscriptions s ON s.hotel_id = h.id
        WHERE s.id IS NULL
        """,
        (starter_id, starter_amount),
    )


def _customer_plan_definition(slug):
    return CUSTOMER_PRIVILEGE_PLAN_DEFINITIONS.get(str(slug or "").strip().lower(), {})


def _customer_tier_rank(tier):
    order = {
        "STANDARD": 0,
        "SILVER": 1,
        "GOLD": 2,
        "PLATINUM": 3,
        "DIAMOND": 4,
    }
    return order.get(str(tier or "STANDARD").strip().upper(), 0)


def _higher_customer_tier(left, right):
    left_tier = str(left or "STANDARD").upper()
    right_tier = str(right or "STANDARD").upper()
    return left_tier if _customer_tier_rank(left_tier) >= _customer_tier_rank(right_tier) else right_tier


def _ensure_customer_privilege_tables(cur):
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


def _seed_customer_privilege_packages(cur):
    _ensure_customer_privilege_tables(cur)
    for package in CUSTOMER_PRIVILEGE_PLAN_DEFINITIONS.values():
        cur.execute(
            """
            INSERT INTO customer_privilege_packages (
                name, slug, description, monthly_price, annual_price,
                bonus_points, perks, is_popular, is_active, display_order
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                monthly_price = EXCLUDED.monthly_price,
                annual_price = EXCLUDED.annual_price,
                bonus_points = EXCLUDED.bonus_points,
                perks = EXCLUDED.perks,
                is_popular = EXCLUDED.is_popular,
                is_active = TRUE,
                display_order = EXCLUDED.display_order,
                updated_at = NOW()
            """,
            (
                package["name"],
                package["slug"],
                package["description"],
                package["monthly_price"],
                package["annual_price"],
                package["bonus_points"],
                package["perks"],
                package["is_popular"],
                package["display_order"],
            ),
        )


def _get_customer_loyalty(cur, customer_id):
    _ensure_customer_privilege_tables(cur)
    cur.execute(
        """
        SELECT customer_id, points, tier, points_this_month
        FROM customer_loyalty
        WHERE customer_id = %s
        LIMIT 1
        """,
        (customer_id,),
    )
    row = cur.fetchone()
    if row:
        return row

    cur.execute(
        """
        SELECT COALESCE(loyalty_points, 0) AS loyalty_points, COALESCE(membership_level, 'STANDARD') AS membership_level
        FROM customers
        WHERE id = %s
        LIMIT 1
        """,
        (customer_id,),
    )
    customer = cur.fetchone() or {}
    seeded_points = _to_int(customer.get("loyalty_points"), 0)
    seeded_tier = str(customer.get("membership_level") or _normalize_tier(seeded_points)).upper()
    cur.execute(
        """
        INSERT INTO customer_loyalty (customer_id, points, tier, points_this_month, updated_at)
        VALUES (%s, %s, %s, 0, NOW())
        ON CONFLICT (customer_id) DO UPDATE SET
            points = EXCLUDED.points,
            tier = EXCLUDED.tier,
            updated_at = NOW()
        RETURNING customer_id, points, tier, points_this_month
        """,
        (customer_id, seeded_points, seeded_tier),
    )
    return cur.fetchone() or {
        "customer_id": customer_id,
        "points": seeded_points,
        "tier": seeded_tier,
        "points_this_month": 0,
    }


def _sync_customer_loyalty(cur, customer_id, points, tier, points_this_month):
    normalized_points = _to_int(points, 0)
    normalized_tier = str(tier or _normalize_tier(normalized_points)).upper()
    normalized_monthly = _to_int(points_this_month, 0)
    cur.execute(
        """
        INSERT INTO customer_loyalty (customer_id, points, tier, points_this_month, updated_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (customer_id) DO UPDATE SET
            points = EXCLUDED.points,
            tier = EXCLUDED.tier,
            points_this_month = EXCLUDED.points_this_month,
            updated_at = NOW()
        """,
        (customer_id, normalized_points, normalized_tier, normalized_monthly),
    )
    if _table_has_column(cur, "customers", "loyalty_points") and _table_has_column(cur, "customers", "membership_level"):
        cur.execute(
            "UPDATE customers SET loyalty_points = %s, membership_level = %s WHERE id = %s",
            (normalized_points, normalized_tier, customer_id),
        )


def _apply_customer_loyalty_bonus(cur, customer_id, bonus_points=0, tier_floor=None):
    loyalty = _get_customer_loyalty(cur, customer_id)
    next_points = _to_int(loyalty.get("points"), 0) + _to_int(bonus_points, 0)
    earned_tier = _normalize_tier(next_points)
    next_tier = _higher_customer_tier(earned_tier, tier_floor or loyalty.get("tier"))
    next_points_this_month = _to_int(loyalty.get("points_this_month"), 0) + _to_int(bonus_points, 0)
    _sync_customer_loyalty(cur, customer_id, next_points, next_tier, next_points_this_month)
    return {
        "customer_id": customer_id,
        "points": next_points,
        "tier": next_tier,
        "points_this_month": next_points_this_month,
    }


def _get_customer_privilege_subscription(cur, customer_id):
    _ensure_customer_privilege_tables(cur)
    cur.execute(
        """
        SELECT
            s.*,
            p.name AS package_name,
            p.slug AS package_slug,
            p.description AS package_description,
            p.monthly_price,
            p.annual_price,
            p.bonus_points,
            p.perks
        FROM customer_privilege_subscriptions s
        LEFT JOIN customer_privilege_packages p ON p.id = s.package_id
        WHERE s.customer_id = %s
        ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
        LIMIT 1
        """,
        (customer_id,),
    )
    return cur.fetchone()


def _serialize_customer_privilege_subscription(row):
    if not row:
        return {
            "id": None,
            "status": "UNPAID",
            "paymentStatus": "UNPAID",
            "isActive": False,
            "packageId": None,
            "packageName": None,
            "packageSlug": None,
            "billingCycle": None,
            "amount": 0,
            "renewalDate": None,
            "bonusPoints": 0,
            "perks": [],
        }

    status = str(row.get("status") or "PENDING").upper()
    renewal_date = _parse_date_input(row.get("renewal_date"))
    is_active = status == "ACTIVE" and (renewal_date is None or renewal_date >= datetime.utcnow().date())
    return {
        "id": row.get("id"),
        "status": status,
        "paymentStatus": str(row.get("payment_status") or "UNPAID").upper(),
        "isActive": is_active,
        "packageId": row.get("package_id"),
        "packageName": row.get("package_name"),
        "packageSlug": row.get("package_slug"),
        "packageDescription": row.get("package_description") or "",
        "billingCycle": str(row.get("billing_cycle") or "MONTHLY").upper(),
        "amount": _to_float(row.get("amount"), 0),
        "renewalDate": _serialize_date(row.get("renewal_date")),
        "lastPaidAt": _serialize_date(row.get("last_paid_at")),
        "bonusPoints": _to_int(row.get("bonus_points"), 0),
        "perks": row.get("perks") or [],
    }


def _customer_booking_discount_percent(subscription):
    if not subscription or not subscription.get("isActive"):
        return 0
    return _to_int(
        CUSTOMER_PRIVILEGE_BOOKING_DISCOUNTS.get(str(subscription.get("packageSlug") or "").strip().lower()),
        0,
    )


def _build_customer_booking_pricing(cur, customer_id, base_amount):
    normalized_base = round(max(_to_float(base_amount, 0), 0), 2)
    subscription = _serialize_customer_privilege_subscription(_get_customer_privilege_subscription(cur, customer_id)) if customer_id else {}
    discount_percent = _customer_booking_discount_percent(subscription)
    discount_amount = round(normalized_base * (discount_percent / 100), 2) if discount_percent > 0 else 0.0
    total_amount = round(max(normalized_base - discount_amount, 0), 2)
    return {
        "baseAmount": normalized_base,
        "discountPercent": discount_percent,
        "discountAmount": discount_amount,
        "totalAmount": total_amount,
        "subscription": subscription,
    }


def _ensure_reservation_pricing_columns(cur):
    statements = [
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12, 2)",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS privilege_discount_percent INTEGER DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS privilege_discount_amount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS applied_privilege_slug VARCHAR(80)",
        "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS applied_privilege_name VARCHAR(80)",
    ]
    for statement in statements:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="reservation_pricing_alter")


def _ensure_about_page_table(cur):
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
            ABOUT_PAGE_DEFAULT["hero_eyebrow"],
            ABOUT_PAGE_DEFAULT["hero_title"],
            ABOUT_PAGE_DEFAULT["hero_highlight"],
            ABOUT_PAGE_DEFAULT["hero_subtitle"],
            ABOUT_PAGE_DEFAULT["story_eyebrow"],
            ABOUT_PAGE_DEFAULT["story_title"],
            ABOUT_PAGE_DEFAULT["story_body"],
            ABOUT_PAGE_DEFAULT["network_eyebrow"],
            ABOUT_PAGE_DEFAULT["network_title"],
            ABOUT_PAGE_DEFAULT["network_body"],
            ABOUT_PAGE_DEFAULT["cta_title"],
            ABOUT_PAGE_DEFAULT["cta_body"],
            ABOUT_PAGE_DEFAULT["cta_button_label"],
            ABOUT_PAGE_DEFAULT["contact_phone"],
            ABOUT_PAGE_DEFAULT["hero_image_url"],
            ABOUT_PAGE_DEFAULT["story_image_url"],
            ABOUT_PAGE_DEFAULT["network_image_url"],
        ),
    )
    cur.execute(
        """
        UPDATE site_about_content
        SET contact_phone = COALESCE(NULLIF(contact_phone, ''), %s),
            updated_at = NOW()
        WHERE id = 1
        """,
        (ABOUT_PAGE_DEFAULT["contact_phone"],),
    )


def _build_about_page_payload(cur):
    _ensure_about_page_table(cur)

    cur.execute("SELECT * FROM site_about_content WHERE id = 1 LIMIT 1")
    content = cur.fetchone() or {}

    hotel_count = room_count = reservation_count = customer_count = owner_count = 0
    featured_hotels = []

    if _table_exists(cur, "hotels"):
        cur.execute("SELECT COUNT(*) AS count FROM hotels")
        hotel_count = _to_int((cur.fetchone() or {}).get("count"), 0)

        select_cols = ["id", "hotel_name"]
        if _table_has_column(cur, "hotels", "hotel_address"):
            select_cols.append("hotel_address")
        query = f"SELECT {', '.join(select_cols)} FROM hotels ORDER BY id DESC LIMIT 4"
        cur.execute(query)
        for row in cur.fetchall() or []:
            featured_hotels.append({
                "id": row.get("id"),
                "name": row.get("hotel_name") or "Innova Property",
                "address": row.get("hotel_address") or "",
            })

    if _table_exists(cur, "rooms"):
        cur.execute("SELECT COUNT(*) AS count FROM rooms")
        room_count = _to_int((cur.fetchone() or {}).get("count"), 0)

    if _table_exists(cur, "reservations"):
        cur.execute("SELECT COUNT(*) AS count FROM reservations")
        reservation_count = _to_int((cur.fetchone() or {}).get("count"), 0)

    if _table_exists(cur, "customers"):
        cur.execute("SELECT COUNT(*) AS count FROM customers")
        customer_count = _to_int((cur.fetchone() or {}).get("count"), 0)

    if _table_exists(cur, "owners"):
        cur.execute("SELECT COUNT(*) AS count FROM owners")
        owner_count = _to_int((cur.fetchone() or {}).get("count"), 0)

    stats = [
        {
            "label": "Hotels Connected",
            "value": hotel_count,
            "helper": "Properties onboarded into the platform",
        },
        {
            "label": "Smart Rooms",
            "value": room_count,
            "helper": "Rooms actively managed through Innova HMS",
        },
        {
            "label": "Guest Bookings",
            "value": reservation_count,
            "helper": "Reservations processed across connected stays",
        },
        {
            "label": "Customer Profiles",
            "value": customer_count,
            "helper": "Guests tracked with loyalty and booking history",
        },
    ]

    return {
        "content": {
            "heroEyebrow": content.get("hero_eyebrow") or ABOUT_PAGE_DEFAULT["hero_eyebrow"],
            "heroTitle": content.get("hero_title") or ABOUT_PAGE_DEFAULT["hero_title"],
            "heroHighlight": content.get("hero_highlight") or ABOUT_PAGE_DEFAULT["hero_highlight"],
            "heroSubtitle": content.get("hero_subtitle") or ABOUT_PAGE_DEFAULT["hero_subtitle"],
            "storyEyebrow": content.get("story_eyebrow") or ABOUT_PAGE_DEFAULT["story_eyebrow"],
            "storyTitle": content.get("story_title") or ABOUT_PAGE_DEFAULT["story_title"],
            "storyBody": content.get("story_body") or ABOUT_PAGE_DEFAULT["story_body"],
            "networkEyebrow": content.get("network_eyebrow") or ABOUT_PAGE_DEFAULT["network_eyebrow"],
            "networkTitle": content.get("network_title") or ABOUT_PAGE_DEFAULT["network_title"],
            "networkBody": content.get("network_body") or ABOUT_PAGE_DEFAULT["network_body"],
            "ctaTitle": content.get("cta_title") or ABOUT_PAGE_DEFAULT["cta_title"],
            "ctaBody": content.get("cta_body") or ABOUT_PAGE_DEFAULT["cta_body"],
            "ctaButtonLabel": content.get("cta_button_label") or ABOUT_PAGE_DEFAULT["cta_button_label"],
            "contactPhone": content.get("contact_phone") or ABOUT_PAGE_DEFAULT["contact_phone"],
            "heroImageUrl": content.get("hero_image_url") or ABOUT_PAGE_DEFAULT["hero_image_url"],
            "storyImageUrl": content.get("story_image_url") or ABOUT_PAGE_DEFAULT["story_image_url"],
            "networkImageUrl": content.get("network_image_url") or ABOUT_PAGE_DEFAULT["network_image_url"],
        },
        "stats": stats,
        "featuredHotels": featured_hotels,
        "support": {
            "owners": owner_count,
            "coverage": max(hotel_count, len(featured_hotels)),
        },
    }


def _customer_privilege_simulation_enabled():
    raw = os.getenv("PAYMONGO_CUSTOMER_SIMULATION")
    if str(raw or "").strip():
        return _is_truthy(raw)
    return _owner_subscription_simulation_enabled()


def _customer_privilege_simulated_link_id(customer_id, package_id, billing_cycle):
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    cycle_name = str(billing_cycle or "MONTHLY").upper()
    return f"simcust_{customer_id}_{package_id}_{cycle_name}_{stamp}"


def _customer_privilege_checkout_url(frontend_url, state, simulated=False):
    suffix = "&simulation=1" if simulated else ""
    return f"{frontend_url}/privileges?payment={state}{suffix}"


def _build_customer_membership_summary(cur, customer_id):
    _ensure_customer_privilege_tables(cur)
    _seed_customer_privilege_packages(cur)

    customer_columns = ["id", "first_name", "last_name", "email", "contact_number"]
    if _table_has_column(cur, "customers", "profile_image"):
        customer_columns.append("profile_image")
    cur.execute(
        f"""
        SELECT {', '.join(customer_columns)}
        FROM customers
        WHERE id = %s
        LIMIT 1
        """,
        (customer_id,),
    )
    customer = cur.fetchone()
    if not customer:
        return None

    monthly_spend = 0.0
    total_spend = 0.0
    if _table_exists(cur, "reservations"):
        cur.execute(
            """
            SELECT total_amount, check_in_date
            FROM reservations
            WHERE customer_id = %s
            """,
            (customer_id,),
        )
        rows = cur.fetchall() or []
        today = datetime.now()
        for row in rows:
            amount = _to_float(row.get("total_amount"), 0)
            total_spend += amount
            check_in = row.get("check_in_date")
            if check_in and hasattr(check_in, "month") and check_in.month == today.month and check_in.year == today.year:
                monthly_spend += amount

    loyalty = _get_customer_loyalty(cur, customer_id)
    points = _to_int(loyalty.get("points"), int(total_spend // 100))
    raw_tier = str(loyalty.get("tier") or _normalize_tier(points)).upper()
    points_this_month = _to_int(loyalty.get("points_this_month"), int(monthly_spend // 100))
    if points_this_month == 0 and monthly_spend > 0:
        points_this_month = int(monthly_spend // 100)

    subscription = _serialize_customer_privilege_subscription(_get_customer_privilege_subscription(cur, customer_id))
    effective_tier = _higher_customer_tier(raw_tier, str(subscription.get("packageSlug") or "").upper() if subscription.get("isActive") else raw_tier)
    progress = _progress_percent(points, effective_tier)
    booking_discount_percent = _customer_booking_discount_percent(subscription)

    return {
        "customerId": customer_id,
        "points": points,
        "tier": effective_tier,
        "loyaltyTier": raw_tier,
        "pointsThisMonth": points_this_month,
        "nextRewardProgressPercent": progress,
        "privilege": subscription,
        "bookingPrivilege": {
            "discountPercent": booking_discount_percent,
            "isActive": bool(subscription.get("isActive")),
            "packageName": subscription.get("packageName"),
            "packageSlug": subscription.get("packageSlug"),
        },
        "user": {
            "id": customer.get("id"),
            "firstName": customer.get("first_name") or "Guest",
            "lastName": customer.get("last_name") or "",
            "email": customer.get("email") or "",
            "contactNumber": customer.get("contact_number") or "",
            "profileImage": customer.get("profile_image") or "",
        },
    }


def _customer_privilege_success_response(cur, customer_id, amount, is_simulated):
    summary = _build_customer_membership_summary(cur, customer_id)
    return jsonify({
        "status": "paid",
        "amount": amount,
        "summary": summary,
        "subscription": (summary or {}).get("privilege") or {},
        "isSimulated": is_simulated,
    }), 200


def _get_owner_subscription(cur, owner_id):
    _ensure_membership_tables(cur)
    cur.execute(
        """
        SELECT
            s.*,
            p.name AS package_name,
            p.slug AS package_slug,
            p.description AS package_description,
            p.monthly_price,
            p.annual_price,
            p.max_rooms,
            p.features,
            h.hotel_name,
            h.hotel_code,
            h.hotel_address
        FROM hotel_package_subscriptions s
        LEFT JOIN membership_packages p ON p.id = s.package_id
        LEFT JOIN hotels h ON h.id = s.hotel_id
        WHERE s.owner_id = %s
           OR (s.owner_id IS NULL AND h.owner_id = %s)
        ORDER BY s.updated_at DESC NULLS LAST, s.id DESC
        LIMIT 1
        """,
        (owner_id, owner_id),
    )
    row = cur.fetchone()
    if not row:
        return None

    if row.get("owner_id") is None:
        cur.execute(
            "UPDATE hotel_package_subscriptions SET owner_id = %s WHERE id = %s",
            (owner_id, row.get("id")),
        )
        row["owner_id"] = owner_id

    renewal_date = _parse_date_input(row.get("renewal_date"))
    status = str(row.get("status") or "PENDING").upper()
    if status == "ACTIVE" and renewal_date and renewal_date < datetime.utcnow().date():
        cur.execute(
            """
            UPDATE hotel_package_subscriptions
            SET status = 'EXPIRED', payment_status = CASE WHEN payment_status = 'PAID' THEN 'PAID' ELSE payment_status END, updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (row.get("id"),),
        )
        refreshed = cur.fetchone()
        if refreshed:
            row.update(refreshed)
            row["package_name"] = row.get("package_name")
    return row


def _serialize_owner_subscription(row):
    if not row:
        return {
            "id": None,
            "status": "UNPAID",
            "paymentStatus": "UNPAID",
            "isActive": False,
            "packageId": None,
            "packageName": None,
            "packageSlug": None,
            "billingCycle": None,
            "amount": 0,
            "renewalDate": None,
            "hotelId": None,
            "hotelName": None,
            "hotelCode": None,
            "hotelAddress": None,
            "hasHotel": False,
            "maxRooms": None,
            "roomLimit": None,
            "features": [],
            "allowedOwnerFeatures": [],
            "daysUntilRenewal": None,
            "expiringSoon": False,
        }

    status = str(row.get("status") or "PENDING").upper()
    renewal_date = _parse_date_input(row.get("renewal_date"))
    is_active = status == "ACTIVE" and (renewal_date is None or renewal_date >= datetime.utcnow().date())
    days_until_renewal = _days_until_date(renewal_date)
    expiring_soon = bool(is_active and days_until_renewal is not None and 1 <= days_until_renewal <= 7)
    plan_slug = row.get("package_slug")
    room_limit = row.get("max_rooms")
    if room_limit is None:
        room_limit = _owner_plan_definition(plan_slug).get("max_rooms")
    allowed_features = _owner_plan_allowed_features(plan_slug) if is_active else []
    return {
        "id": row.get("id"),
        "status": status,
        "paymentStatus": str(row.get("payment_status") or "UNPAID").upper(),
        "isActive": is_active,
        "packageId": row.get("package_id"),
        "packageName": row.get("package_name"),
        "packageSlug": row.get("package_slug"),
        "packageDescription": row.get("package_description") or "",
        "billingCycle": str(row.get("billing_cycle") or "MONTHLY").upper(),
        "amount": _to_float(row.get("amount"), 0),
        "renewalDate": _serialize_date(row.get("renewal_date")),
        "lastPaidAt": _serialize_date(row.get("last_paid_at")),
        "hotelId": row.get("hotel_id"),
        "hotelName": row.get("hotel_name"),
        "hotelCode": row.get("hotel_code"),
        "hotelAddress": row.get("hotel_address"),
        "hasHotel": bool(row.get("hotel_id")),
        "maxRooms": row.get("max_rooms"),
        "roomLimit": room_limit,
        "features": row.get("features") or [],
        "allowedOwnerFeatures": allowed_features,
        "daysUntilRenewal": days_until_renewal,
        "expiringSoon": expiring_soon,
    }


def _owner_has_active_subscription(cur, owner_id):
    subscription = _get_owner_subscription(cur, owner_id)
    return _serialize_owner_subscription(subscription).get("isActive", False)


def _owner_subscription_required_response():
    return jsonify({
        "error": "An active subscription is required before using this owner function.",
        "code": "SUBSCRIPTION_REQUIRED",
    }), 403


def _hotel_owner_id(cur, hotel_id):
    cur.execute("SELECT owner_id FROM hotels WHERE id = %s LIMIT 1", (hotel_id,))
    row = cur.fetchone() or {}
    return row.get("owner_id")


def _room_owner_id(cur, room_id):
    cur.execute(
        """
        SELECT h.owner_id
        FROM rooms r
        JOIN hotels h ON h.id = r.hotel_id
        WHERE r.id = %s
        LIMIT 1
        """,
        (room_id,),
    )
    row = cur.fetchone() or {}
    return row.get("owner_id")


def _reservation_owner_id(cur, reservation_id):
    cur.execute(
        """
        SELECT COALESCE(h.owner_id, hr.owner_id) AS owner_id
        FROM reservations r
        LEFT JOIN hotels h ON h.id = r.hotel_id
        LEFT JOIN rooms rm ON rm.id = r.room_id
        LEFT JOIN hotels hr ON hr.id = rm.hotel_id
        WHERE r.id = %s
        LIMIT 1
        """,
        (reservation_id,),
    )
    row = cur.fetchone() or {}
    return row.get("owner_id")


def _owner_can_mutate(cur, owner_id):
    return bool(owner_id) and _owner_has_active_subscription(cur, owner_id)


def _ensure_profile_media_columns(cur):
    statements = [
        "ALTER TABLE owners ADD COLUMN IF NOT EXISTS profile_image TEXT",
        "ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_image TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS hotel_logo TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS hotel_building_image TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS hotel_description TEXT",
        "ALTER TABLE hotels ADD COLUMN IF NOT EXISTS contact_phone TEXT",
    ]
    for statement in statements:
        _execute_in_savepoint(cur, statement, ignore_errors=True, prefix="profile_media_alter")


def _room_preview_image_for_hotel(cur, hotel_id):
    if not hotel_id or not _table_exists(cur, "rooms"):
        return ""

    cur.execute(
        """
        SELECT images
        FROM rooms
        WHERE hotel_id = %s
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
        """,
        (hotel_id,),
    )
    room = cur.fetchone() or {}
    images = _parse_text_array(room.get("images"))
    return images[0] if images else ""


def _owner_profile_payload(cur, owner_id):
    _ensure_profile_media_columns(cur)

    select_columns = [
        "o.id",
        "o.first_name",
        "o.last_name",
        "o.email",
        "o.contact_number",
        "o.profile_image",
        "h.id AS hotel_id",
        "h.hotel_name",
        "h.hotel_code",
        "h.hotel_address",
        "h.hotel_logo",
        "h.hotel_building_image",
        "h.hotel_description",
        "h.contact_phone",
        "h.latitude",
        "h.longitude",
    ]
    cur.execute(
        f"""
        SELECT {', '.join(select_columns)}
        FROM owners o
        LEFT JOIN hotels h ON h.owner_id = o.id
        WHERE o.id = %s
        ORDER BY h.id ASC NULLS LAST
        LIMIT 1
        """,
        (owner_id,),
    )
    row = cur.fetchone()
    if not row:
        return None

    hotel_id = row.get("hotel_id")
    room_count = reservation_count = 0
    revenue = 0.0
    if hotel_id and _table_exists(cur, "rooms"):
        cur.execute("SELECT COUNT(*) AS count FROM rooms WHERE hotel_id = %s", (hotel_id,))
        room_count = _to_int((cur.fetchone() or {}).get("count"), 0)
    if hotel_id and _table_exists(cur, "reservations"):
        cur.execute(
            """
            SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS revenue
            FROM reservations
            WHERE hotel_id = %s
            """,
            (hotel_id,),
        )
        reservation_row = cur.fetchone() or {}
        reservation_count = _to_int(reservation_row.get("count"), 0)
        revenue = _to_float(reservation_row.get("revenue"), 0)

    fallback_room_image = _room_preview_image_for_hotel(cur, hotel_id)
    hotel_logo = row.get("hotel_logo") or ""
    building_image = row.get("hotel_building_image") or hotel_logo or fallback_room_image or "/images/signup-img.png"
    business_image = hotel_logo or building_image

    return {
        "owner": {
            "id": row.get("id"),
            "firstName": row.get("first_name") or "",
            "lastName": row.get("last_name") or "",
            "email": row.get("email") or "",
            "contactNumber": row.get("contact_number") or "",
            "profileImage": row.get("profile_image") or "",
        },
        "hotel": {
            "id": hotel_id,
            "hotelName": row.get("hotel_name") or "",
            "hotelCode": row.get("hotel_code") or "",
            "hotelAddress": row.get("hotel_address") or "",
            "hotelDescription": row.get("hotel_description") or "",
            "contactPhone": row.get("contact_phone") or row.get("contact_number") or "",
            "businessImage": business_image,
            "hotelLogo": hotel_logo,
            "buildingImage": building_image,
            "latitude": row.get("latitude"),
            "longitude": row.get("longitude"),
        },
        "stats": {
            "roomCount": room_count,
            "reservationCount": reservation_count,
            "revenue": revenue,
        },
    }


def _owner_session_payload(cur, owner_row):
    _ensure_profile_media_columns(cur)
    subscription = _serialize_owner_subscription(_get_owner_subscription(cur, owner_row.get("id")))
    hotel = _resolve_owner_hotel(cur, owner_row.get("id")) or {}
    return {
        "id": owner_row.get("id"),
        "firstName": owner_row.get("first_name"),
        "lastName": owner_row.get("last_name"),
        "email": owner_row.get("email"),
        "hotelName": subscription.get("hotelName"),
        "hotelId": subscription.get("hotelId"),
        "hotelCode": subscription.get("hotelCode"),
        "address": subscription.get("hotelAddress") or owner_row.get("hotel_address", ""),
        "latitude": owner_row.get("latitude"),
        "longitude": owner_row.get("longitude"),
        "subscriptionStatus": subscription.get("status"),
        "subscriptionActive": subscription.get("isActive"),
        "subscriptionPlan": subscription.get("packageName"),
        "subscriptionPlanSlug": subscription.get("packageSlug"),
        "subscriptionRenewalDate": subscription.get("renewalDate"),
        "subscriptionDaysRemaining": subscription.get("daysUntilRenewal"),
        "subscriptionExpiringSoon": subscription.get("expiringSoon"),
        "allowedOwnerFeatures": subscription.get("allowedOwnerFeatures") or [],
        "roomLimit": subscription.get("roomLimit"),
        "hasHotel": subscription.get("hasHotel"),
        "contactNumber": owner_row.get("contact_number") or "",
        "profileImage": owner_row.get("profile_image") or "",
        "hotelLogo": hotel.get("hotel_logo") or "",
        "hotelBuildingImage": hotel.get("hotel_building_image") or hotel.get("hotel_logo") or "",
        "hotelDescription": hotel.get("hotel_description") or "",
        "contactPhone": hotel.get("contact_phone") or owner_row.get("contact_number") or "",
    }


def _owner_subscription_success_response(cur, owner_id, amount, is_simulated):
    cur.execute(
        """
        SELECT o.*, h.hotel_name, h.id as hotel_id, h.hotel_address, h.latitude, h.longitude
        FROM owners o
        LEFT JOIN hotels h ON o.id = h.owner_id
        WHERE o.id = %s
        LIMIT 1
        """,
        (owner_id,),
    )
    owner = cur.fetchone()
    return jsonify({
        'status': 'paid',
        'amount': amount,
        'subscription': _serialize_owner_subscription(_get_owner_subscription(cur, owner_id)),
        'session': _owner_session_payload(cur, owner) if owner else None,
        'isSimulated': is_simulated,
    }), 200


def _owner_subscription_simulation_enabled():
    raw = os.getenv("PAYMONGO_SUBSCRIPTION_SIMULATION")
    if str(raw or "").strip():
        return _is_truthy(raw)
    secret_key = str(os.getenv("PAYMONGO_SECRET_KEY", "") or "").strip()
    if not secret_key or "your_" in secret_key:
        return True
    return secret_key.startswith("sk_test_")


def _owner_subscription_simulated_link_id(owner_id, package_id, billing_cycle):
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    cycle_name = str(billing_cycle or "MONTHLY").upper()
    return f"simsub_{owner_id}_{package_id}_{cycle_name}_{stamp}"


def _owner_subscription_checkout_url(frontend_url, state, simulated=False):
    suffix = "&simulation=1" if simulated else ""
    return f"{frontend_url}/owner/subscription?payment={state}{suffix}"


def _owner_access_state(cur, owner_id):
    subscription = _serialize_owner_subscription(_get_owner_subscription(cur, owner_id))
    return subscription, set(subscription.get("allowedOwnerFeatures") or [])


def _owner_feature_required_response(feature_key, subscription=None):
    feature_meta = OWNER_FEATURE_CATALOG.get(feature_key, {})
    label = feature_meta.get("label") or "This feature"
    required_plan = feature_meta.get("requiredPlan") or "a higher-tier plan"
    return jsonify({
        "error": f"{label} is not included in your current subscription plan. Upgrade to {required_plan} to unlock it.",
        "code": "PLAN_UPGRADE_REQUIRED",
        "feature": feature_key,
        "requiredPlan": required_plan,
        "currentPlan": (subscription or {}).get("packageName"),
    }), 403


def _owner_feature_guard(cur, owner_id, feature_key, mutation=False):
    subscription, allowed_features = _owner_access_state(cur, owner_id)
    if not subscription.get("isActive"):
        return (_owner_subscription_required_response() if mutation else None), subscription
    if feature_key in allowed_features:
        return None, subscription
    return _owner_feature_required_response(feature_key, subscription), subscription


def _owner_room_limit_response(subscription):
    room_limit = subscription.get("roomLimit")
    return jsonify({
        "error": f"Your current subscription only allows up to {room_limit} rooms. Upgrade your plan to add more rooms.",
        "code": "ROOM_LIMIT_REACHED",
        "roomLimit": room_limit,
        "currentPlan": subscription.get("packageName"),
    }), 403


# --- NOTIFICATION SYSTEM ---

def _ensure_notification_tables(cur):
    """Ensure notification-related tables exist"""
    # Notification types table
    cur.execute("""
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
    """)

    # User notification preferences
    cur.execute("""
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
    """)

    # Notifications table
    cur.execute("""
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
    """)

    # Notification logs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS notification_logs (
            id SERIAL PRIMARY KEY,
            notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
            channel VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL,
            provider_response JSONB DEFAULT '{}',
            error_message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Indexes
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, user_type, is_read) WHERE is_read = FALSE")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id)")


def _seed_notification_types(cur):
    """Seed default notification types"""
    _ensure_notification_tables(cur)

    notification_types = [
        # System/Admin notifications
        ('system_maintenance', 'System Maintenance', 'Scheduled system maintenance notifications', 'SYSTEM', 'HIGH'),
        ('admin_user_registration', 'New User Registration', 'New user registration alerts for admins', 'SYSTEM', 'NORMAL'),
        ('admin_payment_received', 'Payment Received', 'Payment received notifications for admins', 'PAYMENT', 'HIGH'),

        # Owner notifications
        ('owner_subscription_expiring', 'Subscription Expiring', 'Subscription renewal reminders for owners', 'PAYMENT', 'HIGH'),
        ('owner_new_booking', 'New Booking', 'New booking notifications for owners', 'BOOKING', 'NORMAL'),
        ('owner_staff_task_completed', 'Staff Task Completed', 'Task completion notifications for owners', 'STAFF', 'NORMAL'),
        ('owner_low_inventory', 'Low Inventory Alert', 'Low inventory alerts for owners', 'INVENTORY', 'HIGH'),

        # Customer notifications
        ('customer_booking_confirmed', 'Booking Confirmed', 'Booking confirmation for customers', 'BOOKING', 'HIGH'),
        ('customer_checkin_reminder', 'Check-in Reminder', 'Check-in reminders for customers', 'BOOKING', 'NORMAL'),
        ('customer_payment_due', 'Payment Due', 'Payment due notifications for customers', 'PAYMENT', 'HIGH'),
        ('customer_loyalty_points', 'Loyalty Points Earned', 'Loyalty points notifications for customers', 'CUSTOMER', 'NORMAL'),

        # Staff notifications
        ('staff_task_assigned', 'Task Assigned', 'New task assignments for staff', 'STAFF', 'HIGH'),
        ('staff_shift_reminder', 'Shift Reminder', 'Shift schedule reminders for staff', 'STAFF', 'NORMAL'),
        ('staff_inventory_alert', 'Inventory Alert', 'Inventory alerts for staff', 'INVENTORY', 'HIGH'),
        ('staff_maintenance_due', 'Maintenance Due', 'Maintenance reminders for staff', 'MAINTENANCE', 'NORMAL'),
    ]

    for type_key, name, description, category, priority in notification_types:
        cur.execute("""
            INSERT INTO notification_types (type_key, name, description, category, priority)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (type_key) DO NOTHING
        """, (type_key, name, description, category, priority))


def _create_notification(user_id, user_type, notification_type_key, title, message, data=None, expires_at=None):
    """Create a notification for a user"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        _ensure_notification_tables(cur)

        # Get notification type ID
        cur.execute("SELECT id FROM notification_types WHERE type_key = %s AND is_active = TRUE", (notification_type_key,))
        type_row = cur.fetchone()
        if not type_row:
            return None

        notification_data = json.dumps(data or {})

        # Create notification
        cur.execute("""
            INSERT INTO notifications (user_id, user_type, notification_type_id, title, message, data, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, user_type, type_row[0], title, message, notification_data, expires_at))

        notification_id = cur.fetchone()[0]
        conn.commit()

        # Trigger sending in background
        threading.Thread(target=_send_notification_async, args=(notification_id,)).start()

        return notification_id

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error creating notification: {e}")
        return None
    finally:
        _safe_close(conn, cur)


def _send_notification_async(notification_id):
    """Send notification via enabled channels asynchronously"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Get notification with user preferences
        cur.execute("""
            SELECT n.*, nt.email_template, nt.sms_template, nt.push_template,
                   COALESCE(up.email_enabled, TRUE) as email_enabled,
                   COALESCE(up.sms_enabled, FALSE) as sms_enabled,
                   COALESCE(up.push_enabled, TRUE) as push_enabled
            FROM notifications n
            LEFT JOIN notification_types nt ON nt.id = n.notification_type_id
            LEFT JOIN user_notification_preferences up ON up.notification_type_id = nt.id
                AND up.user_id = n.user_id AND up.user_type = n.user_type
            WHERE n.id = %s
        """, (notification_id,))

        notification = cur.fetchone()
        if not notification:
            return

        # Send via enabled channels
        if notification['email_enabled']:
            _send_email_notification(notification)
        if notification['sms_enabled']:
            _send_sms_notification(notification)
        if notification['push_enabled']:
            _send_push_notification(notification)

        # Mark as sent
        cur.execute("""
            UPDATE notifications
            SET sent_at = NOW(), email_sent = %s, sms_sent = %s, push_sent = %s
            WHERE id = %s
        """, (
            notification['email_enabled'],
            notification['sms_enabled'],
            notification['push_enabled'],
            notification_id
        ))

        conn.commit()

    except Exception as e:
        print(f"Error sending notification {notification_id}: {e}")
    finally:
        _safe_close(conn, cur)


def _send_email_notification(notification):
    """Send email notification using SendGrid"""
    conn = None
    cur = None
    try:
        sendgrid_key = os.getenv('SENDGRID_API_KEY')
        if not sendgrid_key:
            return

        # Get user email based on type
        conn = get_db_connection()
        cur = conn.cursor()

        if notification['user_type'] == 'admin':
            cur.execute("SELECT email FROM admins WHERE id = %s", (notification['user_id'],))
        elif notification['user_type'] == 'owner':
            cur.execute("SELECT email FROM owners WHERE id = %s", (notification['user_id'],))
        elif notification['user_type'] == 'customer':
            cur.execute("SELECT email FROM customers WHERE id = %s", (notification['user_id'],))
        elif notification['user_type'] == 'staff':
            cur.execute("SELECT email FROM staff WHERE id = %s", (notification['user_id'],))

        user_row = cur.fetchone()
        if not user_row:
            return

        user_email = user_row[0]

        # Send email via SendGrid
        import requests
        headers = {
            'Authorization': f'Bearer {sendgrid_key}',
            'Content-Type': 'application/json'
        }

        data = {
            'personalizations': [{
                'to': [{'email': user_email}],
                'subject': notification['title']
            }],
            'from': {'email': 'noreply@innovahms.com', 'name': 'Innova HMS'},
            'content': [{
                'type': 'text/html',
                'value': f"<p>{notification['message']}</p>"
            }]
        }

        response = requests.post('https://api.sendgrid.com/v3/mail/send', headers=headers, json=data)

        # Log the result
        _log_notification_delivery(notification['id'], 'email',
            'sent' if response.status_code == 202 else 'failed',
            {'status_code': response.status_code, 'response': response.text})

    except Exception as e:
        print(f"Email send error: {e}")
        _log_notification_delivery(notification['id'], 'email', 'failed', {'error': str(e)})
    finally:
        _safe_close(conn, cur)


def _send_sendgrid_email(recipient_email, subject, html_content, plain_text=None):
    sendgrid_key = os.getenv('SENDGRID_API_KEY')
    if not sendgrid_key or not recipient_email:
        return False

    headers = {
        'Authorization': f'Bearer {sendgrid_key}',
        'Content-Type': 'application/json'
    }

    content = []
    if plain_text:
        content.append({'type': 'text/plain', 'value': plain_text})
    content.append({'type': 'text/html', 'value': html_content})

    data = {
        'personalizations': [{
            'to': [{'email': recipient_email}],
            'subject': subject,
        }],
        'from': {'email': 'noreply@innovahms.com', 'name': 'Innova HMS'},
        'content': content,
    }

    response = requests.post(
        'https://api.sendgrid.com/v3/mail/send',
        headers=headers,
        json=data,
        timeout=15,
    )
    return response.status_code == 202


def _send_owner_hotel_code_email(owner_email, first_name, hotel_name, hotel_code, created_hotel):
    safe_first_name = escape(first_name or 'Partner')
    safe_hotel_name = escape(hotel_name or 'your hotel')
    safe_hotel_code = escape(hotel_code or '')

    if not owner_email or not safe_hotel_code:
        return False

    intro_line = (
        'Your new hotel profile has been created successfully.'
        if created_hotel
        else 'Your owner account has been linked successfully.'
    )
    subject = f'Your Innova HMS Hotel Code: {hotel_code}'
    html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
            <p>Hello {safe_first_name},</p>
            <p>{intro_line}</p>
            <p><strong>Hotel:</strong> {safe_hotel_name}</p>
            <p><strong>Assigned Hotel Code:</strong> <span style="font-size: 18px; letter-spacing: 1px;">{safe_hotel_code}</span></p>
            <p>Please keep this code for hotel setup, staff access, and future owner account references.</p>
            <p>You can now log in to the owner portal, but owner actions remain locked until subscription payment is completed.</p>
            <p>Thank you,<br>Innova HMS</p>
        </div>
    """
    plain_text = (
        f"Hello {first_name or 'Partner'},\n\n"
        f"{intro_line}\n"
        f"Hotel: {hotel_name or 'your hotel'}\n"
        f"Assigned Hotel Code: {hotel_code}\n\n"
        "Please keep this code for hotel setup, staff access, and future owner account references.\n"
        "You can now log in to the owner portal, but owner actions remain locked until subscription payment is completed.\n\n"
        "Thank you,\nInnova HMS"
    )

    try:
        return _send_sendgrid_email(owner_email, subject, html_content, plain_text)
    except Exception as exc:
        print(f"Owner hotel code email error: {exc}")
        return False


def _send_sms_notification(notification):
    """Send SMS notification using Twilio"""
    try:
        twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
        twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
        twilio_phone = os.getenv('TWILIO_PHONE_NUMBER')

        if not all([twilio_sid, twilio_token, twilio_phone]):
            return

        # Get user phone based on type
        conn = get_db_connection()
        cur = conn.cursor()

        if notification['user_type'] == 'admin':
            cur.execute("SELECT contact_number FROM admins WHERE id = %s", (notification['user_id'],))
        elif notification['user_type'] == 'owner':
            cur.execute("SELECT contact_number FROM owners WHERE id = %s", (notification['user_id'],))
        elif notification['user_type'] == 'customer':
            cur.execute("SELECT contact_number FROM customers WHERE id = %s", (notification['user_id'],))
        elif notification['user_type'] == 'staff':
            cur.execute("SELECT contact_number FROM staff WHERE id = %s", (notification['user_id'],))

        user_row = cur.fetchone()
        if not user_row or not user_row[0]:
            return

        user_phone = user_row[0]

        # Send SMS via Twilio
        from twilio.rest import Client
        client = Client(twilio_sid, twilio_token)

        message = client.messages.create(
            body=notification['message'][:160],  # SMS length limit
            from_=twilio_phone,
            to=user_phone
        )

        _log_notification_delivery(notification['id'], 'sms', 'sent', {'message_sid': message.sid})

    except Exception as e:
        print(f"SMS send error: {e}")
        _log_notification_delivery(notification['id'], 'sms', 'failed', {'error': str(e)})
    finally:
        _safe_close(conn, cur)


def _send_push_notification(notification):
    """Send push notification (placeholder for future implementation)"""
    # For now, just log that push notification would be sent
    _log_notification_delivery(notification['id'], 'push', 'sent', {'note': 'Push notification placeholder'})


def _log_notification_delivery(notification_id, channel, status, response_data=None):
    """Log notification delivery attempt"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO notification_logs (notification_id, channel, status, provider_response)
            VALUES (%s, %s, %s, %s)
        """, (notification_id, channel, status, json.dumps(response_data or {})))

        conn.commit()

    except Exception as e:
        print(f"Error logging notification delivery: {e}")
    finally:
        _safe_close(conn, cur)


def _get_user_notifications(user_id, user_type, limit=50, unread_only=False):
    """Get notifications for a user"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        _ensure_notification_tables(cur)

        query = """
            SELECT n.*, nt.name as type_name, nt.category, nt.priority
            FROM notifications n
            LEFT JOIN notification_types nt ON nt.id = n.notification_type_id
            WHERE n.user_id = %s AND n.user_type = %s
        """

        params = [user_id, user_type]

        if unread_only:
            query += " AND n.is_read = FALSE"

        query += " ORDER BY n.created_at DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, params)
        notifications = cur.fetchall()

        # Convert data JSON back to dict
        for notification in notifications:
            if notification['data']:
                try:
                    notification['data'] = json.loads(notification['data'])
                except:
                    notification['data'] = {}

        return notifications

    except Exception as e:
        print(f"Error getting notifications: {e}")
        return []
    finally:
        _safe_close(conn, cur)


def _mark_notification_read(notification_id, user_id, user_type):
    """Mark a notification as read"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE notifications
            SET is_read = TRUE, read_at = NOW()
            WHERE id = %s AND user_id = %s AND user_type = %s
        """, (notification_id, user_id, user_type))

        conn.commit()
        return True

    except Exception as e:
        print(f"Error marking notification read: {e}")
        return False
    finally:
        _safe_close(conn, cur)


def _get_notification_preferences(user_id, user_type):
    """Get notification preferences for a user"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        _ensure_notification_tables(cur)

        cur.execute("""
            SELECT nt.type_key, nt.name, nt.description, nt.category,
                   COALESCE(up.email_enabled, TRUE) as email_enabled,
                   COALESCE(up.sms_enabled, FALSE) as sms_enabled,
                   COALESCE(up.push_enabled, TRUE) as push_enabled
            FROM notification_types nt
            LEFT JOIN user_notification_preferences up ON up.notification_type_id = nt.id
                AND up.user_id = %s AND up.user_type = %s
            WHERE nt.is_active = TRUE
            ORDER BY nt.category, nt.name
        """, (user_id, user_type))

        return cur.fetchall()

    except Exception as e:
        print(f"Error getting notification preferences: {e}")
        return []
    finally:
        _safe_close(conn, cur)


def _update_notification_preferences(user_id, user_type, preferences):
    """Update notification preferences for a user"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        _ensure_notification_tables(cur)

        for pref in preferences:
            # Get notification type ID
            cur.execute("SELECT id FROM notification_types WHERE type_key = %s", (pref['type_key'],))
            type_row = cur.fetchone()
            if not type_row:
                continue

            # Upsert preference
            cur.execute("""
                INSERT INTO user_notification_preferences
                (user_id, user_type, notification_type_id, email_enabled, sms_enabled, push_enabled, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id, user_type, notification_type_id) DO UPDATE SET
                    email_enabled = EXCLUDED.email_enabled,
                    sms_enabled = EXCLUDED.sms_enabled,
                    push_enabled = EXCLUDED.push_enabled,
                    updated_at = NOW()
            """, (
                user_id, user_type, type_row[0],
                pref.get('email_enabled', True),
                pref.get('sms_enabled', False),
                pref.get('push_enabled', True)
            ))

        conn.commit()
        return True

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating notification preferences: {e}")
        return False
    finally:
        _safe_close(conn, cur)


# --- ADMIN ENDPOINTS ---

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name, email, password_hash FROM admins WHERE email = %s", (email,))
        admin = cur.fetchone()
        cur.close()
        conn.close()
        if admin and check_password_hash(admin['password_hash'], password):
            return jsonify({
                "message": "Admin login successful!",
                "admin": {"id": admin['id'], "name": admin['name'], "email": admin['email'], "role": "SuperAdmin"}
            }), 200
        return jsonify({"error": "Access Denied: Invalid Credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/dashboard', methods=['GET'])
def admin_dashboard():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT COUNT(*) AS total FROM customers")
        total_customers = _to_int((cur.fetchone() or {}).get('total'), 0)

        cur.execute("SELECT COUNT(*) AS total FROM owners")
        total_owners = _to_int((cur.fetchone() or {}).get('total'), 0)

        cur.execute("SELECT COUNT(*) AS total FROM staff")
        total_staff = _to_int((cur.fetchone() or {}).get('total'), 0)

        cur.execute("SELECT COUNT(*) AS total FROM rooms")
        total_rooms = _to_int((cur.fetchone() or {}).get('total'), 0)

        cur.execute("SELECT COUNT(*) AS total FROM rooms WHERE LOWER(status) = 'available'")
        available_rooms = _to_int((cur.fetchone() or {}).get('total'), 0)

        cur.execute("SELECT COUNT(*) AS total FROM rooms WHERE LOWER(status) = 'occupied'")
        occupied_rooms = _to_int((cur.fetchone() or {}).get('total'), 0)

        total_revenue = 0.0
        today_checkins = 0
        today_checkouts = 0
        pending_res = 0
        today = datetime.utcnow().date()

        cur.execute("SELECT total_amount, status, check_in_date, check_out_date FROM reservations ORDER BY id DESC LIMIT 1000")
        reservations = cur.fetchall() or []
        for r in reservations:
            s = str(r.get('status') or '').upper()
            if s not in {'CANCELLED', 'FAILED'}:
                total_revenue += _to_float(r.get('total_amount'), 0)
            if s == 'PENDING':
                pending_res += 1
            ci = r.get('check_in_date')
            co = r.get('check_out_date')
            if ci and hasattr(ci, 'date') and ci.date() == today:
                today_checkins += 1
            if co and hasattr(co, 'date') and co.date() == today:
                today_checkouts += 1

        occupancy_rate = round((occupied_rooms / total_rooms) * 100, 1) if total_rooms else 0.0

        cur.execute("""
            SELECT r.id, r.booking_number, r.total_amount, r.status, r.created_at,
                   c.first_name, c.last_name, rm.room_number, h.hotel_name
            FROM reservations r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            LEFT JOIN hotels h ON h.id = rm.hotel_id
            ORDER BY r.created_at DESC LIMIT 10
        """)
        recent_bookings = []
        for row in cur.fetchall() or []:
            recent_bookings.append({
                'id': row.get('id'),
                'bookingNumber': row.get('booking_number') or f"INV-{row.get('id')}",
                'guestName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Guest',
                'roomNumber': row.get('room_number') or '--',
                'hotelName': row.get('hotel_name') or 'Innova HMS',
                'amount': _to_float(row.get('total_amount'), 0),
                'status': str(row.get('status') or '').upper(),
                'createdAt': _serialize_date(row.get('created_at')),
            })

        room_status = [
            {'label': 'Available', 'count': available_rooms, 'total': total_rooms},
            {'label': 'Occupied', 'count': occupied_rooms, 'total': total_rooms},
        ]
        cur.execute("SELECT COUNT(*) AS c FROM rooms WHERE LOWER(status) IN ('dirty','cleaning')")
        room_status.append({'label': 'Cleaning', 'count': _to_int((cur.fetchone() or {}).get('c'), 0), 'total': total_rooms})
        cur.execute("SELECT COUNT(*) AS c FROM rooms WHERE LOWER(status) IN ('maintenance','repair')")
        room_status.append({'label': 'Maintenance', 'count': _to_int((cur.fetchone() or {}).get('c'), 0), 'total': total_rooms})

        return jsonify({
            'kpis': {
                'totalCustomers': total_customers,
                'totalOwners': total_owners,
                'totalStaff': total_staff,
                'totalRooms': total_rooms,
                'availableRooms': available_rooms,
                'occupiedRooms': occupied_rooms,
                'occupancyRate': occupancy_rate,
                'totalRevenue': round(total_revenue, 2),
                'todayCheckins': today_checkins,
                'todayCheckouts': today_checkouts,
                'pendingReservations': pending_res,
            },
            'roomStatus': room_status,
            'recentBookings': recent_bookings,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/customers', methods=['GET'])
def admin_customers():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT c.id, c.first_name, c.last_name, c.email, c.contact_number, c.created_at,
                   COUNT(r.id) AS total_bookings,
                   COALESCE(SUM(r.total_amount), 0) AS total_spend
            FROM customers c
            LEFT JOIN reservations r ON r.customer_id = c.id
            GROUP BY c.id ORDER BY c.created_at DESC
        """)
        rows = cur.fetchall() or []
        customers = []
        for row in rows:
            customers.append({
                'id': row.get('id'),
                'firstName': row.get('first_name') or '',
                'lastName': row.get('last_name') or '',
                'email': row.get('email') or '',
                'contactNumber': row.get('contact_number') or '',
                'totalBookings': _to_int(row.get('total_bookings'), 0),
                'totalSpend': _to_float(row.get('total_spend'), 0),
                'createdAt': _serialize_date(row.get('created_at')),
            })
        return jsonify({'customers': customers, 'total': len(customers)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/customers/<int:customer_id>', methods=['DELETE'])
def admin_delete_customer(customer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM customers WHERE id = %s", (customer_id,))
        conn.commit()
        return jsonify({'message': 'Customer deleted.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/owners', methods=['GET'])
def admin_owners():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT o.id, o.first_name, o.last_name, o.email, o.contact_number, o.created_at,
                   h.id AS hotel_id, h.hotel_name, h.hotel_address, h.hotel_code,
                   COUNT(r.id) AS total_rooms
            FROM owners o
            LEFT JOIN hotels h ON h.owner_id = o.id
            LEFT JOIN rooms r ON r.hotel_id = h.id
            GROUP BY o.id, h.id ORDER BY o.created_at DESC
        """)
        rows = cur.fetchall() or []
        owners = []
        for row in rows:
            owners.append({
                'id': row.get('id'),
                'firstName': row.get('first_name') or '',
                'lastName': row.get('last_name') or '',
                'email': row.get('email') or '',
                'contactNumber': row.get('contact_number') or '',
                'hotelId': row.get('hotel_id'),
                'hotelName': row.get('hotel_name') or 'No Hotel',
                'hotelAddress': row.get('hotel_address') or '',
                'hotelCode': row.get('hotel_code') or '',
                'totalRooms': _to_int(row.get('total_rooms'), 0),
                'createdAt': _serialize_date(row.get('created_at')),
            })
        return jsonify({'owners': owners, 'total': len(owners)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/packages', methods=['GET'])
def admin_packages():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _backfill_hotel_subscriptions(cur)
        conn.commit()

        cur.execute(
            """
            SELECT
                id, name, slug, description, monthly_price, annual_price,
                max_rooms, features, is_popular, is_active, display_order,
                created_at, updated_at
            FROM membership_packages
            ORDER BY display_order ASC, monthly_price ASC, name ASC
            """
        )
        package_rows = cur.fetchall() or []
        packages = []
        for row in package_rows:
            packages.append({
                'id': row.get('id'),
                'name': row.get('name') or '',
                'slug': row.get('slug') or _slugify(row.get('name')),
                'description': row.get('description') or '',
                'monthlyPrice': _to_float(row.get('monthly_price'), 0),
                'annualPrice': _to_float(row.get('annual_price'), 0),
                'maxRooms': row.get('max_rooms'),
                'features': row.get('features') or [],
                'isPopular': bool(row.get('is_popular')),
                'isActive': bool(row.get('is_active')),
                'displayOrder': _to_int(row.get('display_order'), 0),
                'createdAt': _serialize_date(row.get('created_at')),
                'updatedAt': _serialize_date(row.get('updated_at')),
            })

        cur.execute(
            """
            SELECT
                s.id,
                s.hotel_id,
                s.package_id,
                s.billing_cycle,
                s.amount,
                s.status,
                s.starts_at,
                s.renewal_date,
                s.updated_at,
                h.hotel_name,
                h.hotel_code,
                o.first_name,
                o.last_name,
                o.email AS owner_email,
                p.name AS package_name,
                p.slug AS package_slug
            FROM hotel_package_subscriptions s
            JOIN hotels h ON h.id = s.hotel_id
            LEFT JOIN owners o ON o.id = h.owner_id
            JOIN membership_packages p ON p.id = s.package_id
            ORDER BY COALESCE(s.renewal_date, CURRENT_DATE) ASC, h.hotel_name ASC
            """
        )
        subscription_rows = cur.fetchall() or []
        subscriptions = []
        monthly_projection = 0.0
        active_count = 0
        pending_count = 0
        for row in subscription_rows:
            status = str(row.get('status') or 'PENDING').upper()
            cycle = str(row.get('billing_cycle') or 'MONTHLY').upper()
            amount = _to_float(row.get('amount'), 0)
            if status == 'ACTIVE':
                active_count += 1
                monthly_projection += amount if cycle == 'MONTHLY' else round(amount / 12, 2)
            elif status == 'PENDING':
                pending_count += 1

            subscriptions.append({
                'id': row.get('id'),
                'hotelId': row.get('hotel_id'),
                'packageId': row.get('package_id'),
                'hotelName': row.get('hotel_name') or 'Unnamed Hotel',
                'hotelCode': row.get('hotel_code') or '',
                'ownerName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Unassigned Owner',
                'ownerEmail': row.get('owner_email') or '',
                'plan': row.get('package_name') or 'Unassigned',
                'planSlug': row.get('package_slug') or '',
                'cycle': cycle,
                'amount': amount,
                'status': status,
                'startsAt': _serialize_date(row.get('starts_at')),
                'renewal': _serialize_date(row.get('renewal_date')),
                'updatedAt': _serialize_date(row.get('updated_at')),
            })

        cur.execute(
            """
            SELECT
                h.id,
                h.hotel_name,
                h.hotel_code,
                o.first_name,
                o.last_name
            FROM hotels h
            LEFT JOIN owners o ON o.id = h.owner_id
            ORDER BY h.hotel_name ASC
            """
        )
        hotels = []
        for row in cur.fetchall() or []:
            hotels.append({
                'id': row.get('id'),
                'hotelName': row.get('hotel_name') or 'Unnamed Hotel',
                'hotelCode': row.get('hotel_code') or '',
                'ownerName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Unassigned Owner',
            })

        return jsonify({
            'packages': packages,
            'subscriptions': subscriptions,
            'hotels': hotels,
            'stats': {
                'totalPackages': len(packages),
                'activeSubscriptions': active_count,
                'pendingSubscriptions': pending_count,
                'totalHotels': len(hotels),
                'monthlyRecurringRevenue': round(monthly_projection, 2),
            },
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/packages', methods=['POST'])
def admin_create_package():
    return jsonify({'error': 'Membership packages are system-defined and cannot be created manually.'}), 403


@app.route('/api/admin/packages/<int:package_id>', methods=['PATCH'])
def admin_update_package(package_id):
    return jsonify({'error': 'Membership packages are system-defined and cannot be edited manually.'}), 403


@app.route('/api/admin/packages/<int:package_id>', methods=['DELETE'])
def admin_delete_package(package_id):
    return jsonify({'error': 'Membership packages are system-defined and cannot be removed.'}), 403


@app.route('/api/admin/package-subscriptions', methods=['POST'])
def admin_upsert_package_subscription():
    conn = None
    cur = None
    try:
        data = request.get_json(silent=True) or {}
        hotel_id = _to_int(data.get('hotelId'), 0)
        package_id = _to_int(data.get('packageId'), 0)
        if not hotel_id or not package_id:
            return jsonify({'error': 'Hotel and package are required.'}), 400

        billing_cycle = str(data.get('billingCycle') or 'MONTHLY').upper()
        if billing_cycle not in {'MONTHLY', 'ANNUAL'}:
            return jsonify({'error': 'Invalid billing cycle.'}), 400

        status = str(data.get('status') or 'ACTIVE').upper()
        if status not in {'ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED'}:
            return jsonify({'error': 'Invalid subscription status.'}), 400

        # Ensure tables exist BEFORE starting transaction
        try:
            temp_conn = get_db_connection()
            temp_cur = temp_conn.cursor()
            _ensure_membership_tables(temp_cur)
            temp_conn.commit()
            _safe_close(temp_conn, temp_cur)
        except Exception as e:
            print(f"Warning: Table setup failed: {e}")

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT id FROM hotels WHERE id = %s LIMIT 1", (hotel_id,))
        hotel_row = cur.fetchone()
        if not hotel_row:
            return jsonify({'error': 'Hotel not found.'}), 404
        cur.execute("SELECT owner_id FROM hotels WHERE id = %s LIMIT 1", (hotel_id,))
        hotel_owner = cur.fetchone() or {}

        cur.execute(
            """
            SELECT id, monthly_price, annual_price
            FROM membership_packages
            WHERE id = %s
            LIMIT 1
            """,
            (package_id,),
        )
        package_row = cur.fetchone()
        if not package_row:
            return jsonify({'error': 'Package not found.'}), 404

        amount = _to_float(
            data.get('amount'),
            _package_amount_for_cycle(package_row, billing_cycle),
        )
        starts_at = _parse_date_input(data.get('startsAt')) or datetime.utcnow().date()
        renewal_date = _parse_date_input(data.get('renewalDate')) or _default_renewal_date(billing_cycle, starts_at)

        cur.execute(
            """
            INSERT INTO hotel_package_subscriptions (
                hotel_id, package_id, billing_cycle, amount, status, starts_at, renewal_date, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (hotel_id) DO UPDATE SET
                package_id = EXCLUDED.package_id,
                billing_cycle = EXCLUDED.billing_cycle,
                amount = EXCLUDED.amount,
                status = EXCLUDED.status,
                starts_at = EXCLUDED.starts_at,
                renewal_date = EXCLUDED.renewal_date,
                updated_at = NOW()
            RETURNING id
            """,
            (hotel_id, package_id, billing_cycle, amount, status, starts_at, renewal_date),
        )
        updated = cur.fetchone() or {}
        if hotel_owner.get("owner_id"):
            cur.execute(
                """
                UPDATE hotel_package_subscriptions
                SET owner_id = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (hotel_owner.get("owner_id"), updated.get("id")),
            )
        conn.commit()
        return jsonify({'message': 'Hotel subscription saved successfully.', 'id': updated.get('id')}), 200
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except:
                pass
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/package-subscriptions/<int:subscription_id>/renew', methods=['PATCH'])
def admin_renew_package_subscription(subscription_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _seed_membership_packages(cur)

        cur.execute(
            """
            SELECT id, billing_cycle, renewal_date, status, last_paid_at
            FROM hotel_package_subscriptions
            WHERE id = %s
            LIMIT 1
            """,
            (subscription_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Subscription not found.'}), 404

        starts_at, next_renewal = _subscription_cycle_dates(row)

        cur.execute(
            """
            UPDATE hotel_package_subscriptions
            SET status = 'ACTIVE', payment_status = 'PAID', starts_at = %s, renewal_date = %s, last_paid_at = NOW(), updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            (starts_at, next_renewal, subscription_id),
        )
        conn.commit()
        return jsonify({
            'message': 'Subscription renewed successfully.',
            'renewalDate': _serialize_date(next_renewal),
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/package-subscriptions', methods=['GET'])
def admin_get_package_subscriptions():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Get all subscriptions with hotel and owner details
        cur.execute("""
            SELECT
                s.id,
                s.hotel_id,
                s.owner_id,
                s.package_id,
                s.billing_cycle,
                s.amount,
                s.status,
                s.payment_status,
                s.paymongo_payment_id,
                s.last_paid_at,
                s.starts_at,
                s.renewal_date,
                s.created_at,
                s.updated_at,
                h.hotel_name,
                h.hotel_address,
                o.first_name as owner_first_name,
                o.last_name as owner_last_name,
                o.email as owner_email,
                p.name as package_name,
                p.monthly_price,
                p.annual_price
            FROM hotel_package_subscriptions s
            LEFT JOIN hotels h ON h.id = s.hotel_id
            LEFT JOIN owners o ON o.id = s.owner_id
            LEFT JOIN membership_packages p ON p.id = s.package_id
            ORDER BY s.created_at DESC
        """)

        subscriptions = []
        for row in cur.fetchall() or []:
            subscriptions.append({
                'id': row.get('id'),
                'hotel': {
                    'id': row.get('hotel_id'),
                    'name': row.get('hotel_name') or 'Unknown Hotel',
                    'address': row.get('hotel_address') or '',
                },
                'owner': {
                    'id': row.get('owner_id'),
                    'name': f"{row.get('owner_first_name') or ''} {row.get('owner_last_name') or ''}".strip() or 'Unknown Owner',
                    'email': row.get('owner_email') or '',
                },
                'package': {
                    'id': row.get('package_id'),
                    'name': row.get('package_name') or 'Unknown Package',
                    'monthlyPrice': _to_float(row.get('monthly_price'), 0),
                    'annualPrice': _to_float(row.get('annual_price'), 0),
                },
                'billingCycle': row.get('billing_cycle') or 'MONTHLY',
                'amount': _to_float(row.get('amount'), 0),
                'status': row.get('status') or 'PENDING',
                'paymentStatus': row.get('payment_status') or 'UNPAID',
                'paymongoPaymentId': row.get('paymongo_payment_id'),
                'lastPaidAt': _serialize_date(row.get('last_paid_at')),
                'startsAt': _serialize_date(row.get('starts_at')),
                'renewalDate': _serialize_date(row.get('renewal_date')),
                'createdAt': _serialize_date(row.get('created_at')),
                'updatedAt': _serialize_date(row.get('updated_at')),
            })

        return jsonify({'subscriptions': subscriptions}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/staff', methods=['GET'])
def admin_staff():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT s.id, s.first_name, s.last_name, s.email, s.contact_number,
                   s.role, s.status, s.date_hired, s.created_at,
                   h.hotel_name
            FROM staff s
            LEFT JOIN hotels h ON h.id = s.hotel_id
            ORDER BY s.created_at DESC
        """)
        rows = cur.fetchall() or []
        staff = []
        for row in rows:
            staff.append({
                'id': row.get('id'),
                'firstName': row.get('first_name') or '',
                'lastName': row.get('last_name') or '',
                'email': row.get('email') or '',
                'contactNumber': row.get('contact_number') or '',
                'role': row.get('role') or 'Staff',
                'status': row.get('status') or 'Active',
                'hotelName': row.get('hotel_name') or 'Unassigned',
                'dateHired': _serialize_date(row.get('date_hired') or row.get('created_at')),
            })
        return jsonify({'staff': staff, 'total': len(staff)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/staff/<int:staff_id>', methods=['DELETE'])
def admin_delete_staff(staff_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM staff WHERE id = %s", (staff_id,))
        conn.commit()
        return jsonify({'message': 'Staff deleted.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/reports', methods=['GET'])
def admin_reports():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("SELECT COUNT(*) AS c FROM owners")
        total_partners = _to_int((cur.fetchone() or {}).get('c'), 0)

        cur.execute("SELECT COALESCE(SUM(total_amount),0) AS rev FROM reservations WHERE LOWER(status) NOT IN ('cancelled','failed')")
        total_revenue = _to_float((cur.fetchone() or {}).get('rev'), 0)

        cur.execute("SELECT COUNT(*) AS c FROM reservations")
        total_res = _to_int((cur.fetchone() or {}).get('c'), 0)

        cur.execute("SELECT COUNT(*) AS c FROM customers")
        total_customers = _to_int((cur.fetchone() or {}).get('c'), 0)

        # Monthly revenue for chart (last 6 months)
        cur.execute("""
            SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
                   COALESCE(SUM(total_amount), 0) AS revenue
            FROM reservations
            WHERE created_at >= NOW() - INTERVAL '6 months'
              AND LOWER(status) NOT IN ('cancelled','failed')
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at) ASC
        """)
        monthly = cur.fetchall() or []
        chart_labels = [r.get('month') for r in monthly]
        chart_values = [_to_float(r.get('revenue'), 0) for r in monthly]

        return jsonify({
            'kpis': {
                'totalPartners': total_partners,
                'totalRevenue': round(total_revenue, 2),
                'totalReservations': total_res,
                'totalCustomers': total_customers,
            },
            'revenueChart': {'labels': chart_labels, 'values': chart_values},
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


# --- NOTIFICATION ENDPOINTS ---

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Get notifications for current user"""
    # This would need authentication middleware to get user_id and user_type
    # For now, return empty list
    return jsonify({'notifications': [], 'unread_count': 0}), 200


@app.route('/api/notifications/<int:notification_id>/read', methods=['PATCH'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    # This would need authentication middleware
    # For now, return success
    return jsonify({'message': 'Notification marked as read'}), 200


@app.route('/api/notifications/preferences', methods=['GET'])
def get_notification_preferences():
    """Get notification preferences for current user"""
    # This would need authentication middleware
    # For now, return empty preferences
    return jsonify({'preferences': []}), 200


@app.route('/api/notifications/preferences', methods=['PUT'])
def update_notification_preferences():
    """Update notification preferences for current user"""
    # This would need authentication middleware
    data = request.get_json() or {}
    # For now, return success
    return jsonify({'message': 'Preferences updated successfully'}), 200


# Admin notification endpoints
@app.route('/api/admin/notifications', methods=['GET'])
def admin_get_notifications():
    """Admin: Get all notifications or filter by user"""
    user_id = request.args.get('user_id', type=int)
    user_type = request.args.get('user_type')
    limit = min(request.args.get('limit', 50, type=int), 200)

    if user_id and user_type:
        notifications = _get_user_notifications(user_id, user_type, limit)
    else:
        # Get notifications for all users (admin view)
        conn = None
        cur = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)

            _ensure_notification_tables(cur)

            cur.execute("""
                SELECT n.*, nt.name as type_name, nt.category, nt.priority,
                       CASE
                           WHEN n.user_type = 'admin' THEN a.name
                           WHEN n.user_type = 'owner' THEN o.first_name || ' ' || o.last_name
                           WHEN n.user_type = 'customer' THEN c.first_name || ' ' || c.last_name
                           WHEN n.user_type = 'staff' THEN s.first_name || ' ' || s.last_name
                       END as user_name
                FROM notifications n
                LEFT JOIN notification_types nt ON nt.id = n.notification_type_id
                LEFT JOIN admins a ON a.id = n.user_id AND n.user_type = 'admin'
                LEFT JOIN owners o ON o.id = n.user_id AND n.user_type = 'owner'
                LEFT JOIN customers c ON c.id = n.user_id AND n.user_type = 'customer'
                LEFT JOIN staff s ON s.id = n.user_id AND n.user_type = 'staff'
                ORDER BY n.created_at DESC
                LIMIT %s
            """, (limit,))

            notifications = cur.fetchall()

            # Convert data JSON back to dict
            for notification in notifications:
                if notification['data']:
                    try:
                        notification['data'] = json.loads(notification['data'])
                    except:
                        notification['data'] = {}

        except Exception as e:
            print(f"Error getting all notifications: {e}")
            notifications = []
        finally:
            _safe_close(conn, cur)

    return jsonify({'notifications': notifications}), 200


@app.route('/api/admin/notifications', methods=['POST'])
def admin_create_notification():
    """Admin: Create a notification for a user"""
    data = request.get_json() or {}

    user_id = data.get('user_id')
    user_type = data.get('user_type')
    notification_type_key = data.get('type_key')
    title = data.get('title')
    message = data.get('message')
    notification_data = data.get('data')

    if not all([user_id, user_type, notification_type_key, title, message]):
        return jsonify({'error': 'Missing required fields'}), 400

    notification_id = _create_notification(user_id, user_type, notification_type_key, title, message, notification_data)

    if notification_id:
        return jsonify({'message': 'Notification created successfully', 'id': notification_id}), 201
    else:
        return jsonify({'error': 'Failed to create notification'}), 500


@app.route('/api/admin/notifications/types', methods=['GET'])
def admin_get_notification_types():
    """Admin: Get all notification types"""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        _ensure_notification_tables(cur)

        cur.execute("""
            SELECT * FROM notification_types
            WHERE is_active = TRUE
            ORDER BY category, name
        """)

        types = cur.fetchall()
        return jsonify({'types': types}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/notifications/bulk', methods=['POST'])
def admin_bulk_notifications():
    """Admin: Send bulk notifications to multiple users"""
    data = request.get_json() or {}

    user_filters = data.get('user_filters', {})  # e.g., {'user_type': 'owner', 'hotel_id': 1}
    notification_type_key = data.get('type_key')
    title = data.get('title')
    message = data.get('message')
    notification_data = data.get('data')

    if not all([notification_type_key, title, message]):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Build query to get target users
        query = "SELECT id, '{}' as user_type FROM {}".format(
            user_filters.get('user_type', 'owner'),
            {'admin': 'admins', 'owner': 'owners', 'customer': 'customers', 'staff': 'staff'}.get(
                user_filters.get('user_type', 'owner'), 'owners'
            )
        )

        conditions = []
        params = []

        if 'hotel_id' in user_filters and user_filters['user_type'] == 'staff':
            conditions.append("hotel_id = %s")
            params.append(user_filters['hotel_id'])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        cur.execute(query, params)
        users = cur.fetchall()

        created_count = 0
        for user in users:
            notification_id = _create_notification(
                user['id'], user['user_type'], notification_type_key,
                title, message, notification_data
            )
            if notification_id:
                created_count += 1

        return jsonify({
            'message': f'Bulk notification sent to {created_count} users',
            'sent_count': created_count
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


# --- REVIEWS ENDPOINTS ---

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        room_id = request.args.get('room_id', type=int)
        limit = min(request.args.get('limit', 20, type=int), 100)

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT r.id, r.rating, r.title, r.comment, r.status, r.created_at,
                   c.first_name, c.last_name,
                   rm.room_name, rm.room_type,
                   h.hotel_name
            FROM reviews r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            LEFT JOIN hotels h ON h.id = r.hotel_id
            WHERE r.status = 'published'
        """
        params = []
        if hotel_id:
            query += " AND r.hotel_id = %s"
            params.append(hotel_id)
        if room_id:
            query += " AND r.room_id = %s"
            params.append(room_id)
        query += " ORDER BY r.created_at DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []
        reviews = []
        for row in rows:
            reviews.append({
                'id': row.get('id'),
                'rating': row.get('rating'),
                'title': row.get('title') or '',
                'comment': row.get('comment') or '',
                'status': row.get('status'),
                'createdAt': _serialize_date(row.get('created_at')),
                'guestName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Guest',
                'roomName': row.get('room_name') or row.get('room_type') or '',
                'hotelName': row.get('hotel_name') or '',
            })
        return jsonify({'reviews': reviews, 'total': len(reviews)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/reviews', methods=['POST'])
def submit_review():
    conn = None
    cur = None
    try:
        data = request.json or {}
        customer_id = data.get('customerId')
        room_id = data.get('roomId')
        hotel_id = data.get('hotelId')
        rating = _to_int(data.get('rating'), 0)
        title = (data.get('title') or '').strip()
        comment = (data.get('comment') or '').strip()

        if not rating or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        if not comment:
            return jsonify({'error': 'Comment is required'}), 400

        # Convert empty strings or invalid integers to None for integer fields
        room_id = _to_int_or_none(room_id)
        hotel_id = _to_int_or_none(hotel_id)

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO reviews (customer_id, room_id, hotel_id, rating, title, comment)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (customer_id, room_id, hotel_id, rating, title, comment))
        new_id = cur.fetchone().get('id')
        conn.commit()
        return jsonify({'message': 'Review submitted successfully.', 'id': new_id}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/reviews', methods=['GET'])
def admin_get_reviews():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT r.id, r.rating, r.title, r.comment, r.status, r.created_at,
                   c.first_name, c.last_name,
                   rm.room_name, rm.room_type,
                   h.hotel_name
            FROM reviews r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            LEFT JOIN hotels h ON h.id = r.hotel_id
            ORDER BY r.created_at DESC LIMIT 200
        """)
        rows = cur.fetchall() or []

        reviews = []
        total_rating = 0
        for row in rows:
            reviews.append({
                'id': row.get('id'),
                'rating': row.get('rating'),
                'title': row.get('title') or '',
                'comment': row.get('comment') or '',
                'status': row.get('status'),
                'createdAt': _serialize_date(row.get('created_at')),
                'guestName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Guest',
                'roomName': row.get('room_name') or row.get('room_type') or '—',
                'hotelName': row.get('hotel_name') or '—',
            })
            total_rating += _to_int(row.get('rating'), 0)

        avg = round(total_rating / len(reviews), 1) if reviews else 0
        five_star = sum(1 for r in reviews if r['rating'] == 5)
        flagged = sum(1 for r in reviews if r['status'] == 'flagged')

        return jsonify({
            'reviews': reviews,
            'stats': {'total': len(reviews), 'avgRating': avg, 'fiveStar': five_star, 'flagged': flagged}
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/reviews/<int:review_id>', methods=['PATCH'])
def admin_update_review_status(review_id):
    conn = None
    cur = None
    try:
        data = request.json or {}
        status = data.get('status')
        if status not in ('published', 'flagged', 'hidden'):
            return jsonify({'error': 'Invalid status'}), 400
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE reviews SET status = %s WHERE id = %s", (status, review_id))
        conn.commit()
        return jsonify({'message': 'Review status updated.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/reviews/<int:review_id>', methods=['DELETE'])
def admin_delete_review(review_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM reviews WHERE id = %s", (review_id,))
        conn.commit()
        return jsonify({'message': 'Review deleted.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/reviews', methods=['GET'])
def owner_get_reviews():
    conn = None
    cur = None
    try:
        owner_id = request.args.get('owner_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT r.id, r.rating, r.title, r.comment, r.status, r.created_at,
                   c.first_name, c.last_name,
                   rm.room_name, rm.room_type,
                   h.hotel_name
            FROM reviews r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            LEFT JOIN hotels h ON h.id = r.hotel_id
        """
        params = []
        if owner_id:
            query += " WHERE h.owner_id = %s"
            params.append(owner_id)
        query += " ORDER BY r.created_at DESC LIMIT 200"

        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []
        reviews = []
        total_rating = 0
        for row in rows:
            reviews.append({
                'id': row.get('id'),
                'rating': row.get('rating'),
                'title': row.get('title') or '',
                'comment': row.get('comment') or '',
                'status': row.get('status'),
                'createdAt': _serialize_date(row.get('created_at')),
                'guestName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Guest',
                'roomName': row.get('room_name') or row.get('room_type') or '—',
                'hotelName': row.get('hotel_name') or '—',
            })
            total_rating += _to_int(row.get('rating'), 0)

        avg = round(total_rating / len(reviews), 1) if reviews else 0
        return jsonify({
            'reviews': reviews,
            'stats': {'total': len(reviews), 'avgRating': avg}
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/admin/system-logs', methods=['GET'])
def admin_system_logs():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        logs = []

        # Recent reservations as activity logs
        cur.execute("""
            SELECT r.id, r.status, r.created_at, r.total_amount,
                   c.first_name, c.last_name
            FROM reservations r
            LEFT JOIN customers c ON c.id = r.customer_id
            ORDER BY r.created_at DESC LIMIT 30
        """)
        for row in cur.fetchall() or []:
            s = str(row.get('status') or '').upper()
            event = 'Reservation Update'
            log_type = 'info'
            if s in {'CONFIRMED', 'PAID', 'COMPLETED'}:
                event = 'Booking Confirmed'
                log_type = 'success'
            elif s in {'CANCELLED', 'FAILED'}:
                event = 'Booking Cancelled'
                log_type = 'error'
            elif s == 'CHECKED_IN':
                event = 'Guest Check-in'
                log_type = 'success'
            elif s == 'CHECKED_OUT':
                event = 'Guest Check-out'
                log_type = 'info'
            name = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Guest'
            logs.append({
                'time': _serialize_date(row.get('created_at')),
                'event': f"{event} — Booking #{row.get('id')}",
                'actor': name,
                'type': log_type,
            })

        # Recent staff registrations
        cur.execute("SELECT first_name, last_name, role, created_at FROM staff ORDER BY created_at DESC LIMIT 5")
        for row in cur.fetchall() or []:
            name = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Staff'
            logs.append({
                'time': _serialize_date(row.get('created_at')),
                'event': f"Staff registered — {name} ({row.get('role') or 'Staff'})",
                'actor': 'System',
                'type': 'info',
            })

        logs.sort(key=lambda x: str(x.get('time') or ''), reverse=True)

        cur.execute("SELECT COUNT(*) AS c FROM reservations WHERE DATE(created_at) = CURRENT_DATE")
        today_count = _to_int((cur.fetchone() or {}).get('c'), 0)
        cur.execute("SELECT COUNT(*) AS c FROM reservations WHERE LOWER(status) = 'pending'")
        pending_count = _to_int((cur.fetchone() or {}).get('c'), 0)
        cur.execute("SELECT COUNT(*) AS c FROM customers")
        auth_count = _to_int((cur.fetchone() or {}).get('c'), 0)

        return jsonify({
            'logs': logs[:40],
            'stats': {
                'totalToday': today_count,
                'warnings': pending_count,
                'errors': 0,
                'authEvents': auth_count,
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)
    
    @app.route('/api/google-login', methods=['POST'])
    def google_login():
      data = request.json
    token = data.get('token')

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo['email']
        
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, first_name, last_name, email, contact_number FROM customers WHERE email = %s", (email,))
        user = cur.fetchone()

        if not user:
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            cur.execute(
                "INSERT INTO customers (first_name, last_name, email, auth_provider) VALUES (%s, %s, %s, %s) RETURNING id",
                (first_name, last_name, email, 'google')
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            
            final_first_name = first_name
            final_last_name = last_name
            final_contact = ""
        else:
            user_id, final_first_name, final_last_name, db_email, final_contact = user

        cur.close()
        conn.close()

        return jsonify({
            "message": "Login successful!",
            "user": {
                "id": user_id,
                "firstName": final_first_name, 
                "lastName": final_last_name,
                "email": email,
                "contactNumber": final_contact
            }
        }), 200

    except ValueError:
        return jsonify({"error": "Invalid Google token"}), 400
    
    
@app.route('/api/facebook-login', methods=['POST'])
def facebook_login():
    data = request.json
    access_token = data.get('accessToken')

    fb_url = f"https://graph.facebook.com/me?fields=id,first_name,last_name,email&access_token={access_token}"
    fb_response = requests.get(fb_url).json()

    if 'error' in fb_response:
        return jsonify({"error": "Invalid Facebook token"}), 400

    email = fb_response.get('email')
    if not email:
        email = f"{fb_response['id']}@facebook.com" 

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, first_name, last_name, email, contact_number FROM customers WHERE email = %s", (email,))
        user = cur.fetchone()

        if not user:
            first_name = fb_response.get('first_name', '')
            last_name = fb_response.get('last_name', '')
            cur.execute(
                "INSERT INTO customers (first_name, last_name, email, auth_provider) VALUES (%s, %s, %s, %s) RETURNING id",
                (first_name, last_name, email, 'facebook')
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            final_first_name, final_last_name, final_contact = first_name, last_name, ""
        else:
            user_id, final_first_name, final_last_name, _, final_contact = user

        cur.close()
        conn.close()

        return jsonify({
            "message": "Login successful!",
            "user": {
                "id": user_id,
                "firstName": final_first_name, 
                "lastName": final_last_name,
                "email": email,
                "contactNumber": final_contact
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- CUSTOMER ENDPOINTS ---

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    f_name = data.get('firstName')
    l_name = data.get('lastName')
    email = data.get('email')
    contact = data.get('contactNumber')
    password = data.get('password')
    hashed_pw = generate_password_hash(password)
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO customers (first_name, last_name, email, contact_number, password_hash) VALUES (%s, %s, %s, %s, %s)",
            (f_name, l_name, email, contact, hashed_pw)
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "User created successfully!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _ensure_profile_media_columns(cur)
        cur.execute("SELECT * FROM customers WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        if user and check_password_hash(user['password_hash'], password):
            return jsonify({
                "message": "Login successful!",
                "user": {
                    "id": user['id'], "firstName": user['first_name'], "lastName": user['last_name'],
                    "email": user['email'], "contactNumber": user['contact_number'],
                    "profileImage": user.get('profile_image') or ""
                }
            }), 200
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/update', methods=['PUT'])
def update_user_profile():
    conn = None
    cur = None
    try:
        payload = request.json or {}
        customer_id = payload.get("id")
        if not customer_id:
            return jsonify({"error": "id is required"}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _ensure_profile_media_columns(cur)

        if not _table_exists(cur, "customers"):
            return jsonify({"error": "customers table is unavailable"}), 404

        cur.execute(
            """
            UPDATE customers
            SET first_name = COALESCE(%s, first_name),
                last_name = COALESCE(%s, last_name),
                email = COALESCE(%s, email),
                contact_number = COALESCE(%s, contact_number),
                profile_image = COALESCE(%s, profile_image)
            WHERE id = %s
            RETURNING id, first_name, last_name, email, contact_number, profile_image
            """,
            (
                payload.get("firstName"),
                payload.get("lastName"),
                payload.get("email"),
                payload.get("contactNumber"),
                payload.get("profileImage"),
                customer_id,
            ),
        )
        row = cur.fetchone()
        if not row:
            conn.rollback()
            return jsonify({"error": "Customer not found"}), 404

        conn.commit()
        return jsonify({
            "message": "Profile updated successfully.",
            "user": {
                "id": row.get("id"),
                "firstName": row.get("first_name") or "",
                "lastName": row.get("last_name") or "",
                "email": row.get("email") or "",
                "contactNumber": row.get("contact_number") or "",
                "profileImage": row.get("profile_image") or "",
            },
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/user/change-password', methods=['PUT'])
def change_user_password():
    conn = None
    cur = None
    try:
        payload = request.json or {}
        customer_id = payload.get("id")
        current_password = payload.get("currentPassword") or ""
        new_password = payload.get("newPassword") or ""

        if not customer_id or not new_password:
            return jsonify({"error": "id and newPassword are required"}), 400
        if len(new_password) < 8:
            return jsonify({"error": "New password must be at least 8 characters."}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, "customers"):
            return jsonify({"error": "customers table is unavailable"}), 404

        cur.execute(
            "SELECT id, password_hash FROM customers WHERE id = %s LIMIT 1",
            (customer_id,),
        )
        customer = cur.fetchone()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        stored_hash = customer.get("password_hash")
        if current_password and stored_hash and not check_password_hash(stored_hash, current_password):
            return jsonify({"error": "Current password is incorrect."}), 400

        cur.execute(
            "UPDATE customers SET password_hash = %s WHERE id = %s",
            (generate_password_hash(new_password), customer_id),
        )
        conn.commit()
        return jsonify({"message": "Password changed successfully."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/user/profile/<int:customer_id>', methods=['GET'])
def get_user_profile(customer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _ensure_profile_media_columns(cur)
        summary = _build_customer_membership_summary(cur, customer_id)
        if not summary:
            return jsonify({"error": "Customer not found"}), 404
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

# --- OWNER ENDPOINTS ---

@app.route('/api/owner/signup', methods=['POST'])
def owner_signup():
    data = request.get_json(silent=True) or {}
    f_name = (data.get('firstName') or '').strip()
    l_name = (data.get('lastName') or '').strip()
    email = (data.get('email') or '').strip().lower()
    contact = (data.get('contactNumber') or '').strip()
    password = data.get('password') or ''
    hotel_code = (data.get('hotelCode') or '').strip().upper()
    hotel_name = (data.get('hotelName') or '').strip()
    hotel_address = (data.get('hotelAddress') or '').strip()
    hotel_coordinates = _geocode_hotel_address(hotel_address, hotel_name)

    if not all([f_name, l_name, email, contact, password]):
        return jsonify({'error': 'Please complete all required fields.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    if not hotel_code and not hotel_name:
        return jsonify({'error': 'Please provide a hotel code or enter a hotel name to create a new hotel.'}), 400

    hashed_pw = generate_password_hash(password)
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute('SELECT id FROM owners WHERE LOWER(email) = %s LIMIT 1', (email,))
        existing_owner = cur.fetchone()
        if existing_owner:
            return jsonify({'error': 'This email is already registered as an owner.'}), 409

        cur2 = conn.cursor()

        if hotel_code:
            hotel = None
            code_format_valid = False
            if _table_has_column(cur, 'hotels', 'hotel_code'):
                cur.execute(
                    """
                    SELECT id, hotel_name, owner_id, hotel_code
                    FROM hotels
                    WHERE UPPER(COALESCE(hotel_code, '')) = %s
                    LIMIT 1
                    """,
                    (hotel_code,),
                )
                hotel = cur.fetchone()

            if not hotel:
                match = re.match(r'^INNOVAHMS-(\d+)$', hotel_code)
                if match:
                    code_format_valid = True
                    cur.execute(
                        'SELECT id, hotel_name, owner_id, hotel_code FROM hotels WHERE id = %s LIMIT 1',
                        (int(match.group(1)),),
                    )
                    hotel = cur.fetchone()

            if hotel and hotel.get('owner_id'):
                cur2.close()
                return jsonify({'error': f'Hotel code {hotel_code} is already claimed by another owner.'}), 409

            if hotel:
                resolved_hotel_name = hotel.get('hotel_name') or hotel_name or 'Hotel'
                claimed_coordinates = _geocode_hotel_address(hotel_address, resolved_hotel_name) if hotel_address else None
                cur2.execute(
                    'INSERT INTO owners (first_name, last_name, email, contact_number, password_hash) VALUES (%s, %s, %s, %s, %s) RETURNING id',
                    (f_name, l_name, email, contact, hashed_pw)
                )
                owner_id = cur2.fetchone()[0]
                update_fields = ['owner_id = %s']
                update_params = [owner_id]
                if hotel_address and _table_has_column(cur, 'hotels', 'hotel_address'):
                    update_fields.append("hotel_address = %s")
                    update_params.append(hotel_address)
                if claimed_coordinates and _table_has_column(cur, 'hotels', 'latitude') and _table_has_column(cur, 'hotels', 'longitude'):
                    update_fields.append("latitude = %s")
                    update_fields.append("longitude = %s")
                    update_params.extend([claimed_coordinates['latitude'], claimed_coordinates['longitude']])
                update_params.append(hotel['id'])
                cur2.execute(
                    f"UPDATE hotels SET {', '.join(update_fields)} WHERE id = %s",
                    tuple(update_params),
                )

                starter_id, starter_amount = _seed_membership_packages(cur)
                cur.execute(
                    """
                INSERT INTO hotel_package_subscriptions (
                    owner_id, hotel_id, package_id, billing_cycle, amount,
                    status, payment_status, starts_at, renewal_date, updated_at
                )
                VALUES (%s, %s, %s, 'MONTHLY', %s, 'PENDING', 'UNPAID', CURRENT_DATE, NULL, NOW())
                ON CONFLICT (hotel_id) DO UPDATE SET
                    owner_id = EXCLUDED.owner_id,
                    package_id = EXCLUDED.package_id,
                    billing_cycle = EXCLUDED.billing_cycle,
                    amount = EXCLUDED.amount,
                    status = 'PENDING',
                    payment_status = 'UNPAID',
                    starts_at = CURRENT_DATE,
                    renewal_date = NULL,
                    last_paid_at = NULL,
                    paymongo_payment_id = NULL,
                    updated_at = NOW()
                """,
                (owner_id, hotel['id'], starter_id, starter_amount),
            )

                resolved_hotel_code = hotel.get('hotel_code') or hotel_code
                cur2.close()
                conn.commit()
                hotel_code_email_sent = _send_owner_hotel_code_email(
                    email,
                    f_name,
                    hotel.get('hotel_name') or hotel_name or 'Hotel',
                    resolved_hotel_code,
                    False,
                )
                return jsonify({
                    'message': 'Owner and hotel registered successfully. Subscription payment is required to unlock owner functions.',
                    'ownerId': owner_id,
                    'hotelId': hotel['id'],
                    'hotelName': hotel.get('hotel_name') or 'Hotel',
                    'hotelCode': resolved_hotel_code,
                    'createdHotel': False,
                    'subscriptionRequired': True,
                    'hotelCodeEmailSent': hotel_code_email_sent,
                    'hotelCodeSentTo': email,
                }), 201

            if not hotel_name:
                cur2.close()
                if code_format_valid:
                    return jsonify({'error': f'Hotel code {hotel_code} does not exist.'}), 404
                return jsonify({'error': 'Invalid hotel code. Please use the hotel code assigned by Innova HMS or leave it blank to create a new hotel.'}), 400

        cur.execute("SELECT nextval(pg_get_serial_sequence('hotels', 'id')) AS hotel_id")
        next_hotel = cur.fetchone() or {}
        hotel_id = next_hotel.get('hotel_id')
        if not hotel_id:
            cur2.close()
            return jsonify({'error': 'Unable to generate a hotel code right now. Please try again.'}), 500

        generated_hotel_code = f'INNOVAHMS-{hotel_id}'

        cur2.execute(
            'INSERT INTO owners (first_name, last_name, email, contact_number, password_hash) VALUES (%s, %s, %s, %s, %s) RETURNING id',
            (f_name, l_name, email, contact, hashed_pw)
        )
        owner_id = cur2.fetchone()[0]

        hotel_columns = ['id', 'owner_id', 'hotel_name']
        hotel_values = [hotel_id, owner_id, hotel_name]
        if _table_has_column(cur, 'hotels', 'hotel_address'):
            hotel_columns.append('hotel_address')
            hotel_values.append(hotel_address or '')
        if hotel_coordinates and _table_has_column(cur, 'hotels', 'latitude'):
            hotel_columns.append('latitude')
            hotel_values.append(hotel_coordinates['latitude'])
        if hotel_coordinates and _table_has_column(cur, 'hotels', 'longitude'):
            hotel_columns.append('longitude')
            hotel_values.append(hotel_coordinates['longitude'])
        if _table_has_column(cur, 'hotels', 'hotel_code'):
            hotel_columns.append('hotel_code')
            hotel_values.append(generated_hotel_code)

        hotel_placeholders = ', '.join(['%s'] * len(hotel_columns))
        cur2.execute(
            f"INSERT INTO hotels ({', '.join(hotel_columns)}) VALUES ({hotel_placeholders}) RETURNING id",
            tuple(hotel_values),
        )
        created_hotel = cur2.fetchone()
        if created_hotel:
            hotel_id = created_hotel[0]

        starter_id, starter_amount = _seed_membership_packages(cur)
        cur.execute(
            """
            INSERT INTO hotel_package_subscriptions (
                owner_id, hotel_id, package_id, billing_cycle, amount,
                status, payment_status, starts_at, renewal_date, updated_at
            )
            VALUES (%s, %s, %s, 'MONTHLY', %s, 'PENDING', 'UNPAID', CURRENT_DATE, NULL, NOW())
            ON CONFLICT (hotel_id) DO UPDATE SET
                owner_id = EXCLUDED.owner_id,
                package_id = EXCLUDED.package_id,
                billing_cycle = EXCLUDED.billing_cycle,
                amount = EXCLUDED.amount,
                status = 'PENDING',
                payment_status = 'UNPAID',
                starts_at = CURRENT_DATE,
                renewal_date = NULL,
                last_paid_at = NULL,
                paymongo_payment_id = NULL,
                updated_at = NOW()
            """,
            (owner_id, hotel_id, starter_id, starter_amount),
        )

        cur2.close()
        conn.commit()
        hotel_code_email_sent = _send_owner_hotel_code_email(
            email,
            f_name,
            hotel_name or 'Hotel',
            generated_hotel_code,
            True,
        )
        return jsonify({
            'message': 'Owner and hotel registered successfully. Subscription payment is required to unlock owner functions.',
            'ownerId': owner_id,
            'hotelId': hotel_id,
            'hotelName': hotel_name or 'Hotel',
            'hotelCode': generated_hotel_code,
            'createdHotel': True,
            'subscriptionRequired': True,
            'hotelCodeEmailSent': hotel_code_email_sent,
            'hotelCodeSentTo': email,
        }), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/login', methods=['POST'])
def owner_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Backfill subscription rows when possible without blocking login itself.
        _run_in_savepoint(
            cur,
            lambda: _backfill_hotel_subscriptions(cur),
            ignore_errors=True,
            prefix="owner_login_backfill",
        )
        cur.execute("""
            SELECT o.*, h.hotel_name, h.id as hotel_id, h.hotel_address, h.latitude, h.longitude
            FROM owners o
            LEFT JOIN hotels h ON o.id = h.owner_id
            WHERE o.email = %s
            LIMIT 1
        """, (email,))
        owner = cur.fetchone()
        if owner and check_password_hash(owner['password_hash'], password):
            owner_payload = _owner_session_payload(cur, owner)
            conn.commit()
            return jsonify({
                "message": "Owner login successful!",
                "owner": owner_payload
            }), 200
        conn.rollback()
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        if conn:
            try: conn.rollback()
            except: pass
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/profile/<int:owner_id>', methods=['GET'])
def owner_profile(owner_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        payload = _owner_profile_payload(cur, owner_id)
        if not payload:
            return jsonify({"error": "Owner not found"}), 404
        return jsonify(payload), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/profile/<int:owner_id>', methods=['PUT'])
def update_owner_profile(owner_id):
    conn = None
    cur = None
    try:
        data = request.get_json(silent=True) or {}
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _ensure_profile_media_columns(cur)

        cur.execute(
            """
            UPDATE owners
            SET first_name = COALESCE(%s, first_name),
                last_name = COALESCE(%s, last_name),
                email = COALESCE(%s, email),
                contact_number = COALESCE(%s, contact_number),
                profile_image = COALESCE(%s, profile_image)
            WHERE id = %s
            RETURNING id
            """,
            (
                data.get("firstName"),
                data.get("lastName"),
                data.get("email"),
                data.get("contactNumber"),
                data.get("profileImage"),
                owner_id,
            ),
        )
        owner_row = cur.fetchone()
        if not owner_row:
            conn.rollback()
            return jsonify({"error": "Owner not found"}), 404

        hotel_payload = data.get("hotel") or {}
        cur.execute("SELECT id, hotel_name FROM hotels WHERE owner_id = %s ORDER BY id ASC LIMIT 1", (owner_id,))
        hotel = cur.fetchone()

        hotel_name = str(hotel_payload.get("hotelName") or "").strip()
        hotel_address = str(hotel_payload.get("hotelAddress") or "").strip()
        hotel_description = str(hotel_payload.get("hotelDescription") or "").strip()
        contact_phone = str(hotel_payload.get("contactPhone") or "").strip()
        business_image = str(hotel_payload.get("businessImage") or hotel_payload.get("hotelLogo") or "").strip()
        building_image = str(hotel_payload.get("buildingImage") or "").strip()
        hotel_coordinates = _geocode_hotel_address(hotel_address, hotel_name) if hotel_address else None

        if hotel:
            update_clauses = [
                "hotel_name = COALESCE(%s, hotel_name)",
                "hotel_address = COALESCE(%s, hotel_address)",
                "hotel_description = COALESCE(%s, hotel_description)",
                "contact_phone = COALESCE(%s, contact_phone)",
                "hotel_logo = COALESCE(%s, hotel_logo)",
                "hotel_building_image = COALESCE(%s, hotel_building_image)",
            ]
            params = [
                hotel_name or None,
                hotel_address or None,
                hotel_description or None,
                contact_phone or None,
                business_image or None,
                building_image or None,
            ]
            if hotel_coordinates and _table_has_column(cur, "hotels", "latitude") and _table_has_column(cur, "hotels", "longitude"):
                update_clauses.extend(["latitude = %s", "longitude = %s"])
                params.extend([hotel_coordinates["latitude"], hotel_coordinates["longitude"]])

            params.append(hotel.get("id"))
            cur.execute(
                f"""
                UPDATE hotels
                SET {', '.join(update_clauses)}
                WHERE id = %s
                """,
                tuple(params),
            )

        payload = _owner_profile_payload(cur, owner_id)
        if not payload:
            conn.rollback()
            return jsonify({"error": "Owner profile unavailable"}), 404

        session_seed = {
            "id": owner_id,
            "first_name": payload["owner"]["firstName"],
            "last_name": payload["owner"]["lastName"],
            "email": payload["owner"]["email"],
            "contact_number": payload["owner"]["contactNumber"],
            "profile_image": payload["owner"]["profileImage"],
        }
        session = _owner_session_payload(cur, session_seed)
        conn.commit()
        return jsonify({
            "message": "Owner profile updated successfully.",
            "profile": payload,
            "session": session,
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/subscription/<int:owner_id>', methods=['GET'])
def owner_subscription(owner_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _backfill_hotel_subscriptions(cur)
        _seed_membership_packages(cur)

        cur.execute(
            """
            SELECT o.*, h.hotel_name, h.id as hotel_id, h.hotel_address, h.latitude, h.longitude
            FROM owners o
            LEFT JOIN hotels h ON o.id = h.owner_id
            WHERE o.id = %s
            LIMIT 1
            """,
            (owner_id,),
        )
        owner = cur.fetchone()
        if not owner:
            return jsonify({"error": "Owner not found."}), 404

        cur.execute(
            """
            SELECT
                id, name, slug, description, monthly_price, annual_price,
                max_rooms, features, is_popular, is_active, display_order
            FROM membership_packages
            WHERE COALESCE(is_active, TRUE) = TRUE
            ORDER BY display_order ASC, monthly_price ASC, name ASC
            """
        )
        packages = []
        for row in cur.fetchall() or []:
            packages.append({
                "id": row.get("id"),
                "name": row.get("name"),
                "slug": row.get("slug"),
                "description": row.get("description") or "",
                "monthlyPrice": _to_float(row.get("monthly_price"), 0),
                "annualPrice": _to_float(row.get("annual_price"), 0),
                "maxRooms": row.get("max_rooms"),
                "features": row.get("features") or [],
                "isPopular": bool(row.get("is_popular")),
                "isActive": bool(row.get("is_active")),
                "displayOrder": _to_int(row.get("display_order"), 0),
            })

        subscription = _serialize_owner_subscription(_get_owner_subscription(cur, owner_id))
        conn.commit()
        return jsonify({
            "ownerId": owner_id,
            "packages": packages,
            "subscription": subscription,
            "session": _owner_session_payload(cur, owner),
            "canSetupHotel": subscription.get("isActive") and not subscription.get("hasHotel"),
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/subscription/create-payment-link', methods=['POST'])
def owner_create_subscription_payment_link():
    conn = None
    cur = None
    try:
        simulation_mode = _owner_subscription_simulation_enabled()
        paymongo_key = os.getenv('PAYMONGO_SECRET_KEY', '')
        if not simulation_mode and (not paymongo_key or 'your_' in paymongo_key):
            return jsonify({'error': 'PayMongo API key not configured. Please set PAYMONGO_SECRET_KEY in backend/.env file.'}), 503

        data = request.get_json(silent=True) or {}
        owner_id = _to_int(data.get("ownerId"), 0)
        package_id = _to_int(data.get("packageId"), 0)
        billing_cycle = str(data.get("billingCycle") or "MONTHLY").upper()
        if not owner_id or not package_id:
            return jsonify({"error": "Owner and package are required."}), 400
        if billing_cycle not in {"MONTHLY", "ANNUAL"}:
            return jsonify({"error": "Invalid billing cycle."}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _backfill_hotel_subscriptions(cur)
        _seed_membership_packages(cur)

        cur.execute("SELECT id, first_name, last_name, email FROM owners WHERE id = %s LIMIT 1", (owner_id,))
        owner = cur.fetchone()
        if not owner:
            return jsonify({"error": "Owner not found."}), 404

        cur.execute(
            """
            SELECT id, name, slug, monthly_price, annual_price
            FROM membership_packages
            WHERE id = %s
            LIMIT 1
            """,
            (package_id,),
        )
        package_row = cur.fetchone()
        if not package_row:
            return jsonify({"error": "Package not found."}), 404

        amount = _package_amount_for_cycle(package_row, billing_cycle)
        amount_cents = int(round(amount * 100))
        if amount_cents <= 0:
            return jsonify({"error": "Invalid subscription amount."}), 400

        cur.execute("SELECT id FROM hotels WHERE owner_id = %s ORDER BY id ASC LIMIT 1", (owner_id,))
        hotel = cur.fetchone() or {}
        hotel_id = hotel.get("id")
        current_subscription = _serialize_owner_subscription(_get_owner_subscription(cur, owner_id))
        pending_status = 'ACTIVE' if current_subscription.get("isActive") else 'PENDING'

        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        success_url = _owner_subscription_checkout_url(frontend_url, 'success', simulation_mode)
        failed_url = _owner_subscription_checkout_url(frontend_url, 'failed', simulation_mode)

        if simulation_mode:
            link_id = _owner_subscription_simulated_link_id(owner_id, package_id, billing_cycle)
            checkout_url = success_url
        else:
            payload = {
                'data': {
                    'attributes': {
                        'amount': amount_cents,
                        'currency': 'PHP',
                        'description': f'Innova HMS {package_row.get("name")} {billing_cycle.title()} Subscription',
                        'remarks': f'Owner #{owner_id} subscription',
                        'redirect': {'success': success_url, 'failed': failed_url},
                    }
                }
            }
            response = requests.post(
                'https://api.paymongo.com/v1/links',
                json=payload,
                headers=_paymongo_headers(),
                timeout=15,
            )
            result = response.json()
            if not response.ok:
                errors = result.get('errors', [{}])
                msg = errors[0].get('detail', 'PayMongo error') if errors else 'PayMongo error'
                return jsonify({'error': msg}), 400

            link_data = result.get('data', {})
            attrs = link_data.get('attributes', {})
            checkout_url = attrs.get('checkout_url', '')
            link_id = link_data.get('id', '')

        cur.execute(
            """
            INSERT INTO hotel_package_subscriptions (
                owner_id, hotel_id, package_id, billing_cycle, amount, status,
                payment_status, paymongo_payment_id, starts_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'PENDING', %s, CURRENT_DATE, NOW())
            ON CONFLICT (owner_id) DO UPDATE SET
                hotel_id = EXCLUDED.hotel_id,
                package_id = EXCLUDED.package_id,
                billing_cycle = EXCLUDED.billing_cycle,
                amount = EXCLUDED.amount,
                status = %s,
                payment_status = 'PENDING',
                paymongo_payment_id = EXCLUDED.paymongo_payment_id,
                updated_at = NOW()
            RETURNING id
            """,
            (owner_id, hotel_id, package_id, billing_cycle, amount, pending_status, link_id, pending_status),
        )
        subscription_row = cur.fetchone() or {}
        conn.commit()
        return jsonify({
            "checkoutUrl": checkout_url,
            "linkId": link_id,
            "subscriptionId": subscription_row.get("id"),
            "amount": amount,
            "packageName": package_row.get("name"),
            "billingCycle": billing_cycle,
            "isSimulated": simulation_mode,
        }), 200
    except requests.exceptions.Timeout:
        return jsonify({'error': 'PayMongo request timed out. Try again.'}), 504
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/subscription/verify/<string:link_id>', methods=['GET'])
def owner_verify_subscription_payment(link_id):
    conn = None
    cur = None
    try:
        owner_id = request.args.get('owner_id', type=int)
        if not owner_id:
            return jsonify({'error': 'owner_id is required.'}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _backfill_hotel_subscriptions(cur)
        _seed_membership_packages(cur)

        cur.execute(
            """
            SELECT *
            FROM hotel_package_subscriptions
            WHERE owner_id = %s AND paymongo_payment_id = %s
            LIMIT 1
            """,
            (owner_id, link_id),
        )
        subscription = cur.fetchone()
        if not subscription:
            return jsonify({'error': 'Subscription payment record not found.'}), 404

        simulated_link = str(link_id or "").startswith("simsub_")
        if str(subscription.get('payment_status') or '').upper() == 'PAID' and subscription.get('last_paid_at'):
            amount = _to_float(subscription.get('amount'), 0)
            conn.commit()
            return _owner_subscription_success_response(cur, owner_id, amount, simulated_link)

        if simulated_link:
            status = 'paid'
            amount = _to_float(subscription.get('amount'), 0)
            is_paid = True
        else:
            response = requests.get(
                f'https://api.paymongo.com/v1/links/{link_id}',
                headers=_paymongo_headers(),
                timeout=15,
            )
            result = response.json()
            if not response.ok:
                return jsonify({'error': 'Failed to verify payment'}), 400

            attrs = result.get('data', {}).get('attributes', {})
            status = attrs.get('status', 'unpaid')
            amount = attrs.get('amount', 0) / 100
            is_paid = status == 'paid'

        if is_paid:
            starts_at, next_renewal = _subscription_cycle_dates(subscription, carry_requires_payment_proof=True)

            cur.execute(
                """
                UPDATE hotel_package_subscriptions
                SET
                    status = 'ACTIVE',
                    payment_status = 'PAID',
                    starts_at = %s,
                    last_paid_at = NOW(),
                    renewal_date = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (starts_at, next_renewal, subscription.get("id")),
            )
            cur.fetchone()

            conn.commit()
            return _owner_subscription_success_response(cur, owner_id, amount, simulated_link)

        cur.execute(
            """
            UPDATE hotel_package_subscriptions
            SET payment_status = %s, updated_at = NOW()
            WHERE id = %s
            """,
            (str(status).upper(), subscription.get("id")),
        )
        conn.commit()
        return jsonify({'status': status, 'amount': amount}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/hotel/setup', methods=['POST'])
def owner_setup_hotel():
    conn = None
    cur = None
    try:
        data = request.get_json(silent=True) or {}
        owner_id = _to_int(data.get("ownerId"), 0)
        hotel_code = str(data.get("hotelCode") or "").strip().upper()
        hotel_name = str(data.get("hotelName") or "").strip()
        hotel_address = str(data.get("hotelAddress") or "").strip()
        hotel_coordinates = _geocode_hotel_address(hotel_address, hotel_name)
        if not owner_id:
            return jsonify({"error": "Owner is required."}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _backfill_hotel_subscriptions(cur)
        _seed_membership_packages(cur)

        if not _owner_has_active_subscription(cur, owner_id):
            return jsonify({"error": "An active subscription is required before setting up a hotel."}), 403

        cur.execute("SELECT id FROM hotels WHERE owner_id = %s LIMIT 1", (owner_id,))
        existing_hotel = cur.fetchone()
        if existing_hotel:
            return jsonify({"error": "This owner already has a hotel configured."}), 409

        resolved_hotel = None
        if hotel_code:
            if _table_has_column(cur, 'hotels', 'hotel_code'):
                cur.execute(
                    """
                    SELECT id, hotel_name, owner_id, hotel_code, hotel_address
                    FROM hotels
                    WHERE UPPER(COALESCE(hotel_code, '')) = %s
                    LIMIT 1
                    """,
                    (hotel_code,),
                )
                resolved_hotel = cur.fetchone()
            if not resolved_hotel:
                match = re.match(r'^INNOVAHMS-(\d+)$', hotel_code)
                if match:
                    cur.execute(
                        "SELECT id, hotel_name, owner_id, hotel_code, hotel_address FROM hotels WHERE id = %s LIMIT 1",
                        (int(match.group(1)),),
                    )
                    resolved_hotel = cur.fetchone()
            if not resolved_hotel:
                return jsonify({"error": f"Hotel code {hotel_code} does not exist."}), 404
            if resolved_hotel.get("owner_id"):
                return jsonify({"error": f"Hotel code {hotel_code} is already claimed by another owner."}), 409

            claimed_hotel_name = resolved_hotel.get("hotel_name") or hotel_name or "Hotel"
            claimed_coordinates = _geocode_hotel_address(hotel_address, claimed_hotel_name) if hotel_address else None
            update_set_parts = [
                "owner_id = %s",
                "hotel_address = COALESCE(NULLIF(%s, ''), hotel_address)",
                "updated_at = NOW()",
            ]
            update_params = [owner_id, hotel_address]
            if claimed_coordinates and _table_has_column(cur, "hotels", "latitude") and _table_has_column(cur, "hotels", "longitude"):
                update_set_parts.extend(["latitude = %s", "longitude = %s"])
                update_params.extend([claimed_coordinates["latitude"], claimed_coordinates["longitude"]])
            update_params.append(resolved_hotel.get("id"))
            cur.execute(
                f"""
                UPDATE hotels
                SET {', '.join(update_set_parts)}
                WHERE id = %s
                RETURNING id, hotel_name, hotel_code, hotel_address
                """,
                tuple(update_params),
            )
            resolved_hotel = cur.fetchone()
        else:
            if not hotel_name:
                return jsonify({"error": "Hotel name is required when no hotel code is provided."}), 400

            cur.execute("SELECT nextval(pg_get_serial_sequence('hotels', 'id')) AS hotel_id")
            next_hotel = cur.fetchone() or {}
            hotel_id = next_hotel.get("hotel_id")
            if not hotel_id:
                return jsonify({"error": "Unable to generate a hotel code right now. Please try again."}), 500

            generated_hotel_code = f"INNOVAHMS-{hotel_id}"
            columns = ["id", "owner_id", "hotel_name"]
            values = [hotel_id, owner_id, hotel_name]
            if _table_has_column(cur, "hotels", "hotel_address"):
                columns.append("hotel_address")
                values.append(hotel_address)
            if hotel_coordinates and _table_has_column(cur, "hotels", "latitude"):
                columns.append("latitude")
                values.append(hotel_coordinates["latitude"])
            if hotel_coordinates and _table_has_column(cur, "hotels", "longitude"):
                columns.append("longitude")
                values.append(hotel_coordinates["longitude"])
            if _table_has_column(cur, "hotels", "hotel_code"):
                columns.append("hotel_code")
                values.append(generated_hotel_code)
            placeholders = ", ".join(["%s"] * len(values))
            cur.execute(
                f"INSERT INTO hotels ({', '.join(columns)}) VALUES ({placeholders}) RETURNING id, hotel_name, hotel_code, hotel_address",
                tuple(values),
            )
            resolved_hotel = cur.fetchone()

        cur.execute(
            """
            UPDATE hotel_package_subscriptions
            SET hotel_id = %s, updated_at = NOW()
            WHERE owner_id = %s
            """,
            (resolved_hotel.get("id"), owner_id),
        )

        cur.execute(
            """
            SELECT o.*, h.hotel_name, h.id as hotel_id, h.hotel_address, h.latitude, h.longitude
            FROM owners o
            LEFT JOIN hotels h ON o.id = h.owner_id
            WHERE o.id = %s
            LIMIT 1
            """,
            (owner_id,),
        )
        owner = cur.fetchone()
        conn.commit()
        return jsonify({
            "message": "Hotel setup completed successfully.",
            "hotel": {
                "id": resolved_hotel.get("id"),
                "hotelName": resolved_hotel.get("hotel_name"),
                "hotelCode": resolved_hotel.get("hotel_code"),
                "hotelAddress": resolved_hotel.get("hotel_address"),
            },
            "session": _owner_session_payload(cur, owner) if owner else None,
        }), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


def _resolve_owner_hotel(cur, owner_id):
    if not _table_exists(cur, "hotels"):
        return None

    _ensure_profile_media_columns(cur)
    select_columns = ["id", "hotel_name"]
    if _table_has_column(cur, "hotels", "hotel_code"):
        select_columns.append("hotel_code")
    if _table_has_column(cur, "hotels", "hotel_address"):
        select_columns.append("hotel_address")
    if _table_has_column(cur, "hotels", "hotel_logo"):
        select_columns.append("hotel_logo")
    if _table_has_column(cur, "hotels", "hotel_building_image"):
        select_columns.append("hotel_building_image")
    if _table_has_column(cur, "hotels", "hotel_description"):
        select_columns.append("hotel_description")
    if _table_has_column(cur, "hotels", "contact_phone"):
        select_columns.append("contact_phone")
    columns_sql = ", ".join(select_columns)

    if _table_has_column(cur, "hotels", "owner_id"):
        cur.execute(
            f"""
            SELECT {columns_sql}
            FROM hotels
            WHERE owner_id = %s
            ORDER BY id ASC
            LIMIT 1
            """,
            (owner_id,),
        )
        row = cur.fetchone()
        if row:
            return row
    return None


def _build_forecast_payload(reservation_rows, total_rooms, period):
    grouped_revenue = defaultdict(float)
    grouped_occ = defaultdict(float)

    for row in reservation_rows:
        row_date = _extract_reservation_date(row)
        key = _period_bucket_key(row_date, period)
        grouped_revenue[key] += _extract_reservation_amount(row)
        status_text = str(row.get("status") or "").lower()
        if status_text in {"checked_in", "occupied", "paid", "confirmed", "completed"}:
            grouped_occ[key] += 1

    labels = sorted(grouped_revenue.keys() or grouped_occ.keys())
    if not labels:
        today = datetime.utcnow().date()
        steps = 6 if period == "monthly" else 10
        labels = []
        for idx in range(steps):
            base = today - timedelta(days=(steps - idx - 1))
            labels.append(_period_bucket_key(base, period))

    revenue_history = [round(grouped_revenue.get(label, 0.0), 2) for label in labels]
    occ_history = []
    for label in labels:
        base_value = grouped_occ.get(label, 0.0)
        if total_rooms > 0:
            occ_history.append(round(min(100.0, (base_value / total_rooms) * 100), 2))
        else:
            occ_history.append(0.0)

    horizon = 4 if period == "monthly" else 7
    revenue_projection = _linear_project(revenue_history, horizon)
    occ_projection = _linear_project(occ_history, horizon)

    extended_labels = list(labels)
    if labels:
        for idx in range(1, horizon + 1):
            extended_labels.append(_next_period_label(labels[-1], period, idx))
    else:
        now_label = _period_bucket_key(datetime.utcnow().date(), period)
        for idx in range(horizon):
            extended_labels.append(_next_period_label(now_label, period, idx + 1))

    revenue_series = [round(value, 2) for value in (revenue_history + revenue_projection)]
    occupancy_series = [round(max(0.0, min(100.0, value)), 2) for value in (occ_history + occ_projection)]

    return {
        "period": period,
        "labels": extended_labels,
        "revenueSeries": revenue_series,
        "occupancySeries": occupancy_series,
        "engine": {
            "prophet": PROPHET_AVAILABLE,
            "plotly": True,
            "mode": "linear-fallback" if not PROPHET_AVAILABLE else "prophet-ready",
        },
        "plotlySpec": {
            "data": [
                {"type": "scatter", "name": "Revenue", "x": extended_labels, "y": revenue_series},
                {"type": "scatter", "name": "Occupancy", "x": extended_labels, "y": occupancy_series, "yaxis": "y2"},
            ],
            "layout": {
                "title": "Owner Forecast",
                "xaxis": {"title": "Period"},
                "yaxis": {"title": "Revenue (PHP)"},
                "yaxis2": {"title": "Occupancy (%)", "overlaying": "y", "side": "right"},
            },
        },
    }


def _coerce_date(value):
    if value is None:
        return None
    if hasattr(value, "date"):
        try:
            return value.date() if hasattr(value, "hour") else value
        except Exception:
            pass
    if isinstance(value, str):
        for fmt in (
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
        ):
            try:
                return datetime.strptime(value[:26], fmt).date()
            except Exception:
                continue
    return None


def _percent(part, whole):
    if not whole:
        return 0.0
    return round((_to_float(part, 0.0) / max(_to_float(whole, 0.0), 1.0)) * 100, 2)


def _default_owner_period_labels(period):
    today = datetime.utcnow().date()
    steps = 7 if period == "daily" else 6
    labels = []
    for idx in range(steps):
        if period == "daily":
            day_value = today - timedelta(days=(steps - idx - 1))
        else:
            month_index = today.month - 1 - (steps - idx - 1)
            year = today.year + (month_index // 12)
            month = (month_index % 12) + 1
            day_value = datetime(year, month, 1).date()
        labels.append(_period_bucket_key(day_value, period))
    return labels


def _owner_room_label(room):
    if not room:
        return "Room"
    return (
        room.get("room_name")
        or room.get("room_type")
        or room.get("room_number")
        or f"Room {room.get('id')}"
    )


def _owner_room_image(room, hotel=None):
    if room:
        for field in ("image_url", "imageUrl", "img", "image"):
            value = room.get(field)
            if value:
                return value
        images = _parse_text_array(room.get("images"))
        if images:
            return images[0]
        fallback = _default_tour_image_for_room(room.get("room_name"), room.get("room_type"))
        if fallback:
            return fallback

    if hotel:
        return hotel.get("hotel_logo") or "/images/deluxe-room.jpg"
    return "/images/deluxe-room.jpg"


def _fetch_owner_room_rows(cur, hotel_id):
    if not _table_exists(cur, "rooms"):
        return []

    query = "SELECT * FROM rooms"
    params = []
    if _table_has_column(cur, "rooms", "hotel_id"):
        query += " WHERE hotel_id = %s"
        params.append(hotel_id)
    query += " ORDER BY id ASC"
    cur.execute(query, tuple(params))
    return cur.fetchall() or []


def _fetch_owner_reservation_rows(cur, hotel_id, limit=900):
    if not _table_exists(cur, "reservations"):
        return []

    query = "SELECT * FROM reservations"
    params = []
    if _table_has_column(cur, "reservations", "hotel_id"):
        query += " WHERE hotel_id = %s"
        params.append(hotel_id)
    query += " ORDER BY id DESC LIMIT %s"
    params.append(limit)
    cur.execute(query, tuple(params))
    return cur.fetchall() or []


def _fetch_owner_customer_map(cur):
    customers = {}
    if not _table_exists(cur, "customers"):
        return customers

    cur.execute(
        """
        SELECT id, first_name, last_name, email, contact_number, created_at
        FROM customers
        """
    )
    for row in cur.fetchall() or []:
        customers[row.get("id")] = {
            "id": row.get("id"),
            "fullName": f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or "Guest",
            "email": row.get("email") or "",
            "contactNumber": row.get("contact_number") or "",
            "createdAt": _serialize_date(row.get("created_at")),
        }
    return customers


def _behavior_segment(total_spend, booking_count, successful_bookings, cancellation_rate):
    if cancellation_rate >= 35 or (booking_count >= 2 and successful_bookings == 0):
        return "RISK"
    if total_spend >= 30000 or successful_bookings >= 4:
        return "VIP"
    if booking_count >= 2:
        return "LOYAL"
    return "STANDARD"


def _behavior_frequency_label(booking_count, first_date, last_date):
    if booking_count >= 6:
        return "Very Frequent"
    if booking_count >= 3:
        return "Frequent"
    if booking_count >= 2:
        return "Returning"
    return "Occasional"


def _owner_recommendation_cards(hotel, analytics_summary, room_mix, guest_rows):
    cards = []
    best_room = room_mix[0] if room_mix else {}
    weakest_room = room_mix[-1] if len(room_mix) > 1 else best_room
    vip_guest = next((guest for guest in guest_rows if guest.get("segment") == "VIP"), guest_rows[0] if guest_rows else {})
    risk_guest = next((guest for guest in guest_rows if guest.get("riskLevel") == "High"), guest_rows[0] if guest_rows else {})

    occupancy_rate = analytics_summary.get("currentOccupancyRate", 0)
    cancellation_rate = analytics_summary.get("cancellationRate", 0)
    repeat_rate = analytics_summary.get("repeatGuestRate", 0)

    cards.append({
        "id": "revenue-optimizer",
        "title": f"AI Revenue Lift for {best_room.get('label') or 'Top Rooms'}",
        "summary": (
            f"Bookings are strongest around {best_room.get('label') or 'your best-selling room type'}. "
            f"Use this demand signal to push premium pricing bundles while occupancy stays at {round(occupancy_rate)}%."
        ),
        "action": "Highlight premium inclusions and raise rates on peak dates.",
        "metricLabel": "Projected Lift",
        "metricValue": f"+{max(8, int(round(best_room.get('share', 0) * 0.4)))}%",
        "priority": "High",
        "imageUrl": best_room.get("imageUrl") or _owner_room_image(None, hotel),
    })

    cards.append({
        "id": "repeat-guest-play",
        "title": "AI Loyalty Campaign Suggestion",
        "summary": (
            f"Repeat guest rate is at {round(repeat_rate)}%. "
            f"Target returning guests like {vip_guest.get('name') or 'top spenders'} with upgrade offers and tailored add-ons."
        ),
        "action": "Launch a returning-guest package with room upgrade and breakfast credit.",
        "metricLabel": "Retention Focus",
        "metricValue": f"{round(repeat_rate)}%",
        "priority": "Medium",
        "imageUrl": vip_guest.get("imageUrl") or best_room.get("imageUrl") or _owner_room_image(None, hotel),
    })

    cards.append({
        "id": "cancel-risk-guard",
        "title": "AI Cancellation Risk Watch",
        "summary": (
            f"Cancellation exposure is {round(cancellation_rate)}%. "
            f"Focus on guests like {risk_guest.get('name') or 'at-risk bookers'} and room categories like {weakest_room.get('label') or 'lower-performing inventory'}."
        ),
        "action": "Offer flexible rebooking, deposit reminders, and pre-arrival confirmation outreach.",
        "metricLabel": "Risk Guests",
        "metricValue": str(analytics_summary.get("highRiskGuests", 0)),
        "priority": "High" if cancellation_rate >= 20 else "Medium",
        "imageUrl": weakest_room.get("imageUrl") or _owner_room_image(None, hotel),
    })

    return cards


def _build_owner_analytics_payload(cur, owner_id, hotel, period):
    hotel_id = hotel.get("id")
    room_rows = _fetch_owner_room_rows(cur, hotel_id)
    reservations = _fetch_owner_reservation_rows(cur, hotel_id)
    customers_by_id = _fetch_owner_customer_map(cur)

    room_by_id = {row.get("id"): row for row in room_rows}
    total_rooms = len(room_rows)

    booked_counter = defaultdict(int)
    revenue_counter = defaultdict(float)
    occupied_counter = defaultdict(float)
    guest_ledger = {}
    room_mix = {}
    total_revenue = 0.0
    total_cancellations = 0

    success_statuses = {"checked_in", "checked_out", "paid", "confirmed", "completed", "occupied"}
    cancelled_statuses = {"cancelled", "failed", "canceled", "no_show", "no-show"}

    for row in reservations:
        status_text = str(row.get("status") or "").strip().lower()
        booking_date = _extract_reservation_date(row)
        bucket_key = _period_bucket_key(booking_date, period)
        amount = _extract_reservation_amount(row)
        room = room_by_id.get(row.get("room_id")) or {}
        room_label = _owner_room_label(room)
        room_type_key = (room.get("room_type") or room_label or "General").strip()
        room_image = _owner_room_image(room, hotel)

        booked_counter[bucket_key] += 1
        if status_text not in cancelled_statuses:
            revenue_counter[bucket_key] += amount
            total_revenue += amount
        else:
            total_cancellations += 1

        if status_text in success_statuses:
            occupied_counter[bucket_key] += 1

        mix = room_mix.setdefault(room_type_key, {
            "label": room_type_key,
            "bookingCount": 0,
            "revenue": 0.0,
            "imageUrl": room_image,
        })
        mix["bookingCount"] += 1
        if status_text not in cancelled_statuses:
            mix["revenue"] += amount
        if not mix.get("imageUrl"):
            mix["imageUrl"] = room_image

        customer_id = row.get("customer_id")
        fallback_key = (row.get("guest_name") or "").strip().lower()
        guest_key = customer_id if customer_id is not None else (fallback_key or f"guest-{row.get('id')}")
        customer = customers_by_id.get(customer_id) or {}
        guest = guest_ledger.setdefault(guest_key, {
            "customerId": customer_id,
            "name": row.get("guest_name") or customer.get("fullName") or "Guest",
            "email": customer.get("email") or "",
            "contactNumber": customer.get("contactNumber") or "",
            "bookingCount": 0,
            "successfulBookings": 0,
            "cancellationCount": 0,
            "totalSpend": 0.0,
            "firstBookingDate": None,
            "lastBookingDate": None,
            "preferredRoomCounter": Counter(),
            "imageUrl": room_image,
        })
        guest["bookingCount"] += 1
        if status_text in cancelled_statuses:
            guest["cancellationCount"] += 1
        else:
            guest["successfulBookings"] += 1
            guest["totalSpend"] += amount

        if room_label:
            guest["preferredRoomCounter"][room_label] += 1

        if booking_date:
            if not guest["firstBookingDate"] or booking_date < guest["firstBookingDate"]:
                guest["firstBookingDate"] = booking_date
            if not guest["lastBookingDate"] or booking_date > guest["lastBookingDate"]:
                guest["lastBookingDate"] = booking_date

        if not guest.get("imageUrl"):
            guest["imageUrl"] = room_image

    labels = sorted(set(booked_counter.keys()) | set(revenue_counter.keys()) | set(occupied_counter.keys()))
    if not labels:
        labels = _default_owner_period_labels(period)

    revenue_series = [round(revenue_counter.get(label, 0.0), 2) for label in labels]
    booking_series = [booked_counter.get(label, 0) for label in labels]
    occupancy_series = [
        round(min(100.0, (occupied_counter.get(label, 0.0) / total_rooms) * 100), 2) if total_rooms else 0.0
        for label in labels
    ]

    forecast = _build_forecast_payload(reservations, total_rooms, period)
    forecast_horizon = max(len(forecast.get("labels", [])) - len(labels), 0)
    projected_revenue = forecast.get("revenueSeries", [0])[-1] if forecast.get("revenueSeries") else 0
    projected_occupancy = forecast.get("occupancySeries", [0])[-1] if forecast.get("occupancySeries") else 0

    guest_rows = []
    for guest in guest_ledger.values():
        booking_count = guest.get("bookingCount", 0)
        successful_bookings = guest.get("successfulBookings", 0)
        total_spend = round(guest.get("totalSpend", 0.0), 2)
        cancellation_count = guest.get("cancellationCount", 0)
        cancellation_rate = _percent(cancellation_count, booking_count)
        first_booking = guest.get("firstBookingDate")
        last_booking = guest.get("lastBookingDate")
        avg_booking_value = round(total_spend / max(successful_bookings, 1), 2) if successful_bookings else 0.0
        risk_score = min(
            100,
            round(
                (cancellation_rate * 1.5)
                + (20 if successful_bookings == 0 and booking_count >= 2 else 0)
                + (15 if last_booking and (datetime.utcnow().date() - last_booking).days > 120 else 0)
            ),
        )
        segment = _behavior_segment(total_spend, booking_count, successful_bookings, cancellation_rate)
        guest_rows.append({
            "customerId": guest.get("customerId"),
            "name": guest.get("name") or "Guest",
            "email": guest.get("email") or "",
            "contactNumber": guest.get("contactNumber") or "",
            "segment": segment,
            "riskLevel": "High" if risk_score >= 65 else "Medium" if risk_score >= 35 else "Low",
            "riskScore": risk_score,
            "totalSpend": total_spend,
            "bookingCount": booking_count,
            "successfulBookings": successful_bookings,
            "cancellationCount": cancellation_count,
            "cancellationRate": cancellation_rate,
            "averageBookingValue": avg_booking_value,
            "bookingFrequency": _behavior_frequency_label(booking_count, first_booking, last_booking),
            "preferredRoom": guest.get("preferredRoomCounter", Counter()).most_common(1)[0][0] if guest.get("preferredRoomCounter") else "Room",
            "firstBookingDate": _serialize_date(first_booking),
            "lastBookingDate": _serialize_date(last_booking),
            "imageUrl": guest.get("imageUrl") or _owner_room_image(None, hotel),
        })

    guest_rows.sort(
        key=lambda item: (
            -_to_float(item.get("totalSpend"), 0),
            -_to_int(item.get("bookingCount"), 0),
            item.get("name") or "",
        )
    )

    repeat_guests = sum(1 for guest in guest_rows if _to_int(guest.get("bookingCount"), 0) > 1)
    high_risk_guests = [guest for guest in guest_rows if guest.get("riskLevel") == "High"]
    segment_counter = Counter(guest.get("segment") or "STANDARD" for guest in guest_rows)

    room_mix_rows = []
    total_room_bookings = sum(item.get("bookingCount", 0) for item in room_mix.values())
    for item in room_mix.values():
        row = dict(item)
        row["revenue"] = round(row.get("revenue", 0.0), 2)
        row["share"] = round(_percent(row.get("bookingCount", 0), total_room_bookings), 2)
        room_mix_rows.append(row)
    room_mix_rows.sort(key=lambda item: (-_to_float(item.get("revenue"), 0.0), -_to_int(item.get("bookingCount"), 0)))

    analytics_summary = {
        "totalGuests": len(guest_rows),
        "repeatGuestRate": _percent(repeat_guests, len(guest_rows)),
        "averageGuestSpendPhp": round(total_revenue / max(len(guest_rows), 1), 2) if guest_rows else 0.0,
        "cancellationRate": _percent(total_cancellations, len(reservations)),
        "highRiskGuests": len(high_risk_guests),
        "currentOccupancyRate": round(occupancy_series[-1], 2) if occupancy_series else 0.0,
        "currentRevenuePhp": round(revenue_series[-1], 2) if revenue_series else 0.0,
        "forecastedRevenuePhp": round(projected_revenue, 2),
        "forecastedOccupancyRate": round(projected_occupancy, 2),
        "forecastHorizon": forecast_horizon,
    }

    return {
        "ownerId": owner_id,
        "hotelId": hotel_id,
        "hotelName": hotel.get("hotel_name") or "Innova Property",
        "period": period,
        "generatedAt": datetime.utcnow().isoformat(),
        "summary": analytics_summary,
        "trends": {
            "labels": labels,
            "bookings": booking_series,
            "revenuePhp": revenue_series,
            "occupancyRate": occupancy_series,
        },
        "forecast": {
            "labels": forecast.get("labels", []),
            "revenueSeries": forecast.get("revenueSeries", []),
            "occupancySeries": forecast.get("occupancySeries", []),
            "engine": forecast.get("engine", {}),
        },
        "behavioralAnalytics": {
            "segments": [{"label": label, "count": count} for label, count in segment_counter.most_common()],
            "topGuests": guest_rows[:5],
            "atRiskGuests": sorted(
                high_risk_guests,
                key=lambda item: (-_to_int(item.get("riskScore"), 0), -_to_float(item.get("cancellationRate"), 0.0))
            )[:5],
            "guestProfiles": guest_rows[:20],
        },
        "roomMix": room_mix_rows[:6],
        "aiRecommendations": _owner_recommendation_cards(hotel, analytics_summary, room_mix_rows, guest_rows),
    }


def _ensure_guest_offers_table(cur):
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


def _build_owner_staff_payload(cur, owner_id, hotel):
    hotel_id = hotel.get("id")
    if not _table_exists(cur, "staff"):
        return {"staff": [], "analytics": {}}

    query = "SELECT * FROM staff"
    params = []
    if _table_has_column(cur, "staff", "hotel_id"):
        query += " WHERE hotel_id = %s"
        params.append(hotel_id)
    query += " ORDER BY id DESC"
    cur.execute(query, tuple(params))
    rows = cur.fetchall() or []

    staff = []
    active_count = 0
    role_counter = Counter()
    for row in rows:
        name = row.get("full_name") or f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or "Staff"
        status_raw = str(row.get("status") or "").strip().lower()
        on_shift = _is_truthy(row.get("is_on_duty")) or status_raw in {"active", "on_shift", "on duty", "on_duty"}
        if on_shift:
            active_count += 1
        role = row.get("role") or "Staff"
        role_counter[role] += 1
        staff.append({
            "id": row.get("id"),
            "name": name,
            "email": row.get("email") or "",
            "role": role,
            "status": "On Shift" if on_shift else "Offline",
            "rating": round(4.2 + ((row.get("id") or 1) % 7) * 0.1, 1),
            "image": row.get("profile_image") or "",
        })

    avg_rating = round(sum(_to_float(item.get("rating"), 0) for item in staff) / max(len(staff), 1), 1) if staff else 0
    analytics = {
        "activeCount": active_count,
        "totalCount": len(staff),
        "avgCleaningSpeed": f"{max(18, 42 - min(active_count, 10))}m",
        "avgRating": avg_rating,
        "payrollProjection": len(staff) * 25000,
        "baseSalary": len(staff) * 22000,
        "bonuses": len(staff) * 3000,
        "tardinessCount": max(0, len(staff) // 4),
        "overtimeHours": len(staff) * 2,
        "morningShiftCount": active_count,
        "afternoonShiftCount": max(0, len(staff) - active_count // 2),
        "nightShiftCount": max(0, len(staff) // 3),
        "cleaningProgress": [
            {"name": "Guest Wing", "percentage": min(100, 35 + (active_count * 8))},
            {"name": "Suite Wing", "percentage": min(100, 28 + (len(staff) * 6))},
            {"name": "Common Areas", "percentage": min(100, 40 + (active_count * 7))},
        ],
        "roles": [{"label": label, "count": count} for label, count in role_counter.most_common()],
    }
    return {"ownerId": owner_id, "hotelId": hotel_id, "staff": staff, "analytics": analytics}


@app.route('/api/owner/dashboard/<int:owner_id>', methods=['GET'])
def owner_dashboard(owner_id):
    conn = None
    cur = None
    try:
        period = (request.args.get("period") or "monthly").strip().lower()
        if period not in {"daily", "monthly"}:
            period = "monthly"

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        hotel_id = hotel.get("id")
        hotel_name = hotel.get("hotel_name") or "Innova Property"

        room_rows = []
        if _table_exists(cur, "rooms"):
            room_query = "SELECT * FROM rooms"
            params = []
            if _table_has_column(cur, "rooms", "hotel_id"):
                room_query += " WHERE hotel_id = %s"
                params.append(hotel_id)
            room_query += " ORDER BY id ASC"
            cur.execute(room_query, tuple(params))
            room_rows = cur.fetchall() or []

        rooms_payload = []
        room_status_counter = Counter()
        for room in room_rows:
            normalized = _normalize_room_status(room.get("status"))
            room_status_counter[normalized] += 1
            rooms_payload.append({
                "id": room.get("id"),
                "roomNumber": room.get("room_number") or f"R-{room.get('id')}",
                "status": normalized,
            })

        total_rooms = len(rooms_payload)
        available_rooms = room_status_counter.get("vacant", 0)
        occupancy_rate = round((room_status_counter.get("occupied", 0) / total_rooms) * 100, 2) if total_rooms else 0

        reservations = []
        if _table_exists(cur, "reservations"):
            res_query = "SELECT * FROM reservations"
            res_params = []
            if _table_has_column(cur, "reservations", "hotel_id"):
                res_query += " WHERE hotel_id = %s"
                res_params.append(hotel_id)
            res_query += " ORDER BY id DESC LIMIT 600"
            cur.execute(res_query, tuple(res_params))
            reservations = cur.fetchall() or []

        customers_by_id = {}
        if _table_exists(cur, "customers"):
            cur.execute("SELECT id, first_name, last_name FROM customers")
            for row in cur.fetchall() or []:
                customers_by_id[row.get("id")] = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or "Guest"

        room_number_by_id = {
            row.get("id"): row.get("room_number") or f"R-{row.get('id')}"
            for row in room_rows
        }

        total_revenue = 0.0
        recent_bookings = []
        origin_counter = Counter()
        for row in reservations:
            amount = _extract_reservation_amount(row)
            status_text = str(row.get("status") or "").upper()
            if status_text not in {"CANCELLED", "FAILED"}:
                total_revenue += amount

            customer_id = row.get("customer_id")
            customer_name = (
                row.get("guest_name")
                or customers_by_id.get(customer_id)
                or "Customer"
            )
            room_id = row.get("room_id")
            created_at = row.get("created_at") or row.get("check_in_date") or row.get("check_in")
            recent_bookings.append({
                "id": row.get("id"),
                "customerName": customer_name,
                "roomNumber": room_number_by_id.get(room_id, "--"),
                "createdAt": _serialize_date(created_at),
                "totalAmountPhp": amount,
                "status": status_text or "--",
            })

            origin_label = row.get("origin_country") or row.get("origin") or "Philippines"
            origin_counter[str(origin_label)] += 1

        recent_bookings = sorted(
            recent_bookings,
            key=lambda item: str(item.get("createdAt") or ""),
            reverse=True,
        )[:10]

        top_origins = [{"label": label, "count": count} for label, count in origin_counter.most_common(5)]
        points = []
        for origin in top_origins:
            lat, lng = _country_lat_lng(origin["label"])
            points.append({
                "label": origin["label"],
                "lat": lat,
                "lng": lng,
                "count": origin["count"],
            })

        staff_on_duty = []
        if _table_exists(cur, "staff"):
            staff_query = "SELECT * FROM staff"
            staff_params = []
            if _table_has_column(cur, "staff", "hotel_id"):
                staff_query += " WHERE hotel_id = %s"
                staff_params.append(hotel_id)
            staff_query += " ORDER BY id DESC LIMIT 30"
            cur.execute(staff_query, tuple(staff_params))
            staff_rows = cur.fetchall() or []
            for row in staff_rows:
                is_on_duty = _is_truthy(row.get("is_on_duty")) or str(row.get("status") or "").lower() in {"active", "on_duty"}
                if not is_on_duty:
                    continue
                name = (
                    row.get("full_name")
                    or f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip()
                    or "Staff"
                )
                staff_on_duty.append({
                    "name": name,
                    "role": row.get("role") or "Staff",
                })

        forecast = _build_forecast_payload(reservations, total_rooms, period)

        return jsonify({
            "ownerId": owner_id,
            "hotelId": hotel_id,
            "hotelName": hotel_name,
            "kpis": {
                "totalReservations": len(reservations),
                "occupancyRate": occupancy_rate,
                "totalRevenuePhp": round(total_revenue, 2),
                "availableRooms": available_rooms,
                "inventoryNote": "Synced with inventory module",
            },
            "roomStatus": {
                "totalRooms": total_rooms,
                "counts": {
                    "occupied": room_status_counter.get("occupied", 0),
                    "vacant": room_status_counter.get("vacant", 0),
                    "dirty": room_status_counter.get("dirty", 0),
                    "maintenance": room_status_counter.get("maintenance", 0),
                },
                "rooms": rooms_payload,
            },
            "staffOnDuty": staff_on_duty[:12],
            "recentBookings": recent_bookings,
            "customerOrigins": {
                "top": top_origins,
                "points": points,
            },
            "forecast": forecast,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/forecast/<int:owner_id>', methods=['GET'])
def owner_forecast(owner_id):
    conn = None
    cur = None
    try:
        period = (request.args.get("period") or "monthly").strip().lower()
        if period not in {"daily", "monthly"}:
            period = "monthly"

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        hotel_id = hotel.get("id")
        reservations = []
        if _table_exists(cur, "reservations"):
            query = "SELECT * FROM reservations"
            params = []
            if _table_has_column(cur, "reservations", "hotel_id"):
                query += " WHERE hotel_id = %s"
                params.append(hotel_id)
            query += " ORDER BY id DESC LIMIT 600"
            cur.execute(query, tuple(params))
            reservations = cur.fetchall() or []

        total_rooms = 0
        if _table_exists(cur, "rooms"):
            query = "SELECT COUNT(*) AS total FROM rooms"
            params = []
            if _table_has_column(cur, "rooms", "hotel_id"):
                query += " WHERE hotel_id = %s"
                params.append(hotel_id)
            cur.execute(query, tuple(params))
            row = cur.fetchone() or {}
            total_rooms = _to_int(row.get("total"), 0)

        payload = _build_forecast_payload(reservations, total_rooms, period)
        payload["ownerId"] = owner_id
        payload["hotelId"] = hotel_id
        return jsonify(payload), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/analytics/<int:owner_id>', methods=['GET'])
def owner_analytics(owner_id):
    conn = None
    cur = None
    try:
        period = (request.args.get("period") or "monthly").strip().lower()
        if period not in {"daily", "monthly"}:
            period = "monthly"

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        payload = _build_owner_analytics_payload(cur, owner_id, hotel, period)
        return jsonify(payload), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


# Owner notification endpoints
@app.route('/api/owner/notifications/<int:owner_id>', methods=['GET'])
def owner_get_notifications(owner_id):
    """Owner: Get notifications"""
    limit = min(request.args.get('limit', 50, type=int), 200)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'

    notifications = _get_user_notifications(owner_id, 'owner', limit, unread_only)
    unread_count = len([n for n in notifications if not n['is_read']]) if not unread_only else len(notifications)

    return jsonify({
        'notifications': notifications,
        'unread_count': unread_count
    }), 200


@app.route('/api/owner/notifications/<int:owner_id>/<int:notification_id>/read', methods=['PATCH'])
def owner_mark_notification_read(owner_id, notification_id):
    """Owner: Mark notification as read"""
    success = _mark_notification_read(notification_id, owner_id, 'owner')
    if success:
        return jsonify({'message': 'Notification marked as read'}), 200
    else:
        return jsonify({'error': 'Failed to mark notification as read'}), 500


@app.route('/api/owner/notifications/preferences/<int:owner_id>', methods=['GET'])
def owner_get_notification_preferences(owner_id):
    """Owner: Get notification preferences"""
    preferences = _get_notification_preferences(owner_id, 'owner')
    return jsonify({'preferences': preferences}), 200


@app.route('/api/owner/notifications/preferences/<int:owner_id>', methods=['PUT'])
def owner_update_notification_preferences(owner_id):
    """Owner: Update notification preferences"""
    data = request.get_json() or {}
    preferences = data.get('preferences', [])

    success = _update_notification_preferences(owner_id, 'owner', preferences)
    if success:
        return jsonify({'message': 'Preferences updated successfully'}), 200
    else:
        return jsonify({'error': 'Failed to update preferences'}), 500


@app.route('/api/owner/customers/<int:owner_id>', methods=['GET'])
def owner_customers(owner_id):
    conn = None
    cur = None
    try:
        period = (request.args.get("period") or "monthly").strip().lower()
        if period not in {"daily", "monthly"}:
            period = "monthly"

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        analytics = _build_owner_analytics_payload(cur, owner_id, hotel, period)
        return jsonify({
            "ownerId": owner_id,
            "hotelId": hotel.get("id"),
            "hotelName": hotel.get("hotel_name") or "Innova Property",
            "stats": analytics.get("summary", {}),
            "segments": analytics.get("behavioralAnalytics", {}).get("segments", []),
            "customers": analytics.get("behavioralAnalytics", {}).get("guestProfiles", []),
            "topGuests": analytics.get("behavioralAnalytics", {}).get("topGuests", []),
            "atRiskGuests": analytics.get("behavioralAnalytics", {}).get("atRiskGuests", []),
            "trends": analytics.get("trends", {}),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/staff/<int:owner_id>', methods=['GET'])
def owner_staff(owner_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'staff')
        if guard:
            return guard
        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404
        return jsonify(_build_owner_staff_payload(cur, owner_id, hotel)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/staff/<int:owner_id>', methods=['POST'])
def owner_add_staff(owner_id):
    conn = None
    cur = None
    try:
        data = request.json or {}
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'staff', mutation=True)
        if guard:
            return guard
        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        full_name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        role = (data.get("role") or "Housekeeping").strip()
        salary = _to_float(data.get("salary"), 0)
        if not full_name or not email:
            return jsonify({"error": "Name and email are required."}), 400

        name_parts = full_name.split()
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "-"

        password_hash = generate_password_hash("staff1234")
        columns = ["hotel_id", "first_name", "last_name", "email", "contact_number", "password_hash", "role", "status"]
        values = [hotel.get("id"), first_name, last_name, email, data.get("contactNumber") or "", password_hash, role, "Active"]
        if _table_has_column(cur, "staff", "hotel_code"):
            columns.append("hotel_code")
            values.append(data.get("hotelCode") or f"OWNER-{hotel.get('id')}")
        if _table_has_column(cur, "staff", "employee_id"):
            columns.append("employee_id")
            values.append(f"EMP-{hotel.get('id')}-{int(datetime.utcnow().timestamp())}"[-20:])

        placeholders = ", ".join(["%s"] * len(values))
        cur.execute(
            f"INSERT INTO staff ({', '.join(columns)}) VALUES ({placeholders}) RETURNING id",
            tuple(values),
        )
        row = cur.fetchone()
        conn.commit()
        return jsonify({"message": "Staff added successfully.", "staffId": row.get("id"), "salary": salary}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/promotions/<int:owner_id>', methods=['GET'])
def owner_promotions(owner_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'promotions')
        if guard:
            return guard
        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        _ensure_guest_offers_table(cur)
        cur.execute(
            """
            SELECT *
            FROM guest_offers
            WHERE hotel_id = %s
            ORDER BY created_at DESC, id DESC
            """,
            (hotel.get("id"),),
        )
        rows = cur.fetchall() or []
        offers = []
        for row in rows:
            offers.append({
                "id": row.get("id"),
                "title": row.get("title") or "Special Offer",
                "subtitle": row.get("subtitle") or "",
                "description": row.get("description") or "",
                "original_price": _to_float(row.get("original_price"), 0),
                "discounted_price": _to_float(row.get("discounted_price"), 0),
                "discount_percentage": _to_int(row.get("discount_percentage"), 0),
                "offer_type": row.get("offer_type") or "seasonal",
                "image_url": row.get("image_url") or "/images/signup-img.png",
                "badge_text": row.get("badge_text") or "Featured Deal",
                "expiry_date": _serialize_date(row.get("expiry_date")),
                "is_active": bool(row.get("is_active", True)),
            })
        return jsonify({"ownerId": owner_id, "hotelId": hotel.get("id"), "offers": offers}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/promotions/<int:owner_id>', methods=['POST'])
def owner_create_promotion(owner_id):
    conn = None
    cur = None
    try:
        data = request.json or {}
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'promotions', mutation=True)
        if guard:
            return guard
        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        _ensure_guest_offers_table(cur)
        cur.execute(
            """
            INSERT INTO guest_offers
            (hotel_id, title, subtitle, description, original_price, discounted_price,
             discount_percentage, offer_type, image_url, badge_text, expiry_date, is_active, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (
                hotel.get("id"),
                (data.get("title") or "Special Offer").strip(),
                (data.get("subtitle") or "").strip(),
                (data.get("description") or "").strip(),
                _to_float(data.get("original_price"), 0),
                _to_float(data.get("discounted_price"), 0),
                _to_int(data.get("discount_percentage"), 0),
                (data.get("offer_type") or "seasonal").strip(),
                (data.get("image_url") or "/images/signup-img.png").strip(),
                (data.get("badge_text") or "Featured Deal").strip(),
                data.get("expiry_date") or None,
                bool(data.get("is_active", True)),
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return jsonify({"message": "Promotion created successfully.", "id": row.get("id")}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/promotions/<int:owner_id>/<int:offer_id>', methods=['PUT'])
def owner_update_promotion(owner_id, offer_id):
    conn = None
    cur = None
    try:
        data = request.json or {}
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'promotions', mutation=True)
        if guard:
            return guard
        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        _ensure_guest_offers_table(cur)
        cur.execute(
            """
            UPDATE guest_offers
            SET title = %s,
                subtitle = %s,
                description = %s,
                original_price = %s,
                discounted_price = %s,
                discount_percentage = %s,
                offer_type = %s,
                image_url = %s,
                badge_text = %s,
                expiry_date = %s,
                is_active = %s,
                updated_at = NOW()
            WHERE id = %s AND hotel_id = %s
            RETURNING id
            """,
            (
                (data.get("title") or "Special Offer").strip(),
                (data.get("subtitle") or "").strip(),
                (data.get("description") or "").strip(),
                _to_float(data.get("original_price"), 0),
                _to_float(data.get("discounted_price"), 0),
                _to_int(data.get("discount_percentage"), 0),
                (data.get("offer_type") or "seasonal").strip(),
                (data.get("image_url") or "/images/signup-img.png").strip(),
                (data.get("badge_text") or "Featured Deal").strip(),
                data.get("expiry_date") or None,
                bool(data.get("is_active", True)),
                offer_id,
                hotel.get("id"),
            ),
        )
        if not cur.fetchone():
            return jsonify({"error": "Promotion not found."}), 404
        conn.commit()
        return jsonify({"message": "Promotion updated successfully."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/promotions/<int:owner_id>/<int:offer_id>', methods=['DELETE'])
def owner_delete_promotion(owner_id, offer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'promotions', mutation=True)
        if guard:
            return guard
        hotel = _resolve_owner_hotel(cur, owner_id)
        if not hotel:
            return jsonify({"error": "No hotel found for this owner."}), 404

        _ensure_guest_offers_table(cur)
        cur.execute("DELETE FROM guest_offers WHERE id = %s AND hotel_id = %s RETURNING id", (offer_id, hotel.get("id")))
        if not cur.fetchone():
            return jsonify({"error": "Promotion not found."}), 404
        conn.commit()
        return jsonify({"message": "Promotion deleted successfully."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)
    
# --- STAFF LOGIN ---
@app.route('/api/staff/login', methods=['POST'])
def staff_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    hotel_code = data.get('hotelCode')

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # I-join ang staff at hotels table para makuha ang hotel_name
        query = """
            SELECT s.*, h.hotel_name 
            FROM staff s 
            JOIN hotels h ON s.hotel_id = h.id 
            WHERE s.email = %s AND s.hotel_code = %s
        """
        cur.execute(query, (email, hotel_code))
        staff = cur.fetchone()
        
        cur.close()
        conn.close()

        if staff and check_password_hash(staff['password_hash'], password):
            return jsonify({
                "message": "Login successful!",
                "staff": {
                    "id": staff['id'],
                    "firstName": staff['first_name'],
                    "lastName": staff.get('last_name') or '',
                    "role": staff['role'],
                    "hotelId": staff['hotel_id'],
                    "hotelName": staff['hotel_name'],
                    "hotelCode": staff.get('hotel_code') or '',
                }
            }), 200
            
        return jsonify({"error": "Invalid email, password, or hotel code"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- STAFF REGISTRATION ---

@app.route('/api/staff/register', methods=['POST'])
def register_staff():
    data = request.json
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    email = data.get('email')
    contact_number = data.get('contactNumber')
    password = data.get('password')
    role = data.get('role')
    hotel_code = data.get('hotelCode')

    # FIX 2: Tinanggal ang 'security.' dahil direct import ang generate_password_hash
    password_hash = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Hanapin ang hotel_id base sa hotel_code
        cur.execute("SELECT id FROM hotels WHERE hotel_code = %s", (hotel_code,))
        hotel = cur.fetchone()
        
        if not hotel:
            cur.close()
            conn.close()
            return jsonify({"error": "Invalid Hotel Verification Code"}), 400
        
        hotel_id = hotel[0]

        # 2. Insert Staff Data
        cur.execute("""
            INSERT INTO staff (hotel_id, first_name, last_name, email, contact_number, password_hash, role, hotel_code)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, email;
        """, (hotel_id, first_name, last_name, email, contact_number, password_hash, role, hotel_code))

        new_staff = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "message": "Staff registered successfully!",
            "staff_id": new_staff[0]
        }), 201

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({"error": str(e)}), 500

        return jsonify({"error": str(e)}), 500

# Staff notification endpoints
@app.route('/api/staff/notifications/<int:staff_id>', methods=['GET'])
def staff_get_notifications(staff_id):
    """Staff: Get notifications"""
    limit = min(request.args.get('limit', 50, type=int), 200)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'

    notifications = _get_user_notifications(staff_id, 'staff', limit, unread_only)
    unread_count = len([n for n in notifications if not n['is_read']]) if not unread_only else len(notifications)

    return jsonify({
        'notifications': notifications,
        'unread_count': unread_count
    }), 200


@app.route('/api/staff/notifications/<int:staff_id>/<int:notification_id>/read', methods=['PATCH'])
def staff_mark_notification_read(staff_id, notification_id):
    """Staff: Mark notification as read"""
    success = _mark_notification_read(notification_id, staff_id, 'staff')
    if success:
        return jsonify({'message': 'Notification marked as read'}), 200
    else:
        return jsonify({'error': 'Failed to mark notification as read'}), 500


@app.route('/api/staff/notifications/preferences/<int:staff_id>', methods=['GET'])
def staff_get_notification_preferences(staff_id):
    """Staff: Get notification preferences"""
    preferences = _get_notification_preferences(staff_id, 'staff')
    return jsonify({'preferences': preferences}), 200


@app.route('/api/staff/notifications/preferences/<int:staff_id>', methods=['PUT'])
def staff_update_notification_preferences(staff_id):
    """Staff: Update notification preferences"""
    data = request.get_json() or {}
    preferences = data.get('preferences', [])

    success = _update_notification_preferences(staff_id, 'staff', preferences)
    if success:
        return jsonify({'message': 'Preferences updated successfully'}), 200
    else:
        return jsonify({'error': 'Failed to update preferences'}), 500

# --- ROOM MANAGEMENT ---

@app.route('/api/owner/rooms/<int:hotel_id>', methods=['GET'])
def get_rooms(hotel_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM rooms WHERE hotel_id = %s ORDER BY room_number", (hotel_id,))
        rows = cur.fetchall() or []
        rooms = []
        for r in rows:
            images = _parse_text_array(r.get('images'))
            amenities = _parse_text_array(r.get('amenities'))
            rooms.append({
                'id': r.get('id'),
                'roomNumber': r.get('room_number') or '',
                'roomName': r.get('room_name') or '',
                'roomType': r.get('room_type') or 'Single',
                'price': float(r.get('price_per_night') or 0),
                'description': r.get('description') or '',
                'maxAdults': int(r.get('max_adults') or 2),
                'maxChildren': int(r.get('max_children') or 0),
                'amenities': amenities,
                'images': images,
                'status': r.get('status') or 'Available',
            })
        return jsonify(rooms), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

def _save_room_images(files, hotel_id, room_num):
    paths = []
    for file in files:
        if file and file.filename:
            filename = secure_filename(f"h{hotel_id}_r{room_num}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            paths.append(f"/static/uploads/rooms/{filename}")
    return paths


def _to_pg_array(items):
    """Convert a list of strings to a PostgreSQL TEXT[] literal."""
    if not items:
        return '{}'
    escaped = [item.replace('"', '\\"') for item in items]
    return '{' + ','.join(f'"{e}"' for e in escaped) + '}'


@app.route('/api/owner/rooms/add', methods=['POST'])
def add_room():
    conn = None
    cur = None
    try:
        hotel_id = _to_int(request.form.get('hotelId'), 0)
        room_num = request.form.get('roomNumber')
        room_name = request.form.get('roomName', '')
        room_type = request.form.get('roomType', 'Single')
        price = float(request.form.get('price') or 0)
        desc = request.form.get('description', '')
        adults = int(request.form.get('maxAdults') or 2)
        children = int(request.form.get('maxChildren') or 0)

        # Parse amenities — frontend sends {"Wifi","Aircon"} or JSON array
        raw_amenities = request.form.get('amenities', '')
        amenities_list = _parse_text_array(raw_amenities)
        amenities_pg = _to_pg_array(amenities_list)

        # Save uploaded images
        image_paths = _save_room_images(request.files.getlist('images'), hotel_id, room_num)
        images_pg = _to_pg_array(image_paths)

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        owner_id = _hotel_owner_id(cur, hotel_id)
        guard, subscription = _owner_feature_guard(cur, owner_id, 'rooms', mutation=True)
        if guard:
            return guard
        room_limit = subscription.get("roomLimit")
        if room_limit:
            cur.execute("SELECT COUNT(*) AS total FROM rooms WHERE hotel_id = %s", (hotel_id,))
            current_count = _to_int((cur.fetchone() or {}).get("total"), 0)
            if current_count >= room_limit:
                return _owner_room_limit_response(subscription)
        cur.execute("""
            INSERT INTO rooms (hotel_id, room_number, room_name, room_type, price_per_night,
                               description, amenities, images, max_adults, max_children, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s::text[], %s::text[], %s, %s, 'Available')
        """, (hotel_id, room_num, room_name, room_type, price, desc,
               amenities_pg, images_pg, adults, children))
        conn.commit()
        return jsonify({"message": "Room added successfully!"}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/rooms/update/<int:room_id>', methods=['PUT'])
def update_room(room_id):
    conn = None
    cur = None
    try:
        hotel_id = _to_int(request.form.get('hotelId'), 0)
        room_num = request.form.get('roomNumber')
        room_name = request.form.get('roomName', '')
        room_type = request.form.get('roomType', 'Single')
        price = float(request.form.get('price') or 0)
        desc = request.form.get('description', '')
        adults = int(request.form.get('maxAdults') or 2)
        children = int(request.form.get('maxChildren') or 0)

        raw_amenities = request.form.get('amenities', '')
        amenities_list = _parse_text_array(raw_amenities)
        amenities_pg = _to_pg_array(amenities_list)

        # Keep existing images + add new uploads
        existing = request.form.getlist('existing_images')
        new_paths = _save_room_images(request.files.getlist('images'), hotel_id, room_num)
        all_images = existing + new_paths
        images_pg = _to_pg_array(all_images)

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        owner_id = _room_owner_id(cur, room_id) or _hotel_owner_id(cur, hotel_id)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'rooms', mutation=True)
        if guard:
            return guard
        cur.execute("""
            UPDATE rooms
            SET room_number = %s, room_name = %s, room_type = %s, price_per_night = %s,
                description = %s, amenities = %s::text[], images = %s::text[],
                max_adults = %s, max_children = %s
            WHERE id = %s
        """, (room_num, room_name, room_type, price, desc,
               amenities_pg, images_pg, adults, children, room_id))
        conn.commit()
        return jsonify({"message": "Room updated successfully!"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/rooms/delete/<int:room_id>', methods=['DELETE'])
def delete_room(room_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        owner_id = _room_owner_id(cur, room_id)
        guard, _subscription = _owner_feature_guard(cur, owner_id, 'rooms', mutation=True)
        if guard:
            return guard
        cur.execute("DELETE FROM rooms WHERE id = %s", (room_id,))
        conn.commit()
        return jsonify({"message": "Room deleted successfully!"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        _safe_close(conn, cur)

@app.route('/api/active-stays', methods=['GET'])
def get_active_stays():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Kunin lang ang mga kasalukuyang naka-check in
        query = """
            SELECT r.*, c.first_name, c.last_name, rm.room_number
            FROM reservations r
            JOIN customers c ON r.customer_id = c.id
            JOIN rooms rm ON r.room_id = rm.id
            WHERE r.status = 'CHECKED_IN';
        """
        cur.execute(query)
        stays = cur.fetchall()
        for s in stays:
            s['check_in_date'] = s['check_in_date'].isoformat()
            s['check_out_date'] = s['check_out_date'].isoformat()
        return jsonify(stays), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()
        
@app.route('/api/check-in/<int:reservation_id>', methods=['PUT'])
def check_in_reservation(reservation_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE reservations
            SET status = 'CHECKED_IN'
            WHERE id = %s
        """, (reservation_id,))

        conn.commit()
        cur.close()

        return jsonify({"message": "Checked-in successfully"}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if conn:
            conn.close()
        
# --- PAYMONGO PAYMENT INTEGRATION ---

def _paymongo_headers():
    import base64
    key = os.getenv('PAYMONGO_SECRET_KEY', '')
    encoded = base64.b64encode(f'{key}:'.encode()).decode()
    return {
        'Authorization': f'Basic {encoded}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


@app.route('/api/payment/create-link', methods=['POST'])
def create_payment_link():
    """Create a PayMongo payment link for a reservation."""
    conn = None
    cur = None
    try:
        paymongo_key = os.getenv('PAYMONGO_SECRET_KEY', '')
        if not paymongo_key or 'your_' in paymongo_key:
            return jsonify({'error': 'PayMongo API key not configured. Please set PAYMONGO_SECRET_KEY in backend/.env file. Get your key at https://dashboard.paymongo.com/developers'}), 503

        data = request.json or {}
        reservation_id = data.get('reservationId')
        payment_method = (data.get('paymentMethod') or 'card').lower()
        if not reservation_id:
            return jsonify({'error': 'reservationId is required'}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            'SELECT id, booking_number, total_amount, status FROM reservations WHERE id = %s',
            (reservation_id,)
        )
        reservation = cur.fetchone()
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404

        amount_cents = int(_to_float(reservation.get('total_amount'), 0) * 100)
        if amount_cents <= 0:
            return jsonify({'error': 'Invalid reservation amount'}), 400

        booking_number = reservation.get('booking_number') or f'INV-{reservation_id}'
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        success_url = f'{frontend_url}/booking/success?reservationId={reservation_id}&bookingNumber={booking_number}'
        failed_url = f'{frontend_url}/booking/failed?reservationId={reservation_id}'

        # Map payment method to PayMongo type
        # Only use payment methods enabled on this account
        # Check your enabled methods at: https://dashboard.paymongo.com/developers
        method_map = {
            'gcash': 'gcash',
            'maya': 'paymaya',
            'card': 'card',
            'online': 'card',
            'qrph': 'qrph',
        }
        pm_type = method_map.get(payment_method, 'card')

        # GCash and Maya use payment intent + payment method flow
        if pm_type in ('gcash', 'paymaya', 'qrph'):
            # Step 1: Create Payment Intent
            intent_payload = {
                'data': {
                    'attributes': {
                        'amount': amount_cents,
                        'currency': 'PHP',
                        'payment_method_allowed': [pm_type],
                        'payment_method_options': {
                            pm_type: {'redirect': {'success': success_url, 'failed': failed_url}}
                        },
                        'description': f'Innova HMS Booking {booking_number}',
                        'statement_descriptor': 'INNOVA HMS',
                        'capture_type': 'automatic',
                    }
                }
            }

            intent_res = requests.post(
                'https://api.paymongo.com/v1/payment_intents',
                json=intent_payload, headers=_paymongo_headers(), timeout=15
            )
            intent_data = intent_res.json()
            if not intent_res.ok:
                errors = intent_data.get('errors', [{}])
                msg = errors[0].get('detail', 'PayMongo error') if errors else 'PayMongo error'
                return jsonify({'error': msg}), 400

            intent_id = intent_data['data']['id']
            client_key = intent_data['data']['attributes']['client_key']

            # Create Payment Method
            pm_res = requests.post(
                'https://api.paymongo.com/v1/payment_methods',
                json={'data': {'attributes': {'type': pm_type, 'billing': {'name': 'Innova HMS Guest', 'email': 'guest@innovahms.com'}}}},
                headers=_paymongo_headers(), timeout=15
            )
            pm_data = pm_res.json()
            if not pm_res.ok:
                errors = pm_data.get('errors', [{}])
                msg = errors[0].get('detail', 'PayMongo error') if errors else 'PayMongo error'
                return jsonify({'error': msg}), 400

            pm_id = pm_data['data']['id']

            # Attach Payment Method to Intent
            attach_res = requests.post(
                f'https://api.paymongo.com/v1/payment_intents/{intent_id}/attach',
                json={'data': {'attributes': {'payment_method': pm_id, 'client_key': client_key, 'return_url': success_url}}},
                headers=_paymongo_headers(), timeout=15
            )
            attach_data = attach_res.json()
            if not attach_res.ok:
                errors = attach_data.get('errors', [{}])
                msg = errors[0].get('detail', 'PayMongo error') if errors else 'PayMongo error'
                return jsonify({'error': msg}), 400

            next_action = attach_data['data']['attributes'].get('next_action') or {}
            redirect_url = next_action.get('redirect', {}).get('url', '')
            qr_code_url = next_action.get('qr_code', {}).get('image_url', '') if isinstance(next_action.get('qr_code'), dict) else ''

            cur.execute('UPDATE reservations SET paymongo_payment_id = %s WHERE id = %s', (intent_id, reservation_id))
            conn.commit()

            return jsonify({
                'checkoutUrl': redirect_url or qr_code_url,
                'qrCodeUrl': qr_code_url,
                'isQrPayment': pm_type == 'qrph',
                'intentId': intent_id,
                'linkId': intent_id,
                'bookingNumber': booking_number,
                'amount': _to_float(reservation.get('total_amount'), 0),
                'paymentMethod': pm_type,
            }), 200

        # Card — use PayMongo Link (supports card payments)
        else:
            payload = {
                'data': {
                    'attributes': {
                        'amount': amount_cents,
                        'currency': 'PHP',
                        'description': f'Innova HMS Booking {booking_number}',
                        'remarks': f'Reservation #{reservation_id}',
                        'redirect': {'success': success_url, 'failed': failed_url}
                    }
                }
            }
            response = requests.post(
                'https://api.paymongo.com/v1/links',
                json=payload,
                headers=_paymongo_headers(),
                timeout=15
            )
            result = response.json()
            if not response.ok:
                errors = result.get('errors', [{}])
                msg = errors[0].get('detail', 'PayMongo error') if errors else 'PayMongo error'
                return jsonify({'error': msg}), 400

            link_data = result.get('data', {})
            attrs = link_data.get('attributes', {})
            checkout_url = attrs.get('checkout_url', '')
            link_id = link_data.get('id', '')

            cur.execute(
                'UPDATE reservations SET paymongo_payment_id = %s WHERE id = %s',
                (link_id, reservation_id)
            )
            conn.commit()

            return jsonify({
                'checkoutUrl': checkout_url,
                'linkId': link_id,
                'bookingNumber': booking_number,
                'amount': _to_float(reservation.get('total_amount'), 0),
                'paymentMethod': 'card',
            }), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'PayMongo request timed out. Try again.'}), 504
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/payment/verify/<string:link_id>', methods=['GET'])
def verify_payment(link_id):
    """Verify payment status - works for both payment links and payment intents."""
    conn = None
    cur = None
    try:
        # Try payment intent first (used by QR Ph, GCash, Maya)
        if link_id.startswith('pi_'):
            response = requests.get(
                f'https://api.paymongo.com/v1/payment_intents/{link_id}',
                headers=_paymongo_headers(), timeout=15
            )
            result = response.json()
            if not response.ok:
                return jsonify({'error': 'Failed to verify payment'}), 400
            attrs = result.get('data', {}).get('attributes', {})
            status = attrs.get('status', 'awaiting_payment_method')
            amount = attrs.get('amount', 0) / 100
            is_paid = status in ('succeeded', 'processing')
        else:
            # PayMongo Link
            response = requests.get(
                f'https://api.paymongo.com/v1/links/{link_id}',
                headers=_paymongo_headers(), timeout=15
            )
            result = response.json()
            if not response.ok:
                return jsonify({'error': 'Failed to verify payment'}), 400
            attrs = result.get('data', {}).get('attributes', {})
            status = attrs.get('status', 'unpaid')
            amount = attrs.get('amount', 0) / 100
            is_paid = status == 'paid'

        if is_paid:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(
                "UPDATE reservations SET status = 'CONFIRMED', payment_method = 'online' WHERE paymongo_payment_id = %s RETURNING id, booking_number",
                (link_id,)
            )
            row = cur.fetchone()
            conn.commit()
            return jsonify({
                'status': 'paid',
                'reservationId': row.get('id') if row else None,
                'bookingNumber': row.get('booking_number') if row else None,
                'amount': amount,
            }), 200

        return jsonify({'status': status, 'amount': amount}), 200

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/payment/webhook', methods=['POST'])
def paymongo_webhook():
    """Handle PayMongo webhook events with signature verification."""
    conn = None
    cur = None
    try:
        # Verify webhook signature
        webhook_secret = os.getenv('PAYMONGO_WEBHOOK_SECRET', '')
        if webhook_secret:
            import hmac, hashlib
            sig_header = request.headers.get('Paymongo-Signature', '')
            raw_body = request.get_data(as_text=True)
            # PayMongo signature format: t=timestamp,te=hash,li=hash
            parts = {p.split('=')[0]: p.split('=')[1] for p in sig_header.split(',') if '=' in p}
            timestamp = parts.get('t', '')
            expected = parts.get('te', '') or parts.get('li', '')
            if timestamp and expected:
                msg = f"{timestamp}.{raw_body}"
                computed = hmac.new(webhook_secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
                if not hmac.compare_digest(computed, expected):
                    return jsonify({'error': 'Invalid webhook signature'}), 401

        payload = request.json or {}
        event_type = payload.get('data', {}).get('attributes', {}).get('type', '')
        resource = payload.get('data', {}).get('attributes', {}).get('data', {})

        if event_type in ('payment.paid', 'link.payment.paid', 'payment_intent.succeeded'):
            # Try to get payment intent id or link id
            resource_id = resource.get('id', '')
            resource_attrs = resource.get('attributes', {})
            payment_intent_id = resource_attrs.get('payment_intent_id', '') or resource_id

            if payment_intent_id:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute(
                    "UPDATE reservations SET status = 'CONFIRMED', payment_method = 'online' WHERE paymongo_payment_id = %s",
                    (payment_intent_id,)
                )
                conn.commit()

        return jsonify({'received': True}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


# --- OWNER RESERVATION MANAGEMENT ---

@app.route('/api/owner/reservations', methods=['GET'])
def owner_get_reservations():
    conn = None
    cur = None
    try:
        owner_id = request.args.get('owner_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT r.id, r.booking_number, r.check_in_date, r.check_out_date,
                   r.total_nights, r.total_amount, r.status, r.payment_method,
                   r.special_requests, r.created_at,
                   c.first_name, c.last_name, c.email,
                   rm.room_number, rm.room_name, rm.room_type, rm.id AS room_id,
                   h.hotel_name, h.id AS hotel_id
            FROM reservations r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            LEFT JOIN hotels h ON h.id = rm.hotel_id
        """
        params = []
        if owner_id:
            query += " WHERE h.owner_id = %s"
            params.append(owner_id)
        query += " ORDER BY r.created_at DESC"
        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []

        # Detect double bookings (same room, overlapping dates, active status)
        reservations = []
        for row in rows:
            reservations.append({
                'id': row.get('id'),
                'bookingNumber': row.get('booking_number') or f"INV-{row.get('id')}",
                'customerName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Guest',
                'customerEmail': row.get('email') or '',
                'roomId': row.get('room_id'),
                'roomNo': row.get('room_number') or '—',
                'roomName': row.get('room_name') or row.get('room_type') or '—',
                'hotelName': row.get('hotel_name') or '—',
                'checkIn': _serialize_date(row.get('check_in_date')),
                'checkOut': _serialize_date(row.get('check_out_date')),
                'nights': row.get('total_nights') or 0,
                'amount': _to_float(row.get('total_amount'), 0),
                'status': str(row.get('status') or 'PENDING').upper(),
                'paymentMethod': row.get('payment_method') or 'cash',
                'specialRequests': row.get('special_requests') or '',
                'createdAt': _serialize_date(row.get('created_at')),
                'isDoubleBooked': False,  # will be set below
            })

        # Mark double bookings
        active_statuses = {'PENDING', 'CONFIRMED', 'CHECKED_IN'}
        for i, res in enumerate(reservations):
            if res['status'] not in active_statuses:
                continue
            for j, other in enumerate(reservations):
                if i == j or other['status'] not in active_statuses:
                    continue
                if res['roomId'] != other['roomId']:
                    continue
                # Check date overlap
                ci1 = res['checkIn']
                co1 = res['checkOut']
                ci2 = other['checkIn']
                co2 = other['checkOut']
                if ci1 and co1 and ci2 and co2 and ci1 < co2 and co1 > ci2:
                    reservations[i]['isDoubleBooked'] = True
                    break

        today = datetime.utcnow().date().isoformat()
        stats = {
            'total': len(reservations),
            'pending': sum(1 for r in reservations if r['status'] == 'PENDING'),
            'confirmed': sum(1 for r in reservations if r['status'] == 'CONFIRMED'),
            'checkedIn': sum(1 for r in reservations if r['status'] == 'CHECKED_IN'),
            'cancelled': sum(1 for r in reservations if r['status'] == 'CANCELLED'),
            'doubleBooked': sum(1 for r in reservations if r['isDoubleBooked']),
            'todayCheckins': sum(1 for r in reservations if r['checkIn'] and str(r['checkIn'])[:10] == today),
            'todayCheckouts': sum(1 for r in reservations if r['checkOut'] and str(r['checkOut'])[:10] == today),
        }

        return jsonify({'reservations': reservations, 'stats': stats}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/reservations/<int:reservation_id>/cancel', methods=['PATCH'])
def owner_cancel_reservation(reservation_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        owner_id = _reservation_owner_id(cur, reservation_id)
        if not _owner_can_mutate(cur, owner_id):
            return _owner_subscription_required_response()
        cur.execute(
            "UPDATE reservations SET status = 'CANCELLED' WHERE id = %s RETURNING id",
            (reservation_id,)
        )
        if not cur.fetchone():
            return jsonify({'error': 'Reservation not found'}), 404
        conn.commit()
        return jsonify({'message': 'Reservation cancelled.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/reservations/<int:reservation_id>', methods=['DELETE'])
def owner_delete_reservation(reservation_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        owner_id = _reservation_owner_id(cur, reservation_id)
        if not _owner_can_mutate(cur, owner_id):
            return _owner_subscription_required_response()
        cur.execute("DELETE FROM reservations WHERE id = %s RETURNING id", (reservation_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Reservation not found'}), 404
        conn.commit()
        return jsonify({'message': 'Reservation deleted.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/owner/reservations-stats', methods=['GET'])
def owner_reservations_stats():
    """Alias that returns stats only — for backward compat."""
    owner_id = request.args.get('owner_id', type=int)
    res = owner_get_reservations.__wrapped__(owner_id) if hasattr(owner_get_reservations, '__wrapped__') else None
    # Just redirect to main endpoint
    return owner_get_reservations()


# --- RESERVATIONS ---

@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    conn = None
    cur = None
    try:
        data = request.json or {}
        customer_id = data.get('customerId')
        room_id = data.get('roomId')
        check_in = data.get('checkIn')
        check_out = data.get('checkOut')
        check_in_time = (data.get('checkInTime') or '14:00').strip()[:5]   # HH:MM
        check_out_time = (data.get('checkOutTime') or '12:00').strip()[:5] # HH:MM
        guests = _to_int(data.get('guests'), 1)
        special_requests = (data.get('specialRequests') or '').strip()
        payment_method = (data.get('paymentMethod') or 'cash').strip()

        if not room_id or not check_in or not check_out:
            return jsonify({'error': 'roomId, checkIn, and checkOut are required'}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _ensure_reservation_pricing_columns(cur)

        # Get room details
        cur.execute('SELECT id, price_per_night, hotel_id, room_number, room_name FROM rooms WHERE id = %s', (room_id,))
        room = cur.fetchone()
        if not room:
            return jsonify({'error': 'Room not found'}), 404

        try:
            ci = datetime.strptime(check_in, '%Y-%m-%d').date()
            co = datetime.strptime(check_out, '%Y-%m-%d').date()
        except Exception:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        today = datetime.utcnow().date()
        if ci < today:
            return jsonify({'error': 'Check-in date cannot be in the past.'}), 400
        if co <= ci:
            return jsonify({'error': 'Check-out must be after check-in.'}), 400

        # ── AVAILABILITY CHECK ──────────────────────────────────────────────
        # Block if room already has an active reservation overlapping these dates
        cur.execute("""
            SELECT id, booking_number, check_in_date, check_out_date
            FROM reservations
            WHERE room_id = %s
              AND status NOT IN ('CANCELLED', 'FAILED', 'CHECKED_OUT')
              AND check_in_date < %s
              AND check_out_date > %s
            LIMIT 1
        """, (room_id, co, ci))
        conflict = cur.fetchone()
        if conflict:
            return jsonify({
                'error': f'Room is already reserved from {conflict["check_in_date"]} to {conflict["check_out_date"]}. Please choose different dates.',
                'conflictBooking': conflict.get('booking_number'),
            }), 409
        # ───────────────────────────────────────────────────────────────────

        nights = (co - ci).days
        price = _to_float(room.get('price_per_night'), 0)
        base_total = round(price * nights, 2)
        pricing = _build_customer_booking_pricing(cur, customer_id, base_total)
        total = pricing["totalAmount"]
        privilege = pricing.get("subscription") or {}

        import random, string
        booking_number = 'INV-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

        cur.execute("""
            INSERT INTO reservations
              (booking_number, customer_id, room_id, hotel_id, check_in_date, check_out_date,
               check_in_time, check_out_time,
               total_nights, total_amount, base_amount, privilege_discount_percent, privilege_discount_amount,
               applied_privilege_slug, applied_privilege_name, payment_method, special_requests, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING')
            RETURNING id, booking_number
        """, (booking_number, customer_id, room_id, room.get('hotel_id'),
               check_in, check_out, check_in_time, check_out_time,
               nights, total, pricing["baseAmount"], pricing["discountPercent"], pricing["discountAmount"],
               privilege.get("packageSlug"), privilege.get("packageName"), payment_method, special_requests))
        row = cur.fetchone()
        conn.commit()

        return jsonify({
            'message': 'Reservation created successfully.',
            'bookingId': row.get('id'),
            'bookingNumber': row.get('booking_number'),
            'totalNights': nights,
            'totalAmount': total,
            'baseAmount': pricing["baseAmount"],
            'privilegeDiscountPercent': pricing["discountPercent"],
            'privilegeDiscountAmount': pricing["discountAmount"],
            'appliedPrivilege': {
                'isActive': bool(privilege.get("isActive")),
                'packageName': privilege.get("packageName"),
                'packageSlug': privilege.get("packageSlug"),
            },
            'roomId': room_id,
            'hotelId': room.get('hotel_id'),
        }), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/reservations', methods=['GET'])
def get_all_reservations():
    conn = None
    try:
        # 1. Kumonekta sa database
        conn = get_db_connection()
        # Gamitin ang RealDictCursor para maging JSON-friendly ang format (key-value pairs)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 2. SQL Query: I-join ang customers at rooms para makuha ang kumpletong detalye
        query = """
            SELECT 
                r.id,
                r.booking_number,
                r.check_in_date AS check_in, 
                r.check_out_date AS check_out,
                r.total_nights,
                r.total_amount,
                r.status,
                r.created_at,
                r.room_id,
                c.first_name,
                c.last_name,
                rm.room_number,
                rm.room_type AS room_name
            FROM reservations r
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN rooms rm ON r.room_id = rm.id
            ORDER BY r.created_at DESC;
        """
        
        cur.execute(query)
        reservations = cur.fetchall()

        # 3. I-format ang data (Dates at Decimals) para hindi mag-error ang JSON conversion
        for res in reservations:
            if res['check_in']:
                res['check_in'] = res['check_in'].isoformat()
            if res['check_out']:
                res['check_out'] = res['check_out'].isoformat()
            if res['created_at']:
                res['created_at'] = res['created_at'].isoformat()
            
            # Siguraduhing float ang amount para sa React
            res['total_amount'] = float(res['total_amount']) if res['total_amount'] else 0.0

        cur.close()
        return jsonify(reservations), 200

    except Exception as e:
        # I-print ang error sa terminal para sa debugging
        print(f"Database Error: {str(e)}")
        return jsonify({"error": str(e)}), 400

    finally:
        # Siguraduhing laging isasara ang connection kahit mag-error
        if conn:
            conn.close()
            
            
@app.route('/api/hr/dashboard-stats', methods=['GET'])
def get_hr_dashboard_stats():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()

        # 1. Fetch Today's Attendance Logs
        # Ginagamit ang JOIN para makuha ang pangalan at role mula sa staff table
        cur.execute("""
            SELECT 
                s.first_name || ' ' || s.last_name as name,
                s.role as dept,
                to_char(a.clock_in, 'HH:MI AM') as time,
                a.status
            FROM attendance a
            JOIN staff s ON a.staff_id = s.id
            WHERE a.date = %s
            ORDER BY a.clock_in DESC;
        """, (today,))
        logs = cur.fetchall()

        # 2. Fetch Present Count
        cur.execute("SELECT COUNT(*) FROM attendance WHERE date = %s AND status IN ('Present', 'Late')", (today,))
        present_count = cur.fetchone()['count']

        # 3. Fetch Pending Leave Requests
        cur.execute("SELECT COUNT(*) FROM leave_requests WHERE status = 'PENDING'")
        pending_leaves = cur.fetchone()['count']

        # 4. Fetch Total Active Employees
        cur.execute("SELECT COUNT(*) FROM staff WHERE status = 'Active'")
        total_employees = cur.fetchone()['count']

        cur.close()
        
        # Siguraduhin na ang keys dito ay tugma sa React (data.totalEmployees, etc.)
        return jsonify({
            "attendanceLogs": logs,
            "presentToday": present_count,
            "pendingLeaves": pending_leaves,
            "totalEmployees": total_employees,
            "monthlyPayroll": "450,000.00" # Static muna or compute-in sa DB
        }), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/rooms', methods=['GET'])
def get_rooms_catalog():
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        status_filter = request.args.get('status')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT
                r.id,
                r.room_number,
                r.room_name,
                r.room_type,
                r.price_per_night,
                r.description,
                r.images,
                r.amenities,
                r.max_adults,
                r.max_children,
                r.status,
                h.hotel_name,
                h.hotel_address
            FROM rooms r
            LEFT JOIN hotels h ON h.id = r.hotel_id
            WHERE 1=1
        """
        params = []

        if hotel_id:
            query += " AND r.hotel_id = %s"
            params.append(hotel_id)

        if status_filter:
            query += " AND LOWER(COALESCE(r.status, '')) = LOWER(%s)"
            params.append(status_filter)

        query += " ORDER BY r.created_at DESC, r.id DESC"
        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []

        formatted = []
        for row in rows:
            images = _parse_text_array(row.get('images'))
            amenities = _parse_text_array(row.get('amenities'))
            max_adults = int(row.get('max_adults') or 0)
            max_children = int(row.get('max_children') or 0)
            max_guests = max(max_adults + max_children, 1)
            primary_image = images[0] if images else "/images/room1.jpg"
            display_name = row.get('room_name') or row.get('room_type') or "Innova Suite"

            formatted.append({
                "id": row.get('id'),
                "roomNumber": row.get('room_number') or '',
                "roomName": display_name,
                "roomType": row.get('room_type') or "Suite",
                "price": float(row.get('price_per_night') or 0),
                "description": row.get('description') or '',
                "images": images,
                "amenities": amenities,
                "maxAdults": max_adults,
                "maxChildren": max_children,
                "status": row.get('status') or "Available",
                "location_description": row.get('hotel_address') or row.get('hotel_name') or "Innova Smart Hotel",
            })

        return jsonify({"rooms": formatted}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/home/hotels', methods=['GET'])
def home_hotels():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _ensure_profile_media_columns(cur)

        select_columns = ["h.id", "h.hotel_name"]
        optional_columns = [
            "hotel_address",
            "hotel_code",
            "hotel_logo",
            "hotel_building_image",
            "hotel_description",
            "contact_phone",
        ]
        for column_name in optional_columns:
            if _table_has_column(cur, "hotels", column_name):
                select_columns.append(f"h.{column_name}")

        query = f"""
            SELECT {', '.join(select_columns)}, COUNT(r.id) AS room_count
            FROM hotels h
            LEFT JOIN rooms r ON r.hotel_id = h.id
            GROUP BY {', '.join(select_columns)}
            ORDER BY COUNT(r.id) DESC, h.id DESC
            LIMIT 6
        """
        cur.execute(query)
        rows = cur.fetchall() or []

        hotels = []
        for row in rows:
            hotel_id = row.get("id")
            building_image = row.get("hotel_building_image") or row.get("hotel_logo") or _room_preview_image_for_hotel(cur, hotel_id) or "/images/signup-img.png"
            hotels.append({
                "id": hotel_id,
                "name": row.get("hotel_name") or "Innova Property",
                "location": row.get("hotel_address") or row.get("hotel_name") or "Innova Smart Hotel",
                "image": building_image,
                "tag": row.get("hotel_code") or "Connected Hotel",
                "rooms": _to_int(row.get("room_count"), 0),
                "description": row.get("hotel_description") or "A connected hotel experience powered by Innova HMS.",
                "contactPhone": row.get("contact_phone") or "",
            })
        return jsonify({"hotels": hotels}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/rooms/<int:room_id>/tour', methods=['GET'])
def get_room_tour(room_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        tour = _build_tour_payload(cur, room_id)
        if not tour:
            return jsonify({"error": "No virtual tour available for this room."}), 404

        return jsonify({"tour": tour}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/guest-offers', methods=['GET'])
def get_guest_offers():
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        _ensure_guest_offers_table(cur)

        select_columns = ['id']
        optional_columns = [
            'hotel_id',
            'title',
            'subtitle',
            'description',
            'original_price',
            'discounted_price',
            'discount_percentage',
            'offer_type',
            'image_url',
            'badge_text',
            'expiry_date',
            'is_active',
        ]

        for column_name in optional_columns:
            if _table_has_column(cur, 'guest_offers', column_name):
                select_columns.append(column_name)

        query = f"SELECT {', '.join(select_columns)} FROM guest_offers"
        where_clauses = []
        params = []
        if 'is_active' in select_columns:
            where_clauses.append("COALESCE(is_active, TRUE) = TRUE")
        if hotel_id and 'hotel_id' in select_columns:
            where_clauses.append("hotel_id = %s")
            params.append(hotel_id)
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        query += " ORDER BY id DESC"

        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []

        offers = []
        for row in rows:
            offers.append({
                "id": row.get('id'),
                "title": row.get('title') or "Special Offer",
                "subtitle": row.get('subtitle') or "Exclusive Guest Deal",
                "description": row.get('description') or "Limited-time promotion for guests.",
                "original_price": float(row.get('original_price') or 0),
                "discounted_price": float(row.get('discounted_price') or 0),
                "discount_percentage": int(row.get('discount_percentage') or 0),
                "offer_type": row.get('offer_type') or "seasonal",
                "image_url": row.get('image_url') or "/images/signup-img.png",
                "badge_text": row.get('badge_text') or "Featured Deal",
                "expiry_date": row.get('expiry_date').isoformat() if row.get('expiry_date') else None,
            })

        return jsonify(offers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    conn = None
    cur = None
    try:
        room_filter = request.args.get('type', 'All')
        category_filter = request.args.get('category')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT
                r.id,
                r.room_name,
                r.room_type,
                r.price_per_night,
                r.images,
                r.amenities,
                r.max_adults,
                r.max_children,
                r.status,
                h.hotel_name,
                h.hotel_address
            FROM rooms r
            LEFT JOIN hotels h ON h.id = r.hotel_id
            WHERE LOWER(COALESCE(r.status, '')) = 'available'
        """
        params = []

        if room_filter and room_filter != 'All':
            query += " AND LOWER(COALESCE(r.room_type, '')) = LOWER(%s)"
            params.append(room_filter)

        if category_filter:
            category_like = f"%{category_filter}%"
            query += """
                AND (
                    LOWER(COALESCE(r.room_type, '')) LIKE LOWER(%s)
                    OR LOWER(COALESCE(r.room_name, '')) LIKE LOWER(%s)
                )
            """
            params.extend([category_like, category_like])

        query += " ORDER BY r.created_at DESC, r.id DESC"
        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []

        formatted_rooms = []
        for row in rows:
            images = _parse_text_array(row.get('images'))
            amenities = [a.lower() for a in _parse_text_array(row.get('amenities'))]
            first_image = images[0] if images else "https://images.unsplash.com/photo-1611892440504-42a792e24d32"
            max_adults = int(row.get('max_adults') or 0)
            max_children = int(row.get('max_children') or 0)

            formatted_rooms.append({
                "id": row.get('id'),
                "name": row.get('room_name') or row.get('room_type') or "Innova Suite",
                "location_description": row.get('hotel_address') or row.get('hotel_name') or "Prime Location",
                "tag": "LIVE AVAILABILITY",
                "tag_color": "green",
                "room_type": row.get('room_type') or "Suite",
                "base_price_php": float(row.get('price_per_night') or 0),
                "max_guests": max(max_adults + max_children, 1),
                "image_url": first_image,
                "has_wifi": any('wifi' in a for a in amenities),
                "has_pool": any('pool' in a for a in amenities),
                "has_dining": any('breakfast' in a or 'dining' in a for a in amenities),
                "has_virtual_tour": True
            })

        return jsonify(formatted_rooms), 200
    except Exception as e:
        return jsonify({"error": "System encountered an issue fetching rooms", "detail": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/reports/full-stats', methods=['GET'])
def reports_full_stats():
    conn = None
    cur = None
    try:
        owner_id = request.args.get('owner_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if owner_id:
            guard, _subscription = _owner_feature_guard(cur, owner_id, 'reports')
            if guard:
                return guard
        hotel = _resolve_owner_hotel(cur, owner_id) if owner_id else None
        hotel_id = hotel.get("id") if hotel else None

        rooms = []
        if _table_exists(cur, "rooms"):
            room_query = "SELECT * FROM rooms"
            room_params = []
            if hotel_id and _table_has_column(cur, "rooms", "hotel_id"):
                room_query += " WHERE hotel_id = %s"
                room_params.append(hotel_id)
            room_query += " ORDER BY id ASC"
            cur.execute(room_query, tuple(room_params))
            rooms = cur.fetchall() or []

        room_by_id = {row.get("id"): row for row in rooms}
        room_status_counter = Counter(_normalize_room_status(row.get("status")) for row in rooms)
        total_rooms = len(rooms)
        available_rooms = room_status_counter.get("vacant", 0)
        occupancy = round((room_status_counter.get("occupied", 0) / total_rooms) * 100, 1) if total_rooms else 0.0

        reservations = []
        if _table_exists(cur, "reservations"):
            reservation_query = "SELECT * FROM reservations"
            reservation_params = []
            if hotel_id and _table_has_column(cur, "reservations", "hotel_id"):
                reservation_query += " WHERE hotel_id = %s"
                reservation_params.append(hotel_id)
            reservation_query += " ORDER BY id DESC LIMIT 1200"
            cur.execute(reservation_query, tuple(reservation_params))
            reservations = cur.fetchall() or []

        customer_map = {}
        if _table_exists(cur, "customers"):
            cur.execute("SELECT id, first_name, last_name FROM customers")
            for row in cur.fetchall() or []:
                customer_map[row.get("id")] = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or "Guest"

        today = datetime.utcnow().date()
        total_revenue = 0.0
        pending = 0
        mapped_rows = []
        today_checkins = 0
        today_checkouts = 0

        for row in reservations:
            amount = _extract_reservation_amount(row)
            status_text = str(row.get("status") or "").upper()
            if status_text not in {"CANCELLED", "FAILED"}:
                total_revenue += amount
            if status_text in {"PENDING"}:
                pending += 1

            check_in = row.get("check_in_date") or row.get("check_in")
            check_out = row.get("check_out_date") or row.get("check_out")
            check_in_iso = _serialize_date(check_in)
            check_out_iso = _serialize_date(check_out)
            if check_in_iso and str(check_in_iso)[:10] == today.isoformat():
                today_checkins += 1
            if check_out_iso and str(check_out_iso)[:10] == today.isoformat():
                today_checkouts += 1

            room_row = room_by_id.get(row.get("room_id"))
            hotel_id_value = row.get("hotel_id")
            if hotel_id_value is None and room_row:
                hotel_id_value = room_row.get("hotel_id")
            mapped_rows.append({
                "hotelId": hotel_id_value,
                "roomId": row.get("room_id"),
                "customerId": row.get("customer_id"),
                "customerName": row.get("guest_name") or customer_map.get(row.get("customer_id")) or "Guest",
                "roomType": room_row.get("room_type") if room_row else "Suite",
                "status": status_text or "--",
                "checkInDate": check_in_iso,
                "checkOutDate": check_out_iso,
                "totalAmount": round(amount, 2),
            })

        recent_cut = mapped_rows[:30]
        prev_cut = mapped_rows[30:60]
        recent_count = len(recent_cut)
        prev_count = len(prev_cut)
        if prev_count > 0:
            res_change = f"{round(((recent_count - prev_count) / prev_count) * 100)}%"
        else:
            res_change = "+0%"

        available_rows = []
        for room in rooms[:80]:
            available_rows.append({
                "hotelId": room.get("hotel_id"),
                "roomId": room.get("id"),
                "customerId": None,
                "customerName": "Room Inventory",
                "roomType": room.get("room_type") or "Suite",
                "status": room.get("status") or "AVAILABLE",
                "checkInDate": None,
                "checkOutDate": None,
                "totalAmount": 0,
            })

        staff_count = 0
        active_staff = 0
        if _table_exists(cur, "staff"):
            staff_query = "SELECT * FROM staff"
            staff_params = []
            if hotel_id and _table_has_column(cur, "staff", "hotel_id"):
                staff_query += " WHERE hotel_id = %s"
                staff_params.append(hotel_id)
            cur.execute(staff_query, tuple(staff_params))
            staff_rows = cur.fetchall() or []
            staff_count = len(staff_rows)
            active_staff = sum(1 for row in staff_rows if _is_truthy(row.get("is_on_duty")) or str(row.get("status") or "").lower() == "active")

        attendance = round((active_staff / staff_count) * 100, 1) if staff_count else 0.0
        payroll_estimate = round(staff_count * 25000, 2)

        inventory_alert = {"stock": 0, "item": "No critical items"}
        if _table_exists(cur, "inventory_items"):
            inv_query = "SELECT * FROM inventory_items"
            inv_params = []
            if hotel_id and _table_has_column(cur, "inventory_items", "hotel_id"):
                inv_query += " WHERE hotel_id = %s"
                inv_params.append(hotel_id)
            inv_query += " ORDER BY id ASC LIMIT 100"
            cur.execute(inv_query, tuple(inv_params))
            inv_rows = cur.fetchall() or []
            if inv_rows:
                critical = sorted(
                    inv_rows,
                    key=lambda row: _to_float(row.get("stock_level"), 0) - _to_float(row.get("reorder_point"), 20),
                )[0]
                inventory_alert = {
                    "stock": _to_int(critical.get("stock_level"), 0),
                    "item": critical.get("item_name") or "Inventory Item",
                }
        else:
            inventory_alert = {"stock": 18, "item": "Fresh Towels"}

        return jsonify({
            "summary": {
                "total_res": len(reservations),
                "res_change": res_change,
                "today_checkins": today_checkins,
                "today_checkouts": today_checkouts,
                "pending": pending,
                "available": available_rooms,
                "occupancy": occupancy,
                "total_revenue_php": round(total_revenue, 2),
            },
            "operational": {
                "inventory": inventory_alert,
                "staff": {
                    "next_date": (today + timedelta(days=7)).isoformat(),
                    "payroll": payroll_estimate,
                    "attendance": attendance,
                },
            },
            "details": {
                "total_reservations": mapped_rows,
                "today_checkins": [row for row in mapped_rows if row.get("checkInDate") and str(row["checkInDate"])[:10] == today.isoformat()],
                "available_rooms": available_rows,
                "today_checkouts": [row for row in mapped_rows if row.get("checkOutDate") and str(row["checkOutDate"])[:10] == today.isoformat()],
            },
            "simulation_results": {
                "revenue": 0,
                "occupancy": 0,
                "workload": 0,
                "velocity": 0,
            },
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/reports/transactions', methods=['GET'])
def reports_transactions():
    conn = None
    cur = None
    try:
        owner_id = request.args.get('owner_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if owner_id:
            guard, _subscription = _owner_feature_guard(cur, owner_id, 'reports')
            if guard:
                return guard
        hotel = _resolve_owner_hotel(cur, owner_id) if owner_id else None
        hotel_id = hotel.get("id") if hotel else None

        logs = []
        customers = {}
        if _table_exists(cur, "customers"):
            cur.execute("SELECT id, first_name, last_name FROM customers")
            for row in cur.fetchall() or []:
                customers[row.get("id")] = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or "Guest"

        if _table_exists(cur, "reservations"):
            query = "SELECT * FROM reservations"
            params = []
            if hotel_id and _table_has_column(cur, "reservations", "hotel_id"):
                query += " WHERE hotel_id = %s"
                params.append(hotel_id)
            query += " ORDER BY id DESC LIMIT 80"
            cur.execute(query, tuple(params))
            for row in cur.fetchall() or []:
                status_text = str(row.get("status") or "PENDING").upper()
                event = "Reservation Update"
                if status_text in {"CONFIRMED", "PAID", "COMPLETED"}:
                    event = "Booking Confirmed"
                elif status_text in {"CANCELLED", "FAILED"}:
                    event = "Booking Alert"
                elif status_text in {"CHECKED_IN"}:
                    event = "Guest Check-in"
                elif status_text in {"CHECKED_OUT"}:
                    event = "Guest Check-out"

                logs.append({
                    "event": event,
                    "user": row.get("guest_name") or customers.get(row.get("customer_id")) or "Guest",
                    "value": f"PHP {int(_extract_reservation_amount(row)):,}",
                    "status": status_text,
                    "time": _serialize_date(row.get("created_at") or row.get("check_in_date") or row.get("check_in")),
                })

        if not logs:
            logs = [
                {"event": "System Sync", "user": "INNOVA CORE", "value": "PHP 0", "status": "SUCCESS", "time": datetime.utcnow().isoformat()},
            ]

        return jsonify(logs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/reports/simulate', methods=['POST'])
def reports_simulate():
    conn = None
    cur = None
    try:
        payload = request.json or {}
        delta = _to_float(payload.get("delta"), 0)
        owner_id = _to_int(payload.get("owner_id"), 0)

        baseline_revenue = 0.0
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if owner_id:
            guard, _subscription = _owner_feature_guard(cur, owner_id, 'reports', mutation=True)
            if guard:
                return guard
        hotel = _resolve_owner_hotel(cur, owner_id) if owner_id else None
        hotel_id = hotel.get("id") if hotel else None
        if _table_exists(cur, "reservations"):
            amount_columns = []
            if _table_has_column(cur, "reservations", "total_amount"):
                amount_columns.append("total_amount")
            if _table_has_column(cur, "reservations", "total_amount_php"):
                amount_columns.append("total_amount_php")
            if not amount_columns:
                amount_columns.append("0 AS total_amount")
            reservation_query = f"SELECT {', '.join(amount_columns)} FROM reservations"
            params = []
            if hotel_id and _table_has_column(cur, "reservations", "hotel_id"):
                reservation_query += " WHERE hotel_id = %s"
                params.append(hotel_id)
            reservation_query += " ORDER BY id DESC LIMIT 300"
            cur.execute(reservation_query, tuple(params))
            rows = cur.fetchall() or []
            baseline_revenue = sum(
                _to_float(row.get("total_amount") or row.get("total_amount_php"), 0)
                for row in rows
            )

        if baseline_revenue <= 0:
            baseline_revenue = 250000.0

        revenue_delta = round((baseline_revenue * delta) / 100, 2)
        occupancy_delta = max(-45.0, min(45.0, round(delta * 0.35, 1)))
        workload_delta = max(-35.0, min(55.0, round(delta * 0.25, 1)))
        velocity_delta = max(-20.0, min(40.0, round(delta * 0.18, 1)))

        return jsonify({
            "revenue": revenue_delta,
            "occupancy": occupancy_delta,
            "workload": workload_delta,
            "velocity": velocity_delta,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/inventory', methods=['GET'])
def inventory_overview():
    conn = None
    cur = None
    try:
        owner_id = request.args.get("owner_id", type=int)
        category_filter = (request.args.get("category") or "All Items").strip()

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if owner_id:
            guard, _subscription = _owner_feature_guard(cur, owner_id, 'inventory')
            if guard:
                return guard
        hotel = _resolve_owner_hotel(cur, owner_id) if owner_id else None
        hotel_id = hotel.get("id") if hotel else None

        items = []
        if _table_exists(cur, "inventory_items"):
            query = "SELECT * FROM inventory_items"
            params = []
            if hotel_id and _table_has_column(cur, "inventory_items", "hotel_id"):
                query += " WHERE hotel_id = %s"
                params.append(hotel_id)
            elif owner_id and _table_has_column(cur, "inventory_items", "owner_id"):
                query += " WHERE owner_id = %s"
                params.append(owner_id)
            query += " ORDER BY id ASC"
            cur.execute(query, tuple(params))
            rows = cur.fetchall() or []
            for row in rows:
                stock = _to_int(row.get("stock_level"), 0)
                max_stock = max(_to_int(row.get("max_stock"), 0), 1)
                reorder = _to_int(row.get("reorder_point"), 20)
                status = "OPTIMAL" if stock > reorder else "LOW"
                items.append({
                    "id": row.get("id"),
                    "sku_id": row.get("sku_id") or f"SKU-{row.get('id')}",
                    "item_name": row.get("item_name") or "Inventory Item",
                    "description": row.get("description") or "",
                    "category": row.get("category") or "Consumables",
                    "unit": row.get("unit") or "pcs",
                    "supplier": row.get("supplier") or "Preferred Supplier",
                    "stock_level": stock,
                    "max_stock": max_stock,
                    "reorder_point": reorder,
                    "status": status,
                    "last_restock": _serialize_date(row.get("updated_at") or row.get("created_at")),
                })

        if not items:
            items = [
                {"id": 1, "sku_id": "SKU-1001", "item_name": "Fresh Towels", "description": "Bath and pool towels", "category": "Linens", "unit": "pcs", "supplier": "Luxe Linen PH", "stock_level": 120, "max_stock": 180, "reorder_point": 40, "status": "OPTIMAL", "last_restock": datetime.utcnow().date().isoformat()},
                {"id": 2, "sku_id": "SKU-1002", "item_name": "Mini Toiletries Kit", "description": "Guest amenity packs", "category": "Consumables", "unit": "box", "supplier": "Innova Guest Supply", "stock_level": 34, "max_stock": 140, "reorder_point": 35, "status": "LOW", "last_restock": datetime.utcnow().date().isoformat()},
                {"id": 3, "sku_id": "SKU-1003", "item_name": "Coffee Pods", "description": "In-room coffee supply", "category": "Consumables", "unit": "box", "supplier": "Brewline Global", "stock_level": 88, "max_stock": 160, "reorder_point": 45, "status": "OPTIMAL", "last_restock": datetime.utcnow().date().isoformat()},
                {"id": 4, "sku_id": "SKU-1004", "item_name": "AC Filter Set", "description": "Maintenance filters", "category": "Maintenance", "unit": "set", "supplier": "HVAC Core", "stock_level": 12, "max_stock": 60, "reorder_point": 15, "status": "LOW", "last_restock": datetime.utcnow().date().isoformat()},
            ]

        if category_filter and category_filter.lower() != "all items":
            items = [item for item in items if str(item.get("category") or "").lower() == category_filter.lower()]

        low_stock = sum(1 for item in items if _to_int(item.get("stock_level"), 0) <= _to_int(item.get("reorder_point"), 20))
        pending = max(0, low_stock - 1)
        avg_ratio = 0.0
        if items:
            avg_ratio = sum(
                (_to_float(item.get("stock_level"), 0) / max(_to_float(item.get("max_stock"), 1), 1))
                for item in items
            ) / len(items)
        consum_rate = round(max(0.0, min(100.0, (1 - avg_ratio) * 100)), 1)

        return jsonify({
            "items": items,
            "summary": {
                "totalSkus": len(items),
                "lowStock": low_stock,
                "consumRate": consum_rate,
                "pending": pending,
            },
        }), 200
    except Exception as e:
        return jsonify({"error": str(e), "items": [], "summary": {"totalSkus": 0, "lowStock": 0, "consumRate": 0, "pending": 0}}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/inventory/forecast', methods=['POST'])
def inventory_forecast():
    try:
        payload = request.json or {}
        event_name = payload.get("event") or "High Occupancy Window"
        occupancy = _to_float(payload.get("occupancy"), 85)
        owner_id = _to_int(payload.get("owner_id"), 0)

        if owner_id:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                guard, _subscription = _owner_feature_guard(cur, owner_id, 'inventory', mutation=True)
                if guard:
                    return guard
            finally:
                _safe_close(conn, cur)

        recommendations = [
            {
                "item": "Mini Toiletries Kit",
                "recommendedIncreasePercent": 30 if occupancy >= 90 else 20,
                "reason": "High turnover on guest amenity packs expected.",
            },
            {
                "item": "Fresh Towels",
                "recommendedIncreasePercent": 18 if occupancy >= 90 else 12,
                "reason": "Laundry demand scales with check-ins and check-outs.",
            },
            {
                "item": "Coffee Pods",
                "recommendedIncreasePercent": 15 if occupancy >= 90 else 10,
                "reason": "In-room pantry usage rises during peak occupancy.",
            },
        ]

        return jsonify({
            "success": True,
            "title": "Forecast completed",
            "message": f"Scenario '{event_name}' projected at {round(occupancy, 1)}% occupancy. Inventory buffer has been recalculated.",
            "recommendations": recommendations,
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/integrations/status', methods=['GET'])
def integrations_status():
    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    paymongo_key = os.getenv("PAYMONGO_SECRET_KEY")
    currency_key = os.getenv("CURRENCY_API_KEY")
    rasa_url = os.getenv("RASA_WEBHOOK_URL")

    integrations = [
        {"name": "SendGrid", "module": "Email Notifications", "connected": bool(sendgrid_key)},
        {"name": "Twilio", "module": "SMS Notifications", "connected": bool(twilio_sid and twilio_token)},
        {"name": "OpenStreetMap + Leaflet", "module": "Maps & Location", "connected": True},
        {"name": "Currency API", "module": "Currency Conversion", "connected": bool(currency_key)},
        {"name": "Plotly + Prophet", "module": "Analytics & Forecasting", "connected": True},
        {"name": "Rasa", "module": "AI Chatbot", "connected": bool(rasa_url) or True},
        {"name": "Marzipano", "module": "360 Room Viewer", "connected": True},
        {"name": "QR Code", "module": "QR Generation", "connected": True},
        {"name": "JWT", "module": "Authentication & Security", "connected": False},
        {"name": "PayMongo", "module": "Payment Integration", "connected": bool(paymongo_key)},
    ]

    return jsonify({
        "integrations": integrations,
        "mainApis": {
            "maps": True,
            "analytics": True,
            "chatbot": True,
        },
    }), 200


@app.route('/api/customers/resolve', methods=['GET'])
def resolve_customer():
    conn = None
    cur = None
    try:
        email = (request.args.get('email') or '').strip()
        if not email:
            return jsonify({"error": "email is required"}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, 'customers'):
            return jsonify({"error": "customers table is unavailable"}), 404

        cur.execute(
            """
            SELECT id, first_name, last_name, email, contact_number
            FROM customers
            WHERE LOWER(email) = LOWER(%s)
            LIMIT 1
            """,
            (email,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Customer not found"}), 404

        return jsonify({
            "user": {
                "id": row.get("id"),
                "firstName": row.get("first_name") or "Guest",
                "lastName": row.get("last_name") or "",
                "email": row.get("email") or email,
                "contactNumber": row.get("contact_number") or "",
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/customer/dashboard/<int:customer_id>', methods=['GET'])
def get_customer_dashboard(customer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, 'customers'):
            return jsonify({"error": "customers table is unavailable"}), 404

        select_cols = ["id", "first_name", "last_name", "email", "contact_number"]
        if _table_has_column(cur, "customers", "loyalty_points"):
            select_cols.append("loyalty_points")
        if _table_has_column(cur, "customers", "membership_level"):
            select_cols.append("membership_level")

        cur.execute(
            f"SELECT {', '.join(select_cols)} FROM customers WHERE id = %s LIMIT 1",
            (customer_id,),
        )
        customer = cur.fetchone()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

        bookings = []
        total_spend = 0.0
        monthly_spend = 0.0
        preferred_room_type = None

        if _table_exists(cur, "reservations"):
            try:
                cur.execute(
                    """
                    SELECT
                        r.id,
                        r.booking_number,
                        r.check_in_date,
                        r.check_out_date,
                        r.total_amount,
                        r.status,
                        r.room_id,
                        r.payment_method,
                        rm.room_name,
                        rm.room_type,
                        h.hotel_name
                    FROM reservations r
                    LEFT JOIN rooms rm ON rm.id = r.room_id
                    LEFT JOIN hotels h ON h.id = rm.hotel_id
                    WHERE r.customer_id = %s
                    ORDER BY COALESCE(r.check_in_date, r.created_at) DESC, r.id DESC
                    """,
                    (customer_id,),
                )
                booking_rows = cur.fetchall() or []

                for row in booking_rows:
                    total_amount = _to_float(row.get("total_amount"), 0)
                    total_spend += total_amount
                    status_text = str(row.get("status") or "PENDING").upper()
                    check_in = row.get("check_in_date")
                    if check_in and hasattr(check_in, "month"):
                        today = datetime.now()
                        if check_in.month == today.month and check_in.year == today.year:
                            monthly_spend += total_amount

                    if not preferred_room_type and row.get("room_type"):
                        preferred_room_type = row.get("room_type")

                    bookings.append({
                        "bookingId": row.get("id"),
                        "bookingNumber": row.get("booking_number") or f"INV-{row.get('id')}",
                        "checkInDate": _serialize_date(row.get("check_in_date")),
                        "checkOutDate": _serialize_date(row.get("check_out_date")),
                        "totalPrice": total_amount,
                        "status": status_text,
                        "roomType": row.get("room_name") or row.get("room_type") or "Suite",
                        "hotelName": row.get("hotel_name") or "Innova HMS",
                        "roomId": row.get("room_id"),
                        "paymentMethod": row.get("payment_method") or "cash",
                    })
            except Exception:
                bookings = []

        points = _to_int(customer.get("loyalty_points"), int(total_spend // 100))
        tier = (customer.get("membership_level") or _normalize_tier(points)).upper()
        progress = _progress_percent(points, tier)
        points_this_month = int(monthly_spend // 100)

        rewards = []
        if _table_exists(cur, "customer_rewards"):
            try:
                cur.execute(
                    """
                    SELECT *
                    FROM customer_rewards
                    WHERE customer_id = %s
                    ORDER BY id DESC
                    LIMIT 8
                    """,
                    (customer_id,),
                )
                rewards_rows = cur.fetchall() or []
                for row in rewards_rows:
                    rewards.append({
                        "id": row.get("id"),
                        "title": row.get("title") or row.get("reward_name") or "Loyalty Reward",
                        "description": row.get("description") or row.get("details") or "Exclusive guest privilege",
                        "pointsCost": _to_int(row.get("points_cost"), _to_int(row.get("required_points"), 0)),
                        "status": row.get("status") or ("CLAIMED" if row.get("claimed_at") else "AVAILABLE"),
                        "claimedAt": _serialize_date(row.get("claimed_at") or row.get("redeemed_at")),
                    })
            except Exception:
                rewards = []

        return jsonify({
            "user": {
                "id": customer.get("id"),
                "firstName": customer.get("first_name") or "Guest",
                "lastName": customer.get("last_name") or "",
                "email": customer.get("email") or "",
                "contactNumber": customer.get("contact_number") or "",
                "loyaltyPoints": points,
                "membershipLevel": tier,
                "tierProgress": progress,
                "pointsThisMonth": points_this_month,
                "preferredRoomType": preferred_room_type,
                "bookings": bookings,
                "rewards": rewards,
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


# Customer notification endpoints
@app.route('/api/customer/notifications/<int:customer_id>', methods=['GET'])
def customer_get_notifications(customer_id):
    """Customer: Get notifications"""
    limit = min(request.args.get('limit', 50, type=int), 200)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'

    notifications = _get_user_notifications(customer_id, 'customer', limit, unread_only)
    unread_count = len([n for n in notifications if not n['is_read']]) if not unread_only else len(notifications)

    return jsonify({
        'notifications': notifications,
        'unread_count': unread_count
    }), 200


@app.route('/api/customer/notifications/<int:customer_id>/<int:notification_id>/read', methods=['PATCH'])
def customer_mark_notification_read(customer_id, notification_id):
    """Customer: Mark notification as read"""
    success = _mark_notification_read(notification_id, customer_id, 'customer')
    if success:
        return jsonify({'message': 'Notification marked as read'}), 200
    else:
        return jsonify({'error': 'Failed to mark notification as read'}), 500


@app.route('/api/customer/notifications/preferences/<int:customer_id>', methods=['GET'])
def customer_get_notification_preferences(customer_id):
    """Customer: Get notification preferences"""
    preferences = _get_notification_preferences(customer_id, 'customer')
    return jsonify({'preferences': preferences}), 200


@app.route('/api/customer/notifications/preferences/<int:customer_id>', methods=['PUT'])
def customer_update_notification_preferences(customer_id):
    """Customer: Update notification preferences"""
    data = request.get_json() or {}
    preferences = data.get('preferences', [])

    success = _update_notification_preferences(customer_id, 'customer', preferences)
    if success:
        return jsonify({'message': 'Preferences updated successfully'}), 200
    else:
        return jsonify({'error': 'Failed to update preferences'}), 500


@app.route('/api/customer/privileges', methods=['GET'])
def customer_privileges():
    conn = None
    cur = None
    try:
        customer_id = request.args.get('customer_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _seed_customer_privilege_packages(cur)

        cur.execute(
            """
            SELECT *
            FROM customer_privilege_packages
            WHERE COALESCE(is_active, TRUE) = TRUE
            ORDER BY display_order ASC, id ASC
            """
        )
        package_rows = cur.fetchall() or []
        packages = [{
            "id": row.get("id"),
            "name": row.get("name"),
            "slug": row.get("slug"),
            "description": row.get("description") or "",
            "monthlyPrice": _to_float(row.get("monthly_price"), 0),
            "annualPrice": _to_float(row.get("annual_price"), 0),
            "bonusPoints": _to_int(row.get("bonus_points"), 0),
            "perks": row.get("perks") or [],
            "isPopular": bool(row.get("is_popular")),
        } for row in package_rows]

        payload = {"packages": packages}
        if customer_id:
            summary = _build_customer_membership_summary(cur, customer_id)
            if not summary:
                return jsonify({"error": "Customer not found"}), 404
            payload["summary"] = summary
            payload["subscription"] = summary.get("privilege") or {}

        return jsonify(payload), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/customer/privileges/create-payment-link', methods=['POST'])
def customer_privileges_create_payment_link():
    conn = None
    cur = None
    try:
        data = request.get_json(silent=True) or {}
        customer_id = _to_int(data.get("customerId"), 0)
        package_id = _to_int(data.get("packageId"), 0)
        billing_cycle = str(data.get("billingCycle") or "MONTHLY").strip().upper()
        if billing_cycle not in {"MONTHLY", "ANNUAL"}:
            billing_cycle = "MONTHLY"

        if not customer_id or not package_id:
            return jsonify({"error": "customerId and packageId are required."}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _seed_customer_privilege_packages(cur)

        cur.execute("SELECT id, first_name, last_name, email FROM customers WHERE id = %s LIMIT 1", (customer_id,))
        customer = cur.fetchone()
        if not customer:
            return jsonify({"error": "Customer not found."}), 404

        cur.execute(
            """
            SELECT *
            FROM customer_privilege_packages
            WHERE id = %s AND COALESCE(is_active, TRUE) = TRUE
            LIMIT 1
            """,
            (package_id,),
        )
        package_row = cur.fetchone()
        if not package_row:
            return jsonify({"error": "Privilege package not found."}), 404

        amount = _package_amount_for_cycle(package_row, billing_cycle)
        if amount <= 0:
            return jsonify({"error": "Invalid privilege package amount."}), 400

        simulation_mode = _customer_privilege_simulation_enabled()
        paymongo_key = os.getenv('PAYMONGO_SECRET_KEY', '')
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        success_url = _customer_privilege_checkout_url(frontend_url, 'success', simulation_mode)
        failed_url = _customer_privilege_checkout_url(frontend_url, 'failed', simulation_mode)

        current_subscription = _serialize_customer_privilege_subscription(_get_customer_privilege_subscription(cur, customer_id))
        pending_status = 'ACTIVE' if current_subscription.get("isActive") else 'PENDING'

        if simulation_mode:
            link_id = _customer_privilege_simulated_link_id(customer_id, package_id, billing_cycle)
            checkout_url = success_url
        else:
            if not paymongo_key or 'your_' in paymongo_key:
                return jsonify({"error": "PayMongo API key not configured."}), 503
            payload = {
                'data': {
                    'attributes': {
                        'amount': int(amount * 100),
                        'currency': 'PHP',
                        'description': f'Innova HMS Customer Privilege {package_row.get("name")}',
                        'remarks': f'Customer #{customer_id} privilege package',
                        'redirect': {'success': success_url, 'failed': failed_url}
                    }
                }
            }
            response = requests.post(
                'https://api.paymongo.com/v1/links',
                json=payload,
                headers=_paymongo_headers(),
                timeout=15
            )
            result = response.json()
            if not response.ok:
                errors = result.get('errors', [{}])
                msg = errors[0].get('detail', 'PayMongo error') if errors else 'PayMongo error'
                return jsonify({'error': msg}), 400
            link_data = result.get('data', {})
            attrs = link_data.get('attributes', {})
            checkout_url = attrs.get('checkout_url', '')
            link_id = link_data.get('id', '')

        cur.execute(
            """
            INSERT INTO customer_privilege_subscriptions (
                customer_id, package_id, billing_cycle, amount, status,
                payment_status, paymongo_payment_id, starts_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, 'PENDING', %s, CURRENT_DATE, NOW())
            ON CONFLICT (customer_id) DO UPDATE SET
                package_id = EXCLUDED.package_id,
                billing_cycle = EXCLUDED.billing_cycle,
                amount = EXCLUDED.amount,
                status = %s,
                payment_status = 'PENDING',
                paymongo_payment_id = EXCLUDED.paymongo_payment_id,
                updated_at = NOW()
            RETURNING id
            """,
            (customer_id, package_id, billing_cycle, amount, pending_status, link_id, pending_status),
        )
        subscription_row = cur.fetchone() or {}
        conn.commit()

        return jsonify({
            "checkoutUrl": checkout_url,
            "linkId": link_id,
            "amount": amount,
            "subscriptionId": subscription_row.get("id"),
            "isSimulated": simulation_mode,
            "billingCycle": billing_cycle,
            "packageName": package_row.get("name"),
        }), 200
    except requests.exceptions.Timeout:
        return jsonify({'error': 'PayMongo request timed out. Try again.'}), 504
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/customer/privileges/verify/<string:link_id>', methods=['GET'])
def customer_privileges_verify_payment(link_id):
    conn = None
    cur = None
    try:
        customer_id = request.args.get('customer_id', type=int)
        if not customer_id:
            return jsonify({'error': 'customer_id is required.'}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _seed_customer_privilege_packages(cur)
        cur.execute(
            """
            SELECT
                s.*,
                p.name AS package_name,
                p.slug AS package_slug,
                p.bonus_points,
                p.perks
            FROM customer_privilege_subscriptions s
            LEFT JOIN customer_privilege_packages p ON p.id = s.package_id
            WHERE s.customer_id = %s AND s.paymongo_payment_id = %s
            LIMIT 1
            """,
            (customer_id, link_id),
        )
        subscription = cur.fetchone()
        if not subscription:
            return jsonify({'error': 'Privilege payment reference not found.'}), 404

        simulated_link = str(link_id or "").startswith("simcust_")
        if str(subscription.get('payment_status') or '').upper() == 'PAID' and subscription.get('last_paid_at'):
            amount = _to_float(subscription.get('amount'), 0)
            return _customer_privilege_success_response(cur, customer_id, amount, simulated_link)

        if simulated_link:
            amount = _to_float(subscription.get('amount'), 0)
            starts_at, next_renewal = _subscription_cycle_dates(subscription, carry_requires_payment_proof=True)
            cur.execute(
                """
                UPDATE customer_privilege_subscriptions
                SET status = 'ACTIVE',
                    payment_status = 'PAID',
                    starts_at = %s,
                    renewal_date = %s,
                    last_paid_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (starts_at, next_renewal, subscription.get("id")),
            )
            _apply_customer_loyalty_bonus(
                cur,
                customer_id,
                bonus_points=_to_int(subscription.get("bonus_points"), 0),
                tier_floor=str(subscription.get("package_slug") or "").upper(),
            )
            conn.commit()
            return _customer_privilege_success_response(cur, customer_id, amount, True)

        response = requests.get(
            f'https://api.paymongo.com/v1/links/{link_id}',
            headers=_paymongo_headers(),
            timeout=15
        )
        result = response.json()
        if not response.ok:
            return jsonify({'error': 'Failed to verify privilege payment.'}), 400

        attrs = result.get('data', {}).get('attributes', {})
        status = attrs.get('status', 'unpaid')
        amount = attrs.get('amount', 0) / 100
        if status == 'paid':
            starts_at, next_renewal = _subscription_cycle_dates(subscription, carry_requires_payment_proof=True)
            cur.execute(
                """
                UPDATE customer_privilege_subscriptions
                SET status = 'ACTIVE',
                    payment_status = 'PAID',
                    starts_at = %s,
                    renewal_date = %s,
                    last_paid_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (starts_at, next_renewal, subscription.get("id")),
            )
            _apply_customer_loyalty_bonus(
                cur,
                customer_id,
                bonus_points=_to_int(subscription.get("bonus_points"), 0),
                tier_floor=str(subscription.get("package_slug") or "").upper(),
            )
            conn.commit()
            return _customer_privilege_success_response(cur, customer_id, amount, False)

        cur.execute(
            "UPDATE customer_privilege_subscriptions SET payment_status = %s, updated_at = NOW() WHERE id = %s",
            (str(status).upper(), subscription.get("id")),
        )
        conn.commit()
        return jsonify({'status': status, 'amount': amount}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/innova/summary/<int:customer_id>', methods=['GET'])
def get_innova_summary(customer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        summary = _build_customer_membership_summary(cur, customer_id)
        if not summary:
            return jsonify({"error": "Customer not found"}), 404
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/about', methods=['GET'])
def public_about_page():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        return jsonify(_build_about_page_payload(cur)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/innova/recommended/<int:customer_id>', methods=['GET'])
def get_innova_recommended(customer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        preferred_type = None
        if _table_exists(cur, "reservations"):
            cur.execute(
                """
                SELECT rm.room_type
                FROM reservations r
                LEFT JOIN rooms rm ON rm.id = r.room_id
                WHERE r.customer_id = %s
                ORDER BY COALESCE(r.check_in_date, r.created_at) DESC, r.id DESC
                LIMIT 1
                """,
                (customer_id,),
            )
            pref = cur.fetchone()
            preferred_type = pref.get("room_type") if pref else None

        if not _table_exists(cur, "rooms"):
            return jsonify({"rooms": []}), 200

        cur.execute(
            """
            SELECT
                r.id,
                r.room_name,
                r.room_type,
                r.price_per_night,
                r.images,
                r.max_adults,
                r.max_children,
                h.hotel_name
            FROM rooms r
            LEFT JOIN hotels h ON h.id = r.hotel_id
            WHERE LOWER(COALESCE(r.status, '')) = 'available'
            ORDER BY
                CASE
                    WHEN %s IS NOT NULL AND LOWER(COALESCE(r.room_type, '')) = LOWER(%s) THEN 0
                    ELSE 1
                END,
                r.price_per_night ASC,
                r.id DESC
            LIMIT 8
            """,
            (preferred_type, preferred_type),
        )
        rows = cur.fetchall() or []

        rooms = []
        for row in rows:
            images = _parse_text_array(row.get("images"))
            capacity = max(_to_int(row.get("max_adults")) + _to_int(row.get("max_children")), 1)
            base_price = _to_float(row.get("price_per_night"), 0)
            rooms.append({
                "id": row.get("id"),
                "name": row.get("room_name") or row.get("room_type") or "Innova Suite",
                "description": f"Refined stay experience at {row.get('hotel_name') or 'Innova HMS'}.",
                "tagline": f"{capacity} guests - from PHP {int(base_price):,} per night",
                "badge": "AI Recommended",
                "discountPercent": 0,
                "basePricePhp": base_price,
                "capacity": capacity,
                "imageUrl": images[0] if images else "/images/room1.jpg",
            })

        return jsonify({"rooms": rooms}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/chatbot/rasa', methods=['POST'])
def chatbot_rasa_fallback():
    conn = None
    cur = None
    try:
        payload = request.json or {}
        sender = (payload.get("sender") or "website-guest").strip()
        message = (payload.get("message") or "").strip()
        customer_id = payload.get("customer_id")
        if not message:
            return jsonify({"error": "message is required"}), 400

        rasa_endpoint = (os.getenv("RASA_WEBHOOK_URL") or "").strip()
        if rasa_endpoint:
            try:
                rasa_response = requests.post(
                    rasa_endpoint,
                    json={"sender": sender, "message": message},
                    timeout=6,
                )
                if rasa_response.ok:
                    rasa_payload = rasa_response.json()
                    messages = []
                    if isinstance(rasa_payload, list):
                        for item in rasa_payload:
                            text = item.get("text") if isinstance(item, dict) else None
                            if text:
                                messages.append(str(text))
                    elif isinstance(rasa_payload, dict):
                        maybe_text = rasa_payload.get("text")
                        if maybe_text:
                            messages.append(str(maybe_text))

                    if messages:
                        return jsonify({
                            "messages": messages,
                            "source": "rasa",
                        }), 200
            except Exception:
                # Falls back to built-in concierge replies when external Rasa is unavailable.
                pass

        lower_msg = message.lower()
        replies = []

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Smart matching for questions that need database queries
        if any(keyword in lower_msg for keyword in ["available", "availability", "room", "suite", "vacant"]):
            if _table_exists(cur, "rooms"):
                cur.execute(
                    """
                    SELECT room_name, room_type, price_per_night
                    FROM rooms
                    WHERE LOWER(COALESCE(status, '')) = 'available'
                    ORDER BY price_per_night ASC, id DESC
                    LIMIT 3
                    """
                )
                room_rows = cur.fetchall() or []
                if room_rows:
                    room_lines = []
                    for row in room_rows:
                        room_lines.append(
                            f"{row.get('room_name') or row.get('room_type') or 'Suite'} - PHP {int(_to_float(row.get('price_per_night'), 0)):,}/night"
                        )
                    replies.append("Current available rooms: " + "; ".join(room_lines))
                else:
                    replies.append("I cannot find available rooms right now. Please try again in a moment.")
            else:
                replies.append("Room inventory is currently syncing. Please try again shortly.")

        if any(keyword in lower_msg for keyword in ["promo", "offer", "discount", "deal", "special"]):
            if _table_exists(cur, "guest_offers"):
                cur.execute(
                    """
                    SELECT title, discount_percentage, discounted_price
                    FROM guest_offers
                    ORDER BY id DESC
                    LIMIT 2
                    """
                )
                offer_rows = cur.fetchall() or []
                if offer_rows:
                    offer_lines = []
                    for row in offer_rows:
                        pct = _to_int(row.get("discount_percentage"), 0)
                        if pct > 0:
                            offer_lines.append(f"{row.get('title') or 'Special Offer'} ({pct}% off)")
                        else:
                            offer_lines.append(
                                f"{row.get('title') or 'Special Offer'} (PHP {int(_to_float(row.get('discounted_price'), 0)):,})"
                            )
                    replies.append("Latest offers: " + "; ".join(offer_lines))

        # For any other question, respond intelligently without filtering
        # Acknowledge the question and provide helpful guidance
        if not replies:
            # Detect the topic of the question to provide relevant guidance
            topics_help = {
                "pet": "For questions about pet policies, please check our Policies page or contact our team directly.",
                "booking": "You can book a room immediately by opening any room card and clicking Reserve.",
                "price": "Our room prices vary by type and date. Check available rooms to see current rates.",
                "wifi": "Yes, we provide free WiFi throughout the hotel.",
                "parking": "Yes, free parking is available for our guests.",
                "breakfast": "Our on-site restaurant offers breakfast. Check the Facilities page for details.",
                "restaurant": "We have an on-site restaurant with local and international cuisine.",
                "cancel": "We offer free cancellation up to 48 hours before check-in.",
                "check-in": "Standard check-in is 2:00 PM and check-out is 11:00 AM.",
                "digital key": "You can access your digital key via QR code from your booking.",
                "loyalty": "Join our membership program to earn loyalty points on bookings.",
                "tour": "Explore 360 virtual tours of our rooms from the Home page.",
                "review": "Check our guest reviews on the Home page to see ratings and feedback.",
                "contact": "Reach us through the Contact page with your phone and email.",
                "location": "Find our location and directions on the Neighborhood Map page.",
            }

            greeting = "Hello"
            if customer_id:
                greeting = f"Hello guest #{customer_id}"

            # Try to match question topic and provide relevant response
            matched_topic = False
            for topic, help_text in topics_help.items():
                if topic in lower_msg:
                    replies.append(help_text)
                    matched_topic = True
                    break

            # If no specific topic matched, give generic open-ended response
            if not matched_topic:
                replies.append(f"{greeting}! I'm here to help with any questions about our hotel, booking process, amenities, policies, pricing, and more. Feel free to ask me anything!")

        return jsonify({
            "messages": replies,
            "source": "fallback",
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/vision/hotel', methods=['GET'])
def vision_hotel():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        hotel_id = request.args.get("hotel_id", type=int)

        hotel = {
            "id": 0,
            "name": "Innova Vision Suites",
            "locationLabel": "Innova Smart Hotel",
            "location": {"lat": 14.5995, "lng": 120.9842},
        }

        if _table_exists(cur, "hotels"):
            select_cols = ["id", "hotel_name", "hotel_address"]
            if _table_has_column(cur, "hotels", "latitude"):
                select_cols.append("latitude")
            if _table_has_column(cur, "hotels", "longitude"):
                select_cols.append("longitude")

            query = f"SELECT {', '.join(select_cols)} FROM hotels"
            params = []
            if hotel_id:
                query += " WHERE id = %s"
                params.append(hotel_id)
            query += " ORDER BY id ASC LIMIT 1"

            cur.execute(query, tuple(params))
            row = cur.fetchone()
            if row:
                hotel = {
                    "id": row.get("id") or 0,
                    "name": row.get("hotel_name") or "Innova Vision Suites",
                    "locationLabel": row.get("hotel_address") or row.get("hotel_name") or "Innova Smart Hotel",
                    "location": {
                        "lat": _to_float(row.get("latitude"), 14.5995),
                        "lng": _to_float(row.get("longitude"), 120.9842),
                    },
                }

        return jsonify({"hotel": hotel}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/vision/rooms', methods=['GET'])
def vision_rooms():
    conn = None
    cur = None
    try:
        view_filter = (request.args.get("view") or "").strip()
        hotel_id = request.args.get("hotel_id", type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, "rooms"):
            return jsonify({"rooms": []}), 200

        query = """
            SELECT
                r.id,
                r.room_name,
                r.room_type,
                r.price_per_night,
                r.images,
                r.amenities,
                r.max_adults,
                r.max_children,
                r.status,
                r.hotel_id,
                h.hotel_name
            FROM rooms r
            LEFT JOIN hotels h ON h.id = r.hotel_id
            WHERE LOWER(COALESCE(r.status, '')) = 'available'
        """
        params = []

        if hotel_id:
            query += " AND r.hotel_id = %s"
            params.append(hotel_id)

        if view_filter and view_filter.lower() != "all":
            like_term = f"%{view_filter}%"
            query += """
                AND (
                    LOWER(COALESCE(r.room_name, '')) LIKE LOWER(%s)
                    OR LOWER(COALESCE(r.room_type, '')) LIKE LOWER(%s)
                    OR LOWER(COALESCE(r.amenities::text, '')) LIKE LOWER(%s)
                )
            """
            params.extend([like_term, like_term, like_term])

        query += " ORDER BY r.price_per_night ASC, r.id DESC"
        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []

        rooms = []
        for row in rows:
            images = _parse_text_array(row.get("images"))
            amenities = _parse_text_array(row.get("amenities"))
            capacity = max(_to_int(row.get("max_adults")) + _to_int(row.get("max_children")), 1)
            room_id = row.get("id")
            has_tour = False
            try:
                has_tour = bool(_build_tour_payload(cur, room_id))
            except Exception:
                has_tour = False

            # Resolve image URL — keep relative path, frontend will prefix
            raw_img = images[0] if images else ""

            rooms.append({
                "id": room_id,
                "name": row.get("room_name") or row.get("room_type") or "Vision Suite",
                "type": row.get("room_type") or "Suite",
                "tagline": row.get("hotel_name") or "Luxury accommodation",
                "description": "Designed for comfort with smart hospitality features.",
                "basePricePhp": _to_float(row.get("price_per_night"), 0),
                "capacity": capacity,
                "imageUrl": raw_img,
                "viewPreference": row.get("room_type") or view_filter or "City View",
                "amenities": amenities,
                "hasVirtualTour": has_tour,
                "hotelId": row.get("hotel_id"),
                "hotelName": row.get("hotel_name") or "",
            })

        return jsonify({"rooms": rooms}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/vision/nearby-hotels', methods=['GET'])
def vision_nearby_hotels():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, "hotels"):
            return jsonify({"hotels": []}), 200

        selected_hotel_id = request.args.get("hotel_id", type=int)
        select_cols = ["id", "hotel_name", "hotel_address"]
        if _table_has_column(cur, "hotels", "latitude"):
            select_cols.append("latitude")
        if _table_has_column(cur, "hotels", "longitude"):
            select_cols.append("longitude")

        cur.execute(f"SELECT {', '.join(select_cols)} FROM hotels ORDER BY id ASC")
        rows = cur.fetchall() or []

        hotels = []
        for row in rows:
            hotels.append({
                "id": row.get("id"),
                "name": row.get("hotel_name") or "Hotel",
                "address": row.get("hotel_address") or "",
                "lat": _to_float(row.get("latitude"), 0),
                "lng": _to_float(row.get("longitude"), 0),
            })

        base_hotel_id = selected_hotel_id or (hotels[0].get("id") if hotels else None)
        if base_hotel_id:
            hotels = [hotel for hotel in hotels if hotel.get("id") != base_hotel_id]

        return jsonify({"hotels": hotels}), 200
    except Exception as e:
        return jsonify({"error": str(e), "hotels": []}), 200
    finally:
        _safe_close(conn, cur)


@app.route('/api/vision/landmarks', methods=['GET'])
def vision_landmarks():
    """Return registered hotels as map landmarks so customers can see nearby hotel locations."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Try vision_landmarks table first (seeded Cebu landmarks)
        if _table_exists(cur, "vision_landmarks"):
            hotel_id_param = request.args.get("hotel_id", type=int)
            q = "SELECT id, name, category, lat, lng FROM vision_landmarks"
            p = []
            if hotel_id_param:
                q += " WHERE hotel_id = %s"
                p.append(hotel_id_param)
            q += " ORDER BY sort_order ASC, id ASC LIMIT 30"
            cur.execute(q, p)
            rows = cur.fetchall() or []
            if rows:
                return jsonify({"landmarks": [
                    {"id": r["id"], "name": r["name"], "category": r["category"],
                     "lat": _to_float(r["lat"], 10.3247), "lng": _to_float(r["lng"], 123.9091)}
                    for r in rows
                ]}), 200

        # 2. Fall back: use hotels table — show each hotel as a landmark pin
        if _table_exists(cur, "hotels"):
            select_cols = ["id", "hotel_name", "hotel_address"]
            if _table_has_column(cur, "hotels", "latitude"):
                select_cols.append("latitude")
            if _table_has_column(cur, "hotels", "longitude"):
                select_cols.append("longitude")
            cur.execute(f"SELECT {', '.join(select_cols)} FROM hotels ORDER BY id ASC LIMIT 20")
            rows = cur.fetchall() or []
            if rows:
                landmarks = []
                for i, row in enumerate(rows):
                    lat = _to_float(row.get("latitude"), 0)
                    lng = _to_float(row.get("longitude"), 0)
                    # Skip hotels with no coordinates
                    if lat == 0 and lng == 0:
                        continue
                    landmarks.append({
                        "id": row.get("id"),
                        "name": row.get("hotel_name") or "Hotel",
                        "category": "Hotel",
                        "address": row.get("hotel_address") or "",
                        "lat": lat,
                        "lng": lng,
                    })
                if landmarks:
                    return jsonify({"landmarks": landmarks}), 200

        # 3. Last resort: empty list — frontend handles gracefully
        return jsonify({"landmarks": []}), 200
    except Exception as e:
        return jsonify({"error": str(e), "landmarks": []}), 200
    finally:
        _safe_close(conn, cur)


@app.route('/api/vision/rooms/<int:room_id>/tour', methods=['GET'])
def vision_room_tour(room_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        tour = _build_tour_payload(cur, room_id)
        if not tour:
            return jsonify({"error": "No virtual tour configured for this room."}), 404
        return jsonify({"tour": tour}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/bookings/<int:booking_id>/digital-key', methods=['GET'])
def get_booking_digital_key(booking_id):
    conn = None
    cur = None
    try:
        customer_id = request.args.get("customer_id", type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, "reservations"):
            return jsonify({"error": "Reservation data is unavailable"}), 404

        if customer_id:
            cur.execute(
                """
                SELECT r.id, r.room_id, rm.room_name, rm.room_type
                FROM reservations r
                LEFT JOIN rooms rm ON rm.id = r.room_id
                WHERE r.id = %s AND r.customer_id = %s
                LIMIT 1
                """,
                (booking_id, customer_id),
            )
        else:
            cur.execute(
                """
                SELECT r.id, r.room_id, rm.room_name, rm.room_type
                FROM reservations r
                LEFT JOIN rooms rm ON rm.id = r.room_id
                WHERE r.id = %s
                LIMIT 1
                """,
                (booking_id,),
            )

        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Booking not found for this customer."}), 404

        now = datetime.utcnow()
        expires = now + timedelta(hours=24)
        access_payload = f"INNOVA|BOOKING:{booking_id}|ROOM:{row.get('room_id') or 'NA'}|TS:{int(now.timestamp())}"

        return jsonify({
            "bookingId": booking_id,
            "roomLabel": row.get("room_name") or row.get("room_type") or "Assigned Room",
            "accessPayload": access_payload,
            "validUntil": expires.isoformat() + "Z",
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/bookings/<int:booking_id>/modify', methods=['PATCH'])
def modify_booking(booking_id):
    conn = None
    cur = None
    try:
        payload = request.json or {}
        customer_id = payload.get("customerId")
        check_in = payload.get("checkInDate")
        check_out = payload.get("checkOutDate")

        if not customer_id or not check_in or not check_out:
            return jsonify({"error": "customerId, checkInDate, and checkOutDate are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, "reservations"):
            return jsonify({"error": "Reservation data is unavailable"}), 404

        cur.execute(
            """
            UPDATE reservations
            SET check_in_date = %s, check_out_date = %s
            WHERE id = %s AND customer_id = %s
            RETURNING id
            """,
            (check_in, check_out, booking_id, customer_id),
        )
        updated = cur.fetchone()
        if not updated:
            conn.rollback()
            return jsonify({"error": "Booking not found or not owned by customer."}), 404

        conn.commit()
        return jsonify({"message": "Booking dates updated successfully."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/bookings/<int:booking_id>/cancel', methods=['PATCH'])
def cancel_booking(booking_id):
    conn = None
    cur = None
    try:
        payload = request.json or {}
        customer_id = payload.get("customerId")
        if not customer_id:
            return jsonify({"error": "customerId is required"}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, "reservations"):
            return jsonify({"error": "Reservation data is unavailable"}), 404

        cur.execute(
            """
            UPDATE reservations
            SET status = 'CANCELLED'
            WHERE id = %s AND customer_id = %s
            RETURNING id
            """,
            (booking_id, customer_id),
        )
        updated = cur.fetchone()
        if not updated:
            conn.rollback()
            return jsonify({"error": "Booking not found or not owned by customer."}), 404

        conn.commit()
        return jsonify({"message": "Booking cancelled successfully."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/static/uploads/rooms/<path:filename>')
def serve_room_images(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/staff/auto-checkout-overdue', methods=['POST'])
def auto_checkout_overdue():
    """Auto checkout CHECKED_IN guests whose check_out_date < today."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        cur.execute("""
            UPDATE reservations
            SET status = 'CHECKED_OUT',
                special_requests = COALESCE(special_requests,'') || ' [Auto-checked-out: past checkout date]'
            WHERE status = 'CHECKED_IN'
              AND check_out_date < %s
            RETURNING id, booking_number, check_out_date, room_id, hotel_id
        """, (today,))
        rows = cur.fetchall() or []
        # Free up rooms and create housekeeping tasks
        for row in rows:
            if row.get('room_id'):
                # Get room number
                cur.execute("SELECT room_number FROM rooms WHERE id = %s", (row['room_id'],))
                room_row = cur.fetchone()
                room_label = room_row.get('room_number') if room_row else None
                
                # Set room to Cleaning status
                cur.execute("UPDATE rooms SET status = 'Cleaning' WHERE id = %s", (row['room_id'],))
                
                # Create housekeeping task
                cur.execute("""
                    INSERT INTO hk_tasks (hotel_id, room_id, room_label, task_type, priority, status, notes, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (row['hotel_id'], row['room_id'], room_label, 'Room Cleaning', 'NORMAL', 'Pending', f'Auto-checkout room cleaning - Booking {row["booking_number"]} (overdue)'))
        
        conn.commit()
        result = [{'id': r['id'], 'bookingNumber': r['booking_number'], 'checkOut': r['check_out_date'].isoformat()} for r in rows]
        if result:
            print(f"[Auto-Checkout] {len(result)} guest(s) auto-checked-out: {[r['bookingNumber'] for r in result]}")
        return jsonify({'message': f'{len(result)} guest(s) auto-checked out and housekeeping tasks created.', 'checkedOut': result, 'count': len(result)}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/overdue-checkout-count', methods=['GET'])
def overdue_checkout_count():
    """Count of overdue CHECKED_IN guests, filtered by hotel."""
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        hf = "AND rm.hotel_id = %s" if hotel_id else ""
        hp = [today, hotel_id] if hotel_id else [today]
        cur.execute(f"""
            SELECT COUNT(*) AS cnt FROM reservations r
            LEFT JOIN rooms rm ON rm.id = r.room_id
            WHERE r.status = 'CHECKED_IN' AND r.check_out_date < %s {hf}
        """, hp)
        cnt = _to_int((cur.fetchone() or {}).get('cnt'), 0)
        return jsonify({'overdueCheckoutCount': cnt}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


# --- STAFF SHIFT / ATTENDANCE ENDPOINTS ---


@app.route('/api/staff/dashboard', methods=['GET'])
def staff_dashboard():
    """Front desk dashboard filtered by hotel."""
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()

        hotel_filter = "AND rm.hotel_id = %s" if hotel_id else ""
        hotel_params = [hotel_id] if hotel_id else []

        cur.execute(f"""
            SELECT r.id, r.booking_number, r.check_in_date, r.check_out_date,
                   r.total_amount, r.deposit_amount, r.status,
                   c.first_name, c.last_name,
                   rm.room_number, rm.room_name, rm.room_type
            FROM reservations r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            WHERE r.check_in_date = %s AND r.status IN ('PENDING','CONFIRMED')
            {hotel_filter}
            ORDER BY r.created_at DESC
        """, [today] + hotel_params)
        arrivals = []
        for row in cur.fetchall() or []:
            arrivals.append({
                'id': row['id'],
                'bookingNumber': row['booking_number'],
                'guestName': f"{row.get('first_name','')} {row.get('last_name','')}".strip(),
                'roomNumber': row.get('room_number') or '--',
                'roomName': row.get('room_name') or row.get('room_type') or '--',
                'status': row['status'],
            })

        cur.execute(f"SELECT COUNT(*) AS c FROM reservations r LEFT JOIN rooms rm ON rm.id=r.room_id WHERE r.check_out_date = %s AND r.status = 'CHECKED_IN' {hotel_filter}", [today] + hotel_params)
        departures_today = _to_int((cur.fetchone() or {}).get('c'), 0)

        room_hotel_filter = "WHERE hotel_id = %s" if hotel_id else ""
        room_hotel_params = [hotel_id] if hotel_id else []
        cur.execute(f"SELECT COUNT(*) AS c FROM rooms {room_hotel_filter} {'AND' if hotel_id else 'WHERE'} LOWER(status) = 'available'", room_hotel_params)
        available_rooms = _to_int((cur.fetchone() or {}).get('c'), 0)

        cur.execute(f"""SELECT COALESCE(SUM(r.total_amount - COALESCE(r.deposit_amount,0)), 0) AS bal
            FROM reservations r LEFT JOIN rooms rm ON rm.id=r.room_id
            WHERE r.status NOT IN ('CANCELLED','FAILED','CHECKED_OUT') {hotel_filter}""", hotel_params)
        pending_balance = _to_float((cur.fetchone() or {}).get('bal'), 0)

        cur.execute(f"SELECT COUNT(*) AS c FROM reservations r LEFT JOIN rooms rm ON rm.id=r.room_id WHERE r.status = 'CHECKED_IN' {hotel_filter}", hotel_params)

        return jsonify({
            'arrivalsToday': len(arrivals),
            'departuresToday': departures_today,
            'availableRooms': available_rooms,
            'inHouse': in_house,
            'pendingBalance': round(pending_balance, 2),
            'arrivals': arrivals,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/checkout-queue', methods=['GET'])
def staff_checkout_queue():
    """All CHECKED_IN guests for checkout, filtered by hotel."""
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        hotel_filter = "AND rm.hotel_id = %s" if hotel_id else ""
        hotel_params = [hotel_id] if hotel_id else []
        cur.execute(f"""
            SELECT r.id, r.booking_number, r.check_in_date, r.check_out_date,
                   r.total_amount, r.deposit_amount, r.status, r.payment_method,
                   c.first_name, c.last_name, c.email, c.contact_number,
                   rm.room_number, rm.room_name, rm.room_type, rm.id AS room_id
            FROM reservations r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            WHERE r.status = 'CHECKED_IN' {hotel_filter}
            ORDER BY r.check_out_date ASC
        """, hotel_params)
        rows = cur.fetchall() or []
        guests = []
        for row in rows:
            total = _to_float(row.get('total_amount'), 0)
            deposit = _to_float(row.get('deposit_amount'), 0)
            guests.append({
                'id': row['id'],
                'bookingNumber': row['booking_number'],
                'guestName': f"{row.get('first_name','')} {row.get('last_name','')}".strip(),
                'firstName': row.get('first_name') or '',
                'lastName': row.get('last_name') or '',
                'email': row.get('email') or '',
                'contact': row.get('contact_number') or '',
                'roomId': row.get('room_id'),
                'roomNumber': row.get('room_number') or '--',
                'roomName': row.get('room_name') or row.get('room_type') or '--',
                'roomType': row.get('room_type') or '--',
                'checkIn': _serialize_date(row.get('check_in_date')),
                'checkOut': _serialize_date(row.get('check_out_date')),
                'totalAmount': total,
                'deposit': deposit,
                'balance': max(0, total - deposit),
                'paymentMethod': row.get('payment_method') or 'cash',
            })
        return jsonify({'guests': guests, 'total': len(guests)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/checkout/<int:reservation_id>', methods=['PUT'])
def staff_process_checkout(reservation_id):
    """Process final checkout — sets status to CHECKED_OUT, room to Available, and creates housekeeping task."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE reservations SET status = 'CHECKED_OUT'
            WHERE id = %s AND status = 'CHECKED_IN'
            RETURNING id, booking_number, room_id, hotel_id
        """, (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found or not checked in.'}), 404
        
        # Get room details for housekeeping task
        room_label = None
        if row.get('room_id'):
            cur.execute("SELECT room_number FROM rooms WHERE id = %s", (row['room_id'],))
            room_row = cur.fetchone()
            room_label = room_row.get('room_number') if room_row else None
            
            # Set room to Cleaning status and create housekeeping task
            cur.execute("UPDATE rooms SET status = 'Cleaning' WHERE id = %s", (row['room_id'],))
            
            # Create housekeeping task for room cleaning
            cur.execute("""
                INSERT INTO hk_tasks (hotel_id, room_id, room_label, task_type, priority, status, notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            """, (row['hotel_id'], row['room_id'], room_label, 'Room Cleaning', 'NORMAL', 'Pending', f'Room cleaning required after guest checkout - Booking {row["booking_number"]}'))
        
        conn.commit()
        return jsonify({'message': f"{row['booking_number']} checked out. Room freed and housekeeping task created.", 'bookingNumber': row['booking_number']}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/extend/<int:reservation_id>', methods=['PUT'])
def staff_extend_stay(reservation_id):
    """Extend checkout date and recalculate total."""
    conn = None
    cur = None
    try:
        data = request.json or {}
        new_checkout = data.get('newCheckout')
        if not new_checkout:
            return jsonify({'error': 'newCheckout date is required.'}), 400
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT r.check_in_date, r.check_out_date, rm.price_per_night
            FROM reservations r
            LEFT JOIN rooms rm ON rm.id = r.room_id
            WHERE r.id = %s
        """, (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found.'}), 404
        try:
            new_co = datetime.strptime(new_checkout, '%Y-%m-%d').date()
            ci = row['check_in_date']
            nights = (new_co - ci).days
            if nights < 1:
                return jsonify({'error': 'New checkout must be after check-in.'}), 400
            price = _to_float(row.get('price_per_night'), 0)
            new_total = round(price * nights, 2)
        except Exception:
            return jsonify({'error': 'Invalid date format.'}), 400
        cur.execute("""
            UPDATE reservations
            SET check_out_date = %s, total_nights = %s, total_amount = %s
            WHERE id = %s RETURNING id, booking_number
        """, (new_co, nights, new_total, reservation_id))
        updated = cur.fetchone()
        conn.commit()
        return jsonify({'message': f"Stay extended to {new_checkout}.", 'bookingNumber': updated['booking_number'], 'newTotal': new_total, 'nights': nights}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/transfer/<int:reservation_id>', methods=['PUT'])
def staff_transfer_room(reservation_id):
    """Transfer guest to a different room."""
    conn = None
    cur = None
    try:
        data = request.json or {}
        new_room_number = (data.get('newRoomNumber') or '').strip()
        if not new_room_number:
            return jsonify({'error': 'newRoomNumber is required.'}), 400
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, status FROM rooms WHERE room_number = %s LIMIT 1", (new_room_number,))
        new_room = cur.fetchone()
        if not new_room:
            return jsonify({'error': f'Room {new_room_number} not found.'}), 404
        if str(new_room.get('status') or '').lower() not in ('available', 'vacant'):
            return jsonify({'error': f'Room {new_room_number} is not available.'}), 409
        # Get old room
        cur.execute("SELECT room_id FROM reservations WHERE id = %s", (reservation_id,))
        old = cur.fetchone()
        old_room_id = old.get('room_id') if old else None
        # Update reservation
        cur.execute("UPDATE reservations SET room_id = %s WHERE id = %s RETURNING booking_number", (new_room['id'], reservation_id))
        updated = cur.fetchone()
        if not updated:
            return jsonify({'error': 'Reservation not found.'}), 404
        # Free old room, occupy new room
        if old_room_id:
            cur.execute("UPDATE rooms SET status = 'Available' WHERE id = %s", (old_room_id,))
        cur.execute("UPDATE rooms SET status = 'Occupied' WHERE id = %s", (new_room['id'],))
        conn.commit()
        return jsonify({'message': f"Transferred to Room {new_room_number}.", 'bookingNumber': updated['booking_number']}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/guests', methods=['GET'])
def staff_guest_list():
    """All customers with stay history, filtered by hotel."""
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        hf = "AND rm.hotel_id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"""
            SELECT c.id, c.first_name, c.last_name, c.email, c.contact_number,
                   c.created_at,
                   COUNT(r.id) AS total_stays,
                   COALESCE(SUM(r.total_amount), 0) AS total_spent,
                   MAX(r.check_in_date) AS last_stay
            FROM customers c
            LEFT JOIN reservations r ON r.customer_id = c.id
              AND r.status NOT IN ('CANCELLED','FAILED')
            LEFT JOIN rooms rm ON rm.id = r.room_id
            WHERE 1=1 {hf}
            GROUP BY c.id
            ORDER BY total_spent DESC
        """, hp)
        rows = cur.fetchall() or []
        guests = []
        for row in rows:
            guests.append({
                'id': row['id'],
                'firstName': row.get('first_name') or '',
                'lastName': row.get('last_name') or '',
                'email': row.get('email') or '',
                'contact': row.get('contact_number') or '',
                'loyaltyPoints': int(_to_float(row.get('total_spent'), 0) // 100),
                'tier': _normalize_tier(int(_to_float(row.get('total_spent'), 0) // 100)),
                'totalStays': _to_int(row.get('total_stays'), 0),
                'totalSpent': _to_float(row.get('total_spent'), 0),
                'lastStay': _serialize_date(row.get('last_stay')),
                'memberSince': _serialize_date(row.get('created_at')),
            })
        return jsonify({'guests': guests, 'total': len(guests)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/guests/<int:customer_id>/history', methods=['GET'])
def staff_guest_history(customer_id):
    """Full stay history for a specific guest."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT r.id, r.booking_number, r.check_in_date, r.check_out_date,
                   r.total_nights, r.total_amount, r.status, r.payment_method,
                   rm.room_name, rm.room_type, rm.room_number, h.hotel_name
            FROM reservations r
            LEFT JOIN rooms rm ON rm.id = r.room_id
            LEFT JOIN hotels h ON h.id = rm.hotel_id
            WHERE r.customer_id = %s
            ORDER BY r.check_in_date DESC
        """, (customer_id,))
        rows = cur.fetchall() or []
        history = []
        for row in rows:
            history.append({
                'id': row['id'],
                'bookingNumber': row['booking_number'],
                'checkIn': _serialize_date(row.get('check_in_date')),
                'checkOut': _serialize_date(row.get('check_out_date')),
                'nights': _to_int(row.get('total_nights'), 0),
                'amount': _to_float(row.get('total_amount'), 0),
                'status': str(row.get('status') or '').upper(),
                'paymentMethod': row.get('payment_method') or 'cash',
                'roomName': row.get('room_name') or row.get('room_type') or '--',
                'roomNumber': row.get('room_number') or '--',
                'hotelName': row.get('hotel_name') or 'Innova HMS',
            })
        return jsonify({'history': history}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/loyalty', methods=['GET'])
def staff_loyalty_members():
    """Loyalty members with points, tier, and stats."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        has_pts  = _table_has_column(cur, 'customers', 'loyalty_points')
        has_tier = _table_has_column(cur, 'customers', 'membership_level')
        pts_col  = 'COALESCE(c.loyalty_points, 0)' if has_pts else '0'
        tier_col = "COALESCE(c.membership_level, 'STANDARD')" if has_tier else "'STANDARD'"
        cur.execute(f"""
            SELECT c.id, c.first_name, c.last_name,
                   {pts_col} AS points,
                   {tier_col} AS tier,
                   COUNT(r.id) AS total_stays,
                   COALESCE(SUM(r.total_amount), 0) AS total_spent
            FROM customers c
            LEFT JOIN reservations r ON r.customer_id = c.id
              AND r.status NOT IN ('CANCELLED','FAILED')
            GROUP BY c.id
            ORDER BY total_spent DESC
        """)
        rows = cur.fetchall() or []
        members = []
        for row in rows:
            spent = _to_float(row.get('total_spent'), 0)
            pts = _to_int(row.get('points'), 0) if has_pts else int(spent // 100)
            tier = str(row.get('tier') or _normalize_tier(pts)).upper()
            members.append({
                'id': row['id'],
                'name': f"{row.get('first_name','')} {row.get('last_name','')}".strip(),
                'points': pts,
                'tier': tier,
                'totalStays': _to_int(row.get('total_stays'), 0),
                'totalSpent': _to_float(row.get('total_spent'), 0),
                'discount': {'DIAMOND': 30, 'PLATINUM': 20, 'GOLD': 10, 'SILVER': 5}.get(tier, 0),
                'progress': _progress_percent(pts, tier),
            })
        # Stats
        total = len(members)
        diamond = sum(1 for m in members if m['tier'] == 'DIAMOND')
        platinum = sum(1 for m in members if m['tier'] == 'PLATINUM')
        gold = sum(1 for m in members if m['tier'] == 'GOLD')
        return jsonify({'members': members, 'stats': {'total': total, 'diamond': diamond, 'platinum': platinum, 'gold': gold}}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/room-map', methods=['GET'])
def staff_room_map():
    """All rooms with live status, filtered by hotel."""
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        hf = "WHERE r.hotel_id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"""
            SELECT r.id, r.room_number, r.room_name, r.room_type,
                   r.status, r.price_per_night, r.max_adults, r.max_children,
                   h.hotel_name
            FROM rooms r
            LEFT JOIN hotels h ON h.id = r.hotel_id
            {hf}
            ORDER BY r.room_number ASC
        """, hp)
        rows = cur.fetchall() or []
        rooms = []
        for row in rows:
            rooms.append({
                'id': row['id'],
                'roomNumber': row.get('room_number') or '--',
                'roomName': row.get('room_name') or row.get('room_type') or '--',
                'roomType': row.get('room_type') or 'Standard',
                'status': row.get('status') or 'Available',
                'price': _to_float(row.get('price_per_night'), 0),
                'capacity': _to_int(row.get('max_adults'), 0) + _to_int(row.get('max_children'), 0),
                'hotelName': row.get('hotel_name') or '',
            })
        counts = {}
        for r in rooms:
            s = str(r['status']).lower()
            counts[s] = counts.get(s, 0) + 1
        return jsonify({'rooms': rooms, 'counts': counts, 'total': len(rooms)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)

@app.route('/api/staff/list', methods=['GET'])
def staff_list_with_shift():
    """All staff with today's clock-in/out status, filtered by hotel."""
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        hf = "AND s.hotel_id = %s" if hotel_id else ""
        hp = [today, hotel_id] if hotel_id else [today]
        cur.execute(f"""
            SELECT
                s.id, s.first_name, s.last_name, s.role, s.status,
                h.hotel_name,
                a.id        AS att_id,
                a.clock_in,
                a.clock_out,
                a.status    AS att_status
            FROM staff s
            LEFT JOIN hotels h ON h.id = s.hotel_id
            LEFT JOIN attendance a ON a.staff_id = s.id AND a.date = %s
            WHERE 1=1 {hf}
            ORDER BY s.first_name ASC
        """, hp)
        rows = cur.fetchall() or []
        staff = []
        for r in rows:
            ci = r.get('clock_in')
            co = r.get('clock_out')
            staff.append({
                'id': r['id'],
                'name': f"{r.get('first_name','')} {r.get('last_name','')}".strip(),
                'role': r.get('role') or 'Staff',
                'hotelName': r.get('hotel_name') or '',
                'status': r.get('status') or 'Active',
                'clockIn': ci.strftime('%H:%M:%S') if ci else None,
                'clockOut': co.strftime('%H:%M:%S') if co else None,
                'shiftStatus': r.get('att_status') or ('On Duty' if ci and not co else ('Off Duty' if co else 'Not Clocked In')),
            })
        present = sum(1 for s in staff if s['clockIn'] and not s['clockOut'])
        absent  = sum(1 for s in staff if not s['clockIn'])
        off     = sum(1 for s in staff if s['clockOut'])
        return jsonify({'staff': staff, 'stats': {'present': present, 'absent': absent, 'off': off, 'total': len(staff)}}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/time-in', methods=['POST'])
def staff_time_in():
    """Clock in a staff member for today."""
    conn = None
    cur = None
    try:
        data = request.json or {}
        staff_id = data.get('staffId')
        if not staff_id:
            return jsonify({'error': 'staffId is required'}), 400
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        now   = datetime.now()
        # Check if already clocked in today
        cur.execute("SELECT id, clock_in FROM attendance WHERE staff_id = %s AND date = %s", (staff_id, today))
        existing = cur.fetchone()
        if existing and existing.get('clock_in'):
            return jsonify({'error': 'Already clocked in today.', 'clockIn': existing['clock_in'].strftime('%H:%M:%S')}), 409
        # Determine late status (after 09:00)
        shift_start = now.replace(hour=9, minute=0, second=0, microsecond=0)
        att_status = 'Late' if now > shift_start else 'Present'
        if existing:
            cur.execute("UPDATE attendance SET clock_in = %s, status = %s WHERE id = %s RETURNING id",
                        (now, att_status, existing['id']))
        else:
            cur.execute("""
                INSERT INTO attendance (staff_id, date, clock_in, status)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (staff_id, today, now, att_status))
        conn.commit()
        return jsonify({'message': 'Clocked in successfully.', 'clockIn': now.strftime('%H:%M:%S'), 'status': att_status}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/time-out', methods=['POST'])
def staff_time_out():
    """Clock out a staff member for today."""
    conn = None
    cur = None
    try:
        data = request.json or {}
        staff_id = data.get('staffId')
        if not staff_id:
            return jsonify({'error': 'staffId is required'}), 400
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        now   = datetime.now()
        cur.execute("SELECT id, clock_in, clock_out FROM attendance WHERE staff_id = %s AND date = %s", (staff_id, today))
        row = cur.fetchone()
        if not row or not row.get('clock_in'):
            return jsonify({'error': 'No clock-in record found for today.'}), 404
        if row.get('clock_out'):
            return jsonify({'error': 'Already clocked out today.', 'clockOut': row['clock_out'].strftime('%H:%M:%S')}), 409
        # Compute hours worked
        ci = row['clock_in']
        hours = round((now - ci).total_seconds() / 3600, 2)
        cur.execute("UPDATE attendance SET clock_out = %s WHERE id = %s", (now, row['id']))
        conn.commit()
        return jsonify({'message': 'Clocked out successfully.', 'clockOut': now.strftime('%H:%M:%S'), 'hoursWorked': hours}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/shift-status/<int:staff_id>', methods=['GET'])
def staff_shift_status(staff_id):
    """Get today's shift status for a specific staff member."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        cur.execute("""
            SELECT a.clock_in, a.clock_out, a.status,
                   s.first_name, s.last_name, s.role, h.hotel_name
            FROM staff s
            LEFT JOIN hotels h ON h.id = s.hotel_id
            LEFT JOIN attendance a ON a.staff_id = s.id AND a.date = %s
            WHERE s.id = %s
        """, (today, staff_id))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Staff not found'}), 404
        ci = row.get('clock_in')
        co = row.get('clock_out')
        hours = None
        if ci and co:
            hours = round((co - ci).total_seconds() / 3600, 2)
        elif ci:
            hours = round((datetime.now() - ci).total_seconds() / 3600, 2)
        return jsonify({
            'staffId': staff_id,
            'name': f"{row.get('first_name','')} {row.get('last_name','')}".strip(),
            'role': row.get('role') or 'Staff',
            'hotelName': row.get('hotel_name') or '',
            'clockIn': ci.strftime('%H:%M:%S') if ci else None,
            'clockOut': co.strftime('%H:%M:%S') if co else None,
            'hoursWorked': hours,
            'shiftStatus': row.get('status') or ('On Duty' if ci and not co else ('Completed' if co else 'Not Started')),
            'date': today.isoformat(),
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/reservations/<int:reservation_id>/pay', methods=['POST'])
def staff_process_payment(reservation_id):
    """Process cash payment at front desk — records amount paid and marks as CONFIRMED + CHECKED_IN."""
    conn = None
    cur = None
    try:
        data = request.json or {}
        amount_paid = _to_float(data.get('amountPaid'), 0)
        payment_method = (data.get('paymentMethod') or 'cash').strip()
        notes = (data.get('notes') or '').strip()

        if amount_paid <= 0:
            return jsonify({'error': 'Amount paid must be greater than 0.'}), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT id, booking_number, total_amount, status, deposit_amount
            FROM reservations WHERE id = %s
        """, (reservation_id,))
        res = cur.fetchone()
        if not res:
            return jsonify({'error': 'Reservation not found.'}), 404

        total = _to_float(res.get('total_amount'), 0)
        prev_deposit = _to_float(res.get('deposit_amount'), 0)
        new_deposit = prev_deposit + amount_paid
        balance = max(0, total - new_deposit)
        is_fully_paid = new_deposit >= total

        # Update deposit_amount, payment_method, status -> CONFIRMED, and check in
        new_status = 'CHECKED_IN' if is_fully_paid else res.get('status')
        # If partial payment, keep current status but update deposit
        cur.execute("""
            UPDATE reservations
            SET deposit_amount  = %s,
                payment_method  = %s,
                status          = CASE
                    WHEN %s >= total_amount THEN 'CHECKED_IN'
                    WHEN status IN ('PENDING','CONFIRMED') THEN 'CONFIRMED'
                    ELSE status
                END,
                special_requests = COALESCE(special_requests,'') || %s
            WHERE id = %s
            RETURNING id, booking_number, status, deposit_amount, total_amount
        """, (
            new_deposit,
            payment_method,
            new_deposit,
            f' [Payment: {payment_method} ₱{amount_paid:,.2f}{" - " + notes if notes else ""}]',
            reservation_id,
        ))
        row = cur.fetchone()
        conn.commit()

        return jsonify({
            'message': 'Payment recorded successfully.',
            'bookingNumber': row.get('booking_number'),
            'status': row.get('status'),
            'amountPaid': amount_paid,
            'totalDeposit': _to_float(row.get('deposit_amount'), 0),
            'totalAmount': _to_float(row.get('total_amount'), 0),
            'balance': max(0, _to_float(row.get('total_amount'), 0) - _to_float(row.get('deposit_amount'), 0)),
            'isFullyPaid': _to_float(row.get('deposit_amount'), 0) >= _to_float(row.get('total_amount'), 0),
        }), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/reservations/<int:reservation_id>', methods=['DELETE'])
def staff_delete_reservation(reservation_id):
    """Hard delete a reservation from the database."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("DELETE FROM reservations WHERE id = %s RETURNING id, booking_number", (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found.'}), 404
        conn.commit()
        return jsonify({'message': f'Reservation {row["booking_number"]} deleted.', 'id': row['id']}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/reservations/<int:reservation_id>/cancel', methods=['PATCH'])
def staff_cancel_reservation(reservation_id):
    """Cancel a reservation (soft delete — keeps record)."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE reservations SET status = 'CANCELLED'
            WHERE id = %s AND status NOT IN ('CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')
            RETURNING id, booking_number
        """, (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found or cannot be cancelled.'}), 404
        conn.commit()
        return jsonify({'message': f'Reservation {row["booking_number"]} cancelled.', 'id': row['id']}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/reservations', methods=['GET'])
def staff_reservations():
    """All reservations filtered by hotel."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()

        hotel_id = request.args.get('hotel_id', type=int)
        hf = "AND h.id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"""
            SELECT
                r.id, r.booking_number, r.check_in_date, r.check_out_date,
                r.check_in_time, r.check_out_time,
                r.total_nights, r.total_amount, r.deposit_amount, r.status, r.payment_method,
                r.special_requests, r.created_at,
                c.first_name, c.last_name, c.email, c.contact_number,
                rm.room_number, rm.room_name, rm.room_type, rm.id AS room_id,
                h.hotel_name, h.id AS hotel_id
            FROM reservations r
            LEFT JOIN customers c ON c.id = r.customer_id
            LEFT JOIN rooms rm ON rm.id = r.room_id
            LEFT JOIN hotels h ON h.id = rm.hotel_id
            WHERE 1=1 {hf}
            ORDER BY r.check_in_date ASC, r.created_at DESC
        """, hp)
        rows = cur.fetchall() or []

        reservations = []
        for row in rows:
            ci_date = row.get('check_in_date')
            co_date = row.get('check_out_date')
            ci_str = ci_date.isoformat() if ci_date else None
            co_str = co_date.isoformat() if co_date else None
            is_today = ci_date == today if ci_date else False
            status = str(row.get('status') or 'PENDING').upper()

            reservations.append({
                'id': row.get('id'),
                'bookingNumber': row.get('booking_number') or f"INV-{row.get('id')}",
                'guestName': f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or 'Guest',
                'guestEmail': row.get('email') or '',
                'guestContact': row.get('contact_number') or '',
                'firstName': row.get('first_name') or '',
                'lastName': row.get('last_name') or '',
                'roomId': row.get('room_id'),
                'roomNumber': row.get('room_number') or '—',
                'roomName': row.get('room_name') or row.get('room_type') or '—',
                'roomType': row.get('room_type') or '—',
                'hotelName': row.get('hotel_name') or '—',
                'checkIn': ci_str,
                'checkOut': co_str,
                'checkInTime': str(row.get('check_in_time') or '14:00')[:5],
                'checkOutTime': str(row.get('check_out_time') or '12:00')[:5],
                'nights': _to_int(row.get('total_nights'), 0),
                'amount': _to_float(row.get('total_amount'), 0),
                'deposit': _to_float(row.get('deposit_amount'), 0),
                'balance': max(0, _to_float(row.get('total_amount'), 0) - _to_float(row.get('deposit_amount'), 0)),
                'status': status,
                'paymentMethod': row.get('payment_method') or 'cash',
                'specialRequests': row.get('special_requests') or '',
                'createdAt': _serialize_date(row.get('created_at')),
                'isArrivalToday': is_today,
                'isDoubleBooked': False,
            })

        # Mark double bookings — same room, overlapping dates, active status
        active = {'PENDING', 'CONFIRMED', 'CHECKED_IN'}
        for i, res in enumerate(reservations):
            if res['status'] not in active:
                continue
            for j, other in enumerate(reservations):
                if i == j or other['status'] not in active:
                    continue
                if res['roomId'] != other['roomId']:
                    continue
                ci1, co1, ci2, co2 = res['checkIn'], res['checkOut'], other['checkIn'], other['checkOut']
                if ci1 and co1 and ci2 and co2 and ci1 < co2 and co1 > ci2:
                    reservations[i]['isDoubleBooked'] = True
                    break

        today_str = today.isoformat()
        stats = {
            'total': len(reservations),
            'pending': sum(1 for r in reservations if r['status'] == 'PENDING'),
            'confirmed': sum(1 for r in reservations if r['status'] == 'CONFIRMED'),
            'checkedIn': sum(1 for r in reservations if r['status'] == 'CHECKED_IN'),
            'cancelled': sum(1 for r in reservations if r['status'] == 'CANCELLED'),
            'doubleBooked': sum(1 for r in reservations if r['isDoubleBooked']),
            'arrivalsToday': sum(1 for r in reservations if r['checkIn'] == today_str and r['status'] in ('PENDING', 'CONFIRMED')),
            'checkoutsToday': sum(1 for r in reservations if r['checkOut'] == today_str),
        }
        return jsonify({'reservations': reservations, 'stats': stats}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/check-in/<int:reservation_id>', methods=['PUT'])
def staff_check_in(reservation_id):
    """Process guest check-in — updates status to CHECKED_IN."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE reservations SET status = 'CHECKED_IN'
            WHERE id = %s AND status IN ('PENDING','CONFIRMED')
            RETURNING id, booking_number, status
        """, (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found or already checked in.'}), 404
        conn.commit()
        return jsonify({'message': 'Guest checked in successfully.', 'bookingNumber': row.get('booking_number'), 'status': row.get('status')}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/check-out/<int:reservation_id>', methods=['PUT'])
def staff_check_out(reservation_id):
    """Process guest check-out — updates status to CHECKED_OUT and creates housekeeping task."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE reservations SET status = 'CHECKED_OUT'
            WHERE id = %s AND status = 'CHECKED_IN'
            RETURNING id, booking_number, room_id, hotel_id
        """, (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found or not checked in.'}), 404
        
        # Create housekeeping task if room is assigned
        if row.get('room_id'):
            cur.execute("SELECT room_number FROM rooms WHERE id = %s", (row['room_id'],))
            room_row = cur.fetchone()
            room_label = room_row.get('room_number') if room_row else None
            
            cur.execute("""
                INSERT INTO hk_tasks (hotel_id, room_id, room_label, task_type, priority, status, notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            """, (row['hotel_id'], row['room_id'], room_label, 'Room Cleaning', 'NORMAL', 'Pending', f'Room cleaning required after guest checkout - Booking {row["booking_number"]}'))
        
        conn.commit()
        return jsonify({'message': 'Guest checked out successfully.', 'bookingNumber': row.get('booking_number'), 'status': row.get('status')}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


# --- AUTO-CANCEL OVERDUE RESERVATIONS ---


@app.route('/api/admin/migrate-arrival-time', methods=['POST'])
def migrate_arrival_time():
    """One-time migration: add check_in_time and check_out_time columns."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
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
        """)
        conn.commit()
        return jsonify({'message': 'Migration complete: check_in_time and check_out_time columns added.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)

def _run_auto_cancel():
    """Cancel PENDING/CONFIRMED reservations where check_in_date < today and guest never arrived."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        cur.execute("""
            UPDATE reservations
            SET status = 'CANCELLED',
                special_requests = COALESCE(special_requests, '') || ' [Auto-cancelled: no-show past check-in date]'
            WHERE check_in_date < %s
              AND status IN ('PENDING', 'CONFIRMED')
            RETURNING id, booking_number, check_in_date
        """, (today,))
        cancelled = cur.fetchall() or []
        conn.commit()
        if cancelled:
            print(f"[Auto-Cancel] {len(cancelled)} overdue reservation(s) cancelled: {[r['booking_number'] for r in cancelled]}")
        return [{'id': r['id'], 'bookingNumber': r['booking_number'], 'checkIn': r['check_in_date'].isoformat()} for r in cancelled]
    except Exception as e:
        print(f"[Auto-Cancel] Error: {e}")
        if conn: conn.rollback()
        return []
    finally:
        _safe_close(conn, cur)


@app.route('/api/staff/auto-cancel-overdue', methods=['POST'])
def auto_cancel_overdue():
    """Manually trigger auto-cancel of overdue no-show reservations."""
    cancelled = _run_auto_cancel()
    return jsonify({
        'message': f'{len(cancelled)} overdue reservation(s) auto-cancelled.',
        'cancelled': cancelled,
        'count': len(cancelled),
    }), 200


@app.route('/api/staff/overdue-count', methods=['GET'])
def overdue_count():
    """Returns count of overdue no-show reservations, filtered by hotel."""
    conn = None
    cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        hf = "AND rm.hotel_id = %s" if hotel_id else ""
        hp = [today, hotel_id] if hotel_id else [today]
        cur.execute(f"""
            SELECT COUNT(*) AS cnt FROM reservations r
            LEFT JOIN rooms rm ON rm.id = r.room_id
            WHERE r.check_in_date < %s AND r.status IN ('PENDING', 'CONFIRMED') {hf}
        """, hp)
        cnt = _to_int((cur.fetchone() or {}).get('cnt'), 0)
        return jsonify({'overdueCount': cnt}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


def _run_auto_checkout():
    """Auto checkout CHECKED_IN guests whose check_out_date < today."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        today = datetime.now().date()
        cur.execute("""
            UPDATE reservations
            SET status = 'CHECKED_OUT',
                special_requests = COALESCE(special_requests,'') || ' [Auto-checked-out: past checkout date]'
            WHERE status = 'CHECKED_IN' AND check_out_date < %s
            RETURNING id, booking_number, room_id
        """, (today,))
        rows = cur.fetchall() or []
        for row in rows:
            if row.get('room_id'):
                cur.execute("UPDATE rooms SET status = 'Available' WHERE id = %s", (row['room_id'],))
        conn.commit()
        if rows:
            print(f"[Auto-Checkout] {len(rows)} guest(s) auto-checked-out")
        return rows
    except Exception as e:
        print(f"[Auto-Checkout] Error: {e}")
        if conn: conn.rollback()
        return []
    finally:
        _safe_close(conn, cur)


def _schedule_auto_cancel():
    """Background thread: runs auto-cancel + auto-checkout once at startup, then every day at midnight."""
    _run_auto_cancel()
    _run_auto_checkout()
    while True:
        now = datetime.now()
        next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=1, second=0, microsecond=0)
        sleep_secs = (next_midnight - now).total_seconds()
        threading.Event().wait(sleep_secs)
        _run_auto_cancel()
        _run_auto_checkout()


# Start background scheduler (only once, not in reloader child process)
if os.environ.get('WERKZEUG_RUN_MAIN') != 'false':
    _cancel_thread = threading.Thread(target=_schedule_auto_cancel, daemon=True)
    _cancel_thread.start()


# --- HOUSEKEEPING ROOM STATUS ENDPOINTS ---

@app.route('/api/housekeeping/room-status', methods=['GET'])
def hk_room_status():
    conn = None; cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        hf = "WHERE hotel_id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"SELECT id,room_number,room_name,room_type,status FROM rooms {hf} ORDER BY room_number ASC", hp)
        rows = cur.fetchall() or []
        rooms = [{'id':r['id'],'room_label':r['room_number'] or str(r['id']),'room_type':r['room_type'] or 'Standard','room_name':r['room_name'] or '','status':r['status'] or 'Available'} for r in rows]
        counts = {}
        for r in rooms: counts[r['status']] = counts.get(r['status'], 0) + 1
        return jsonify({'rooms': rooms, 'counts': counts, 'total': len(rooms)}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/housekeeping/room-status/<room_number>', methods=['PATCH'])
def hk_update_room_status(room_number):
    conn = None; cur = None
    try:
        data = request.json or {}
        new_status = data.get('status', 'Available')
        hotel_id   = data.get('hotel_id')
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        q = "UPDATE rooms SET status = %s WHERE room_number = %s"
        p = [new_status, room_number]
        if hotel_id: q += " AND hotel_id = %s"; p.append(hotel_id)
        q += " RETURNING id, room_number, status"
        cur.execute(q, p)
        row = cur.fetchone()
        if not row: return jsonify({'error': 'Room not found.'}), 404
        conn.commit()
        return jsonify({'message': f'Room {room_number} updated to {new_status}.', 'status': new_status}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


# ── INVENTORY MANAGEMENT ENDPOINTS ──────────────────────────────────────────

@app.route('/api/inventory/items', methods=['GET'])
def inv_items():
    conn = None; cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        category = request.args.get('category', '').strip()
        search   = request.args.get('search', '').strip()
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        q = "SELECT * FROM inventory_items WHERE 1=1"
        p = []
        if hotel_id: q += " AND hotel_id = %s"; p.append(hotel_id)
        if category and category.lower() != 'all': q += " AND LOWER(category) = LOWER(%s)"; p.append(category)
        if search: q += " AND (LOWER(item_name) LIKE LOWER(%s) OR LOWER(sku_id) LIKE LOWER(%s))"; p += [f'%{search}%', f'%{search}%']
        q += " ORDER BY category, item_name"
        cur.execute(q, p)
        rows = cur.fetchall() or []
        items = []
        for r in rows:
            pct = round((r['stock_level'] / max(r['max_stock'], 1)) * 100, 1)
            items.append({
                'id': r['id'], 'skuId': r['sku_id'], 'name': r['item_name'],
                'description': r.get('description') or '', 'category': r['category'],
                'unit': r['unit'], 'supplier': r.get('supplier') or '',
                'stockLevel': r['stock_level'], 'minStock': r['min_stock'],
                'maxStock': r['max_stock'], 'reorderPoint': r['reorder_point'],
                'unitCost': _to_float(r.get('unit_cost'), 0),
                'status': r.get('status') or ('CRITICAL' if r['stock_level'] <= r['reorder_point'] else 'OPTIMAL'),
                'stockPercent': pct,
                'updatedAt': _serialize_date(r.get('updated_at')),
            })
        # summary
        total = len(items); low = sum(1 for i in items if i['status'] in ('LOW','CRITICAL'))
        critical = sum(1 for i in items if i['status'] == 'CRITICAL')
        cats = list(dict.fromkeys(i['category'] for i in items))
        return jsonify({'items': items, 'summary': {'total': total, 'low': low, 'critical': critical, 'categories': cats}}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/items', methods=['POST'])
def inv_add_item():
    conn = None; cur = None
    try:
        d = request.json or {}
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO inventory_items
              (hotel_id,sku_id,item_name,description,category,unit,supplier,
               stock_level,min_stock,max_stock,reorder_point,unit_cost)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id,sku_id
        """, (d.get('hotelId'), d.get('skuId'), d.get('name'), d.get('description',''),
               d.get('category','General'), d.get('unit','pcs'), d.get('supplier',''),
               _to_int(d.get('stockLevel'),0), _to_int(d.get('minStock'),10),
               _to_int(d.get('maxStock'),100), _to_int(d.get('reorderPoint'),10),
               _to_float(d.get('unitCost'),0)))
        row = cur.fetchone(); conn.commit()
        return jsonify({'message': 'Item added.', 'id': row['id'], 'skuId': row['sku_id']}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/items/<int:item_id>', methods=['PUT'])
def inv_update_item(item_id):
    conn = None; cur = None
    try:
        d = request.json or {}
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute("""
            UPDATE inventory_items SET
              item_name=%s, description=%s, category=%s, unit=%s, supplier=%s,
              min_stock=%s, max_stock=%s, reorder_point=%s, unit_cost=%s, updated_at=NOW()
            WHERE id=%s
        """, (d.get('name'), d.get('description',''), d.get('category','General'),
               d.get('unit','pcs'), d.get('supplier',''),
               _to_int(d.get('minStock'),10), _to_int(d.get('maxStock'),100),
               _to_int(d.get('reorderPoint'),10), _to_float(d.get('unitCost'),0), item_id))
        conn.commit()
        return jsonify({'message': 'Item updated.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/items/<int:item_id>', methods=['DELETE'])
def inv_delete_item(item_id):
    conn = None; cur = None
    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute("DELETE FROM inventory_items WHERE id=%s", (item_id,))
        conn.commit()
        return jsonify({'message': 'Item deleted.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/stock-in', methods=['POST'])
def inv_stock_in():
    conn = None; cur = None
    try:
        d = request.json or {}
        item_id  = d.get('itemId'); qty = _to_int(d.get('quantity'), 0)
        if not item_id or qty <= 0: return jsonify({'error': 'itemId and quantity > 0 required'}), 400
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, stock_level, hotel_id FROM inventory_items WHERE id=%s", (item_id,))
        item = cur.fetchone()
        if not item: return jsonify({'error': 'Item not found'}), 404
        new_stock = item['stock_level'] + qty
        cur.execute("UPDATE inventory_items SET stock_level=%s, updated_at=NOW() WHERE id=%s", (new_stock, item_id))
        cur.execute("""
            INSERT INTO stock_movements
              (hotel_id,item_id,movement_type,quantity,unit_cost,supplier,po_number,notes,performed_by,staff_id)
            VALUES (%s,%s,'IN',%s,%s,%s,%s,%s,%s,%s)
        """, (item['hotel_id'], item_id, qty, _to_float(d.get('unitCost'),0),
               d.get('supplier',''), d.get('poNumber',''), d.get('notes',''),
               d.get('performedBy','Staff'), d.get('staffId')))
        conn.commit()
        return jsonify({'message': f'Stock IN recorded. New level: {new_stock}', 'newStock': new_stock}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/stock-out', methods=['POST'])
def inv_stock_out():
    conn = None; cur = None
    try:
        d = request.json or {}
        item_id = d.get('itemId'); qty = _to_int(d.get('quantity'), 0)
        if not item_id or qty <= 0: return jsonify({'error': 'itemId and quantity > 0 required'}), 400
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, stock_level, hotel_id FROM inventory_items WHERE id=%s", (item_id,))
        item = cur.fetchone()
        if not item: return jsonify({'error': 'Item not found'}), 404
        if item['stock_level'] < qty:
            return jsonify({'error': f'Insufficient stock. Available: {item["stock_level"]}'}), 409
        new_stock = item['stock_level'] - qty
        cur.execute("UPDATE inventory_items SET stock_level=%s, updated_at=NOW() WHERE id=%s", (new_stock, item_id))
        cur.execute("""
            INSERT INTO stock_movements
              (hotel_id,item_id,movement_type,quantity,department,reason,notes,performed_by,staff_id)
            VALUES (%s,%s,'OUT',%s,%s,%s,%s,%s,%s)
        """, (item['hotel_id'], item_id, qty, d.get('department',''),
               d.get('reason',''), d.get('notes',''),
               d.get('performedBy','Staff'), d.get('staffId')))
        conn.commit()
        return jsonify({'message': f'Stock OUT recorded. New level: {new_stock}', 'newStock': new_stock}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/movements', methods=['GET'])
def inv_movements():
    conn = None; cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        limit    = min(request.args.get('limit', 50, type=int), 200)
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        hf = "AND sm.hotel_id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"""
            SELECT sm.id, sm.movement_type, sm.quantity, sm.department, sm.reason,
                   sm.supplier, sm.po_number, sm.notes, sm.performed_by, sm.created_at,
                   ii.item_name, ii.sku_id, ii.unit, ii.category
            FROM stock_movements sm
            JOIN inventory_items ii ON ii.id = sm.item_id
            WHERE 1=1 {hf}
            ORDER BY sm.created_at DESC LIMIT %s
        """, hp + [limit])
        rows = cur.fetchall() or []
        movements = [{
            'id': r['id'], 'type': r['movement_type'], 'quantity': r['quantity'],
            'itemName': r['item_name'], 'skuId': r['sku_id'], 'unit': r['unit'],
            'category': r['category'], 'department': r.get('department') or '',
            'reason': r.get('reason') or '', 'supplier': r.get('supplier') or '',
            'poNumber': r.get('po_number') or '', 'notes': r.get('notes') or '',
            'performedBy': r.get('performed_by') or '', 'createdAt': _serialize_date(r['created_at']),
        } for r in rows]
        return jsonify({'movements': movements, 'total': len(movements)}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/low-stock', methods=['GET'])
def inv_low_stock():
    conn = None; cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        hf = "AND hotel_id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"""
            SELECT * FROM inventory_items
            WHERE stock_level <= reorder_point {hf}
            ORDER BY (stock_level::float / NULLIF(max_stock,0)) ASC
        """, hp)
        rows = cur.fetchall() or []
        items = [{
            'id': r['id'], 'skuId': r['sku_id'], 'name': r['item_name'],
            'category': r['category'], 'unit': r['unit'], 'supplier': r.get('supplier') or '',
            'stockLevel': r['stock_level'], 'reorderPoint': r['reorder_point'],
            'maxStock': r['max_stock'],
            'severity': 'CRITICAL' if r['stock_level'] <= 0 or r['stock_level'] <= r['reorder_point'] * 0.5 else 'LOW STOCK',
            'stockPercent': round((r['stock_level'] / max(r['max_stock'], 1)) * 100, 1),
        } for r in rows]
        return jsonify({'items': items, 'critical': sum(1 for i in items if i['severity']=='CRITICAL'), 'low': len(items)}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/purchase-orders', methods=['GET'])
def inv_purchase_orders():
    conn = None; cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        hf = "WHERE po.hotel_id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"""
            SELECT po.*, COUNT(poi.id) AS item_count
            FROM purchase_orders po
            LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
            {hf} GROUP BY po.id ORDER BY po.created_at DESC
        """, hp)
        rows = cur.fetchall() or []
        orders = [{
            'id': r['id'], 'poNumber': r['po_number'], 'supplier': r['supplier'],
            'status': r['status'], 'totalAmount': _to_float(r.get('total_amount'),0),
            'expectedDate': _serialize_date(r.get('expected_date')),
            'receivedDate': _serialize_date(r.get('received_date')),
            'itemCount': _to_int(r.get('item_count'),0),
            'notes': r.get('notes') or '', 'createdBy': r.get('created_by') or '',
            'createdAt': _serialize_date(r['created_at']),
        } for r in rows]
        return jsonify({'orders': orders, 'total': len(orders)}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/purchase-orders', methods=['POST'])
def inv_create_po():
    conn = None; cur = None
    try:
        d = request.json or {}
        import random, string
        po_num = 'PO-' + ''.join(random.choices(string.digits, k=8))
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO purchase_orders (hotel_id,po_number,supplier,status,total_amount,expected_date,notes,created_by,staff_id)
            VALUES (%s,%s,%s,'PENDING',%s,%s,%s,%s,%s) RETURNING id,po_number
        """, (d.get('hotelId'), po_num, d.get('supplier'), _to_float(d.get('totalAmount'),0),
               d.get('expectedDate'), d.get('notes',''), d.get('createdBy','Staff'), d.get('staffId')))
        row = cur.fetchone(); conn.commit()
        return jsonify({'message': 'Purchase order created.', 'id': row['id'], 'poNumber': row['po_number']}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/purchase-orders/<int:po_id>/receive', methods=['PUT'])
def inv_receive_po(po_id):
    """Mark PO as received and update stock levels."""
    conn = None; cur = None
    try:
        d = request.json or {}
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("UPDATE purchase_orders SET status='RECEIVED', received_date=NOW(), updated_at=NOW() WHERE id=%s RETURNING id,po_number,hotel_id", (po_id,))
        po = cur.fetchone()
        if not po: return jsonify({'error': 'PO not found'}), 404
        # Update stock for each item in the PO
        items = d.get('items', [])
        for item in items:
            cur.execute("UPDATE inventory_items SET stock_level = stock_level + %s, updated_at=NOW() WHERE id=%s", (_to_int(item.get('quantity'),0), item.get('itemId')))
            cur.execute("""
                INSERT INTO stock_movements (hotel_id,item_id,movement_type,quantity,po_number,performed_by)
                VALUES (%s,%s,'IN',%s,%s,%s)
            """, (po['hotel_id'], item.get('itemId'), _to_int(item.get('quantity'),0), po['po_number'], d.get('receivedBy','Staff')))
        conn.commit()
        return jsonify({'message': f"PO {po['po_number']} received. Stock updated."}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/settings', methods=['GET'])
def inv_get_settings():
    conn = None; cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM inventory_settings WHERE hotel_id=%s", (hotel_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'criticalThreshold':15,'lowThreshold':30,'overstockThreshold':95,'autoPo':True,'emailAlerts':True,'smsAlerts':False,'storageLocation':'Basement Level B1','capacitySqm':280,'managerName':''}), 200
        return jsonify({
            'criticalThreshold': row['critical_threshold'], 'lowThreshold': row['low_threshold'],
            'overstockThreshold': row['overstock_threshold'], 'autoPo': row['auto_po_enabled'],
            'emailAlerts': row['email_alerts'], 'smsAlerts': row['sms_alerts'],
            'storageLocation': row.get('storage_location') or '', 'capacitySqm': row.get('capacity_sqm') or 280,
            'managerName': row.get('manager_name') or '',
        }), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/settings', methods=['PUT'])
def inv_save_settings():
    conn = None; cur = None
    try:
        d = request.json or {}; hotel_id = d.get('hotelId')
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute("""
            INSERT INTO inventory_settings (hotel_id,critical_threshold,low_threshold,overstock_threshold,auto_po_enabled,email_alerts,sms_alerts,storage_location,capacity_sqm,manager_name)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (hotel_id) DO UPDATE SET
              critical_threshold=%s, low_threshold=%s, overstock_threshold=%s,
              auto_po_enabled=%s, email_alerts=%s, sms_alerts=%s,
              storage_location=%s, capacity_sqm=%s, manager_name=%s, updated_at=NOW()
        """, (
            hotel_id, d.get('criticalThreshold',15), d.get('lowThreshold',30), d.get('overstockThreshold',95),
            d.get('autoPo',True), d.get('emailAlerts',True), d.get('smsAlerts',False),
            d.get('storageLocation',''), d.get('capacitySqm',280), d.get('managerName',''),
            d.get('criticalThreshold',15), d.get('lowThreshold',30), d.get('overstockThreshold',95),
            d.get('autoPo',True), d.get('emailAlerts',True), d.get('smsAlerts',False),
            d.get('storageLocation',''), d.get('capacitySqm',280), d.get('managerName',''),
        ))
        conn.commit()
        return jsonify({'message': 'Settings saved.'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


@app.route('/api/inventory/dashboard', methods=['GET'])
def inv_dashboard():
    """Inventory dashboard stats + recent movements + low stock."""
    conn = None; cur = None
    try:
        hotel_id = request.args.get('hotel_id', type=int)
        conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
        hf = "AND hotel_id = %s" if hotel_id else ""
        hp = [hotel_id] if hotel_id else []
        cur.execute(f"SELECT COUNT(*) AS c FROM inventory_items WHERE 1=1 {hf}", hp)
        total_skus = _to_int((cur.fetchone() or {}).get('c'), 0)
        cur.execute(f"SELECT COUNT(*) AS c FROM inventory_items WHERE stock_level <= reorder_point {hf}", hp)
        low_stock = _to_int((cur.fetchone() or {}).get('c'), 0)
        cur.execute(f"SELECT COUNT(*) AS c FROM inventory_items WHERE stock_level <= 0 {hf}", hp)
        out_of_stock = _to_int((cur.fetchone() or {}).get('c'), 0)
        today = datetime.now().date()
        hf2 = "AND sm.hotel_id = %s" if hotel_id else ""
        cur.execute(f"""
            SELECT COALESCE(SUM(sm.quantity),0) AS c FROM stock_movements sm
            WHERE sm.movement_type='OUT' AND DATE(sm.created_at)=%s {hf2}
        """, [today] + hp)
        items_out_today = _to_int((cur.fetchone() or {}).get('c'), 0)
        cur.execute(f"SELECT COUNT(*) AS c FROM purchase_orders WHERE status IN ('PENDING','ORDERED','IN_TRANSIT') {hf}", hp)
        pending_pos = _to_int((cur.fetchone() or {}).get('c'), 0)
        # Category breakdown
        cur.execute(f"""
            SELECT category,
                   ROUND(CAST(AVG(stock_level::float / NULLIF(max_stock,0)) * 100 AS NUMERIC), 1) AS avg_pct
            FROM inventory_items WHERE 1=1 {hf}
            GROUP BY category ORDER BY category
        """, hp)
        cats = [{'name': r['category'], 'avgPercent': _to_float(r['avg_pct'], 0)} for r in (cur.fetchall() or [])]
        # Recent movements
        cur.execute(f"""
            SELECT sm.movement_type, sm.quantity, sm.performed_by, sm.created_at,
                   ii.item_name, ii.unit
            FROM stock_movements sm JOIN inventory_items ii ON ii.id=sm.item_id
            WHERE 1=1 {hf2} ORDER BY sm.created_at DESC LIMIT 8
        """, hp)
        recent = [{
            'type': r['movement_type'], 'qty': r['quantity'], 'item': r['item_name'],
            'unit': r['unit'], 'by': r.get('performed_by') or 'Staff',
            'time': _serialize_date(r['created_at']),
        } for r in (cur.fetchall() or [])]
        return jsonify({
            'stats': {'totalSkus': total_skus, 'lowStock': low_stock, 'outOfStock': out_of_stock,
                      'itemsOutToday': items_out_today, 'pendingPos': pending_pos},
            'categories': cats, 'recentMovements': recent,
        }), 200
    except Exception as e: return jsonify({'error': str(e)}), 500
    finally: _safe_close(conn, cur)


if __name__ == "__main__":
    app.run(debug=True, port=5000)


# ================================================================
# HOUSEKEEPING & MAINTENANCE ROUTES
# ================================================================

@app.route('/api/housekeeping/dashboard-stats', methods=['GET'])
def hk_dashboard_stats():
    hotel_id = request.args.get('hotel_id', type=int)
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        q = "WHERE hotel_id = %s" if hotel_id else ""
        p = [hotel_id] if hotel_id else []

        cur.execute(f"SELECT COUNT(*) AS c FROM hk_tasks {q} AND status='Pending'" if hotel_id else "SELECT COUNT(*) AS c FROM hk_tasks WHERE status='Pending'", p)
        pending = (cur.fetchone() or {}).get('c', 0)

        cur.execute(f"SELECT COUNT(*) AS c FROM hk_tasks {q} AND status='In Progress'" if hotel_id else "SELECT COUNT(*) AS c FROM hk_tasks WHERE status='In Progress'", p)
        in_prog = (cur.fetchone() or {}).get('c', 0)

        cur.execute(f"SELECT COUNT(*) AS c FROM hk_tasks {q} AND status='Completed' AND completed_at::date=CURRENT_DATE" if hotel_id else "SELECT COUNT(*) AS c FROM hk_tasks WHERE status='Completed' AND completed_at::date=CURRENT_DATE", p)
        completed = (cur.fetchone() or {}).get('c', 0)

        cur.execute(f"SELECT COUNT(*) AS c FROM hk_room_status {q} AND status='Dirty'" if hotel_id else "SELECT COUNT(*) AS c FROM hk_room_status WHERE status='Dirty'", p)
        dirty = (cur.fetchone() or {}).get('c', 0)

        # Priority tasks
        if hotel_id:
            cur.execute("SELECT * FROM hk_tasks WHERE hotel_id=%s AND status!='Completed' ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, scheduled_time LIMIT 5", [hotel_id])
        else:
            cur.execute("SELECT * FROM hk_tasks WHERE status!='Completed' ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, scheduled_time LIMIT 5")
        tasks = cur.fetchall()

        # Room grid
        if hotel_id:
            cur.execute("SELECT room_label AS id, room_type AS type, status FROM hk_room_status WHERE hotel_id=%s ORDER BY room_label LIMIT 12", [hotel_id])
        else:
            cur.execute("SELECT room_label AS id, room_type AS type, status FROM hk_room_status ORDER BY room_label LIMIT 12")
        rooms = cur.fetchall()

        # Supplies
        if hotel_id:
            cur.execute("SELECT item_name AS name, current_qty AS current, max_qty AS max FROM hk_inventory WHERE hotel_id=%s ORDER BY current_qty ASC LIMIT 5", [hotel_id])
        else:
            cur.execute("SELECT item_name AS name, current_qty AS current, max_qty AS max FROM hk_inventory ORDER BY current_qty ASC LIMIT 5")
        supplies_raw = cur.fetchall()
        supplies = [{'name': s['name'], 'current': s['current'], 'max': s['max'], 'alert': s['current'] < (s['max'] * 0.4)} for s in supplies_raw]

        priority_tasks = [{'id': t['room_label'], 'type': t['task_type'], 'staff': t['staff_name'] or '', 'time': str(t['scheduled_time'] or ''), 'status': t['priority'], 'note': t['notes'] or ''} for t in tasks]
        room_grid = [{'id': r['id'], 'type': r['type'] or '', 'status': r['status']} for r in rooms]

        return jsonify({
            'pendingTasks': pending, 'inProgress': in_prog,
            'completedToday': completed, 'roomsNeedingClean': dirty,
            'priorityTasks': priority_tasks, 'roomGrid': room_grid, 'supplies': supplies
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/tasks', methods=['GET'])
def hk_get_tasks():
    hotel_id = request.args.get('hotel_id', type=int)
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if hotel_id:
            cur.execute("SELECT * FROM hk_tasks WHERE hotel_id=%s ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, created_at DESC", [hotel_id])
        else:
            cur.execute("SELECT * FROM hk_tasks ORDER BY created_at DESC")
        rows = cur.fetchall()
        return jsonify({'tasks': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/tasks', methods=['POST'])
def hk_create_task():
    d = request.json
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO hk_tasks (hotel_id, room_label, task_type, assigned_to, staff_name, priority, notes, scheduled_time)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
        """, [d.get('hotel_id'), d.get('room_label'), d.get('task_type'), d.get('assigned_to'),
              d.get('staff_name'), d.get('priority','NORMAL'), d.get('notes'), d.get('scheduled_time')])
        task = cur.fetchone()
        conn.commit()
        return jsonify({'task': dict(task)}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/tasks/<int:task_id>/status', methods=['PATCH'])
def hk_update_task_status(task_id):
    d = request.json
    status = d.get('status')
    time_spent = d.get('time_spent_mins')
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if status == 'Completed':
            cur.execute("""
                UPDATE hk_tasks SET status=%s, completed_at=NOW(), time_spent_mins=%s WHERE id=%s RETURNING *
            """, [status, time_spent, task_id])
            row = cur.fetchone()
            if row:
                # If this is a room cleaning task and it's completed, set room status to Available
                if row.get('task_type') == 'Room Cleaning' and row.get('room_id'):
                    cur.execute("UPDATE rooms SET status = 'Available' WHERE id = %s", (row['room_id'],))
                
                cur.execute("""
                    INSERT INTO hk_history (hotel_id, task_id, room_label, task_type, staff_name, status, notes)
                    VALUES (%s,%s,%s,%s,%s,'Completed',%s)
                """, [row['hotel_id'], task_id, row['room_label'], row['task_type'], row['staff_name'], row['notes']])
        else:
            cur.execute("UPDATE hk_tasks SET status=%s WHERE id=%s", [status, task_id])
        conn.commit()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/room-status', methods=['GET'])
def hk_get_room_status():
    hotel_id = request.args.get('hotel_id', type=int)
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if hotel_id:
            cur.execute("SELECT * FROM hk_room_status WHERE hotel_id=%s ORDER BY room_label", [hotel_id])
        else:
            cur.execute("SELECT * FROM hk_room_status ORDER BY room_label")
        rows = cur.fetchall()
        return jsonify({'rooms': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/room-status/<string:room_label>', methods=['PATCH'])
def hk_update_room_status(room_label):
    d = request.json
    hotel_id = d.get('hotel_id')
    status = d.get('status')
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO hk_room_status (hotel_id, room_label, room_type, status)
            VALUES (%s,%s,%s,%s)
            ON CONFLICT (hotel_id, room_label) DO UPDATE SET status=EXCLUDED.status, updated_at=NOW()
        """, [hotel_id, room_label, d.get('room_type','Standard'), status])
        conn.commit()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/maintenance', methods=['GET'])
def hk_get_maintenance():
    hotel_id = request.args.get('hotel_id', type=int)
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if hotel_id:
            cur.execute("SELECT * FROM hk_maintenance_reports WHERE hotel_id=%s ORDER BY created_at DESC", [hotel_id])
        else:
            cur.execute("SELECT * FROM hk_maintenance_reports ORDER BY created_at DESC")
        rows = cur.fetchall()
        return jsonify({'reports': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/maintenance', methods=['POST'])
def hk_create_maintenance():
    d = request.json
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO hk_maintenance_reports (hotel_id, room_label, issue, severity, is_out_of_order, reported_by)
            VALUES (%s,%s,%s,%s,%s,%s) RETURNING *
        """, [d.get('hotel_id'), d.get('room_label'), d.get('issue'), d.get('severity','Medium Priority'),
              d.get('is_out_of_order', False), d.get('reported_by')])
        row = cur.fetchone()
        conn.commit()
        return jsonify({'report': dict(row)}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/maintenance/<int:report_id>/status', methods=['PATCH'])
def hk_update_maintenance_status(report_id):
    d = request.json
    status = d.get('status')
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if status == 'Resolved':
            cur.execute("UPDATE hk_maintenance_reports SET status=%s, resolved_at=NOW() WHERE id=%s", [status, report_id])
        else:
            cur.execute("UPDATE hk_maintenance_reports SET status=%s WHERE id=%s", [status, report_id])
        conn.commit()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/inventory', methods=['GET'])
def hk_get_inventory():
    hotel_id = request.args.get('hotel_id', type=int)
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if hotel_id:
            cur.execute("SELECT * FROM hk_inventory WHERE hotel_id=%s ORDER BY category, item_name", [hotel_id])
        else:
            cur.execute("SELECT * FROM hk_inventory ORDER BY category, item_name")
        rows = cur.fetchall()
        return jsonify({'inventory': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/inventory/<int:item_id>/restock', methods=['PATCH'])
def hk_restock_inventory(item_id):
    d = request.json
    qty = d.get('qty', 0)
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE hk_inventory SET current_qty = LEAST(current_qty + %s, max_qty) WHERE id=%s", [qty, item_id])
        conn.commit()
        return jsonify({'message': 'Restocked'}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/history', methods=['GET'])
def hk_get_history():
    hotel_id = request.args.get('hotel_id', type=int)
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if hotel_id:
            cur.execute("SELECT * FROM hk_history WHERE hotel_id=%s ORDER BY completed_at DESC LIMIT 50", [hotel_id])
        else:
            cur.execute("SELECT * FROM hk_history ORDER BY completed_at DESC LIMIT 50")
        rows = cur.fetchall()

        cur.execute("SELECT COUNT(*) AS c FROM hk_history WHERE hotel_id=%s AND completed_at >= NOW() - INTERVAL '7 days'" if hotel_id else "SELECT COUNT(*) AS c FROM hk_history WHERE completed_at >= NOW() - INTERVAL '7 days'", [hotel_id] if hotel_id else [])
        week_count = (cur.fetchone() or {}).get('c', 0)

        cur.execute("SELECT AVG(t.time_spent_mins) AS avg FROM hk_tasks t JOIN hk_history h ON h.task_id=t.id WHERE t.hotel_id=%s" if hotel_id else "SELECT AVG(t.time_spent_mins) AS avg FROM hk_tasks t JOIN hk_history h ON h.task_id=t.id", [hotel_id] if hotel_id else [])
        avg_time = round((cur.fetchone() or {}).get('avg') or 0)

        return jsonify({
            'history': [dict(r) for r in rows],
            'stats': {'completedThisWeek': week_count, 'avgTaskTime': f"{avg_time}min" if avg_time else 'N/A', 'performanceScore': '89%'}
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/schedule', methods=['GET'])
def hk_get_schedule():
    hotel_id = request.args.get('hotel_id', type=int)
    date = request.args.get('date')
    conn = None; cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        params = []
        where = []
        if hotel_id:
            where.append("hotel_id=%s"); params.append(hotel_id)
        if date:
            where.append("shift_date=%s"); params.append(date)
        w = "WHERE " + " AND ".join(where) if where else ""
        cur.execute(f"SELECT * FROM hk_schedules {w} ORDER BY shift_start", params)
        rows = cur.fetchall()
        return jsonify({'schedules': [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)
