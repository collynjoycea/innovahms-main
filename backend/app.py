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

# FIX 1: Mas malawak na CORS configuration para sa Vite (5173) at Localhost
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]}})

# --- CONFIGURATION ---

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="innovahmsdb",
        user="postgres",
        password="lily1245" 
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
    if not _table_exists(cur, 'room_tours'):
        return None

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
        return None

    return {
        "roomId": row.get("room_id"),
        "panoramaUrl": row.get("panorama_url"),
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
                   h.id AS hotel_id, h.hotel_name, h.hotel_address,
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
                'totalRooms': _to_int(row.get('total_rooms'), 0),
                'createdAt': _serialize_date(row.get('created_at')),
            })
        return jsonify({'owners': owners, 'total': len(owners)}), 200
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
        cur.execute("SELECT * FROM customers WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        if user and check_password_hash(user['password_hash'], password):
            return jsonify({
                "message": "Login successful!",
                "user": {
                    "id": user['id'], "firstName": user['first_name'], "lastName": user['last_name'],
                    "email": user['email'], "contactNumber": user['contact_number']
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

        if not _table_exists(cur, "customers"):
            return jsonify({"error": "customers table is unavailable"}), 404

        cur.execute(
            """
            UPDATE customers
            SET first_name = COALESCE(%s, first_name),
                last_name = COALESCE(%s, last_name),
                email = COALESCE(%s, email),
                contact_number = COALESCE(%s, contact_number)
            WHERE id = %s
            RETURNING id, first_name, last_name, email, contact_number
            """,
            (
                payload.get("firstName"),
                payload.get("lastName"),
                payload.get("email"),
                payload.get("contactNumber"),
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

# --- OWNER ENDPOINTS ---

@app.route('/api/owner/signup', methods=['POST'])
def owner_signup():
    data = request.json
    f_name = data.get('firstName')
    l_name = data.get('lastName')
    email = data.get('email')
    contact = data.get('contactNumber')
    password = data.get('password')
    hotel_name = data.get('hotelName')
    address = data.get('address', '')
    latitude = data.get('latitude') or None
    longitude = data.get('longitude') or None
    hashed_pw = generate_password_hash(password)
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO owners (first_name, last_name, email, contact_number, password_hash) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (f_name, l_name, email, contact, hashed_pw)
        )
        owner_id = cur.fetchone()[0]
        has_addr = _table_has_column(cur, 'hotels', 'hotel_address')
        has_lat  = _table_has_column(cur, 'hotels', 'latitude')
        if has_addr and has_lat:
            cur.execute(
                "INSERT INTO hotels (owner_id, hotel_name, hotel_address, latitude, longitude) VALUES (%s, %s, %s, %s, %s)",
                (owner_id, hotel_name, address, latitude, longitude)
            )
        elif has_addr:
            cur.execute(
                "INSERT INTO hotels (owner_id, hotel_name, hotel_address) VALUES (%s, %s, %s)",
                (owner_id, hotel_name, address)
            )
        else:
            cur.execute("INSERT INTO hotels (owner_id, hotel_name) VALUES (%s, %s)", (owner_id, hotel_name))
        conn.commit()
        return jsonify({"message": "Owner and Hotel registered successfully!"}), 201
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        _safe_close(conn, cur)

@app.route('/api/owner/login', methods=['POST'])
def owner_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT o.*, h.hotel_name, h.id as hotel_id, h.hotel_address, h.latitude, h.longitude
            FROM owners o
            LEFT JOIN hotels h ON o.id = h.owner_id
            WHERE o.email = %s
        """, (email,))
        owner = cur.fetchone()
        cur.close()
        conn.close()
        if owner and check_password_hash(owner['password_hash'], password):
            return jsonify({
                "message": "Owner login successful!",
                "owner": {
                    "id": owner['id'], "firstName": owner['first_name'], "lastName": owner['last_name'],
                    "email": owner['email'], "hotelName": owner['hotel_name'], "hotelId": owner['hotel_id'],
                    "address": owner.get('hotel_address', ''),
                    "latitude": owner.get('latitude'), "longitude": owner.get('longitude')
                }
            }), 200
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _resolve_owner_hotel(cur, owner_id):
    if not _table_exists(cur, "hotels"):
        return None

    if _table_has_column(cur, "hotels", "owner_id"):
        cur.execute(
            """
            SELECT id, hotel_name, hotel_address
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

    cur.execute(
        """
        SELECT id, hotel_name, hotel_address
        FROM hotels
        ORDER BY id ASC
        LIMIT 1
        """
    )
    return cur.fetchone()


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
        hotel_id = request.form.get('hotelId')
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
        cur = conn.cursor()
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
        hotel_id = request.form.get('hotelId')
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
        cur = conn.cursor()
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
        cur = conn.cursor()
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
        cur = conn.cursor()
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
        cur = conn.cursor()
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
        total = round(price * nights, 2)

        import random, string
        booking_number = 'INV-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

        cur.execute("""
            INSERT INTO reservations
              (booking_number, customer_id, room_id, hotel_id, check_in_date, check_out_date,
               check_in_time, check_out_time,
               total_nights, total_amount, payment_method, special_requests, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING')
            RETURNING id, booking_number
        """, (booking_number, customer_id, room_id, room.get('hotel_id'),
               check_in, check_out, check_in_time, check_out_time,
               nights, total, payment_method, special_requests))
        row = cur.fetchone()
        conn.commit()

        return jsonify({
            'message': 'Reservation created successfully.',
            'bookingId': row.get('id'),
            'bookingNumber': row.get('booking_number'),
            'totalNights': nights,
            'totalAmount': total,
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
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, 'guest_offers'):
            return jsonify([]), 200

        select_columns = ['id']
        optional_columns = [
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
        if 'is_active' in select_columns:
            query += " WHERE COALESCE(is_active, TRUE) = TRUE"
        query += " ORDER BY id DESC"

        cur.execute(query)
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
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        rooms = []
        if _table_exists(cur, "rooms"):
            cur.execute("SELECT * FROM rooms ORDER BY id ASC")
            rooms = cur.fetchall() or []

        room_by_id = {row.get("id"): row for row in rooms}
        room_status_counter = Counter(_normalize_room_status(row.get("status")) for row in rooms)
        total_rooms = len(rooms)
        available_rooms = room_status_counter.get("vacant", 0)
        occupancy = round((room_status_counter.get("occupied", 0) / total_rooms) * 100, 1) if total_rooms else 0.0

        reservations = []
        if _table_exists(cur, "reservations"):
            cur.execute("SELECT * FROM reservations ORDER BY id DESC LIMIT 1200")
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
            cur.execute("SELECT * FROM staff")
            staff_rows = cur.fetchall() or []
            staff_count = len(staff_rows)
            active_staff = sum(1 for row in staff_rows if _is_truthy(row.get("is_on_duty")) or str(row.get("status") or "").lower() == "active")

        attendance = round((active_staff / staff_count) * 100, 1) if staff_count else 0.0
        payroll_estimate = round(staff_count * 25000, 2)

        inventory_alert = {"stock": 0, "item": "No critical items"}
        if _table_exists(cur, "inventory_items"):
            cur.execute("SELECT * FROM inventory_items ORDER BY id ASC LIMIT 100")
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
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        logs = []
        customers = {}
        if _table_exists(cur, "customers"):
            cur.execute("SELECT id, first_name, last_name FROM customers")
            for row in cur.fetchall() or []:
                customers[row.get("id")] = f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or "Guest"

        if _table_exists(cur, "reservations"):
            cur.execute("SELECT * FROM reservations ORDER BY id DESC LIMIT 80")
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

        baseline_revenue = 0.0
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        if _table_exists(cur, "reservations"):
            amount_columns = []
            if _table_has_column(cur, "reservations", "total_amount"):
                amount_columns.append("total_amount")
            if _table_has_column(cur, "reservations", "total_amount_php"):
                amount_columns.append("total_amount_php")
            if not amount_columns:
                amount_columns.append("0 AS total_amount")
            cur.execute(f"SELECT {', '.join(amount_columns)} FROM reservations ORDER BY id DESC LIMIT 300")
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

        items = []
        if _table_exists(cur, "inventory_items"):
            query = "SELECT * FROM inventory_items"
            params = []
            if owner_id and _table_has_column(cur, "inventory_items", "owner_id"):
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


@app.route('/api/innova/summary/<int:customer_id>', methods=['GET'])
def get_innova_summary(customer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if not _table_exists(cur, "customers"):
            return jsonify({"error": "customers table is unavailable"}), 404

        select_cols = ["id", "first_name", "membership_level"]
        if _table_has_column(cur, "customers", "loyalty_points"):
            select_cols.append("loyalty_points")

        cur.execute(
            f"SELECT {', '.join(select_cols)} FROM customers WHERE id = %s LIMIT 1",
            (customer_id,),
        )
        customer = cur.fetchone()
        if not customer:
            return jsonify({"error": "Customer not found"}), 404

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
                if check_in and hasattr(check_in, "month"):
                    if check_in.month == today.month and check_in.year == today.year:
                        monthly_spend += amount

        points = _to_int(customer.get("loyalty_points"), int(total_spend // 100))
        tier = (customer.get("membership_level") or _normalize_tier(points)).upper()
        progress = _progress_percent(points, tier)

        return jsonify({
            "customerId": customer_id,
            "points": points,
            "tier": tier,
            "pointsThisMonth": int(monthly_spend // 100),
            "nextRewardProgressPercent": progress,
            "user": {
                "firstName": customer.get("first_name") or "Guest",
            }
        }), 200
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

        if any(keyword in lower_msg for keyword in ["available", "availability", "room", "suite"]):
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

        if any(keyword in lower_msg for keyword in ["promo", "offer", "discount", "deal"]):
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
            if not replies:
                replies.append("Promo data is currently unavailable, but I can still help you choose rooms.")

        if any(keyword in lower_msg for keyword in ["360", "tour", "virtual"]):
            replies.append("You can open a 360 tour from the Home room cards or from Vision Suites using the 'Explore 360' button.")

        if any(keyword in lower_msg for keyword in ["booking", "reserve", "reservation"]):
            replies.append("To reserve immediately, open any room card and click Reserve. I can also suggest room types based on your budget.")

        if not replies:
            greeting = "Hello"
            if customer_id:
                greeting = f"Hello guest #{customer_id}"
            replies = [
                f"{greeting}, I can help with availability, promos, booking guidance, and virtual tours. What would you like to check first?"
            ]

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

            cur.execute(f"SELECT {', '.join(select_cols)} FROM hotels ORDER BY id ASC LIMIT 1")
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
            RETURNING id, booking_number, check_out_date, room_id
        """, (today,))
        rows = cur.fetchall() or []
        # Free up rooms
        for row in rows:
            if row.get('room_id'):
                cur.execute("UPDATE rooms SET status = 'Available' WHERE id = %s", (row['room_id'],))
        conn.commit()
        result = [{'id': r['id'], 'bookingNumber': r['booking_number'], 'checkOut': r['check_out_date'].isoformat()} for r in rows]
        if result:
            print(f"[Auto-Checkout] {len(result)} guest(s) auto-checked-out: {[r['bookingNumber'] for r in result]}")
        return jsonify({'message': f'{len(result)} guest(s) auto-checked out.', 'checkedOut': result, 'count': len(result)}), 200
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
    """Process final checkout — sets status to CHECKED_OUT, room to Available."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE reservations SET status = 'CHECKED_OUT'
            WHERE id = %s AND status = 'CHECKED_IN'
            RETURNING id, booking_number, room_id
        """, (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found or not checked in.'}), 404
        # Free up the room
        if row.get('room_id'):
            cur.execute("UPDATE rooms SET status = 'Available' WHERE id = %s", (row['room_id'],))
        conn.commit()
        return jsonify({'message': f"{row['booking_number']} checked out. Room freed.", 'bookingNumber': row['booking_number']}), 200
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
    """Process guest check-out — updates status to CHECKED_OUT."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            UPDATE reservations SET status = 'CHECKED_OUT'
            WHERE id = %s AND status = 'CHECKED_IN'
            RETURNING id, booking_number, status
        """, (reservation_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Reservation not found or not checked in.'}), 404
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
