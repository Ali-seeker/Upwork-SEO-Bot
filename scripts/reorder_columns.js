import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function reorderColumns() {
    try {
        console.log("Reordering columns in 'jobs_selected'...");
        await pool.query('BEGIN');
        
        // 1. Rename old table
        await pool.query('ALTER TABLE jobs_selected RENAME TO jobs_selected_old');
        
        // 2. Create new table with correct order
        await pool.query(`
            CREATE TABLE jobs_selected (
                id VARCHAR(255) PRIMARY KEY,
                campaign_id VARCHAR(255),
                title VARCHAR(255),
                description TEXT,
                open_source_viable BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 3. Copy data over
        await pool.query(`
            INSERT INTO jobs_selected (id, campaign_id, title, description, open_source_viable, created_at)
            SELECT id, campaign_id, title, description, open_source_viable, created_at 
            FROM jobs_selected_old
        `);
        
        // 4. Drop old table and its foreign keys
        await pool.query('DROP TABLE jobs_selected_old CASCADE');
        
        // 5. Re-add foreign keys to other tables
        await pool.query('ALTER TABLE product ADD CONSTRAINT product_source_job_id_fkey FOREIGN KEY (source_job_id) REFERENCES jobs_selected(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE blog ADD CONSTRAINT blog_source_job_id_fkey FOREIGN KEY (source_job_id) REFERENCES jobs_selected(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE services ADD CONSTRAINT services_source_job_id_fkey FOREIGN KEY (source_job_id) REFERENCES jobs_selected(id) ON DELETE SET NULL');
        
        await pool.query('COMMIT');
        
        console.log("✅ Columns reordered successfully! 'description' is now right after 'title'.");
        console.log("Please refresh pgAdmin and take your AFTER screenshot!");
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error("Error reordering columns:", e.message);
    } finally {
        await pool.end();
    }
}

reorderColumns();
