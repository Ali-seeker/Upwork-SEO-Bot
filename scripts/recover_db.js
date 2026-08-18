import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function recoverDB() {
    try {
        console.log("Recovering column 'description' in 'jobs_selected'...");
        await pool.query('ALTER TABLE jobs_selected ADD COLUMN description TEXT');
        console.log("✅ Column added back successfully! Now take your AFTER screenshot in pgAdmin/TablePlus.");
    } catch (e) {
        console.error("Error recovering column:", e.message);
    } finally {
        await pool.end();
    }
}

recoverDB();
