import psycopg2

conn = psycopg2.connect(host="localhost", database="innovahmsdb", user="postgres", password="admin123")
cur = conn.cursor()

cols = [
    ("room_number", "VARCHAR(20) NOT NULL"),
    ("room_name", "VARCHAR(100)"),
    ("room_type", "VARCHAR(50)"),
    ("description", "TEXT"),
    ("amenities", "TEXT[]"),
    ("images", "TEXT[]"),
    ("max_adults", "INTEGER DEFAULT 2"),
    ("max_children", "INTEGER DEFAULT 0"),
    ("price_per_night", "DECIMAL(10,2) NOT NULL"),
    ("status", "VARCHAR(20) DEFAULT 'Available'"),
]

print("Checking rooms table columns...")
for col, typ in cols:
    cur.execute(
        "SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name=%s",
        (col,),
    )
    if not cur.fetchone():
        print(f"Adding column: {col}")
        cur.execute(f"ALTER TABLE rooms ADD COLUMN {col} {typ}")

conn.commit()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='rooms' ORDER BY ordinal_position")
print("Columns now:\n", cur.fetchall())
cur.close()
conn.close()
