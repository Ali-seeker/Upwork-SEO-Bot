import EventEmitter from 'events';
import { spawn } from 'child_process';
import path from 'path';
import { storage } from './storage.js';
import { UpworkEvaluator } from './chatgptScraper.js';
import { ContentGenerator } from './contentGenerator.js';
import { execFile } from 'child_process';


class UpworkCampaignManager extends EventEmitter {
  constructor() {
    super();
    this.running = new Map();

    this.evaluators = new Map();
    this.evaluationIntervals = new Map();

    console.log('UpworkCampaignManager initialized (Python Integration Active)');
  }

  log(campaignId, level, message, type) {
    const evt = { campaignId, level, message, timestamp: Date.now() };
    this.emit('log', evt);
    console.log(`[${level}] [${campaignId}] ${message}`);

    // Save to DB so UI shows it across reloads
    storage.appendLog(campaignId, evt).catch(err => {
      console.error(`Failed to append log for ${campaignId}:`, err);
    });
  }

  setStatus(campaignId, status, type) {
    console.log(`Setting campaign ${campaignId} status to: ${status}`);
    this.emit('status', { campaignId, status });

    // Save to DB so UI doesn't say "Idle" when it's running
    if (type === 'upwork') {
      storage.updateUpworkCampaign(campaignId, { status }).catch(console.error);
    } else if (type === 'scrapeJobs') {
      storage.updateScrapeJobsCampaign(campaignId, { status }).catch(console.error);
    }
  }

  updateProgress(campaignId, processed, total) {
    const progress = { processed, total };
    console.log(`Progress update: ${processed}/${total}`);
    this.emit('progress', { campaignId, ...progress });
  }

  async startCampaign(id) {
    console.log('\n===== STARTING UPWORK CAMPAIGN =====');
    console.log('Campaign ID:', id);

    // Call the generic start logic
    return this._runPythonScraper(id, 'upwork');
  }

  async startScrapeJobsCampaign(id) {
    console.log('\n===== STARTING SCRAPE JOBS CAMPAIGN =====');
    console.log('Campaign ID:', id);

    // Call the generic start logic
    return this._runPythonScraper(id, 'scrapeJobs');
  }

