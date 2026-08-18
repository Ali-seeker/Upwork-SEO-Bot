import os
from dotenv import load_dotenv
import psycopg2

load_dotenv(r'c:\Users\kcv\OneDrive\Desktop\One-Week-work-with-CEO\.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# product table
cur.execute("""
CREATE TABLE IF NOT EXISTS product (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    source_job_id VARCHAR(255) REFERENCES jobs_selected(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
""")

# blog table
cur.execute("""
CREATE TABLE IF NOT EXISTS blog (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    content TEXT,
    source_job_id VARCHAR(255) REFERENCES jobs_selected(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
""")

# services table
cur.execute("""
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    source_job_id VARCHAR(255) REFERENCES jobs_selected(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
""")

conn.commit()

# Verify
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = [r[0] for r in cur.fetchall()]
print(f"Tables: {tables}")

for table in ['jobs_selected', 'product', 'blog', 'services']:
    if table in tables:
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s", (table,))
        schema = cur.fetchall()
        print(f"\n{table} schema:")
        for col in schema:
            print(f"  {col[0]}: {col[1]}")
    else:
        print(f"\n{table} does not exist in PostgreSQL.")

cur.close()
conn.close()
