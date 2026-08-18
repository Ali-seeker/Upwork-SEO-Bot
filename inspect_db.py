import os
from dotenv import load_dotenv
import psycopg2

load_dotenv(r'c:\Users\kcv\OneDrive\Desktop\One-Week-work-with-CEO\.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

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
