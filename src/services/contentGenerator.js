import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ContentGenerator {
  constructor(scraper, campaignId, logFn) {
    this.scraper = scraper;
    this.campaignId = campaignId;
    this.log = logFn || ((msg) => console.log(msg));
  }

  extractJSON(text) {
    try {
      // Clean markdown code blocks if present
      let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`);
    }
  }

  getPromptTemplate(filename) {
    try {
      const promptPath = path.resolve(__dirname, '../../prompts', filename);
      return fs.readFileSync(promptPath, 'utf8');
    } catch (err) {
      this.log(`❌ Error reading prompt file ${filename}: ${err.message}`);
      return null;
    }
  }

  formatPrompt(template, job) {
    const jobDataString = `Job Title: ${job.title}\nJob Description: ${job.description}`;
    if (template.includes('<USER_REQUEST>')) {
      return template.replace('<USER_REQUEST>', `<USER_REQUEST>\n${jobDataString}\n</USER_REQUEST>`);
    } else {
      return `${template}\n\nHere is the job you need to process:\n${jobDataString}`;
    }
  }

  async processPendingJobs() {
    this.log(`🔍 Checking for pending content generation jobs...`);
    const pendingJobs = await storage.getPendingContentJobs();
    
    if (!pendingJobs || pendingJobs.length === 0) {
      return;
    }

    this.log(`📝 Found ${pendingJobs.length} jobs needing content. Starting generation...`);

    const productTemplate = this.getPromptTemplate('product-generation.txt');
    const serviceTemplate = this.getPromptTemplate('service-generation.txt');
    const blogTemplate = this.getPromptTemplate('blog-generation.txt');

    if (!productTemplate || !serviceTemplate || !blogTemplate) {
      this.log('❌ Missing one or more prompt templates. Aborting content generation.');
      return;
    }

    for (const job of pendingJobs) {
      this.log(`🚀 Generating content for job: ${job.title.substring(0, 50)}...`);
      
      try {
        // 1. Product
        this.log(`   -> Generating Product...`);
        const productPrompt = this.formatPrompt(productTemplate, job);
        const productResp = await this.scraper.generateContent(productPrompt, (msg) => this.log(`      [Product] ${msg}`));
        const productData = this.extractJSON(productResp);
        await storage.saveProduct(job.id, productData);

        // 2. Service
        this.log(`   -> Generating Service...`);
        const servicePrompt = this.formatPrompt(serviceTemplate, job);
        const serviceResp = await this.scraper.generateContent(servicePrompt, (msg) => this.log(`      [Service] ${msg}`));
        const serviceData = this.extractJSON(serviceResp);
        await storage.saveService(job.id, serviceData);

        // 3. Blog
        this.log(`   -> Generating Blog...`);
        const blogPrompt = this.formatPrompt(blogTemplate, job);
        const blogResp = await this.scraper.generateContent(blogPrompt, (msg) => this.log(`      [Blog] ${msg}`));
        const blogData = this.extractJSON(blogResp);
        await storage.saveBlog(job.id, blogData);

        // Mark as completed
        await storage.updateContentStatus(job.id, 'completed');
        this.log(`✅ Finished generating all content for job: ${job.id}`);

      } catch (err) {
        this.log(`❌ Error generating content for job ${job.id}: ${err.message}`);
        // We leave it as 'pending' so it can be retried next time, or mark as 'error'
        try {
          await storage.updateContentStatus(job.id, 'error');
        } catch (e) {
          this.log(`Failed to update error status: ${e.message}`);
        }
      }
    }
  }
}
