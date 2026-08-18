import re

with open("src/services/upworkCampaignManager.js", "r", encoding="utf-8") as f:
    content = f.read()

imports = """
import { UpworkEvaluator } from './chatgptScraper.js';
import { execFile } from 'child_process';
"""

content = content.replace("import { storage } from './storage.js';", "import { storage } from './storage.js';\n" + imports)

constructor_addition = """
    this.evaluators = new Map();
    this.evaluationIntervals = new Map();
"""

content = content.replace("this.running = new Map();", "this.running = new Map();\n" + constructor_addition)

run_python_addition = """
      // Start evaluator loop
      if (type === 'upwork') {
         this.startEvaluatorLoop(id, keyword);
      }
"""

content = content.replace("this.running.set(id, { process: pythonProcess, type });", "this.running.set(id, { process: pythonProcess, type });\n" + run_python_addition)

methods_addition = """
  async startEvaluatorLoop(campaignId, keyword) {
    if (this.evaluators.has(campaignId)) return;
    
    this.log(campaignId, 'info', 'Starting Upwork Evaluator session...', 'upwork');
    const evaluator = new UpworkEvaluator();
    this.evaluators.set(campaignId, evaluator);
    
    try {
        await evaluator.startSession((msg) => this.log(campaignId, 'info', `ChatGPT: ${msg}`, 'upwork'));
    } catch(err) {
        this.log(campaignId, 'error', `Failed to start ChatGPT session: ${err.message}`, 'upwork');
        return;
    }

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
                        await storage.saveViableUpworkJob(job);
                        this.log(campaignId, 'info', `✅ Job saved to MongoDB`, 'upwork');
                    }
                }
            }
        } catch(err) {
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
            } catch(e) {
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
"""

content = content.replace("async stopCampaign(id) {", methods_addition + "\n  async stopCampaign(id) {")

stop_addition = """
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
"""

content = content.replace("if (runningData && runningData.process) {", "if (runningData && runningData.process) {\n" + stop_addition)

with open("src/services/upworkCampaignManager.js", "w", encoding="utf-8") as f:
    f.write(content)
