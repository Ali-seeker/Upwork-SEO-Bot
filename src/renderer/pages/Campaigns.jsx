import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, LayoutDashboard } from 'lucide-react';
import CampaignList from '../components/CampaignList';
import CreateCampaignModal from '../components/CreateCampaignModal';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadCampaigns();
    
    // Listen for campaign updates from main process
    const handleCampaignUpdate = () => {
      loadCampaigns();
    };

    if (window.api) {
      // Assuming these event listeners exist in your preload/main
      window.api.onCampaignStatus?.(handleCampaignUpdate);
      window.api.onUpworkCampaignStatus?.(handleCampaignUpdate);
      window.api.onScrapeJobsCampaignStatus?.(handleCampaignUpdate);
      window.api.onProgress?.(handleCampaignUpdate);
    }
    
    const interval = setInterval(loadCampaigns, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadCampaigns = async () => {
    if (window.api) {
      let allCampaigns = [];
      if (window.api.listCampaigns) {
        const data = await window.api.listCampaigns();
        allCampaigns = [...allCampaigns, ...(data || [])];
      }
      if (window.api.listUpworkCampaigns) {
        const data = await window.api.listUpworkCampaigns();
        allCampaigns = [...allCampaigns, ...(data || [])];
      }
      setCampaigns(allCampaigns);
    }
  };

  const handleCreateCampaign = async (campaignData) => {
    if (window.api && window.api.createCampaign) {
      await window.api.createCampaign(campaignData);
      loadCampaigns();
    }
  };

  const handleStartCampaign = async (id) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      if (campaign.category === 'upwork' && window.api.startUpworkCampaign) {
        await window.api.startUpworkCampaign(id);
      } else if (campaign.category === 'scrape-jobs' && window.api.startScrapeJobsCampaign) {
        await window.api.startScrapeJobsCampaign(id);
      } else if (window.api.startCampaign) {
        await window.api.startCampaign(id);
      }
      loadCampaigns();
    }
  };

  const handleStopCampaign = async (id) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      if (campaign.category === 'upwork' && window.api.stopUpworkCampaign) {
        await window.api.stopUpworkCampaign(id);
      } else if (campaign.category === 'scrape-jobs' && window.api.stopScrapeJobsCampaign) {
        await window.api.stopScrapeJobsCampaign(id);
      } else if (window.api.stopCampaign) {
        await window.api.stopCampaign(id);
      }
      loadCampaigns();
    }
  };

  const handleDeleteCampaign = async (id) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      if (campaign.category === 'upwork' && window.api.deleteUpworkCampaign) {
        await window.api.deleteUpworkCampaign(id);
      } else if (campaign.category === 'scrape-jobs' && window.api.deleteScrapeJobsCampaign) {
        await window.api.deleteScrapeJobsCampaign(id);
      } else if (window.api.deleteCampaign) {
        await window.api.deleteCampaign(id);
      }
      loadCampaigns();
    }
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Campaigns</h1>
            <p className="text-neutral-400">Manage and run your automation campaigns</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
        >
          <Plus className="w-5 h-5" />
          Create Campaign
        </button>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CampaignList
          campaigns={campaigns}
          onStart={handleStartCampaign}
          onStop={handleStopCampaign}
          onDelete={handleDeleteCampaign}
        />
      </motion.div>

      {/* Modals */}
      <CreateCampaignModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCampaign}
      />
    </div>
  );
}
