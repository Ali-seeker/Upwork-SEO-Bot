import EventEmitter from 'node:events';

class CampaignManager extends EventEmitter {
  constructor() {
    super();
    this.running = new Map();
    console.log('CampaignManager initialized (GitHub functionality removed)');
  }

  log(campaignId, level, message) {
    const evt = { campaignId, level, message, timestamp: Date.now() };
    this.emit('log', evt);
    console.log(`[${level}] [${campaignId}] ${message}`);
  }

  setStatus(campaignId, status) {
    console.log(`Setting campaign ${campaignId} status to: ${status}`);
    this.emit('status', { campaignId, status });
  }

  updateProgress(campaignId, processed, total) {
    const progress = { processed, total };
    console.log(`Progress update: ${processed}/${total}`);
    this.emit('progress', { campaignId, ...progress });
  }

  async startCampaign(id) {
    console.log('\n===== STARTING CAMPAIGN =====');
    console.log('Campaign ID:', id);
    
    if (this.running.get(id)) {
      this.log(id, 'warning', 'Campaign is already running');
      return;
    }

    this.running.set(id, true);
    this.setStatus(id, 'Running');

    this.log(id, 'info', 'Campaign execution skipped: GitHub integration has been removed.');
    this.setStatus(id, 'Completed');
    this.running.delete(id);
  }
}

export const campaignManager = new CampaignManager();
export default CampaignManager;