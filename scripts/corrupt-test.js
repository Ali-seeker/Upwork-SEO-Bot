import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function corruptAndTest() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("1. Dropping column 'description' from 'jobs_selected'...");
    await pool.query('ALTER TABLE jobs_selected DROP COLUMN description');
    console.log("   ✅ Column dropped successfully.");

    console.log("2. Simulating a job insertion (which represents the campaign actively running)...");
    
    // Simulate what storeProcessedJob does when it finds a "Yes"
    await pool.query(
      `INSERT INTO jobs_selected (id, campaign_id, title, description, open_source_viable, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['test-id-123', 'campaign-456', 'Test Title', 'Test Description', true, new Date()]
    );
    
    console.log("   ❌ Insertion succeeded! (This should not happen since the column is gone)");
  } catch (error) {
    console.log("\n============================================================");
    console.log("MANDATORY CORRUPTION & RECOVERY PROOF - ERROR CAPTURED");
    console.log("============================================================");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Exact Error Output:\n", error.message);
    console.log("Stack Trace:\n", error.stack);
    console.log("============================================================\n");
  } finally {
    await pool.end();
  }
}

corruptAndTest();
