import re

f = open('app.py', 'rb')
raw = f.read()
f.close()
text = raw.decode('latin-1')

old = """@app.route('/api/owner/login', methods=['POST'])
def owner_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        _backfill_hotel_subscriptions(cur)
        cur.execute(\"\"\"
            SELECT o.*, h.hotel_name, h.id as hotel_id, h.hotel_address, h.latitude, h.longitude
            FROM owners o
            LEFT JOIN hotels h ON o.id = h.owner_id
            WHERE o.email = %s
        \"\"\", (email,))
        owner = cur.fetchone()
        if owner and check_password_hash(owner['password_hash'], password):
            owner_payload = _owner_session_payload(cur, owner)
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({
                "message": "Owner login successful!",
                "owner": owner_payload
            }), 200
        cur.close()
        conn.close()
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500"""

new = """@app.route('/api/owner/login', methods=['POST'])
def owner_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Run backfill in a savepoint so any failure doesn't abort the transaction
        try:
            cur.execute("SAVEPOINT owner_login_backfill")
            _backfill_hotel_subscriptions(cur)
            cur.execute("RELEASE SAVEPOINT owner_login_backfill")
        except Exception:
            cur.execute("ROLLBACK TO SAVEPOINT owner_login_backfill")
        cur.execute(\"\"\"
            SELECT o.*, h.hotel_name, h.id as hotel_id, h.hotel_address, h.latitude, h.longitude
            FROM owners o
            LEFT JOIN hotels h ON o.id = h.owner_id
            WHERE o.email = %s
            LIMIT 1
        \"\"\", (email,))
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
        _safe_close(conn, cur)"""

# normalize line endings for matching
text_n = text.replace('\r\n', '\n').replace('\r', '\n')
old_n = old.replace('\r\n', '\n').replace('\r', '\n')

if old_n in text_n:
    text_n = text_n.replace(old_n, new)
    with open('app.py', 'wb') as f:
        f.write(text_n.encode('latin-1'))
    print("DONE - owner_login patched")
else:
    print("NOT FOUND - trying partial match")
    idx = text_n.find("def owner_login():")
    print("def owner_login at char:", idx)
    if idx >= 0:
        print(repr(text_n[idx:idx+300]))
