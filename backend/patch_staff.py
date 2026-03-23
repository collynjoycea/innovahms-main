"""
Patch script: adds hotel_id filtering to all staff endpoints.
Run once: python patch_staff.py
"""
import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

patches = [
    # ── staff_reservations ──────────────────────────────────────────────────
    (
        'def staff_reservations():\n    """All reservations with full guest + room + hotel info for front desk staff."""',
        'def staff_reservations():\n    """All reservations filtered by hotel."""'
    ),
    (
        '        cur.execute("""\n            SELECT\n                r.id, r.booking_number, r.check_in_date, r.check_out_date,\n                r.check_in_time, r.check_out_time,\n                r.total_nights, r.total_amount, r.deposit_amount, r.status, r.payment_method,\n                r.special_requests, r.created_at,\n                c.first_name, c.last_name, c.email, c.contact_number,\n                rm.room_number, rm.room_name, rm.room_type, rm.id AS room_id,\n                h.hotel_name, h.id AS hotel_id\n            FROM reservations r\n            LEFT JOIN customers c ON c.id = r.customer_id\n            LEFT JOIN rooms rm ON rm.id = r.room_id\n            LEFT JOIN hotels h ON h.id = rm.hotel_id\n            ORDER BY r.check_in_date ASC, r.created_at DESC\n        """)',
        '        hotel_id = request.args.get(\'hotel_id\', type=int)\n        hf = "AND h.id = %s" if hotel_id else ""\n        hp = [hotel_id] if hotel_id else []\n        cur.execute(f"""\n            SELECT\n                r.id, r.booking_number, r.check_in_date, r.check_out_date,\n                r.check_in_time, r.check_out_time,\n                r.total_nights, r.total_amount, r.deposit_amount, r.status, r.payment_method,\n                r.special_requests, r.created_at,\n                c.first_name, c.last_name, c.email, c.contact_number,\n                rm.room_number, rm.room_name, rm.room_type, rm.id AS room_id,\n                h.hotel_name, h.id AS hotel_id\n            FROM reservations r\n            LEFT JOIN customers c ON c.id = r.customer_id\n            LEFT JOIN rooms rm ON rm.id = r.room_id\n            LEFT JOIN hotels h ON h.id = rm.hotel_id\n            WHERE 1=1 {hf}\n            ORDER BY r.check_in_date ASC, r.created_at DESC\n        """, hp)'
    ),

    # ── staff_guest_list ────────────────────────────────────────────────────
    (
        'def staff_guest_list():\n    """All customers with stay history for Guest Profile CRM."""\n    conn = None\n    cur = None\n    try:\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        cur.execute("""\n            SELECT c.id, c.first_name, c.last_name, c.email, c.contact_number,\n                   c.created_at,\n                   COUNT(r.id) AS total_stays,\n                   COALESCE(SUM(r.total_amount), 0) AS total_spent,\n                   MAX(r.check_in_date) AS last_stay\n            FROM customers c\n            LEFT JOIN reservations r ON r.customer_id = c.id\n              AND r.status NOT IN (\'CANCELLED\',\'FAILED\')\n            GROUP BY c.id\n            ORDER BY total_spent DESC\n        """)',
        'def staff_guest_list():\n    """All customers with stay history, filtered by hotel."""\n    conn = None\n    cur = None\n    try:\n        hotel_id = request.args.get(\'hotel_id\', type=int)\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        hf = "AND rm.hotel_id = %s" if hotel_id else ""\n        hp = [hotel_id] if hotel_id else []\n        cur.execute(f"""\n            SELECT c.id, c.first_name, c.last_name, c.email, c.contact_number,\n                   c.created_at,\n                   COUNT(r.id) AS total_stays,\n                   COALESCE(SUM(r.total_amount), 0) AS total_spent,\n                   MAX(r.check_in_date) AS last_stay\n            FROM customers c\n            LEFT JOIN reservations r ON r.customer_id = c.id\n              AND r.status NOT IN (\'CANCELLED\',\'FAILED\')\n            LEFT JOIN rooms rm ON rm.id = r.room_id\n            WHERE 1=1 {hf}\n            GROUP BY c.id\n            ORDER BY total_spent DESC\n        """, hp)'
    ),

    # ── staff_room_map ──────────────────────────────────────────────────────
    (
        'def staff_room_map():\n    """All rooms with live status for room map."""\n    conn = None\n    cur = None\n    try:\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        cur.execute("""\n            SELECT r.id, r.room_number, r.room_name, r.room_type,\n                   r.status, r.price_per_night, r.max_adults, r.max_children,\n                   h.hotel_name\n            FROM rooms r\n            LEFT JOIN hotels h ON h.id = r.hotel_id\n            ORDER BY r.room_number ASC\n        """)',
        'def staff_room_map():\n    """All rooms with live status, filtered by hotel."""\n    conn = None\n    cur = None\n    try:\n        hotel_id = request.args.get(\'hotel_id\', type=int)\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        hf = "WHERE r.hotel_id = %s" if hotel_id else ""\n        hp = [hotel_id] if hotel_id else []\n        cur.execute(f"""\n            SELECT r.id, r.room_number, r.room_name, r.room_type,\n                   r.status, r.price_per_night, r.max_adults, r.max_children,\n                   h.hotel_name\n            FROM rooms r\n            LEFT JOIN hotels h ON h.id = r.hotel_id\n            {hf}\n            ORDER BY r.room_number ASC\n        """, hp)'
    ),

    # ── staff_list_with_shift ───────────────────────────────────────────────
    (
        'def staff_list_with_shift():\n    """All staff with today\'s clock-in/out status."""\n    conn = None\n    cur = None\n    try:\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        today = datetime.now().date()\n        cur.execute("""\n            SELECT\n                s.id, s.first_name, s.last_name, s.role, s.status,\n                h.hotel_name,\n                a.id        AS att_id,\n                a.clock_in,\n                a.clock_out,\n                a.status    AS att_status\n            FROM staff s\n            LEFT JOIN hotels h ON h.id = s.hotel_id\n            LEFT JOIN attendance a ON a.staff_id = s.id AND a.date = %s\n            ORDER BY s.first_name ASC\n        """, (today,))',
        'def staff_list_with_shift():\n    """All staff with today\'s clock-in/out status, filtered by hotel."""\n    conn = None\n    cur = None\n    try:\n        hotel_id = request.args.get(\'hotel_id\', type=int)\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        today = datetime.now().date()\n        hf = "AND s.hotel_id = %s" if hotel_id else ""\n        hp = [today, hotel_id] if hotel_id else [today]\n        cur.execute(f"""\n            SELECT\n                s.id, s.first_name, s.last_name, s.role, s.status,\n                h.hotel_name,\n                a.id        AS att_id,\n                a.clock_in,\n                a.clock_out,\n                a.status    AS att_status\n            FROM staff s\n            LEFT JOIN hotels h ON h.id = s.hotel_id\n            LEFT JOIN attendance a ON a.staff_id = s.id AND a.date = %s\n            WHERE 1=1 {hf}\n            ORDER BY s.first_name ASC\n        """, hp)'
    ),

    # ── overdue_count ───────────────────────────────────────────────────────
    (
        'def overdue_count():\n    """Returns count of reservations that are past check-in date and still PENDING/CONFIRMED.\"\"\"\n    conn = None\n    cur = None\n    try:\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        today = datetime.now().date()\n        cur.execute("""\n            SELECT COUNT(*) AS cnt FROM reservations\n            WHERE check_in_date < %s AND status IN (\'PENDING\', \'CONFIRMED\')\n        """, (today,))',
        'def overdue_count():\n    """Returns count of overdue no-show reservations, filtered by hotel.\"\"\"\n    conn = None\n    cur = None\n    try:\n        hotel_id = request.args.get(\'hotel_id\', type=int)\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        today = datetime.now().date()\n        hf = "AND rm.hotel_id = %s" if hotel_id else ""\n        hp = [today, hotel_id] if hotel_id else [today]\n        cur.execute(f"""\n            SELECT COUNT(*) AS cnt FROM reservations r\n            LEFT JOIN rooms rm ON rm.id = r.room_id\n            WHERE r.check_in_date < %s AND r.status IN (\'PENDING\', \'CONFIRMED\') {hf}\n        """, hp)'
    ),

    # ── overdue_checkout_count ──────────────────────────────────────────────
    (
        'def overdue_checkout_count():\n    """Count of CHECKED_IN guests whose checkout date has passed.\"\"\"\n    conn = None\n    cur = None\n    try:\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        today = datetime.now().date()\n        cur.execute("""\n            SELECT COUNT(*) AS cnt FROM reservations\n            WHERE status = \'CHECKED_IN\' AND check_out_date < %s\n        """, (today,))',
        'def overdue_checkout_count():\n    """Count of overdue CHECKED_IN guests, filtered by hotel.\"\"\"\n    conn = None\n    cur = None\n    try:\n        hotel_id = request.args.get(\'hotel_id\', type=int)\n        conn = get_db_connection()\n        cur = conn.cursor(cursor_factory=RealDictCursor)\n        today = datetime.now().date()\n        hf = "AND rm.hotel_id = %s" if hotel_id else ""\n        hp = [today, hotel_id] if hotel_id else [today]\n        cur.execute(f"""\n            SELECT COUNT(*) AS cnt FROM reservations r\n            LEFT JOIN rooms rm ON rm.id = r.room_id\n            WHERE r.status = \'CHECKED_IN\' AND r.check_out_date < %s {hf}\n        """, hp)'
    ),
]

applied = 0
for old, new in patches:
    if old in content:
        content = content.replace(old, new)
        applied += 1
        print(f'  PATCHED: {old[:60].strip()!r}')
    else:
        print(f'  SKIP (not found): {old[:60].strip()!r}')

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. {applied}/{len(patches)} patches applied.')
