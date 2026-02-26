import React, { useState, useMemo } from 'react';
import { useAppContext, Project } from '../lib/AppContext';
import { ExportButton } from './ExportButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, isWithinInterval, startOfWeek, startOfMonth, differenceInDays } from 'date-fns';
import { Search, ArrowUpDown, Edit2, X, Check } from 'lucide-react';

const COLORS = ['#10b981', '#4f46e5', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function ProjectTracking() {
  const { currentUser, projects, users, factories, addProject, updateProject } = useAppContext();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-28'));
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // New/Edit project form state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectFactoryId, setNewProjectFactoryId] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('Not Started');
  const [newProjectProgress, setNewProjectProgress] = useState(0);
  const [newProjectStartDate, setNewProjectStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newProjectEndDate, setNewProjectEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newProjectAssignedUsers, setNewProjectAssignedUsers] = useState<string[]>(currentUser?.isAdmin ? [] : [currentUser?.id || '']);

  const handleEditClick = (project: Project) => {
    setEditingProjectId(project.id);
    setNewProjectName(project.name);
    setNewProjectFactoryId(project.factoryId);
    setNewProjectStatus(project.status);
    setNewProjectProgress(project.progress);
    setNewProjectStartDate(project.startDate);
    setNewProjectEndDate(project.endDate);
    setNewProjectAssignedUsers(project.assignedUserIds);
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setNewProjectName('');
    setNewProjectFactoryId('');
    setNewProjectStatus('Not Started');
    setNewProjectProgress(0);
    setNewProjectStartDate(format(new Date(), 'yyyy-MM-dd'));
    setNewProjectEndDate(format(new Date(), 'yyyy-MM-dd'));
    setNewProjectAssignedUsers(currentUser?.isAdmin ? [] : [currentUser?.id || '']);
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectFactoryId || !newProjectStartDate || !newProjectEndDate) return;
    
    if (editingProjectId) {
      updateProject({
        id: editingProjectId,
        name: newProjectName,
        factoryId: newProjectFactoryId,
        status: newProjectStatus,
        progress: newProjectProgress,
        startDate: newProjectStartDate,
        endDate: newProjectEndDate,
        assignedUserIds: newProjectAssignedUsers,
      });
      setEditingProjectId(null);
    } else {
      addProject({
        id: `p${Date.now()}`,
        name: newProjectName,
        factoryId: newProjectFactoryId,
        status: newProjectStatus,
        progress: newProjectProgress,
        startDate: newProjectStartDate,
        endDate: newProjectEndDate,
        assignedUserIds: newProjectAssignedUsers,
      });
    }

    // Reset form fields
    setNewProjectName('');
    setNewProjectFactoryId('');
    setNewProjectProgress(0);
    setNewProjectStatus('Not Started');
    setNewProjectStartDate(format(new Date(), 'yyyy-MM-dd'));
    setNewProjectEndDate(format(new Date(), 'yyyy-MM-dd'));
    setNewProjectAssignedUsers(currentUser?.isAdmin ? [] : [currentUser?.id || '']);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      // Role-based filtering
      if (!currentUser?.isAdmin && !project.assignedUserIds.includes(currentUser?.id || '')) return false;

      const pStart = parseISO(project.startDate);
      const pEnd = parseISO(project.endDate);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const inRange = isWithinInterval(pStart, { start, end }) || isWithinInterval(pEnd, { start, end });

      if (!inRange) return false;
      if (!searchQuery) return true;

      const factory = factories.find(f => f.id === project.factoryId);
      const searchLower = searchQuery.toLowerCase();

      return (
        project.name.toLowerCase().includes(searchLower) ||
        (factory?.name.toLowerCase() || '').includes(searchLower)
      );
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        if (sortConfig.key === 'factory') {
          aValue = factories.find(f => f.id === a.factoryId)?.name || '';
          bValue = factories.find(f => f.id === b.factoryId)?.name || '';
        } else if (sortConfig.key === 'duration') {
          aValue = differenceInDays(parseISO(a.endDate), parseISO(a.startDate));
          bValue = differenceInDays(parseISO(b.endDate), parseISO(b.startDate));
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [projects, startDate, endDate, searchQuery, sortConfig, factories, currentUser]);

  const userChartsData = useMemo(() => {
    const charts: Record<string, { userName: string, data: any[] }> = {};
    
    // Initialize charts for users we want to show
    const usersToShow = currentUser?.isAdmin ? users : users.filter(u => u.id === currentUser?.id);
    
    usersToShow.forEach(user => {
      charts[user.id] = { userName: user.name, data: [] };
      
      const dataMap: Record<string, number> = {};
      
      filteredProjects.filter(p => p.assignedUserIds.includes(user.id)).forEach(project => {
        const date = parseISO(project.startDate);
        let key = '';
        if (groupBy === 'week') {
          key = `Week of ${format(startOfWeek(date), 'MMM dd')}`;
        } else {
          key = format(startOfMonth(date), 'MMM yyyy');
        }
        dataMap[key] = (dataMap[key] || 0) + 1;
      });

      charts[user.id].data = Object.entries(dataMap).map(([name, count]) => ({ name, count }));
    });

    return Object.values(charts).filter(chart => chart.data.length > 0);
  }, [filteredProjects, groupBy, users, currentUser]);

  const exportData = filteredProjects.map(project => {
    const factory = factories.find(f => f.id === project.factoryId);
    const assignedUsers = project.assignedUserIds.map(uid => users.find(u => u.id === uid)?.name).join(', ');
    return {
      ProjectName: project.name,
      Factory: factory?.name || 'Unknown',
      Location: factory?.location || 'Unknown',
      Status: project.status,
      Progress: `${project.progress}%`,
      StartDate: project.startDate,
      EndDate: project.endDate,
      AssignedUsers: assignedUsers,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Project Tracking</h1>
        <ExportButton data={exportData} filename="Project_Tracking" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{editingProjectId ? 'Edit Project' : 'Add New Project'}</h2>
        <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Project Name</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Upgrade Line 1"
              required
              disabled={!currentUser?.isAdmin && !!editingProjectId}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Factory</label>
            <select
              value={newProjectFactoryId}
              onChange={(e) => setNewProjectFactoryId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              required
            >
              <option value="" disabled>Select Factory</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>{factory.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Status</label>
            <select
              value={newProjectStatus}
              onChange={(e) => setNewProjectStatus(e.target.value as any)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Progress (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={newProjectProgress}
              onChange={(e) => setNewProjectProgress(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={newProjectStartDate}
              onChange={(e) => setNewProjectStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={newProjectEndDate}
              onChange={(e) => setNewProjectEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-slate-500 mb-1">Assigned Users (Hold Ctrl/Cmd to select multiple)</label>
            <select
              multiple
              value={newProjectAssignedUsers}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions, option => option.value);
                setNewProjectAssignedUsers(options);
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white h-24"
              disabled={!currentUser?.isAdmin}
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2 space-x-3">
            {editingProjectId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center space-x-2"
            >
              {editingProjectId ? <><Check size={18} /><span>Save Changes</span></> : <span>Add Project</span>}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-slate-500 mb-1">Search Projects</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project or factory..."
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-slate-500 mb-1">Start Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-slate-500 mb-1">End Date</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-slate-500 mb-1">Group By</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setGroupBy('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${groupBy === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGroupBy('month')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${groupBy === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {userChartsData.map((chart, index) => (
          <div key={chart.userName} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Projects - {chart.userName}</h2>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} name="Projects" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
        {userChartsData.length === 0 && (
          <div className="col-span-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center text-slate-500 py-12">
            No chart data available for the selected period.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center space-x-1"><span>Project</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('factory')}>
                  <div className="flex items-center space-x-1"><span>Factory</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center space-x-1"><span>Status</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('progress')}>
                  <div className="flex items-center space-x-1"><span>Progress</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('startDate')}>
                  <div className="flex items-center space-x-1"><span>Timeline</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('duration')}>
                  <div className="flex items-center space-x-1"><span>Duration</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(project => {
                  const factory = factories.find(f => f.id === project.factoryId);
                  const assignedUsers = project.assignedUserIds.map(uid => users.find(u => u.id === uid)?.name).join(', ');
                  const duration = differenceInDays(parseISO(project.endDate), parseISO(project.startDate)) + 1;
                  const canEdit = currentUser?.isAdmin || project.assignedUserIds.includes(currentUser?.id || '');
                  return (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{project.name}</td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">{factory?.name}</div>
                        <div className="text-xs text-slate-500">{factory?.location}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          project.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          project.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-full bg-slate-200 rounded-full h-2 max-w-[100px]">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div className="text-xs">{project.startDate}</div>
                        <div className="text-xs text-slate-500">to {project.endDate}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{duration} days</td>
                      <td className="px-6 py-4 text-slate-700">{assignedUsers}</td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button 
                            onClick={() => handleEditClick(project)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit Project"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No projects found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