  async _runPythonScraper(id, type) {
    if (this.running.get(id)) {
      this.log(id, 'warning', 'Campaign is already running', type);
      return;
    }

    try {
      let campaign = null;
      if (type === 'upwork') {
        campaign = await storage.getUpworkCampaign(id);
      } else {
        campaign = await storage.getScrapeJobsCampaign(id);
      }

      if (!campaign) {
        this.log(id, 'error', 'Campaign not found', type);
        return;
      }

      const keyword = campaign.upworkSearchInput || campaign.keywords || '';
      this.log(id, 'info', `🚀 Booting Upwork Bot for keyword: "${keyword}"...`, type);
      this.setStatus(id, 'Running', type);

      // The bot directory is one level up from the src/services folder, in upwork-discord-bot
      const botDir = path.join(process.cwd(), 'upwork-discord-bot');

      // Use -u to force unbuffered output in Python so logs stream immediately
      const args = ['-u', 'main.py'];
      if (keyword.trim() !== '') {
        args.push('--keyword');
        args.push(keyword);
      }

      this.log(id, 'info', `Running: python ${args.join(' ')}`, type);

      // Spawn the python process
      const pythonProcess = spawn('python', args, { cwd: botDir });

      // Store the process so we can kill it later along with its type
      this.running.set(id, { process: pythonProcess, type });

      // Start evaluator loop
      if (type === 'upwork') {
        this.startEvaluatorLoop(id, keyword);
      }


      // Handle stdout
      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text) {
          text.split('\n').forEach(line => {
            if (line.trim()) this.log(id, 'info', line.trim(), type);
          });
        }
      });

      // Handle stderr
      pythonProcess.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (text) {
          text.split('\n').forEach(line => {
            if (line.trim()) this.log(id, 'error', line.trim(), type);
          });
        }
      });

      // Handle process exit
      pythonProcess.on('close', (code) => {
        if (this.running.has(id)) {
          this.log(id, 'info', `🛑 Upwork Bot exited with code ${code}`, type);
          this.setStatus(id, 'Completed', type);
          this.running.delete(id);
        }
      });

      pythonProcess.on('error', (err) => {
        this.log(id, 'error', `Failed to start Python process: ${err.message}`, type);
        this.setStatus(id, 'Error', type);
        this.running.delete(id);
      });

    } catch (error) {
      this.log(id, 'error', `Failed to start campaign: ${error.message}`, type);
      this.setStatus(id, 'Error', type);
    }
  }


  async startEvaluatorLoop(campaignId, keyword) {
    if (this.evaluators.has(campaignId)) return;

    this.log(campaignId, 'info', 'Starting Upwork Evaluator session...', 'upwork');
    const evaluator = new UpworkEvaluator();
    this.evaluators.set(campaignId, evaluator);

    try {
      await evaluator.startSession((msg) => this.log(campaignId, 'info', `ChatGPT: ${msg}`, 'upwork'));
    } catch (err) {
      this.log(campaignId, 'error', `Failed to start ChatGPT session: ${err.message}`, 'upwork');
      return;
    }

    const contentGenerator = new ContentGenerator(evaluator, campaignId, (msg) => this.log(campaignId, 'info', msg, 'upwork'));

    const intervalId = setInterval(async () => {
      // Prevent concurrent evaluations in same interval
      if (evaluator.isEvaluating) return;
      evaluator.isEvaluating = true;

      try {
        const jobs = await this.getUnevaluatedJobs(keyword);
        if (jobs && jobs.length > 0) {
          this.log(campaignId, 'info', `Found ${jobs.length} unevaluated jobs. Evaluating...`, 'upwork');
          for (const job of jobs) {
            this.log(campaignId, 'info', `Evaluating job: ${job.title}`, 'upwork');
            const decision = await evaluator.evaluateJob(job, (msg) => this.log(campaignId, 'info', `ChatGPT: ${msg}`, 'upwork'));
            this.log(campaignId, 'info', `Decision for '${job.title}': ${decision}`, 'upwork');

            await this.markJobEvaluated(job.job_id, decision);

            if (decision === 'Yes') {
              job.campaignId = campaignId;
              job.keyword = keyword;
              job.id = job.job_id;
              job.decision = 'Yes';
              await storage.storeProcessedJob(job);
              this.log(campaignId, 'info', `✅ Job saved to PostgreSQL (jobs_selected)`, 'upwork');
            }
          }

          // After evaluating all unevaluated jobs in this batch, process any pending content generation
          await contentGenerator.processPendingJobs();
        } else {
          // If no unevaluated jobs were found, we can still check for pending content generation
          // just in case there are leftovers in the DB
          await contentGenerator.processPendingJobs();
        }
      } catch (err) {
        this.log(campaignId, 'error', `Evaluation error: ${err.message}`, 'upwork');
      } finally {
        evaluator.isEvaluating = false;
      }

    }, 15000); // Poll every 15 seconds

    this.evaluationIntervals.set(campaignId, intervalId);
  }

  getUnevaluatedJobs(keyword) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'upwork-discord-bot', 'get_unevaluated_jobs.py');
      execFile('python', [scriptPath, keyword], (error, stdout, stderr) => {
        if (error) {
          console.error('Error running get_unevaluated_jobs.py', error);
          return resolve([]);
        }
        try {
          const jobs = JSON.parse(stdout);
          resolve(Array.isArray(jobs) ? jobs : []);
        } catch (e) {
          console.error('JSON parse error from get_unevaluated_jobs.py', e);
          resolve([]);
        }
      });
    });
  }

  markJobEvaluated(jobId, decision) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'upwork-discord-bot', 'mark_job_evaluated.py');
      execFile('python', [scriptPath, jobId, decision], (error, stdout, stderr) => {
        if (error) {
          console.error('Error running mark_job_evaluated.py', error);
          return resolve(false);
        }
        resolve(true);
      });
    });
  }

  async stopCampaign(id) {
    console.log(`Stopping campaign ${id}...`);
    const runningData = this.running.get(id);

    // Stop evaluator loop
    if (this.evaluationIntervals.has(id)) {
      clearInterval(this.evaluationIntervals.get(id));
      this.evaluationIntervals.delete(id);
    }
    if (this.evaluators.has(id)) {
      const evaluator = this.evaluators.get(id);
      evaluator.closeSession().catch(e => console.error(e));
      this.evaluators.delete(id);
    }

    if (runningData && runningData.process) {
      const { process: pythonProcess, type } = runningData;
      this.log(id, 'warning', '🛑 Stopping Python bot...', type);
      try {
        // Kill the python child process
        pythonProcess.kill('SIGINT');
      } catch (e) {
        pythonProcess.kill();
      }
      this.running.delete(id);
      this.setStatus(id, 'Stopped', type);
      this.log(id, 'info', 'Campaign manually stopped by user.', type);
    } else {
      this.log(id, 'warning', 'Campaign was not running (in-memory). Resetting UI status to Stopped.');
      // Attempt to fix UI status since it's "Running" in MongoDB but not in memory
      try {
        const campaign = await storage.getUpworkCampaign(id);
        if (campaign) {
          this.setStatus(id, 'Stopped', 'upwork');
        } else {
          const sjCampaign = await storage.getScrapeJobsCampaign(id);
          if (sjCampaign) {
            this.setStatus(id, 'Stopped', 'scrapeJobs');
          }
        }
      } catch (e) {
        console.error("Error resetting ghost status:", e);
      }
    }
  }
}

export const upworkCampaignManager = new UpworkCampaignManager();
export default UpworkCampaignManager;