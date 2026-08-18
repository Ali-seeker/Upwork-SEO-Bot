import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function showTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n=======================================');
    console.log('📦 DATABASE: automation_UTP2');
    console.log('=======================================');
    console.log('Tables found:\n');
    
    for (const row of res.rows) {
      const tableName = row.table_name;
      const countRes = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`- ${tableName.padEnd(20)} (${countRes.rows[0].count} rows)`);
    }
    console.log('=======================================\n');
  } catch (error) {
    console.error('Error fetching tables:', error);
  } finally {
    await pool.end();
  }
}

showTables();
