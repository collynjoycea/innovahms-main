from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
import psycopg2
import os
import uuid
import json
from datetime import datetime
import urllib.request
import urllib.error
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
except Exception:
    SendGridAPIClient = None
    Mail = None

app = Flask(__name__)
# Frontend runs on Vite (commonly :5173 / :5178). Keep it explicit to avoid flaky CORS in browsers.
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=False,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)


@app.before_request
def _handle_preflight():
    # Ensure CORS preflight always succeeds even when the underlying route errors or
    # when Flask's automatic OPTIONS handling is not triggered by the client.
    if request.method != "OPTIONS":
        return None
    return make_response(("", 204))


@app.errorhandler(HTTPException)
def _handle_http_exception(err):
    # Ensure API clients always receive JSON for HTTP errors (404/405/etc.)
    if request.path.startswith("/api/"):
        return jsonify({"error": err.description}), err.code
    return err


@app.errorhandler(Exception)
def _handle_unexpected_exception(err):
    # Avoid HTML error pages for API routes; surface message to the client.
    if request.path.startswith("/api/"):
        return jsonify({"error": str(err)}), 500
    raise err

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="innovahmsdb",
        user="postgres",
        password="admin123"
    )


def _fetchone_value(cur, query, params=()):
    cur.execute(query, params)
    row = cur.fetchone()
    return row[0] if row else None


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


def _safe_number(value, digits=2):
    try:
        return round(float(value or 0), digits)
    except (TypeError, ValueError):
        return 0 if digits == 0 else round(0, digits)


def _tuple_value(row, index, default=None):
    if row is None:
        return default
    try:
        return row[index]
    except (IndexError, KeyError, TypeError):
        return default


def _first_existing_column(cur, table_name, candidates, default=None):
    for column_name in candidates:
        if _table_has_column(cur, table_name, column_name):
            return column_name
    return default


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
ROOMS_UPLOAD_DIR = os.path.join(UPLOAD_DIR, "rooms")
os.makedirs(ROOMS_UPLOAD_DIR, exist_ok=True)


def _safe_close(conn, cur):
    try:
        if cur is not None:
            cur.close()
    finally:
        if conn is not None:
            conn.close()


def _resolve_hotel(cur, hotel_id=None):
    if hotel_id is not None:
        cur.execute("SELECT id, hotel_name FROM hotels WHERE id = %s", (hotel_id,))
        row = cur.fetchone()
        return row
    cur.execute("SELECT id, hotel_name FROM hotels ORDER BY id ASC LIMIT 1")
    return cur.fetchone()


def _resolve_hotel_for_owner(cur, owner_id):
    cur.execute("SELECT id, hotel_name FROM hotels WHERE owner_id = %s ORDER BY id ASC LIMIT 1", (owner_id,))
    return cur.fetchone()


COUNTRY_GEOPOINTS = {
    "philippines": {"lat": 12.8797, "lng": 121.7740},
    "japan": {"lat": 36.2048, "lng": 138.2529},
    "south korea": {"lat": 35.9078, "lng": 127.7669},
    "china": {"lat": 35.8617, "lng": 104.1954},
    "singapore": {"lat": 1.3521, "lng": 103.8198},
    "united states": {"lat": 37.0902, "lng": -95.7129},
    "usa": {"lat": 37.0902, "lng": -95.7129},
    "canada": {"lat": 56.1304, "lng": -106.3468},
    "australia": {"lat": -25.2744, "lng": 133.7751},
    "united kingdom": {"lat": 55.3781, "lng": -3.4360},
    "uk": {"lat": 55.3781, "lng": -3.4360},
    "france": {"lat": 46.2276, "lng": 2.2137},
    "germany": {"lat": 51.1657, "lng": 10.4515},
    "india": {"lat": 20.5937, "lng": 78.9629},
    "malaysia": {"lat": 4.2105, "lng": 101.9758},
    "indonesia": {"lat": -0.7893, "lng": 113.9213},
    "thailand": {"lat": 15.8700, "lng": 100.9925},
    "vietnam": {"lat": 14.0583, "lng": 108.2772},
    "unknown": {"lat": 14.5995, "lng": 120.9842},
}


def _normalize_room_status(status):
    value = str(status or "").strip().lower()
    if value in {"available", "vacant"}:
        return "vacant"
    if value in {"occupied", "checked-in", "checked_in"}:
        return "occupied"
    if value == "cleaning":
        return "dirty"
    if value in {"dirty", "maintenance"}:
        return value
    return "vacant"


def _country_to_point(label):
    return COUNTRY_GEOPOINTS.get(str(label or "unknown").strip().lower(), COUNTRY_GEOPOINTS["unknown"])


def _build_forecast_payload(cur, hotel_id, period):
    bookings_time_col = _first_existing_column(cur, "bookings", ["booking_date", "created_at", "check_in"], "check_in")
    bookings_time_expr = f"b.{bookings_time_col}"
    if period == "daily":
        cur.execute(
            f"""
            WITH dates AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day')::date AS bucket_date
            ),
            revenue AS (
                SELECT {bookings_time_expr}::date AS bucket_date, COALESCE(SUM(b.total_price), 0) AS revenue
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                WHERE r.hotel_id = %s
                  AND {bookings_time_expr} >= CURRENT_DATE - INTERVAL '13 days'
                GROUP BY {bookings_time_expr}::date
            ),
            occupancy AS (
                SELECT {bookings_time_expr}::date AS bucket_date, COUNT(*) AS occupied_count
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                WHERE r.hotel_id = %s
                  AND {bookings_time_expr} >= CURRENT_DATE - INTERVAL '13 days'
                  AND LOWER(COALESCE(b.status, '')) <> 'cancelled'
                GROUP BY {bookings_time_expr}::date
            )
            SELECT
                TO_CHAR(d.bucket_date, 'Mon DD') AS label,
                COALESCE(rv.revenue, 0) AS revenue,
                COALESCE(oc.occupied_count, 0) AS occupied_count
            FROM dates d
            LEFT JOIN revenue rv ON rv.bucket_date = d.bucket_date
            LEFT JOIN occupancy oc ON oc.bucket_date = d.bucket_date
            ORDER BY d.bucket_date ASC
            """,
            (hotel_id, hotel_id),
        )
    else:
        cur.execute(
            f"""
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                    date_trunc('month', CURRENT_DATE),
                    INTERVAL '1 month'
                )::date AS bucket_date
            ),
            revenue AS (
                SELECT date_trunc('month', {bookings_time_expr})::date AS bucket_date, COALESCE(SUM(b.total_price), 0) AS revenue
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                WHERE r.hotel_id = %s
                  AND {bookings_time_expr} >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
                GROUP BY date_trunc('month', {bookings_time_expr})::date
            ),
            occupancy AS (
                SELECT date_trunc('month', {bookings_time_expr})::date AS bucket_date, COUNT(*) AS occupied_count
                FROM bookings b
                JOIN rooms r ON r.id = b.room_id
                WHERE r.hotel_id = %s
                  AND {bookings_time_expr} >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
                  AND LOWER(COALESCE(b.status, '')) <> 'cancelled'
                GROUP BY date_trunc('month', {bookings_time_expr})::date
            )
            SELECT
                TO_CHAR(m.bucket_date, 'Mon YYYY') AS label,
                COALESCE(rv.revenue, 0) AS revenue,
                COALESCE(oc.occupied_count, 0) AS occupied_count
            FROM months m
            LEFT JOIN revenue rv ON rv.bucket_date = m.bucket_date
            LEFT JOIN occupancy oc ON oc.bucket_date = m.bucket_date
            ORDER BY m.bucket_date ASC
            """,
            (hotel_id, hotel_id),
        )

    forecast_rows = cur.fetchall() or []
    total_rooms = _fetchone_value(cur, "SELECT COUNT(*) FROM rooms WHERE hotel_id = %s", (hotel_id,)) or 0
    labels = [_tuple_value(row, 0, "--") for row in forecast_rows]
    revenue_series = [float(_tuple_value(row, 1, 0) or 0) for row in forecast_rows]
    occupancy_series = [
        round(((int(_tuple_value(row, 2, 0) or 0) / total_rooms) * 100), 2) if total_rooms else 0
        for row in forecast_rows
    ]

    return {
        "period": period,
        "labels": labels,
        "revenueSeries": revenue_series,
        "occupancySeries": occupancy_series,
    }


