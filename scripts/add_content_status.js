import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function addContentStatusColumn() {
    try {
        console.log("Adding 'content_status' column to 'jobs_selected'...");
        await pool.query("ALTER TABLE jobs_selected ADD COLUMN IF NOT EXISTS content_status VARCHAR(50) DEFAULT 'pending'");
        console.log("✅ Column added successfully!");
    } catch (e) {
        console.error("Error adding column:", e.message);
    } finally {
        await pool.end();
    }
}

addContentStatusColumn();
