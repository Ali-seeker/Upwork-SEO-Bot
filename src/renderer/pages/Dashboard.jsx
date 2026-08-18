import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, TrendingUp, Activity, Zap, Users, GitBranch, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    runningCampaigns: 0,
    completedCampaigns: 0,
    totalRepos: 0,
    successRate: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      if (window.api && window.api.listCampaigns) {
        const campaigns = await window.api.listCampaigns();
        
        const total = campaigns.length;
        const running = campaigns.filter(c => c.status === 'Running').length;
        const completed = campaigns.filter(c => c.status === 'Completed').length;
        
        let totalRepos = 0;
        let successfulRepos = 0;
        
        campaigns.forEach(campaign => {
          if (campaign.results) {
            totalRepos += campaign.results.length;
            successfulRepos += campaign.results.filter(r => r.status === 'success').length;
          }
        });
        
        const successRate = totalRepos > 0 ? Math.round((successfulRepos / totalRepos) * 100) : 0;
        
        setStats({
          totalCampaigns: total,
          runningCampaigns: running,
          completedCampaigns: completed,
          totalRepos: successfulRepos,
          successRate
        });

        // Get recent activity (last 5 campaigns)
        const recent = campaigns
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 5);
        setRecentActivity(recent);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: 'Total Campaigns',
      value: stats.totalCampaigns,
      icon: Server,
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Running Now',
      value: stats.runningCampaigns,
      icon: Zap,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
      animate: stats.runningCampaigns > 0
    },
    {
      title: 'Repositories Created',
      value: stats.totalRepos,
      icon: GitBranch,
      color: 'green',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: 'yellow',
      gradient: 'from-yellow-500 to-orange-500'
    }
  ];

  const features = [
    {
      icon: Server,
      title: 'AI-Powered Generation',
      description: 'Leverage ChatGPT to generate repository metadata automatically',
      color: 'purple'
    },
    {
      icon: Zap,
      title: 'Bulk Automation',
      description: 'Process multiple keywords and create repositories in batches',
      color: 'blue'
    },
    {
      icon: Activity,
      title: 'Real-time Monitoring',
      description: 'Track campaign progress and view detailed execution logs',
      color: 'green'
    }
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border border-purple-500/20 rounded-3xl p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 animate-pulse" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-neutral-400">Overview of your automation activity</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all overflow-hidden"
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-neutral-400">{card.title}</span>
                <div className={`w-10 h-10 rounded-xl bg-${card.color}-500/10 flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 text-${card.color}-400 ${card.animate ? 'animate-pulse' : ''}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-neutral-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}