def _chatbot_fallback_reply(message, sender):
    text = (message or "").strip().lower()

    customer_id = None
    if sender:
      try:
          digits = ''.join(ch for ch in str(sender) if ch.isdigit())
          customer_id = int(digits) if digits else None
      except Exception:
          customer_id = None

    booking = None
    loyalty = {"points": 0, "tier": "STANDARD"}
    recommendations = []
    conn = None
    cur = None
    try:
        if customer_id:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                """
                SELECT b.id, b.check_in, b.check_out, b.status,
                       COALESCE(r.room_name, r.room_type, 'Suite') AS room_label
                FROM bookings b
                LEFT JOIN rooms r ON r.id = b.room_id
                WHERE b.customer_id = %s
                ORDER BY b.check_in ASC, b.id DESC
                LIMIT 1
                """,
                (customer_id,),
            )
            row = cur.fetchone()
            if row:
                booking = {
                    "bookingId": row[0],
                    "checkInDate": row[1].isoformat() if getattr(row[1], "isoformat", None) else row[1],
                    "checkOutDate": row[2].isoformat() if getattr(row[2], "isoformat", None) else row[2],
                    "status": row[3],
                    "roomLabel": row[4] or "Suite",
                }

            try:
                cur.execute("SELECT points, tier FROM customer_loyalty WHERE customer_id = %s", (customer_id,))
                loyalty_row = cur.fetchone()
                if loyalty_row:
                    loyalty = {
                        "points": int(loyalty_row[0] or 0),
                        "tier": (loyalty_row[1] or "STANDARD").upper(),
                    }
            except Exception:
                pass

            try:
                cur.execute(
                    """
                    SELECT COALESCE(vr.name, 'Suite') AS room_name,
                           COALESCE(vr.tagline, 'Recommended stay') AS tagline
                    FROM vision_rooms vr
                    ORDER BY vr.sort_order ASC, vr.id ASC
                    LIMIT 3
                    """
                )
                recommendations = cur.fetchall() or []
            except Exception:
                recommendations = []
    except Exception:
        pass
    finally:
        _safe_close(conn, cur)

    extracted_room_type = None
    for room_type in ['suite', 'single', 'double', 'deluxe', 'standard']:
        if room_type in text:
            extracted_room_type = room_type.title()
            break

    extracted_guests = None
    for token in text.replace('-', ' ').split():
        if token.isdigit():
            extracted_guests = int(token)
            break

    date_tokens = []
    for raw in message.replace(',', ' ').split():
        if len(raw) == 10 and raw[4:5] == '-' and raw[7:8] == '-':
            date_tokens.append(raw)

    entities_summary = []
    if extracted_room_type:
        entities_summary.append(f"room type: {extracted_room_type}")
    if extracted_guests:
        entities_summary.append(f"guests: {extracted_guests}")
    if date_tokens:
        entities_summary.append(f"dates: {', '.join(date_tokens[:2])}")

    entity_line = f" I also detected {', '.join(entities_summary)} from your message." if entities_summary else ""

    if any(keyword in text for keyword in ["digital key", "qr", "access my room", "room access"]):
        if booking:
            return [f"Your digital key is tied to booking #INV-{booking['bookingId']} for {booking['roomLabel']}. Open the Digital Key card on your dashboard and scan the QR code at your assigned room door."]
        return ["Your digital key will appear on the dashboard once you have an active confirmed booking."]

    if any(keyword in text for keyword in ["available", "availability", "vacant", "open room", "open rooms"]):
        if recommendations:
            names = ', '.join(r[0] for r in recommendations[:3] if r and r[0])
            return [f"I can help you check room availability and suggest available options such as {names}.{entity_line} Continue to the reservation form once you choose your preferred room."]
        return [f"I can help you check room availability and narrow down the best room type for your stay.{entity_line}"]

    if any(keyword in text for keyword in ["amenities", "pool", "breakfast", "wifi", "parking"]):
        return ["Our smart guest assistant can answer FAQ topics such as pool access, breakfast schedule, Wi-Fi, parking, and general hotel amenities. Breakfast starts at 6:00 AM and standard guest amenities include Wi-Fi and concierge support."]

    if any(keyword in text for keyword in ["check in", "check-in", "check out", "check-out"]):
        return ["Standard check-in starts at 2:00 PM and check-out is at 12:00 PM. Early check-in or late check-out depends on availability and confirmation from the hotel team."]

    if any(keyword in text for keyword in ["book", "booking", "reserve", "reservation"]):
        suggestion = f" Based on your message, I can guide you toward a {extracted_room_type} room." if extracted_room_type else ""
        guest_hint = f" I also detected {extracted_guests} guest(s)." if extracted_guests else ""
        return [f"I can guide you through the reservation process before you open the booking form.{suggestion}{guest_hint} Tell me your preferred room type, stay dates, or guest count and I will help narrow the best option."]

    if any(keyword in text for keyword in ["points", "loyalty", "reward", "rewards"]):
        return [f"You currently have {loyalty['points']} loyalty points and your membership tier is {loyalty['tier']}."]

    if any(keyword in text for keyword in ["modify", "change booking", "reschedule"]):
        return ["You can modify a booking up to 48 hours before check-in from the Modification / Cancellation section on your dashboard."]

    if any(keyword in text for keyword in ["cancel", "cancellation"]):
        return ["You can cancel a booking before the check-in date from the Modification / Cancellation section, subject to the hotel policy window."]

    if booking:
        return [f"I am your 24/7 Rasa-style virtual assistant for booking FAQs, reservation guidance, and guest experience support. I can help with booking #INV-{booking['bookingId']}, digital key access, room selection, check-in/check-out details, amenities, and loyalty insights.{entity_line}"]

    return [f"I am your 24/7 Rasa-style virtual assistant. I can answer hotel FAQs, guide reservation choices, understand natural language requests, and support personalized guest experience workflows.{entity_line}"]


def _get_hotel_location(cur, hotel_id):
    # Prefer vision_hotel_locations, otherwise return None.
    try:
        cur.execute(
            "SELECT label, lat, lng FROM vision_hotel_locations WHERE hotel_id = %s ORDER BY id ASC LIMIT 1",
            (hotel_id,),
        )
        row = cur.fetchone()
        if row:
            return {"locationLabel": row[0], "location": {"lat": float(row[1]), "lng": float(row[2])}}
    except Exception:
        return None

    return None


@app.route("/uploads/rooms/<path:filename>")
def serve_room_upload(filename):
    # Serve uploaded room images (uploaded via owner panel)
    return send_from_directory(ROOMS_UPLOAD_DIR, filename)


# --- CUSTOMER ENDPOINTS ---

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    email = data.get('email')
    contact = data.get('contactNumber')
    password = data.get('password')

    hashed_pw = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO customers (first_name, last_name, email, contact_number, password_hash) VALUES (%s, %s, %s, %s, %s)",
            (first_name, last_name, email, contact, hashed_pw)
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "User created successfully!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, first_name, last_name, email, contact_number, password_hash FROM customers WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            user_id, f_name, l_name, u_email, u_contact, hashed_pw = user
            if check_password_hash(hashed_pw, password):
                return jsonify({
                    "message": "Login successful!",
                    "user": {
                        "id": user_id,
                        "firstName": f_name,
                        "lastName": l_name,
                        "email": u_email,
                        "contactNumber": u_contact
                    }
                }), 200
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        if "conn" in locals():
            try:
                conn.close()
            except Exception:
                pass
        return jsonify({"error": str(e)}), 500


@app.route('/api/customers/resolve', methods=['GET'])
def resolve_customer():
    email = request.args.get('email', type=str)
    if not email:
        return jsonify({"error": "email is required"}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
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
                "id": row[0],
                "firstName": row[1],
                "lastName": row[2],
                "email": row[3],
                "contactNumber": row[4],
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

# --- OWNER ENDPOINTS ---

@app.route('/api/owner/login', methods=['POST'])
def owner_login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT o.id, o.first_name, o.last_name, o.email, o.password_hash, h.hotel_name 
            FROM owners o
            LEFT JOIN hotels h ON o.id = h.owner_id
            WHERE o.email = %s
        """, (email,))
        
        owner = cur.fetchone()
        cur.close()
        conn.close()

        if owner:
            owner_id, f_name, l_name, owner_email, hashed_pw, h_name = owner
            if check_password_hash(hashed_pw, password):
                return jsonify({
                    "message": "Owner login successful!",
                    "owner": {
                        "id": owner_id,
                        "firstName": f_name, 
                        "lastName": l_name,
                        "email": owner_email,
                        "hotelName": h_name 
                    }
                }), 200
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/owner/signup', methods=['POST'])
def owner_signup():
    try:
        data = request.get_json(silent=True) or {}
        f_name = data.get('firstName')
        l_name = data.get('lastName')
        email = data.get('email')
        contact = data.get('contactNumber')
        password = data.get('password')
        hotel_name = data.get('hotelName')

        missing = [k for k, v in {
            "firstName": f_name,
            "lastName": l_name,
            "email": email,
            "contactNumber": contact,
            "password": password,
            "hotelName": hotel_name,
        }.items() if not v]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        hashed_pw = generate_password_hash(password)

        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Insert Owner
        cur.execute(
            "INSERT INTO owners (first_name, last_name, email, contact_number, password_hash) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (f_name, l_name, email, contact, hashed_pw)
        )
        owner_id = cur.fetchone()[0]

        # 2. Insert Hotel
        cur.execute(
            "INSERT INTO hotels (owner_id, hotel_name) VALUES (%s, %s)",
            (owner_id, hotel_name)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Owner and Hotel registered successfully!"}), 201
    except Exception as e:
        if "conn" in locals():
            try:
                conn.rollback()
            except Exception:
                pass
            conn.close()
        return jsonify({"error": str(e)}), 400


@app.route("/api/owner/dashboard/<int:owner_id>", methods=["GET"])
def owner_dashboard(owner_id):
    period = (request.args.get("period") or "monthly").lower()
    if period not in ("daily", "monthly"):
        period = "monthly"

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        hotel_row = _resolve_hotel_for_owner(cur, owner_id)
        if not hotel_row:
            return jsonify({"error": "No hotel found for this owner. Please complete signup first."}), 404

        hotel_id = _tuple_value(hotel_row, 0)
        hotel_name = _tuple_value(hotel_row, 1, "Your Property")

        # --- KPIs ---
        cur.execute(
            """
            SELECT id, room_number, status
            FROM rooms
            WHERE hotel_id = %s
            ORDER BY room_number ASC, id ASC
            """,
            (hotel_id,),
        )
        room_rows = cur.fetchall() or []
        rooms = []
        counts = {"occupied": 0, "vacant": 0, "dirty": 0, "maintenance": 0}
        for row in room_rows:
            normalized_status = _normalize_room_status(_tuple_value(row, 2))
            counts[normalized_status] += 1
            rooms.append({
                "id": _tuple_value(row, 0),
                "roomNumber": _tuple_value(row, 1),
                "status": normalized_status,
            })

        total_rooms = len(rooms)
        available_rooms = counts["vacant"]
        occupied_rooms = counts["occupied"]
        occupancy_rate = round((occupied_rooms / total_rooms) * 100.0, 2) if total_rooms else 0.0

        cur.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE LOWER(COALESCE(b.status, '')) <> 'cancelled') AS total_reservations,
                COALESCE(SUM(CASE WHEN LOWER(COALESCE(b.status, '')) <> 'cancelled' THEN b.total_price ELSE 0 END), 0) AS total_revenue
            FROM bookings b
            JOIN rooms rm ON rm.id = b.room_id
            WHERE rm.hotel_id = %s
            """,
            (hotel_id,),
        )
        bookings_summary = cur.fetchone() or (0, 0)
        total_reservations = int(_tuple_value(bookings_summary, 0, 0) or 0)
        total_revenue = float(_tuple_value(bookings_summary, 1, 0) or 0)

        forecast_payload = _build_forecast_payload(cur, hotel_id, period)

        # --- Staff on duty ---
        cur.execute(
            """
            SELECT full_name, role
            FROM staff
            WHERE hotel_id = %s AND is_on_duty = TRUE
            ORDER BY full_name ASC
            LIMIT 10
            """,
            (hotel_id,),
        )
        staff_rows = cur.fetchall() or []
        staff_on_duty = [
            {"name": _tuple_value(r, 0, "Staff"), "role": _tuple_value(r, 1, "Team Member")}
            for r in staff_rows
        ]

        bookings_time_col = _first_existing_column(cur, "bookings", ["booking_date", "created_at", "check_in"], "check_in")
        bookings_time_expr = f"b.{bookings_time_col}"

        # --- Recent bookings ---
        cur.execute(
            f"""
            SELECT
                b.id,
                COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Customer') AS customer_name,
                rm.room_number,
                b.total_price,
                b.status,
                {bookings_time_expr}
            FROM bookings b
            JOIN rooms rm ON rm.id = b.room_id
            LEFT JOIN customers c ON c.id = b.customer_id
            WHERE rm.hotel_id = %s
            ORDER BY {bookings_time_expr} DESC, b.id DESC
            LIMIT 10
            """,
            (hotel_id,),
        )
        booking_rows = cur.fetchall() or []
        recent_bookings = [
            {
                "id": _tuple_value(r, 0),
                "customerName": _tuple_value(r, 1, "Customer"),
                "roomNumber": _tuple_value(r, 2),
                "totalAmountPhp": float(_tuple_value(r, 3, 0) or 0),
                "status": _tuple_value(r, 4),
                "createdAt": _tuple_value(r, 5).isoformat() if _tuple_value(r, 5) else None,
            }
            for r in booking_rows
        ]

        # --- Customer origins ---
        cur.execute(
            """
            SELECT COALESCE(res.origin_country, 'Unknown') AS label, COUNT(*) AS cnt
            FROM reservations res
            WHERE res.hotel_id = %s
            GROUP BY COALESCE(res.origin_country, 'Unknown')
            ORDER BY cnt DESC
            LIMIT 10
            """,
            (hotel_id,),
        )
        origin_rows = cur.fetchall() or []
        origins_top = [{"label": _tuple_value(r, 0, "Unknown"), "count": int(_tuple_value(r, 1, 0) or 0)} for r in origin_rows]
        origin_points = [
            {
                "label": _tuple_value(row, 0, "Unknown"),
                "count": int(_tuple_value(row, 1, 0) or 0),
                **_country_to_point(_tuple_value(row, 0, "Unknown")),
            }
            for row in origin_rows
        ]

        payload = {
            "hotelName": hotel_name,
            "kpis": {
                "totalReservations": int(total_reservations),
                "occupancyRate": float(occupancy_rate),
                "totalRevenuePhp": float(total_revenue),
                "availableRooms": int(available_rooms),
                "inventoryNote": "",
            },
            "forecast": forecast_payload,
            "staffOnDuty": staff_on_duty,
            "roomStatus": {
                "totalRooms": int(total_rooms),
                "counts": counts,
                "rooms": rooms,
            },
            "recentBookings": recent_bookings,
            "customerOrigins": {
                "top": origins_top,
                "points": origin_points,
            },
        }

        _safe_close(conn, cur)
        return jsonify(payload), 200

    except Exception as e:
        # If dashboard tables are not created yet, return a helpful message instead of a hard crash.
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": f"Dashboard data unavailable. Run the owner dashboard SQL first. ({str(e)})"}), 500


