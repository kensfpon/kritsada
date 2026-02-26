import React from 'react';
import { Users, Briefcase, Calendar, Settings, LogOut } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { currentUser, logout } = useAppContext();

  const tabs = [
    { id: 'manpower', label: 'Manpower Tracking', icon: Users },
    { id: 'project', label: 'Project Tracking', icon: Briefcase },
    { id: 'masterplan', label: 'Master Plan', icon: Calendar },
  ];

  if (currentUser?.isAdmin) {
    tabs.push({ id: 'settings', label: 'Settings', icon: Settings });
  }

  return (
    <div className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col">
      <div className="p-6 text-xl font-bold text-white border-b border-slate-800">
        Factory Tracker
      </div>
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="text-sm text-slate-400">Logged in as</div>
        <div className="font-medium text-white truncate">{currentUser?.name}</div>
        <div className="text-xs text-indigo-400 mt-0.5">{currentUser?.role}</div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
