import { MongoClient } from 'mongodb';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool, Client } = pg;

async function migrate() {
    console.log('🚀 Starting MongoDB to PostgreSQL Migration...');

    // 1. Connect to MongoDB
    const mongoUri = "mongodb+srv://jaishasohail419_db_user:FnLrrjb3iYhiqfIN@cluster0.kjhwa8e.mongodb.net/?appName=Cluster0";
    const mongoClient = new MongoClient(mongoUri);
    let db = null;
    try {
        await mongoClient.connect();
        db = mongoClient.db('automation_UTP2');
        console.log('✅ Connected to MongoDB');
    } catch (e) {
        console.error('❌ Failed to connect to MongoDB. Data migration will be skipped. Creating Postgres tables only.', e.message);
    }

    // 2. Connect to PostgreSQL (Default DB) to create target DB if not exists
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set in .env');
    
    // Parse the DB name out of the URL
    const urlObj = new URL(dbUrl);
    const targetDbName = urlObj.pathname.replace('/', '');
    
    // Connect to 'postgres' to create the new db
    urlObj.pathname = '/postgres';
    const initClient = new Client({ connectionString: urlObj.toString() });
    await initClient.connect();
    
    try {
        const res = await initClient.query(`SELECT 1 FROM pg_database WHERE datname = '${targetDbName}'`);
        if (res.rowCount === 0) {
            console.log(`🔨 Creating PostgreSQL database: ${targetDbName}`);
            await initClient.query(`CREATE DATABASE "${targetDbName}"`);
        } else {
            console.log(`✅ PostgreSQL database ${targetDbName} already exists.`);
        }
    } catch (e) {
        console.error('Error checking/creating database:', e);
    } finally {
        await initClient.end();
    }

    // 3. Connect to the target PostgreSQL DB
    const pool = new Pool({ connectionString: dbUrl });
    
    // 4. Create Tables
    console.log('🔨 Creating tables...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS campaigns (
            id VARCHAR(255) PRIMARY KEY,
            type VARCHAR(50),
            status VARCHAR(50),
            target VARCHAR(255),
            progress JSONB,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stars_campaigns (
            id VARCHAR(255) PRIMARY KEY,
            type VARCHAR(50),
            status VARCHAR(50),
            target VARCHAR(255),
            progress JSONB,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS indexer_campaigns (
            id VARCHAR(255) PRIMARY KEY,
            type VARCHAR(50),
            status VARCHAR(50),
            target VARCHAR(255),
            progress JSONB,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS view_campaigns (
            id VARCHAR(255) PRIMARY KEY,
            type VARCHAR(50),
            status VARCHAR(50),
            target VARCHAR(255),
            progress JSONB,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS upwork_campaigns (
            id VARCHAR(255) PRIMARY KEY,
            type VARCHAR(50),
            status VARCHAR(50),
            target VARCHAR(255),
            keyword VARCHAR(255),
            progress JSONB,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            campaign_id VARCHAR(255),
            type VARCHAR(50),
            message TEXT,
            module VARCHAR(100),
            timestamp TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS logs_campaign_id_idx ON logs(campaign_id);

        CREATE TABLE IF NOT EXISTS gpt_accounts (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255),
            cookies JSONB,
            status VARCHAR(50),
            last_used TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS processed_jobs (
            id VARCHAR(255) PRIMARY KEY,
            campaign_id VARCHAR(255),
            normalized_title VARCHAR(255),
            decision VARCHAR(50),
            metadata JSONB,
            created_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS processed_jobs_normalized_title_idx ON processed_jobs(normalized_title);
        CREATE INDEX IF NOT EXISTS processed_jobs_campaign_id_idx ON processed_jobs(campaign_id);

        CREATE TABLE IF NOT EXISTS data_to_export (
            id VARCHAR(255) PRIMARY KEY,
            campaign_id VARCHAR(255),
            data JSONB,
            created_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jobs_selected (
            id VARCHAR(255) PRIMARY KEY,
            campaign_id VARCHAR(255),
            title VARCHAR(255),
            description TEXT,
            open_source_viable BOOLEAN,
            created_at TIMESTAMP
        );
    `);

    // 5. Migrate Data
    const migrateCollection = async (mongoColName, pgTableName, mapFn) => {
        console.log(`📦 Migrating ${mongoColName} to ${pgTableName}...`);
        const docs = await db.collection(mongoColName).find({}).toArray();
        if (docs.length === 0) {
            console.log(`   No documents found in ${mongoColName}.`);
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const doc of docs) {
                const { query, values } = mapFn(doc);
                await client.query(query, values).catch(e => {
                    // Ignore duplicate key errors if running multiple times
                    if (e.code !== '23505') {
                        console.error(`Error inserting into ${pgTableName}:`, e);
                    }
                });
            }
            await client.query('COMMIT');
            console.log(`   Migrated ${docs.length} documents.`);
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(`❌ Error migrating ${mongoColName}:`, e);
        } finally {
            client.release();
        }
    };

    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr);
        return isNaN(d) ? new Date() : d;
    };

    const mapCampaign = (table) => (doc) => ({
        query: `INSERT INTO ${table} (id, type, status, target, progress, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        values: [doc.id, doc.type || null, doc.status || 'Stopped', doc.target || doc.keyword || null, JSON.stringify(doc.progress || {}), parseDate(doc.createdAt), parseDate(doc.updatedAt)]
    });

    if (db) {
        await migrateCollection('campaigns', 'campaigns', mapCampaign('campaigns'));
        await migrateCollection('starsCampaigns', 'stars_campaigns', mapCampaign('stars_campaigns'));
        await migrateCollection('indexerCampaigns', 'indexer_campaigns', mapCampaign('indexer_campaigns'));
        await migrateCollection('viewCampaigns', 'view_campaigns', mapCampaign('view_campaigns'));
        
        // Upwork campaigns has 'keyword' instead of 'target'
        await migrateCollection('upworkCampaigns', 'upwork_campaigns', (doc) => ({
            query: `INSERT INTO upwork_campaigns (id, type, status, target, keyword, progress, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            values: [doc.id, doc.type || null, doc.status || 'Stopped', doc.target || null, doc.keyword || null, JSON.stringify(doc.progress || {}), parseDate(doc.createdAt), parseDate(doc.updatedAt)]
        }));

        await migrateCollection('logs', 'logs', (doc) => ({
            query: `INSERT INTO logs (campaign_id, type, message, module, timestamp) VALUES ($1, $2, $3, $4, $5)`,
            values: [doc.campaignId, doc.type, doc.message, doc.module || null, parseDate(doc.timestamp)]
        }));

        await migrateCollection('gptAccounts', 'gpt_accounts', (doc) => ({
            query: `INSERT INTO gpt_accounts (id, email, cookies, status, last_used) VALUES ($1, $2, $3, $4, $5)`,
            values: [doc.id, doc.email || null, JSON.stringify(doc.cookies || []), doc.status || 'Active', parseDate(doc.lastUsed)]
        }));

        await migrateCollection('processedJobs', 'processed_jobs', (doc) => ({
            query: `INSERT INTO processed_jobs (id, campaign_id, normalized_title, decision, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            values: [doc.id, doc.campaignId || null, doc.normalizedTitle || '', doc.decision || null, JSON.stringify(doc.metadata || {}), parseDate(doc.createdAt)]
        }));

        await migrateCollection('dataToExport', 'data_to_export', (doc) => ({
            query: `INSERT INTO data_to_export (id, campaign_id, data, created_at) VALUES ($1, $2, $3, $4)`,
            values: [doc.id, doc.campaignId || null, JSON.stringify(doc.data || doc), parseDate(doc.createdAt || doc.timestamp)]
        }));

        // 6. Populate `jobs_selected` from `processedJobs`
        console.log(`📦 Populating jobs_selected from processedJobs...`);
        const yesJobs = await db.collection('processedJobs').find({ decision: 'Yes' }).toArray();
        if (yesJobs.length > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                for (const doc of yesJobs) {
                    // Try to extract title/description from metadata
                    const title = doc.metadata?.title || doc.normalizedTitle || 'Unknown Title';
                    const description = doc.metadata?.description || '';
                    
                    await client.query(
                        `INSERT INTO jobs_selected (id, campaign_id, title, description, open_source_viable, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [doc.id, doc.campaignId || null, title, description, true, parseDate(doc.createdAt)]
                    ).catch(e => {
                        if (e.code !== '23505') console.error(`Error inserting into jobs_selected:`, e);
                    });
                }
                await client.query('COMMIT');
                console.log(`   Populated ${yesJobs.length} records into jobs_selected.`);
            } catch (e) {
                await client.query('ROLLBACK');
                console.error(`❌ Error populating jobs_selected:`, e);
            } finally {
                client.release();
            }
        } else {
            console.log(`   No 'Yes' decisions found to populate jobs_selected.`);
        }
    }

    console.log('✅ Migration completed successfully!');
    await pool.end();
    await mongoClient.close();
}

migrate().catch(console.error);