@app.route("/api/owner/forecast/<int:owner_id>", methods=["GET"])
def owner_forecast(owner_id):
    period = (request.args.get("period") or "monthly").lower()
    if period not in ("daily", "monthly"):
        period = "monthly"

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        hotel_row = _resolve_hotel_for_owner(cur, owner_id)
        if not hotel_row:
            return jsonify({"error": "No hotel found for this owner."}), 404

        hotel_id = hotel_row[0]
        return jsonify(_build_forecast_payload(cur, hotel_id, period)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


# --- VISION SUITES (GUEST-FACING) ---

@app.route("/api/vision/hotel", methods=["GET"])
def vision_hotel():
    hotel_id = request.args.get("hotel_id", type=int)
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        row = _resolve_hotel(cur, hotel_id)
        if not row:
            return jsonify({"error": "No hotel found."}), 404

        hid, name = row
        loc = _get_hotel_location(cur, hid) or {"locationLabel": "Hotel Location", "location": None}

        _safe_close(conn, cur)
        return jsonify(
            {
                "hotel": {
                    "id": hid,
                    "name": name,
                    "locationLabel": loc["locationLabel"],
                    "location": loc["location"],
                }
            }
        ), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/vision/rooms", methods=["GET"])
def vision_rooms():
    hotel_id = request.args.get("hotel_id", type=int)
    view = request.args.get("view")
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        row = _resolve_hotel(cur, hotel_id)
        if not row:
            return jsonify({"error": "No hotel found."}), 404
        hid, _ = row

        params = [hid]
        where = ["hotel_id = %s"]
        if view:
            # Treat `view` as room_type for the owner-driven rooms schema
            where.append("room_type = %s")
            params.append(view)

        # If date range is provided, only return rooms that are not overlapping a reservation.
        availability_sql = ""
        if from_date and to_date:
            availability_sql = """
              AND id NOT IN (
                SELECT room_id
                FROM reservations
                WHERE room_id IS NOT NULL
                  AND status NOT IN ('cancelled')
                  AND (
                    (check_in IS NOT NULL AND check_out IS NOT NULL AND NOT (check_out <= %s OR check_in >= %s))
                  )
              )
            """
            params.extend([from_date, to_date])

        cur.execute(
            f"""
            SELECT id, room_name, description, max_adults, price_per_night, images, room_type
            FROM rooms
            WHERE {' AND '.join(where)}
            {availability_sql}
            ORDER BY id ASC
            """,
            tuple(params),
        )
        rows = cur.fetchall() or []

        rooms = []
        for r in rows:
            images = r[5] or []
            image_url = None
            if images:
                image_url = images[0]
                if image_url and image_url.startswith("/"):
                    image_url = request.host_url.rstrip("/") + image_url

            rooms.append(
                {
                    "id": r[0],
                    "name": r[1] or "Suite",
                    "tagline": (r[2] or "")[:85],
                    "capacity": int(r[3] or 0),
                    "basePricePhp": float(r[4] or 0),
                    "imageUrl": image_url,
                    "viewPreference": r[6] or "",
                }
            )

        _safe_close(conn, cur)
        return jsonify({"rooms": rooms}), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": f"Vision rooms unavailable. ({str(e)})"}), 500


@app.route("/api/vision/rooms/<int:room_id>", methods=["GET"])
def vision_room_details(room_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT r.id, r.room_name, r.room_type, r.max_adults, h.hotel_name
            FROM rooms r
            LEFT JOIN hotels h ON h.id = r.hotel_id
            WHERE r.id = %s
            LIMIT 1
            """,
            (room_id,),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "Room not found."}), 404

        _safe_close(conn, cur)
        return jsonify(
            {
                "room": {
                    "id": row[0],
                    "name": row[1] or row[2] or "Suite",
                    "type": row[2] or "Suite",
                    "capacity": int(row[3] or 2),
                    "hotelName": row[4] or "Innova HMS",
                }
            }
        ), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/vision/rooms/<int:room_id>/tour", methods=["GET"])
def vision_room_tour(room_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT panorama_url, initial_yaw, initial_pitch, initial_fov
            FROM room_tours
            WHERE room_id = %s
            ORDER BY id ASC
            LIMIT 1
            """,
            (room_id,),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                """
                SELECT panorama_url, initial_yaw, initial_pitch, initial_fov
                FROM vision_room_tours
                WHERE room_id = %s
                ORDER BY id ASC
                LIMIT 1
                """,
                (room_id,),
            )
            row = cur.fetchone()
        if not row:
            _safe_close(conn, cur)
            return jsonify({"tour": None}), 200

        _safe_close(conn, cur)

        return jsonify(
            {
                "tour": {
                    "panoramaUrl": row[0],
                    "initialYaw": float(row[1] or 0),
                    "initialPitch": float(row[2] or 0),
                    "initialFov": float(row[3] or 0),
                }
            }
        ), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/rooms/<int:room_id>/tour", methods=["GET"])
def room_tour(room_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT panorama_url, initial_yaw, initial_pitch, initial_fov
            FROM room_tours
            WHERE room_id = %s
            ORDER BY id ASC
            LIMIT 1
            """,
            (room_id,),
        )
        row = cur.fetchone()

        if not row:
            cur.execute(
                """
                SELECT panorama_url, initial_yaw, initial_pitch, initial_fov
                FROM vision_room_tours
                WHERE room_id = %s
                ORDER BY id ASC
                LIMIT 1
                """,
                (room_id,),
            )
            row = cur.fetchone()

        if not row:
            _safe_close(conn, cur)
            return jsonify({"tour": None}), 200

        _safe_close(conn, cur)

        return jsonify(
            {
                "tour": {
                    "panoramaUrl": row[0],
                    "initialYaw": float(row[1] or 0),
                    "initialPitch": float(row[2] or 0),
                    "initialFov": float(row[3] or 0),
                }
            }
        ), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/vision/landmarks", methods=["GET"])
def vision_landmarks():
    hotel_id = request.args.get("hotel_id", type=int)
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        row = _resolve_hotel(cur, hotel_id)
        if not row:
            return jsonify({"error": "No hotel found."}), 404
        hid, _ = row

        cur.execute(
            """
            SELECT id, name, category, lat, lng
            FROM vision_landmarks
            WHERE hotel_id = %s
            ORDER BY sort_order ASC, id ASC
            """,
            (hid,),
        )
        rows = cur.fetchall() or []
        landmarks = [{"id": r[0], "name": r[1], "category": r[2], "lat": float(r[3]), "lng": float(r[4])} for r in rows]

        _safe_close(conn, cur)
        return jsonify({"landmarks": landmarks}), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": f"Vision landmarks unavailable. Run vision_suites.sql first. ({str(e)})"}), 500


# --- INNOVA SUITES (CUSTOMER-FACING) ---

@app.route("/api/innova/summary/<int:customer_id>", methods=["GET"])
def innova_summary(customer_id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, first_name, last_name, email FROM customers WHERE id = %s", (customer_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "Customer not found."}), 404

        _, first_name, last_name, email = user

        points = 0
        tier = "STANDARD"
        points_this_month = 0

        # Loyalty (optional table)
        try:
            cur.execute("SELECT points, tier, points_this_month FROM customer_loyalty WHERE customer_id = %s", (customer_id,))
            row = cur.fetchone()
            if row:
                points = int(row[0] or 0)
                tier = (row[1] or "STANDARD").upper()
                points_this_month = int(row[2] or 0)
        except Exception:
            pass

        next_reward_name = "Free Spa Treatment"
        next_reward_target = 129000
        points_to_next = max(0, next_reward_target - points)
        progress = 0.0
        if next_reward_target > 0:
            progress = (min(points, next_reward_target) / next_reward_target) * 100.0

        payload = {
            "user": {
                "id": customer_id,
                "firstName": first_name,
                "lastName": last_name,
                "email": email,
            },
            "points": points,
            "tier": tier,
            "pointsThisMonth": points_this_month,
            "nextRewardName": next_reward_name,
            "pointsToNextReward": points_to_next,
            "nextRewardProgressPercent": progress,
            "recentActivity": [],
        }

        _safe_close(conn, cur)
        return jsonify(payload), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/innova/recommended/<int:customer_id>", methods=["GET"])
def innova_recommended(customer_id):
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        row = _resolve_hotel(cur, None)
        if not row:
            return jsonify({"error": "No hotel found."}), 404
        hid, _ = row

        preferred_view = None
        try:
            cur.execute("SELECT preferred_view FROM customer_preferences WHERE customer_id = %s", (customer_id,))
            pv = cur.fetchone()
            preferred_view = pv[0] if pv else None
        except Exception:
            preferred_view = None

        tier = "STANDARD"
        points = 0
        try:
            cur.execute("SELECT points, tier FROM customer_loyalty WHERE customer_id = %s", (customer_id,))
            loyalty = cur.fetchone()
            if loyalty:
                points = int(loyalty[0] or 0)
                tier = (loyalty[1] or "STANDARD").upper()
        except Exception:
            pass

        availability_sql = ""
        params = [hid]
        if from_date and to_date:
            availability_sql = """
              AND vr.id NOT IN (
                SELECT room_id
                FROM reservations
                WHERE room_id IS NOT NULL
                  AND status NOT IN ('cancelled')
                  AND (check_in IS NOT NULL AND check_out IS NOT NULL AND NOT (check_out <= %s OR check_in >= %s))
              )
            """
            params.extend([from_date, to_date])

        # Offer / member price (optional table)
        cur.execute(
            f"""
            SELECT vr.id,
                   vr.name,
                   vr.tagline,
                   vr.capacity,
                   vr.base_price_php,
                   vr.image_url,
                   vr.view_preference,
                   COALESCE(o.discount_percent, 0) AS discount_percent,
                   COALESCE(o.points_cost, 0) AS points_cost
            FROM vision_rooms vr
            LEFT JOIN room_member_offers o
              ON o.room_id = vr.id AND UPPER(o.tier) = %s
            WHERE vr.hotel_id = %s
            {availability_sql}
            ORDER BY
              CASE WHEN %s IS NOT NULL AND vr.view_preference = %s THEN 0 ELSE 1 END,
              vr.sort_order ASC,
              vr.id ASC
            """,
            (tier, *params, preferred_view, preferred_view),
        )
        rows = cur.fetchall() or []

        rooms = []
        for r in rows:
            base = float(r[4] or 0)
            discount = float(r[7] or 0)
            member_price = max(0, base * (1 - (discount / 100.0)))
            badge = "Recommended"
            if discount > 0:
                badge = "Member Deal"
            elif r[6] and preferred_view and r[6] == preferred_view:
                badge = "98% Match"

            rooms.append(
                {
                    "id": r[0],
                    "name": r[1],
                    "tagline": r[2],
                    "capacity": int(r[3] or 0),
                    "basePricePhp": base,
                    "memberPricePhp": member_price,
                    "discountPercent": discount,
                    "pointsCost": int(r[8] or 0),
                    "imageUrl": r[5],
                    "viewPreference": r[6],
                    "badge": badge,
                    "description": "High-floor view, premium sound system, and smart climate control.",
                }
            )

        _safe_close(conn, cur)
        return jsonify({"rooms": rooms, "points": points, "tier": tier}), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": f"Innova Suites unavailable. Run innova_suites.sql + vision_suites.sql. ({str(e)})"}), 500


# --- ROOM MANAGEMENT (OWNER + PUBLIC) ---

@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    """Public room listing used by guest/customer pages."""
    hotel_id = request.args.get("hotel_id", type=int)
    room_type = request.args.get("room_type")

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if hotel_id is None:
            row = _resolve_hotel(cur, None)
            if not row:
                return jsonify({"error": "No hotel found."}), 404
            hotel_id = row[0]

        params = [hotel_id]
        where = ["hotel_id = %s"]
        if room_type:
            where.append("room_type = %s")
            params.append(room_type)

        cur.execute(
            f"""
            SELECT id, room_number, room_name, room_type, description, amenities, images, max_adults, max_children, price_per_night, status
            FROM rooms
            WHERE {' AND '.join(where)}
            ORDER BY id ASC
            """,
            tuple(params),
        )

        rows = cur.fetchall() or []
        rooms = []
        for r in rows:
            images = r[6] or []
            image_url = None
            if images:
                image_url = images[0]
                if image_url and image_url.startswith("/"):
                    image_url = request.host_url.rstrip("/") + image_url

            rooms.append(
                {
                    "id": r[0],
                    "roomNumber": r[1],
                    "name": r[2] or r[1],
                    "type": r[3],
                    "description": r[4],
                    "amenities": r[5] or [],
                    "images": images,
                    "imageUrl": image_url,
                    "capacity": {"adults": int(r[7] or 0), "children": int(r[8] or 0)},
                    "price": float(r[9] or 0),
                    "status": r[10] or "Available",
                }
            )

        _safe_close(conn, cur)
        return jsonify({"rooms": rooms}), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/owner/rooms/<int:owner_id>", methods=["GET"])
def owner_rooms(owner_id):
    """Rooms list for owner dashboard."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        row = _resolve_hotel_for_owner(cur, owner_id)
        if not row:
            return jsonify({"error": "No hotel found for owner."}), 404
        hotel_id = row[0]

        cur.execute(
            "SELECT id, room_number, room_name, room_type, description, amenities, images, max_adults, max_children, price_per_night, status FROM rooms WHERE hotel_id = %s ORDER BY id ASC",
            (hotel_id,),
        )
        rows = cur.fetchall() or []
        rooms = []
        for r in rows:
            rooms.append(
                {
                    "id": r[0],
                    "roomNumber": r[1],
                    "roomName": r[2],
                    "roomType": r[3],
                    "description": r[4],
                    "amenities": r[5] or [],
                    "images": r[6] or [],
                    "maxAdults": int(r[7] or 0),
                    "maxChildren": int(r[8] or 0),
                    "price": float(r[9] or 0),
                    "status": r[10] or "Available",
                }
            )

        _safe_close(conn, cur)
        return jsonify(rooms), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


def _save_room_images(files):
    stored_urls = []
    for file in files:
        if not file:
            continue
        filename = secure_filename(file.filename)
        if not filename:
            continue
        ext = os.path.splitext(filename)[1]
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(ROOMS_UPLOAD_DIR, safe_name)
        file.save(dest_path)
        stored_urls.append(f"/uploads/rooms/{safe_name}")
    return stored_urls


def _get_default_panorama_url(room_name="", room_type=""):
    room_hint = f"{room_name or ''} {room_type or ''}".lower()

    if "single" in room_hint or "standard" in room_hint:
        return "/images/standard-room.jpg"
    if "double" in room_hint:
        return "/images/my-room-360.jpg"
    if "deluxe" in room_hint:
        return "/images/deluxe-room.jpg"
    if "executive" in room_hint or "penthouse" in room_hint:
        return "/images/executive-penthouse.jpg"
    if "ocean" in room_hint or "suite" in room_hint:
        return "/images/ocean-suite.jpg"
    return "/images/my-room-360.jpg"


@app.route("/api/owner/rooms/add", methods=["POST"])
def add_room():
    try:
        hotel_id = request.form.get("hotelId")
        if hotel_id is None:
            return jsonify({"error": "Missing hotelId"}), 400

        # allow passing in ownerId as hotelId for compatibility
        try:
            hotel_id_int = int(hotel_id)
        except ValueError:
            return jsonify({"error": "Invalid hotelId"}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        # if the provided hotel_id maps to an owner, resolve their hotel
        hotel_row = _resolve_hotel_for_owner(cur, hotel_id_int)
        if hotel_row:
            hotel_id_int = hotel_row[0]

        room_number = request.form.get("roomNumber")
        room_name = request.form.get("roomName")
        room_type = request.form.get("roomType")
        description = request.form.get("description")
        max_adults = int(request.form.get("maxAdults") or 0)
        max_children = int(request.form.get("maxChildren") or 0)
        price = float(request.form.get("price") or 0)

        amenities = []
        try:
            amenities = request.form.get("amenities")
            if amenities:
                amenities = json.loads(amenities)
        except Exception:
            amenities = []

        existing_images = request.form.getlist("existing_images") or []

        uploaded_images = _save_room_images(request.files.getlist("images"))
        images = [*existing_images, *uploaded_images]

        cur.execute(
            "INSERT INTO rooms (hotel_id, room_number, room_name, room_type, description, amenities, images, max_adults, max_children, price_per_night) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
            (hotel_id_int, room_number, room_name, room_type, description, amenities, images, max_adults, max_children, price),
        )
        room_id = cur.fetchone()[0]

        panorama_url = _get_default_panorama_url(room_name, room_type)
        cur.execute(
            """
            INSERT INTO room_tours (room_id, panorama_url, initial_yaw, initial_pitch, initial_fov)
            SELECT %s, %s, %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM room_tours WHERE room_id = %s
            )
            """,
            (room_id, panorama_url, 0, 0, 1.57079632679, room_id),
        )

        conn.commit()
        _safe_close(conn, cur)
        return jsonify({"id": room_id}), 201
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/owner/rooms/update/<int:room_id>", methods=["PUT"])
def update_room(room_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Fetch existing
        cur.execute("SELECT images FROM rooms WHERE id = %s", (room_id,))
        existing = cur.fetchone()
        if not existing:
            _safe_close(conn, cur)
            return jsonify({"error": "Room not found"}), 404

        existing_images = existing[0] or []
        incoming_existing = request.form.getlist("existing_images") or []
        uploaded_images = _save_room_images(request.files.getlist("images"))
        images = [*incoming_existing, *uploaded_images] if incoming_existing else [*existing_images, *uploaded_images]

        room_number = request.form.get("roomNumber")
        room_name = request.form.get("roomName")
        room_type = request.form.get("roomType")
        description = request.form.get("description")
        max_adults = int(request.form.get("maxAdults") or 0)
        max_children = int(request.form.get("maxChildren") or 0)
        price = float(request.form.get("price") or 0)

        amenities = []
        try:
            amenities = request.form.get("amenities")
            if amenities:
                amenities = json.loads(amenities)
        except Exception:
            amenities = []

        cur.execute(
            "UPDATE rooms SET room_number=%s, room_name=%s, room_type=%s, description=%s, amenities=%s, images=%s, max_adults=%s, max_children=%s, price_per_night=%s WHERE id=%s",
            (room_number, room_name, room_type, description, amenities, images, max_adults, max_children, price, room_id),
        )
        conn.commit()
        _safe_close(conn, cur)
        return jsonify({"message": "Updated"}), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/owner/rooms/delete/<int:room_id>", methods=["DELETE"])
def delete_room(room_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM rooms WHERE id = %s", (room_id,))
        conn.commit()
        _safe_close(conn, cur)
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        try:
            _safe_close(conn, cur)
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500

# --- PROFILE UPDATES ---

@app.route('/api/user/update', methods=['PUT'])
def update_user():
    data = request.json
    user_id = data.get('id')
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    contact = data.get('contactNumber')

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE customers SET first_name = %s, last_name = %s, contact_number = %s WHERE id = %s",
            (first_name, last_name, contact, user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Profile updated successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/user/change-password', methods=['PUT'])
def change_password():
    data = request.json
    user_id = data.get('id')
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM customers WHERE id = %s", (user_id,))
        result = cur.fetchone()
        
        if result and check_password_hash(result[0], current_password):
            new_hashed_pw = generate_password_hash(new_password)
            cur.execute("UPDATE customers SET password_hash = %s WHERE id = %s", (new_hashed_pw, user_id))
            conn.commit()
            status, msg = 200, "Password updated!"
        else:
            status, msg = 401, "Current password incorrect"

        cur.close()
        conn.close()
        return jsonify({"message": msg}), status
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/customer/dashboard/<int:user_id>', methods=['GET'])
def get_customer_dashboard(user_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Kunin ang Customer Info kasama ang loyalty columns mula sa SQL schema mo
        cur.execute("""
            SELECT id, first_name, email, loyalty_points, membership_level, tier_progress 
            FROM customers 
            WHERE id = %s
        """, (user_id,))
        user_row = cur.fetchone()
        
        if not user_row:
            cur.close()
            conn.close()
            return jsonify({"error": "User not found"}), 404

        # I-map ang database columns sa variables
        u_id, f_name, u_email, l_points, m_level, t_progress = user_row

        # 2. Kunin ang Rewards mula sa 'rewards' table
        cur.execute("SELECT title, quantity FROM rewards WHERE customer_id = %s", (user_id,))
        rewards_rows = cur.fetchall()
        rewards_list = [{"title": r[0], "quantity": r[1]} for r in rewards_rows]

        # 3. Kunin ang Bookings gamit ang actual live schema ng bookings table
        booking_list = []
        try:
            cur.execute(
                """
                SELECT
                    b.id,
                    b.room_id,
                    h.hotel_name,
                    COALESCE(r.room_name, r.room_type, 'Suite') AS room_label,
                    b.check_in,
                    b.check_out,
                    b.status,
                    b.total_price
                FROM bookings b
                LEFT JOIN rooms r ON r.id = b.room_id
                LEFT JOIN hotels h ON h.id = r.hotel_id
                WHERE b.customer_id = %s
                ORDER BY b.created_at DESC, b.check_in DESC
                """,
                (user_id,),
            )
            booking_rows = cur.fetchall()
            booking_list = [
                {
                    "bookingId": r[0],
                    "roomId": r[1],
                    "hotelName": r[2] or "Innova HMS",
                    "roomType": r[3] or "Suite",
                    "checkInDate": r[4].isoformat() if getattr(r[4], "isoformat", None) else r[4],
                    "checkOutDate": r[5].isoformat() if getattr(r[5], "isoformat", None) else r[5],
                    "status": r[6] or "Confirmed",
                    "totalPrice": float(r[7] or 0),
                }
                for r in booking_rows
            ]
        except Exception:
            conn.rollback()

        dashboard_data = {
            "id": u_id,
            "firstName": f_name,
            "email": u_email,
            "loyaltyPoints": l_points or 0,
            "membershipLevel": m_level or "Gold",
            "tierProgress": t_progress or 0,
            "bookings": booking_list,
            "rewards": rewards_list
        }

        cur.close()
        conn.close()
        return jsonify({"user": dashboard_data}), 200

    except Exception as e:
        if 'conn' in locals():
            conn.close()
        return jsonify({"error": str(e)}), 500


@app.route('/api/bookings/<int:booking_id>/modify', methods=['PATCH'])
def modify_booking(booking_id):
    data = request.get_json(silent=True) or {}
    customer_id = data.get('customerId')
    check_in_raw = data.get('checkInDate')
    check_out_raw = data.get('checkOutDate')

    if not customer_id or not check_in_raw or not check_out_raw:
        return jsonify({"error": "customerId, checkInDate, and checkOutDate are required."}), 400

    try:
        new_check_in = datetime.strptime(check_in_raw, "%Y-%m-%d").date()
        new_check_out = datetime.strptime(check_out_raw, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Dates must use YYYY-MM-DD format."}), 400

    if new_check_out <= new_check_in:
        return jsonify({"error": "Check-out must be after check-in."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, customer_id, check_in, status
            FROM bookings
            WHERE id = %s
            """,
            (booking_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Booking not found."}), 404

        _, booking_customer_id, current_check_in, status = row
        if int(booking_customer_id) != int(customer_id):
            return jsonify({"error": "This booking does not belong to the current customer."}), 403

        normalized_status = str(status or '').lower()
        if normalized_status in ('cancelled', 'completed', 'checked_out'):
            return jsonify({"error": "This booking can no longer be modified."}), 400

        days_until = (current_check_in - datetime.utcnow().date()).days if current_check_in else -1
        if days_until < 2:
            return jsonify({"error": "Modification is only allowed at least 48 hours before check-in."}), 400

        cur.execute(
            """
            UPDATE bookings
            SET check_in = %s, check_out = %s
            WHERE id = %s AND customer_id = %s
            """,
            (new_check_in, new_check_out, booking_id, customer_id),
        )
        conn.commit()
        return jsonify({"message": "Booking updated successfully."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/bookings/<int:booking_id>/cancel', methods=['PATCH'])
def cancel_booking(booking_id):
    data = request.get_json(silent=True) or {}
    customer_id = data.get('customerId')

    if not customer_id:
        return jsonify({"error": "customerId is required."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT customer_id, check_in, status
            FROM bookings
            WHERE id = %s
            """,
            (booking_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Booking not found."}), 404

        booking_customer_id, check_in, status = row
        if int(booking_customer_id) != int(customer_id):
            return jsonify({"error": "This booking does not belong to the current customer."}), 403

        normalized_status = str(status or '').lower()
        if normalized_status in ('cancelled', 'completed', 'checked_out'):
            return jsonify({"error": "This booking can no longer be cancelled."}), 400

        days_until = (check_in - datetime.utcnow().date()).days if check_in else -1
        if days_until < 1:
            return jsonify({"error": "Cancellation is only allowed before the check-in date."}), 400

        cur.execute(
            "UPDATE bookings SET status = %s WHERE id = %s AND customer_id = %s",
            ('cancelled', booking_id, customer_id),
        )
        conn.commit()
        return jsonify({"message": "Booking cancelled successfully."}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/bookings/<int:booking_id>/digital-key', methods=['GET'])
def get_booking_digital_key(booking_id):
    customer_id = request.args.get('customer_id', type=int)
    if not customer_id:
        return jsonify({"error": "customer_id is required."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT b.id, b.customer_id, b.room_id, b.check_in, b.check_out, b.status,
                   COALESCE(r.room_name, r.room_type, 'Room') AS room_label
            FROM bookings b
            LEFT JOIN rooms r ON r.id = b.room_id
            WHERE b.id = %s
            """,
            (booking_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Booking not found."}), 404

        _, booking_customer_id, room_id, check_in, check_out, status, room_label = row
        if int(booking_customer_id) != int(customer_id):
            return jsonify({"error": "This booking does not belong to the current customer."}), 403

        access_payload = {
            "bookingId": booking_id,
            "customerId": customer_id,
            "roomId": room_id,
            "roomLabel": room_label,
            "status": status,
            "checkInDate": check_in.isoformat() if check_in else None,
            "checkOutDate": check_out.isoformat() if check_out else None,
        }

        return jsonify({
            "bookingId": booking_id,
            "roomLabel": room_label,
            "status": status,
            "accessPayload": json.dumps(access_payload, separators=(',', ':')),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/chatbot/rasa', methods=['POST'])
def customer_rasa_chatbot():
    data = request.get_json(silent=True) or {}
    sender = str(data.get('sender') or 'guest')
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({"error": "message is required."}), 400

    rasa_url = os.getenv('RASA_WEBHOOK_URL', 'http://localhost:5005/webhooks/rest/webhook')
    payload = json.dumps({"sender": sender, "message": message}).encode('utf-8')
    req = urllib.request.Request(
        rasa_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode('utf-8')
            parsed = json.loads(body or '[]')
            messages = [item.get('text') for item in parsed if isinstance(item, dict) and item.get('text')]
            if messages:
                return jsonify({"messages": messages, "source": "rasa"}), 200
            return jsonify({"messages": _chatbot_fallback_reply(message, sender), "source": "fallback"}), 200
    except urllib.error.URLError as e:
        return jsonify({
            "messages": _chatbot_fallback_reply(message, sender),
            "source": "fallback",
            "notice": f"Rasa API unavailable: {e.reason}",
        }), 200
    except Exception as e:
        return jsonify({
            "messages": _chatbot_fallback_reply(message, sender),
            "source": "fallback",
            "notice": str(e),
        }), 200

# --- HELPERS ---
def _resolve_hotel_for_owner(cur, owner_id):
    cur.execute("SELECT id FROM hotels WHERE owner_id = %s LIMIT 1", (owner_id,))
    return cur.fetchone()

def _safe_close(conn, cur):
    if cur: cur.close()
    if conn: conn.close()

# --- HOUSEKEEPING ENDPOINTS ---

@app.route('/api/housekeeping', methods=['GET'])
def get_housekeeping_data():
    owner_id = request.args.get("owner_id", type=int) # Kunin natin base sa owner
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Resolve hotel_id gamit ang helper mo
        hotel_row = _resolve_hotel_for_owner(cur, owner_id)
        if not hotel_row:
            return jsonify({"error": "No hotel found for this owner."}), 404
        hotel_id = hotel_row[0]

        # 1. Kunin ang status ng lahat ng rooms sa hotel na ito
        cur.execute("""
            SELECT id, room_number, status 
            FROM rooms 
            WHERE hotel_id = %s 
            ORDER BY room_number ASC
        """, (hotel_id,))
        rooms = cur.fetchall()
        
        # 2. Kunin ang pending tasks at i-join sa rooms
        # Note: Siguraduhin na na-run mo na yung CREATE TABLE para sa housekeeping_tasks
        cur.execute("""
            SELECT t.id, t.room_id, t.priority, t.staff_name, t.guest_arrival, 
                   t.task_status, r.room_number, r.room_type 
            FROM housekeeping_tasks t 
            JOIN rooms r ON t.room_id = r.id 
            WHERE r.hotel_id = %s AND t.task_status != 'Validated'
            ORDER BY CASE t.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 ELSE 3 END
        """, (hotel_id,))
        tasks = cur.fetchall()
        
        # Mapping para sa JSON
        room_list = [{"id": r[0], "room_number": r[1], "status": r[2]} for r in rooms]
        task_list = [
            {
                "id": t[0], "room_id": t[1], "priority": t[2], 
                "staff_name": t[3], "guest_arrival": t[4].isoformat() if t[4] else None, 
                "task_status": t[5], "room_number": t[6], "room_type": t[7]
            } for t in tasks
        ]

        return jsonify({"rooms": room_list, "tasks": task_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

@app.route('/api/housekeeping/complete', methods=['POST'])
def complete_housekeeping():
    data = request.json
    room_id = data.get('room_id')
    task_id = data.get('task_id')
    
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # I-update ang room status pabalik sa 'Available' (o 'vacant' base sa dashboard logic mo)
        cur.execute("UPDATE rooms SET status = 'Available' WHERE id = %s", (room_id,))
        # I-mark ang task bilang 'Validated'
        cur.execute("UPDATE housekeeping_tasks SET task_status = 'Validated' WHERE id = %s", (task_id,))
        
        conn.commit()
        return jsonify({"message": "Room is now Available"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/housekeeping/tasks', methods=['POST'])
def assign_housekeeping_task():
    data = request.get_json() or {}
    room_id = data.get('room_id')
    priority = data.get('priority', 'Routine')
    staff_name = data.get('staff_name')
    special_instructions = data.get('special_instructions')

    conn = None
    cur = None
    try:
        if not room_id:
            return jsonify({"error": "room_id is required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO housekeeping_tasks (room_id, priority, staff_name, special_instructions, task_status)
            VALUES (%s, %s, %s, %s, 'Queued')
            RETURNING id
            """,
            (room_id, priority, staff_name, special_instructions),
        )
        task_id = cur.fetchone()[0]
        cur.execute("UPDATE rooms SET status = 'Cleaning' WHERE id = %s", (room_id,))
        conn.commit()
        return jsonify({"message": "Housekeeping task assigned.", "taskId": task_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


import random # Siguraduhin na nasa taas ito kasama ng ibang imports

# --- INVENTORY ENDPOINTS ---

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        category_filter = request.args.get('category', 'All Items')

        query = "SELECT id, item_name, category, stock_level, max_stock, unit_price, last_restock FROM inventory"
        params = []

        if category_filter != 'All Items':
            query += " WHERE category = %s"
            params.append(category_filter)
        
        query += " ORDER BY stock_level ASC"
        
        cur.execute(query, tuple(params))
        items = cur.fetchall()
        
        items_list = []
        low_stock_count = 0

        for item in items:
            stock = item[3]
            max_s = item[4]
            status = "OPTIMAL"
            
            if stock <= (max_s * 0.2):
                status = "CRITICAL"
                low_stock_count += 1
            elif stock <= (max_s * 0.5):
                status = "LOW STOCK"
                low_stock_count += 1

            items_list.append({
                "id": item[0],
                "item_name": item[1],
                "category": item[2],
                "stock_level": stock,
                "max_stock": max_s,
                "unit_price": float(item[5]) if item[5] else 0.0,
                "status": status,
                "last_restock": item[6].strftime("%b %d, %Y") if item[6] else "N/A"
            })

        return jsonify({
            "items": items_list,
            "summary": {
                "totalSkus": len(items_list),
                "lowStock": low_stock_count,
                "consumRate": random.randint(70, 95),
                "pending": random.randint(2, 15)
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

@app.route('/api/inventory/forecast', methods=['POST'])
def run_forecast():
    try:
        data = request.get_json() or {}
        event_name = data.get('event', 'General Event')

        return jsonify({
            "success": True,
            "title": "AI Analysis Complete",
            "message": f"Demand analysis for {event_name} is finished.",
            "risk_level": "Medium",
            "recommendations": [
                "Luxury Soap Set (+500 units)",
                "Egyptian Cotton Towels (+200 units)",
                "Sparkling Water (+150 cases)"
            ]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/inventory/order', methods=['POST'])
def order_inventory():
    data = request.json
    item_id = data.get('item_id')
    
    # Dito pwede mong i-update ang database para bawasan ang budget
    # O kaya ay mag-insert sa isang 'purchase_orders' table
    return jsonify({
        "status": "success",
        "message": f"Order for Item ID {item_id} has been transmitted to supplier."
    })
# --- RESERVATIONS ENDPOINTS (CORRECTED) ---

@app.route("/api/owner/reservations-stats", methods=["GET"])
def get_reservation_stats():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Total Reservations
        cur.execute("SELECT COUNT(*) FROM reservations")
        total = cur.fetchone()[0]
        
        # Today's Check-ins (Pending reservations)
        cur.execute("SELECT COUNT(*) FROM reservations WHERE status = 'Pending'")
        checkins = cur.fetchone()[0]
        
        # Available Rooms (Dapat match sa ENUM ng rooms table mo: 'Available')
        cur.execute("SELECT COUNT(*) FROM rooms WHERE status = 'Available'")
        available = cur.fetchone()[0]
        
        # Today's Check-outs (Mock logic o query sa check_out date)
        cur.execute("SELECT COUNT(*) FROM reservations WHERE status = 'Checked-in' AND check_out = CURRENT_DATE")
        checkouts = cur.fetchone()[0]
        
        return jsonify({
            "totalReservations": total,
            "todayCheckins": checkins,
            "availableRooms": available,
            "todayCheckouts": checkouts
        })
    finally:
        _safe_close(conn, cur)

@app.route("/api/owner/reservations", methods=["GET"])
def get_all_reservations():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                res.id, 
                COALESCE(res.guest_name, 'Guest') AS guest_name,
                rm.room_number, 
                res.check_in, 
                res.check_out, 
                res.status, 
                res.total_amount_php
            FROM reservations res
            LEFT JOIN rooms rm ON res.room_id = rm.id
            ORDER BY res.created_at DESC
        """)
        rows = cur.fetchall()
        res_list = []
        for r in rows:
            res_list.append({
                "id": r[0], 
                "customerName": r[1], 
                "customerType": "VIP / Platinum" if (r[5] or '').lower() == 'checked-in' else "Standard",
                "roomNo": r[2] if r[2] else "N/A",
                "stayDates": f"{r[3].strftime('%b %d')} - {r[4].strftime('%b %d')}" if r[3] and r[4] else "TBD",
                "nights": (r[4] - r[3]).days if r[3] and r[4] else 0,
                "status": r[5] or "Pending",
                "payment": "Full Paid" if float(r[6] or 0) > 0 else "Unpaid"
            })
        return jsonify(res_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

@app.route("/api/owner/reservations/<int:res_id>/status", methods=["PATCH"])
def update_res_status(res_id):
    data = request.json
    new_status = data.get('status') # e.g., 'Checked-in', 'Cancelled'
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Update Reservation
        cur.execute("UPDATE reservations SET status = %s WHERE id = %s", (new_status, res_id))
        
        # LOGIC: Kung nag Check-in, dapat maging 'Occupied' ang room sa rooms table
        if new_status == 'Checked-in':
            cur.execute("""
                UPDATE rooms SET status = 'Occupied' 
                WHERE id = (SELECT room_id FROM reservations WHERE id = %s)
            """, (res_id,))
            
        conn.commit()
        return jsonify({"message": f"Status updated to {new_status}"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

@app.route("/api/reports/full-stats", methods=["GET"])
def get_report_stats():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        today = datetime.now().date()

        cur.execute(
            """
            SELECT
                b.id,
                COALESCE(r.hotel_id, 0) AS hotel_id,
                b.room_id,
                b.customer_id,
                COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Guest') AS customer_name,
                COALESCE(r.room_type, 'Suite') AS room_type,
                b.check_in,
                b.check_out,
                b.total_price,
                b.status
            FROM bookings b
            LEFT JOIN rooms r ON r.id = b.room_id
            LEFT JOIN customers c ON c.id = b.customer_id
            ORDER BY b.created_at DESC, b.id DESC
            LIMIT 200
            """
        )
        booking_rows = cur.fetchall() or []
        booking_details = [
            {
                "bookingId": row["id"],
                "hotelId": row["hotel_id"],
                "roomId": row["room_id"],
                "customerId": row["customer_id"],
                "customerName": row["customer_name"],
                "roomType": row["room_type"],
                "checkInDate": row["check_in"].isoformat() if getattr(row["check_in"], "isoformat", None) else row["check_in"],
                "checkOutDate": row["check_out"].isoformat() if getattr(row["check_out"], "isoformat", None) else row["check_out"],
                "totalAmount": float(row["total_price"] or 0),
                "status": row["status"] or "Confirmed",
            }
            for row in booking_rows
        ]

        cur.execute(
            """
            SELECT id, hotel_id, room_number, room_type, status
            FROM rooms
            ORDER BY room_number ASC, id ASC
            """
        )
        room_rows = cur.fetchall() or []

        cur.execute("SELECT * FROM staff_reports ORDER BY id DESC LIMIT 1")
        staff = cur.fetchone()

        cur.execute(
            """
            SELECT item_name, stock_level
            FROM inventory
            ORDER BY stock_level ASC NULLS LAST, id ASC
            LIMIT 1
            """
        )
        low_stock = cur.fetchone()

        total_reservations = len(booking_details)
        today_checkins = sum(
            1
            for row in booking_rows
            if row.get("check_in") == today and str(row.get("status") or "").lower() != "cancelled"
        )
        today_checkouts = sum(
            1
            for row in booking_rows
            if row.get("check_out") == today and str(row.get("status") or "").lower() != "cancelled"
        )
        pending_checkins = sum(
            1
            for row in booking_rows
            if row.get("check_in") == today and str(row.get("status") or "").lower() == "pending"
        )
        available_rooms = sum(
            1
            for room in room_rows
            if str(room.get("status") or "").strip().lower() in {"available", "vacant"}
        )
        total_rooms = len(room_rows)
        occupied_rooms = max(total_rooms - available_rooms, 0)
        occupancy_percent = round((occupied_rooms / total_rooms) * 100, 2) if total_rooms else 0

        available_room_details = [
            {
                "hotelId": room["hotel_id"],
                "roomId": room["id"],
                "customerId": None,
                "customerName": "Available Room",
                "roomType": room.get("room_type") or "Unassigned",
                "checkInDate": None,
                "checkOutDate": None,
                "totalAmount": 0,
                "status": room.get("status") or "Available",
            }
            for room in room_rows
            if str(room.get("status") or "").strip().lower() in {"available", "vacant"}
        ]

        # I-format ang response para sa Reports.jsx
        return jsonify({
            "summary": {
                "total_res": total_reservations,
                "res_change": None,
                "today_checkins": today_checkins,
                "pending": pending_checkins,
                "available": available_rooms,
                "occupancy": occupancy_percent,
                "today_checkouts": today_checkouts
            },
            "operational": {
                "inventory": {
                    "item": low_stock["item_name"] if low_stock else None,
                    "stock": low_stock["stock_level"] if low_stock else None
                },
                "staff": {
                    "payroll": float(staff["est_total_payroll"]) if staff and staff.get("est_total_payroll") is not None else None,
                    "attendance": float(staff["attendance_rate"]) if staff and staff.get("attendance_rate") is not None else None,
                    "next_date": str(staff["next_payroll_date"]) if staff and staff.get("next_payroll_date") else None
                }
            },
            "simulation_results": { 
                "revenue": None,
                "occupancy": None,
                "workload": None,
                "velocity": None
            },
            "details": {
                "total_reservations": booking_details,
                "today_checkins": [
                    item for item in booking_details
                    if item["checkInDate"] == today.isoformat()
                ],
                "available_rooms": available_room_details,
                "today_checkouts": [
                    item for item in booking_details
                    if item["checkOutDate"] == today.isoformat()
                ],
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/reports/transactions", methods=["GET"])
def get_transactions():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Kunin ang last 10 transactions
        cur.execute("""
            SELECT event_name as event, user_guest as user, value, status, 
            TO_CHAR(created_at, 'HH12:MI AM') as time 
            FROM transaction_logs 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        logs = cur.fetchall() or []
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route("/api/owner/system-events", methods=["GET"])
def owner_system_events():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, event_name, user_guest, status, created_at
            FROM transaction_logs
            ORDER BY created_at DESC
            LIMIT 8
            """
        )
        rows = cur.fetchall() or []
        events = []
        for row in rows:
            events.append(
                {
                    "id": row[0],
                    "type": "sms" if "SMS" in (row[1] or "").upper() else "task",
                    "title": row[1] or "System Event",
                    "desc": row[2] or "System generated update",
                    "time": row[4].strftime('%b %d, %I:%M %p') if row[4] else "Just now",
                }
            )
        return jsonify(events), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route('/api/guests', methods=['GET'])
def get_guests():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                c.id,
                CONCAT(c.first_name, ' ', c.last_name) AS guest_name,
                c.email,
                c.contact_number,
                COALESCE(COUNT(b.id), 0) AS total_bookings,
                COALESCE(SUM(b.total_price), 0) AS total_spent,
                MAX(b.check_out) AS last_visit,
                COALESCE(MAX(r.room_type), 'Suite') AS preferred_room,
                COALESCE(c.loyalty_points, 0) AS points,
                COALESCE(c.membership_level, 'STANDARD') AS segment
            FROM customers c
            LEFT JOIN bookings b ON b.customer_id = c.id
            LEFT JOIN rooms r ON r.id = b.room_id
            GROUP BY c.id, c.first_name, c.last_name, c.email, c.contact_number, c.loyalty_points, c.membership_level
            ORDER BY total_spent DESC, guest_name ASC
            """
        )
        rows = cur.fetchall() or []
        guests = []
        for r in rows:
            total_spent = float(r[5] or 0)
            total_bookings = int(r[4] or 0)
            avg_spend = total_spent / total_bookings if total_bookings else 0
            segment = (r[9] or 'STANDARD').upper()
            guests.append(
                {
                    "id": r[0],
                    "name": r[1],
                    "customer_id": f"CUST-{r[0]}",
                    "email": r[2] or '',
                    "phone": r[3] or '',
                    "total_bookings": total_bookings,
                    "total_spent": total_spent,
                    "avg_spend": avg_spend,
                    "preferred_room": r[7] or 'Suite',
                    "points": int(r[8] or 0),
                    "segment": segment,
                    "last_visit": r[6].isoformat() if getattr(r[6], "isoformat", None) else 'N/A',
                    "special_requests": 'No specific preferences',
                    "frequency": 'Frequent' if total_bookings >= 3 else 'Occasional',
                    "cancel_rate": 0,
                    "no_show_count": 0,
                    "payment_issue": 'Clear',
                    "risk_score": 15 if segment == 'VIP' else 30,
                    "clv": total_spent,
                    "avg_trans": avg_spend,
                    "retention": 'Strong' if total_bookings >= 3 else 'Stable',
                    "cac": 0,
                }
            )
        return jsonify(guests), 200
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
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT id, title, subtitle, description, original_price, discounted_price,
                   discount_percentage, offer_type, image_url, badge_text, expiry_date
            FROM guest_offers
            WHERE is_active = TRUE
            ORDER BY created_at DESC, id DESC
            """
        )
        rows = cur.fetchall() or []

        offers = [
            {
                "id": row["id"],
                "title": row["title"],
                "subtitle": row["subtitle"],
                "description": row["description"],
                "original_price": float(row["original_price"] or 0),
                "discounted_price": float(row["discounted_price"] or 0),
                "discount_percentage": int(row["discount_percentage"] or 0),
                "offer_type": row["offer_type"],
                "image_url": row["image_url"],
                "badge_text": row["badge_text"],
                "expiry_date": row["expiry_date"].isoformat() if row["expiry_date"] else None,
            }
            for row in rows
        ]

        return jsonify(offers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route("/api/staff/dashboard", methods=["GET"])
def staff_dashboard():
    owner_id = request.args.get("owner_id", type=int)
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        hotel_row = _resolve_hotel_for_owner(cur, owner_id)
        if not hotel_row:
            return jsonify({"staff": [], "analytics": {}}), 200
        hotel_id = hotel_row["id"] if isinstance(hotel_row, dict) else hotel_row[0]

        cur.execute(
            """
            SELECT id, full_name, role, is_on_duty
            FROM staff
            WHERE hotel_id = %s
            ORDER BY full_name ASC
            """,
            (hotel_id,),
        )
        staff_rows = cur.fetchall() or []

        cur.execute("SELECT * FROM staff_reports ORDER BY id DESC LIMIT 1")
        report = cur.fetchone()

        on_duty_count = sum(1 for row in staff_rows if row["is_on_duty"])
        staff_list = [
            {
                "id": row["id"],
                "name": row["full_name"],
                "email": f"{row['full_name'].lower().replace(' ', '.')}@innova.local" if row["full_name"] else "",
                "role": row["role"],
                "status": "On Shift" if row["is_on_duty"] else "Offline",
                "rating": 4.8 if row["is_on_duty"] else 4.5,
            }
            for row in staff_rows
        ]

        analytics = {
            "activeCount": on_duty_count,
            "totalCount": len(staff_rows),
            "avgCleaningSpeed": "18m",
            "avgRating": 4.8 if staff_rows else 0,
            "payrollProjection": float(report["est_total_payroll"]) if report else 0,
            "baseSalary": float(report["est_total_payroll"]) if report else 0,
            "bonuses": 0,
            "tardinessCount": 0,
            "overtimeHours": float(report["overtime_hours"]) if report else 0,
            "morningShiftCount": on_duty_count,
            "afternoonShiftCount": max(len(staff_rows) - on_duty_count, 0),
            "nightShiftCount": 0,
            "cleaningProgress": [
                {"name": "East Wing", "percentage": 82},
                {"name": "West Wing", "percentage": 64},
                {"name": "Upper Floors", "percentage": 91},
            ],
        }
        return jsonify({"staff": staff_list, "analytics": analytics}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route("/api/staff/add", methods=["POST"])
def add_staff_member():
    data = request.get_json() or {}
    owner_id = data.get("owner_id")
    full_name = data.get("name")
    role = data.get("role")

    conn = None
    cur = None
    try:
        if not owner_id or not full_name or not role:
            return jsonify({"error": "owner_id, name, and role are required"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        hotel_row = _resolve_hotel_for_owner(cur, owner_id)
        if not hotel_row:
            return jsonify({"error": "No hotel found for owner."}), 404
        hotel_id = hotel_row[0]

        cur.execute(
            """
            INSERT INTO staff (hotel_id, full_name, role, is_on_duty)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (hotel_id, full_name, role, False),
        )
        staff_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({"message": "Staff member added.", "id": staff_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)


@app.route("/api/reviews/summary", methods=["GET"])
def reviews_summary():
    return jsonify({
        "data": [],
        "sentimentStats": {"positive": 0, "neutral": 0, "negative": 0},
        "trendData": [],
        "insight": None
    }), 200

@app.route("/api/reports/simulate", methods=["POST"])
def simulate():
    payload = request.json or {}
    delta = payload.get("delta", 0)

    conn = None
    cur = None
    try:
        delta = float(delta or 0)
    except (TypeError, ValueError):
        delta = 0

    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(
            """
            SELECT
                COALESCE(SUM(total_price), 0) AS current_revenue,
                COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) <> 'cancelled') AS active_bookings,
                COUNT(*) FILTER (WHERE check_in = CURRENT_DATE AND LOWER(COALESCE(status, '')) <> 'cancelled') AS todays_checkins
            FROM bookings
            """
        )
        booking_summary = cur.fetchone() or {}

        cur.execute("SELECT COUNT(*) AS total_rooms FROM rooms")
        rooms_summary = cur.fetchone() or {}

        cur.execute(
            """
            SELECT
                COALESCE(AVG(stock_level), 0) AS avg_stock_level,
                COUNT(*) AS inventory_items
            FROM inventory
            """
        )
        inventory_summary = cur.fetchone() or {}

        current_revenue = _safe_number(booking_summary.get("current_revenue"))
        active_bookings = int(booking_summary.get("active_bookings") or 0)
        todays_checkins = int(booking_summary.get("todays_checkins") or 0)
        total_rooms = int(rooms_summary.get("total_rooms") or 0)
        avg_stock_level = _safe_number(inventory_summary.get("avg_stock_level"))
        inventory_items = int(inventory_summary.get("inventory_items") or 0)

        revenue_delta = current_revenue * (delta / 100)
        occupancy_delta = ((active_bookings / total_rooms) * 100 * (delta / 100)) if total_rooms else 0
        workload_delta = ((todays_checkins or active_bookings) * 0.35) * (delta / 100)
        supply_chain_delta = ((avg_stock_level or inventory_items) * 0.2) * (delta / 100)

        return jsonify({
            "revenue": revenue_delta,
            "occupancy": occupancy_delta,
            "workload": workload_delta,
            "velocity": supply_chain_delta,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _safe_close(conn, cur)

# 2. Idagdag ang bagong route na ito
@app.route('/api/bookings/confirm', methods=['POST'])
def confirm_booking():
    data = request.json or {}
    # Kunin ang data mula sa React frontend
    customer_id = data.get('customerId')
    customer_email = data.get('customerEmail')
    customer_name = data.get('customerName')
    check_in = data.get('checkIn')
    check_out = data.get('checkOut')
    rooms = data.get('rooms') # Ito ay list/array
    priorities = data.get('priorities') # List/array
    special_requests = data.get('specialRequests')

    conn = None
    cur = None
    try:
        if not customer_id or not customer_email or not check_in or not check_out or not rooms:
            return jsonify({"error": "Incomplete booking details."}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        first_room = rooms[0] if isinstance(rooms, list) and rooms else {}
        room_id = first_room.get('roomId')

        if not room_id:
            return jsonify({"error": "Selected room is missing."}), 400

        cur.execute(
            """
            SELECT price_per_night, room_name, room_type
            FROM rooms
            WHERE id = %s
            LIMIT 1
            """,
            (room_id,),
        )
        room_row = cur.fetchone()

        if not room_row:
            return jsonify({"error": "Selected room not found."}), 404

        nights = 1
        try:
            from datetime import date
            check_in_date = date.fromisoformat(check_in)
            check_out_date = date.fromisoformat(check_out)
            nights = max((check_out_date - check_in_date).days, 1)
        except Exception:
            nights = 1

        price_per_night = float(room_row[0] or 0)
        total_price = price_per_night * nights

        # 1. I-save sa actual live bookings schema
        cur.execute(
            """
            INSERT INTO bookings (customer_id, room_id, check_in, check_out, total_price, status)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """,
            (customer_id, room_id, check_in, check_out, total_price, 'Confirmed')
        )
        booking_id = cur.fetchone()[0]
        conn.commit()

        email_sent = False
        sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
        if SendGridAPIClient and Mail and sendgrid_api_key:
            message = Mail(
                from_email='reservations@innovahms.com',
                to_emails=customer_email,
                subject=f'Reservation Confirmed #{booking_id} - Innova HMS',
                html_content=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #d4af37; padding: 20px;">
                        <h2 style="color: #1a2b3c;">Booking Confirmed!</h2>
                        <p>Hello <strong>{customer_name}</strong>,</p>
                        <p>Your stay at Innova HMS is officially booked. Here are your details:</p>
                        <hr>
                        <p><strong>Booking ID:</strong> #INV-{booking_id}</p>
                        <p><strong>Room:</strong> {room_row[1] or room_row[2] or 'Suite'}</p>
                        <p><strong>Check-in:</strong> {check_in}</p>
                        <p><strong>Check-out:</strong> {check_out}</p>
                        <p><strong>Nights:</strong> {nights}</p>
                        <p><strong>Total:</strong> PHP {total_price:,.2f}</p>
                        <p><strong>Preferences:</strong> {", ".join(priorities or [])}</p>
                        <hr>
                        <p>We look forward to seeing you!</p>
                    </div>
                """
            )

            sg = SendGridAPIClient(sendgrid_api_key)
            sg.send(message)
            email_sent = True

        response_message = "Booking successful! Confirmation email sent." if email_sent else "Booking successful! Email sending is not configured yet."
        return jsonify({"message": response_message, "bookingId": booking_id, "emailSent": email_sent}), 201

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error: {str(e)}")
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
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT r.id, r.room_name, r.room_type, r.price_per_night, 
                   r.images, r.amenities, r.max_adults, r.max_children, 
                   r.status, COALESCE(h.location, h.hotel_name, 'Prime Location') as hotel_location
            FROM rooms r
            JOIN hotels h ON r.hotel_id = h.id
            WHERE LOWER(COALESCE(r.status, '')) = 'available'
        """

        params = []
        if room_filter and room_filter != 'All':
            query += " AND LOWER(COALESCE(r.room_type, '')) = LOWER(%s)"
            params.append(room_filter)
        if category_filter:
            query += " AND (LOWER(COALESCE(r.room_type, '')) LIKE LOWER(%s) OR LOWER(COALESCE(r.room_name, '')) LIKE LOWER(%s))"
            category_like = f"%{category_filter}%"
            params.extend([category_like, category_like])

        cur.execute(query, params)
        rows = cur.fetchall() or []

        formatted_rooms = []
        for row in rows:
            images_list = row['images'] if row['images'] else []
            first_image = images_list[0] if len(images_list) > 0 else "https://images.unsplash.com/photo-1611892440504-42a792e24d32"

            amenities = [a.lower() for a in (row['amenities'] or [])]

            formatted_rooms.append({
                "id": row['id'],
                "name": row['room_name'],
                "location_description": row['hotel_location'] or "Prime Location",
                "tag": "LIVE AVAILABILITY" if row['status'] == 'Available' else None,
                "tag_color": "green",
                "room_type": row['room_type'],
                "base_price_php": float(row['price_per_night']),
                "max_guests": row['max_adults'] + row['max_children'],
                "image_url": first_image,
                "has_wifi": any('wifi' in a for a in amenities),
                "has_pool": any('pool' in a for a in amenities),
                "has_dining": any('breakfast' in a or 'dining' in a for a in amenities),
                "has_virtual_tour": True
            })
        
        return jsonify(formatted_rooms)

    except Exception as e:
        print(f"Backend Error: {str(e)}")
        return jsonify({"error": "System encountered an issue fetching rooms"}), 500
    finally:
        _safe_close(conn, cur)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
