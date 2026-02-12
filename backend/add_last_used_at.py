import sqlite3
from datetime import datetime

# Connect to database
conn = sqlite3.connect('synapsemind.db')
cursor = conn.cursor()

# Check if column exists
cursor.execute("PRAGMA table_info(llm_providers)")
columns = [col[1] for col in cursor.fetchall()]

if 'last_used_at' not in columns:
    print("Adding last_used_at column...")
    cursor.execute("ALTER TABLE llm_providers ADD COLUMN last_used_at TIMESTAMP")
    conn.commit()
    print("✓ Column added successfully")
else:
    print("✓ Column already exists")

conn.close()
