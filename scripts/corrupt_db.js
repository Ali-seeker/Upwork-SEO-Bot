import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function corruptDB() {
    try {
        console.log("Dropping column 'description' from 'jobs_selected'...");
        await pool.query('ALTER TABLE jobs_selected DROP COLUMN description');
        console.log("✅ Column dropped successfully! Now take your BEFORE screenshot in pgAdmin/TablePlus.");
    } catch (e) {
        console.error("Error dropping column:", e.message);
    } finally {
        await pool.end();
    }
}

corruptDB();
