import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
// import StarsCampaign from './pages/Starscampaign.jsx';
// import IndexerChecker from './pages/IndexerChecker.jsx';
// import RepoViews from './pages/RepoViews.jsx';
import Campaigns from './pages/Campaigns.jsx';



createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/" element={<App />}> 
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          {/* <Route path="/stars-campaign" element={<StarsCampaign />} /> */}
          {/* <Route path="/indexer-checker" element={<IndexerChecker />} /> */}

          {/* <Route path="/repo-views" element={<RepoViews />} /> */}
          <Route path="/settings" element={<Settings />} />

        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
