'use client';

import React, { useState } from 'react';
import { AppProvider, useAppContext } from '../lib/AppContext';
import { Sidebar } from '../components/Sidebar';
import { ManpowerTracking } from '../components/ManpowerTracking';
import { ProjectTracking } from '../components/ProjectTracking';
import { MasterPlan } from '../components/MasterPlan';
import { Settings } from '../components/Settings';
import { Login } from '../components/Login';

function DashboardContent() {
  const { currentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState('manpower');

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'manpower' && <ManpowerTracking />}
        {activeTab === 'project' && <ProjectTracking />}
        {activeTab === 'masterplan' && <MasterPlan />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
