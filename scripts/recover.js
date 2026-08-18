import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function recover() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("Recovering column 'description' in 'jobs_selected'...");
    await pool.query('ALTER TABLE jobs_selected ADD COLUMN description TEXT');
    console.log("   ✅ Column recovered successfully.");
  } catch (error) {
    console.log("Error recovering:", error.message);
  } finally {
    await pool.end();
  }
}

recover();
