import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

class Storage {
  constructor() {
    this.pool = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    try {
      const uri = process.env.DATABASE_URL;
      if (!uri) throw new Error('DATABASE_URL environment variable is not set');

      this.pool = new Pool({
        connectionString: uri,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      await this.pool.query('SELECT 1');
      this.connected = true;
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error.message);
      throw error;
    }
  }

  async ensureConnected() {
    if (!this.connected) {
      await this.connect();
    }
  }

  async getCampaigns() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
    return res.rows.map(r => this.mapCampaignFromDb(r));
  }

  async getCampaign(id) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    return res.rows.length ? this.mapCampaignFromDb(res.rows[0]) : null;
  }

  async createCampaign(campaignData) {
    await this.ensureConnected();
    const id = uuidv4();
    let totalItems = 0;
    if (campaignData.category === 'apify') {
      totalItems = campaignData.apifyUrls?.split('\n').filter(l => l.trim()).length || 0;
    } else if (campaignData.category === 'va') {
      totalItems = campaignData.vaRepoType === 'single' ? 1 : (campaignData.vaMultipleRepoDescriptions?.split('\n').filter(l => l.trim()).length || 0);
    } else {
      totalItems = campaignData.keywords?.split('\n').filter(l => l.trim()).length || 0;
    }

    const campaign = {
      id: id,
      name: campaignData.name,
      category: campaignData.category || 'keywords',
      accountGroupId: campaignData.accountGroupId,
      gptAccountId: campaignData.gptAccountId,
      keywords: campaignData.keywords || '',
      questions: campaignData.questions || '',
      apifyUrls: campaignData.apifyUrls || '',
      vaRepoType: campaignData.vaRepoType,
      vaPlatform: campaignData.vaPlatform || 'bitbash',
      vaSingleRepoDescriptions: campaignData.vaSingleRepoDescriptions || '',
      vaMultipleRepoDescriptions: campaignData.vaMultipleRepoDescriptions || '',
      timeCoefficient: campaignData.timeCoefficient || 'balanced',
      delayBetweenRepos: campaignData.delayBetweenRepos || 900000,
      reposPerHour: campaignData.reposPerHour || 4,
      status: 'Idle',
      progress: { processed: 0, total: totalItems },
      results: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.pool.query(
      `INSERT INTO campaigns (id, type, status, target, progress, data, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, campaign.category, 'Idle', '', JSON.stringify(campaign.progress), JSON.stringify(campaign), new Date(), new Date()]
    );

    return await this.getCampaign(id);
  }

  async updateCampaign(id, updates) {
    await this.ensureConnected();
    const current = await this.getCampaign(id);
    if (!current) throw new Error(`Campaign ${id} not found`);
    
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    
    await this.pool.query(
      'UPDATE campaigns SET status = $1, progress = $2, data = $3, updated_at = $4 WHERE id = $5',
      [merged.status, JSON.stringify(merged.progress), JSON.stringify(merged), new Date(), id]
    );
    return await this.getCampaign(id);
  }

  async deleteCampaign(id) {
    await this.ensureConnected();
    const res = await this.pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new Error(`Campaign ${id} not found`);
    await this.pool.query('DELETE FROM logs WHERE campaign_id = $1', [id]);
    return true;
  }

  // --- Stars Campaigns ---
  async getStarsCampaigns() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM stars_campaigns ORDER BY created_at DESC');
    return res.rows.map(r => this.mapCampaignFromDb(r));
  }

  async getStarsCampaign(id) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM stars_campaigns WHERE id = $1', [id]);
    return res.rows.length ? this.mapCampaignFromDb(res.rows[0]) : null;
  }

  async createStarsCampaign(campaignData) {
    await this.ensureConnected();
    const id = uuidv4();
    const campaign = {
      id: id,
      name: campaignData.name,
      keyword: campaignData.keyword,
      targetUrl: campaignData.targetUrl,
      folderId: campaignData.folderId,
      folderName: campaignData.folderName || 'Unknown',
      status: 'Idle',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      stoppedAt: null,
      progress: 0,
      currentProfile: 0,
      totalProfiles: 0,
      stats: { successful: 0, skipped: 0, failed: 0 }
    };

    await this.pool.query(
      `INSERT INTO stars_campaigns (id, status, target, progress, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, 'Idle', campaignData.targetUrl || '', JSON.stringify({}), JSON.stringify(campaign), new Date(), new Date()]
    );
    return await this.getStarsCampaign(id);
  }

  async updateStarsCampaign(id, updates) {
    await this.ensureConnected();
    const current = await this.getStarsCampaign(id);
    if (!current) throw new Error(`Campaign ${id} not found`);
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query(
      'UPDATE stars_campaigns SET status = $1, progress = $2, data = $3, updated_at = $4 WHERE id = $5',
      [merged.status, JSON.stringify(merged.progress), JSON.stringify(merged), new Date(), id]
    );
    return await this.getStarsCampaign(id);
  }

  async deleteStarsCampaign(id) {
    await this.ensureConnected();
    await this.pool.query('DELETE FROM stars_campaigns WHERE id = $1', [id]);
    await this.pool.query('DELETE FROM logs WHERE campaign_id = $1', [id]);
    return true;
  }

  // --- Indexer Campaigns ---
  async getIndexerCampaigns() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM indexer_campaigns ORDER BY created_at DESC');
    return res.rows.map(r => this.mapCampaignFromDb(r));
  }

  async getIndexerCampaign(id) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM indexer_campaigns WHERE id = $1', [id]);
    return res.rows.length ? this.mapCampaignFromDb(res.rows[0]) : null;
  }

  async createIndexerCampaign(campaignData) {
    await this.ensureConnected();
    const id = nanoid();
    const totalItems = campaignData.items ? campaignData.items.length : 1;
    const campaign = {
      id: id,
      ...campaignData,
      status: 'Idle',
      results: [],
      progress: { processed: 0, total: totalItems },
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    await this.pool.query(
      `INSERT INTO indexer_campaigns (id, status, progress, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, 'Idle', JSON.stringify(campaign.progress), JSON.stringify(campaign), new Date(), new Date()]
    );
    return await this.getIndexerCampaign(id);
  }

  async updateIndexerCampaign(id, updates) {
    await this.ensureConnected();
    const current = await this.getIndexerCampaign(id);
    if (!current) throw new Error(`Campaign ${id} not found`);
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query(
      'UPDATE indexer_campaigns SET status = $1, progress = $2, data = $3, updated_at = $4 WHERE id = $5',
      [merged.status, JSON.stringify(merged.progress), JSON.stringify(merged), new Date(), id]
    );
    return await this.getIndexerCampaign(id);
  }

  async deleteIndexerCampaign(id) {
    await this.ensureConnected();
    await this.pool.query('DELETE FROM indexer_campaigns WHERE id = $1', [id]);
    await this.pool.query('DELETE FROM logs WHERE campaign_id = $1', [id]);
    return { ok: true };
  }

  // --- View Campaigns ---
  async getViewCampaigns() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM view_campaigns ORDER BY created_at DESC');
    return res.rows.map(r => this.mapCampaignFromDb(r));
  }

  async getViewCampaign(id) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM view_campaigns WHERE id = $1', [id]);
    return res.rows.length ? this.mapCampaignFromDb(res.rows[0]) : null;
  }

  async createViewCampaign(campaignData) {
    await this.ensureConnected();
    const id = uuidv4();
    const campaign = {
      id: id,
      name: campaignData.name,
      searchType: campaignData.searchType,
      searchQuery: campaignData.searchQuery,
      repoUrl: campaignData.repoUrl,
      numViews: campaignData.numViews || 1,
      status: 'Idle',
      progress: { completed: 0, total: campaignData.numViews || 1 },
      results: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.pool.query(
      `INSERT INTO view_campaigns (id, status, progress, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, 'Idle', JSON.stringify(campaign.progress), JSON.stringify(campaign), new Date(), new Date()]
    );
    return await this.getViewCampaign(id);
  }

  async updateViewCampaign(id, updates) {
    await this.ensureConnected();
    const current = await this.getViewCampaign(id);
    if (!current) throw new Error(`Campaign ${id} not found`);
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query(
      'UPDATE view_campaigns SET status = $1, progress = $2, data = $3, updated_at = $4 WHERE id = $5',
      [merged.status, JSON.stringify(merged.progress), JSON.stringify(merged), new Date(), id]
    );
    return await this.getViewCampaign(id);
  }

  async deleteViewCampaign(id) {
    await this.ensureConnected();
    await this.pool.query('DELETE FROM view_campaigns WHERE id = $1', [id]);
    await this.pool.query('DELETE FROM logs WHERE campaign_id = $1', [id]);
    return true;
  }

  // --- Upwork Campaigns ---
  async getUpworkCampaigns() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM upwork_campaigns ORDER BY created_at DESC');
    return res.rows.map(r => this.mapCampaignFromDb(r));
  }

  async getUpworkCampaign(id) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM upwork_campaigns WHERE id = $1', [id]);
    return res.rows.length ? this.mapCampaignFromDb(res.rows[0]) : null;
  }

  async createUpworkCampaign(campaignData) {
    await this.ensureConnected();
    const id = uuidv4();
    const campaign = {
      id: id,
      name: campaignData.name || campaignData.keyword || campaignData.target || '',
      keyword: campaignData.keyword,
      status: 'Idle',
      target: campaignData.target,
      progress: { processed: 0, viable: 0, total: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...campaignData
    };
    
    await this.pool.query(
      `INSERT INTO upwork_campaigns (id, type, status, target, keyword, progress, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, campaignData.category || null, 'Idle', campaignData.target || null, campaignData.keyword || null, JSON.stringify(campaign.progress), JSON.stringify(campaign), new Date(), new Date()]
    );
    return await this.getUpworkCampaign(id);
  }

  async updateUpworkCampaign(id, updates) {
    await this.ensureConnected();
    const current = await this.getUpworkCampaign(id);
    if (!current) throw new Error(`Campaign ${id} not found`);
    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query(
      'UPDATE upwork_campaigns SET status = $1, progress = $2, data = $3, updated_at = $4 WHERE id = $5',
      [merged.status, JSON.stringify(merged.progress), JSON.stringify(merged), new Date(), id]
    );
    return await this.getUpworkCampaign(id);
  }

  async deleteUpworkCampaign(id) {
    await this.ensureConnected();
    await this.pool.query('DELETE FROM upwork_campaigns WHERE id = $1', [id]);
    await this.pool.query('DELETE FROM logs WHERE campaign_id = $1', [id]);
    return true;
  }

  // ALIAS FOR SCRAPE JOBS
  async getScrapeJobsCampaigns() { return this.getUpworkCampaigns(); }
  async getScrapeJobsCampaign(id) { return this.getUpworkCampaign(id); }
  async createScrapeJobsCampaign(data) { return this.createUpworkCampaign(data); }
  async updateScrapeJobsCampaign(id, updates) { return this.updateUpworkCampaign(id, updates); }
  async deleteScrapeJobsCampaign(id) { return this.deleteUpworkCampaign(id); }

  // --- Logs ---
  async appendLog(campaignId, logEntry) {
    await this.ensureConnected();
    const now = logEntry.timestamp ? new Date(logEntry.timestamp) : new Date();
    await this.pool.query(
      'INSERT INTO logs (campaign_id, type, message, module, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [campaignId, logEntry.level, logEntry.message, logEntry.module || null, now]
    );
    return logEntry;
  }

  async getLogs(campaignId, since = 0) {
    await this.ensureConnected();
    const sinceDate = new Date(since);
    const res = await this.pool.query(
      'SELECT * FROM logs WHERE campaign_id = $1 AND timestamp > $2 ORDER BY timestamp ASC',
      [campaignId, sinceDate]
    );
    return res.rows.map(row => ({
      id: row.id,
      campaignId: row.campaign_id,
      level: row.type,
      message: row.message,
      timestamp: new Date(row.timestamp).getTime()
    }));
  }

  async clearLogs(campaignId) {
    await this.ensureConnected();
    await this.pool.query('DELETE FROM logs WHERE campaign_id = $1', [campaignId]);
    return true;
  }

  // --- GPT Accounts ---
  async getGPTAccounts() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM gpt_accounts ORDER BY last_used DESC');
    return res.rows.map(r => this.mapAccountFromDb(r));
  }

  async getGPTAccount(id) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT * FROM gpt_accounts WHERE id = $1', [id]);
    return res.rows.length ? this.mapAccountFromDb(res.rows[0]) : null;
  }

  async createGPTAccount(data) {
    await this.ensureConnected();
    const id = nanoid();
    await this.pool.query(
      'INSERT INTO gpt_accounts (id, email, cookies, status, last_used) VALUES ($1, $2, $3, $4, $5)',
      [id, data.name, JSON.stringify(data.cookies || []), 'Active', new Date()]
    );
    return await this.getGPTAccount(id);
  }

  async updateGPTAccount(id, updates) {
    await this.ensureConnected();
    const current = await this.getGPTAccount(id);
    if (!current) throw new Error('Account not found');
    const newStatus = updates.status !== undefined ? updates.status : current.status;
    const newCookies = updates.cookies !== undefined ? JSON.stringify(updates.cookies) : JSON.stringify(current.cookies);
    await this.pool.query(
      'UPDATE gpt_accounts SET status = $1, cookies = $2, last_used = $3 WHERE id = $4',
      [newStatus, newCookies, new Date(), id]
    );
    return true;
  }

  async deleteGPTAccount(id) {
    await this.ensureConnected();
    await this.pool.query('DELETE FROM gpt_accounts WHERE id = $1', [id]);
    return true;
  }

  // --- Processed Jobs ---
  async checkJobDuplicate(title, description, similarityThreshold = 0.85) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT id FROM processed_jobs WHERE normalized_title = $1 LIMIT 1', [this.normalizeString(title)]);
    return res.rows.length > 0;
  }

  async storeProcessedJob(jobData) {
    await this.ensureConnected();
    const id = jobData.id || uuidv4();
    const normTitle = this.normalizeString(jobData.title || '');
    
    await this.pool.query(
      `INSERT INTO processed_jobs (id, campaign_id, normalized_title, decision, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [id, jobData.campaignId || null, normTitle, jobData.decision || null, JSON.stringify(jobData), new Date()]
    );
    
    // Check if decision is Yes, add to jobs_selected
    if (jobData.decision === 'Yes') {
       await this.pool.query(
          `INSERT INTO jobs_selected (id, campaign_id, title, description, open_source_viable, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [id, jobData.campaignId || null, jobData.title || normTitle, jobData.description || '', true, new Date()]
       );
    }
    
    return true;
  }

  async getProcessedJobsForCampaign(campaignId) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT metadata FROM processed_jobs WHERE campaign_id = $1 ORDER BY created_at DESC', [campaignId]);
    return res.rows.map(r => r.metadata);
  }

  async getProcessedJobsStats() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT COUNT(*) as total FROM processed_jobs');
    const viable = await this.pool.query("SELECT COUNT(*) as v FROM processed_jobs WHERE decision = 'Yes'");
    return {
      totalProcessed: parseInt(res.rows[0].total) || 0,
      totalViable: parseInt(viable.rows[0].v) || 0
    };
  }

  async clearOldProcessedJobs(daysOld = 30) {
    await this.ensureConnected();
    const date = new Date();
    date.setDate(date.getDate() - daysOld);
    await this.pool.query('DELETE FROM processed_jobs WHERE created_at < $1', [date]);
  }

  // --- Data to Export ---
  async storeDataToExport(exportData) {
    await this.ensureConnected();
    const id = exportData.id || uuidv4();
    await this.pool.query(
      'INSERT INTO data_to_export (id, campaign_id, data, created_at) VALUES ($1, $2, $3, $4)',
      [id, exportData.campaignId || null, JSON.stringify(exportData), new Date()]
    );
    return true;
  }

  async getExportDataByCampaign(campaignId) {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT data FROM data_to_export WHERE campaign_id = $1 ORDER BY created_at DESC', [campaignId]);
    return res.rows.map(r => r.data);
  }

  async getAllExportData() {
    await this.ensureConnected();
    const res = await this.pool.query('SELECT data FROM data_to_export ORDER BY created_at DESC');
    return res.rows.map(r => r.data);
  }

  async deleteExportDataByCampaign(campaignId) {
    await this.ensureConnected();
    await this.pool.query('DELETE FROM data_to_export WHERE campaign_id = $1', [campaignId]);
    return true;
  }

  async getPendingContentJobs() {
    await this.ensureConnected();
    const res = await this.pool.query("SELECT * FROM jobs_selected WHERE content_status = 'pending' ORDER BY created_at ASC");
    return res.rows;
  }

  async updateContentStatus(jobId, status) {
    await this.ensureConnected();
    await this.pool.query("UPDATE jobs_selected SET content_status = $1 WHERE id = $2", [status, jobId]);
    return true;
  }

  async saveProduct(jobId, content) {
    await this.ensureConnected();
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO product (
        id, "source_job_id", "name", "slug", "category", "shortDesc", "description",
        "problem", "solution", "valueProp", "targetCustomer", "features", "technologies",
        "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING`,
      [
        id, jobId, content.name || 'Generated Product', content.slug || id, content.category || 'Software',
        content.shortDesc || '', content.description || '', content.problem || '', content.solution || '',
        content.valueProp || '', content.targetCustomer || '', content.features || [], content.technologies || [],
        content.status || 'draft', new Date(), new Date()
      ]
    );
    return true;
  }

  async saveService(jobId, content) {
    await this.ensureConnected();
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO services (
        id, "source_job_id", "name", "slug", "category", "shortDesc", "description",
        "problem", "benefits", "deliverables", "process", "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING`,
      [
        id, jobId, content.name || 'Generated Service', content.slug || id, content.category || 'Consulting',
        content.shortDesc || '', content.description || '', content.problem || '', content.benefits || [],
        content.deliverables || [], content.process || [], content.status || 'draft', new Date(), new Date()
      ]
    );
    return true;
  }

  async saveBlog(jobId, content) {
    await this.ensureConnected();
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO blog (
        id, "source_job_id", "title", "slug", "category", "excerpt", "content",
        "author", "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [
        id, jobId, content.title || 'Generated Blog', content.slug || id, content.category || 'News',
        content.excerpt || '', content.content || '', content.author || 'Admin', content.status || 'draft',
        new Date(), new Date()
      ]
    );
    return true;
  }

  // --- Helpers ---
  normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  mapCampaignFromDb(row) {
    if (row.data) {
       return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    }
    return {
      id: row.id,
      name: row.target || row.keyword || '',
      category: row.type || 'keywords',
      status: row.status,
      target: row.target,
      progress: row.progress || { processed: 0, total: 0 },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  mapAccountFromDb(row) {
    return {
      id: row.id,
      name: row.email,
      email: row.email,
      cookies: row.cookies,
      status: row.status,
      lastUsed: row.last_used
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
    }
  }
}

export const storage = new Storage();
