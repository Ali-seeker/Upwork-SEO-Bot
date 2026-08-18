import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function alterTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const tables = ['campaigns', 'stars_campaigns', 'indexer_campaigns', 'view_campaigns', 'upwork_campaigns'];
    for (const table of tables) {
      console.log(`Adding data column to ${table}...`);
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS data JSONB`);
    }
    console.log("✅ Tables altered successfully.");
  } catch (error) {
    console.log("Error:", error.message);
  } finally {
    await pool.end();
  }
}

alterTables();
