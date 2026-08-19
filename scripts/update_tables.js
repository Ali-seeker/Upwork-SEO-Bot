import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log("Starting DB Schema Update...");

    // 1. Clear existing content data
    await pool.query('TRUNCATE TABLE product');
    await pool.query('TRUNCATE TABLE services');
    await pool.query('TRUNCATE TABLE blog');
    console.log("Cleared old data from product, services, and blog tables.");

    // 2. Set all jobs to pending
    await pool.query("UPDATE jobs_selected SET content_status = 'pending'");
    console.log("Set content_status of all jobs to pending.");

    // 3. Drop existing tables and recreate them to ensure exact schema matches
    // Note: We retain source_job_id in all tables for relation back to Upwork jobs
    
    await pool.query(`DROP TABLE IF EXISTS product`);
    await pool.query(`
      CREATE TABLE product (
        id VARCHAR(255) PRIMARY KEY,
        "source_job_id" VARCHAR(255),
        "name" TEXT,
        "slug" TEXT UNIQUE,
        "category" TEXT DEFAULT 'Software',
        "shortDesc" TEXT DEFAULT '',
        "description" TEXT,
        "problem" TEXT DEFAULT '',
        "solution" TEXT DEFAULT '',
        "valueProp" TEXT DEFAULT '',
        "targetCustomer" TEXT DEFAULT '',
        "features" TEXT[],
        "technologies" TEXT[],
        "status" TEXT DEFAULT 'draft',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Recreated product table.");

    await pool.query(`DROP TABLE IF EXISTS services`);
    await pool.query(`
      CREATE TABLE services (
        id VARCHAR(255) PRIMARY KEY,
        "source_job_id" VARCHAR(255),
        "name" TEXT,
        "slug" TEXT UNIQUE,
        "category" TEXT DEFAULT 'Consulting',
        "shortDesc" TEXT DEFAULT '',
        "description" TEXT,
        "problem" TEXT DEFAULT '',
        "benefits" TEXT[],
        "deliverables" TEXT[],
        "process" TEXT[],
        "status" TEXT DEFAULT 'draft',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Recreated services table.");

    await pool.query(`DROP TABLE IF EXISTS blog`);
    await pool.query(`
      CREATE TABLE blog (
        id VARCHAR(255) PRIMARY KEY,
        "source_job_id" VARCHAR(255),
        "title" TEXT,
        "slug" TEXT UNIQUE,
        "category" TEXT DEFAULT 'News',
        "excerpt" TEXT,
        "content" TEXT,
        "author" TEXT DEFAULT 'Admin',
        "status" TEXT DEFAULT 'draft',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Recreated blog table.");

    console.log("Schema Update Complete!");

  } catch(e) {
    console.error("Error updating schema:", e);
  } finally {
    pool.end();
  }
}

run();
