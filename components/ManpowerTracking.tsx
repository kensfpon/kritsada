import React, { useState, useMemo } from 'react';
import { useAppContext, ManpowerTask } from '../lib/AppContext';
import { ExportButton } from './ExportButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, isWithinInterval, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { Search, ArrowUpDown, Edit2, X, Check } from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function ManpowerTracking() {
  const { currentUser, manpowerTasks, users, factories, addManpowerTask, updateManpowerTask } = useAppContext();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-28'));
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // New/Edit task form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskUserId, setNewTaskUserId] = useState(currentUser?.id || '');
  const [newTaskFactoryId, setNewTaskFactoryId] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTaskStartTime, setNewTaskStartTime] = useState('08:00');
  const [newTaskEndTime, setNewTaskEndTime] = useState('17:00');

  const handleEditClick = (task: ManpowerTask) => {
    setEditingTaskId(task.id);
    setNewTaskUserId(task.userId);
    setNewTaskFactoryId(task.factoryId);
    setNewTaskDescription(task.description);
    setNewTaskDate(task.date);
    setNewTaskStartTime(task.startTime);
    setNewTaskEndTime(task.endTime);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setNewTaskUserId(currentUser?.id || '');
    setNewTaskFactoryId('');
    setNewTaskDescription('');
    setNewTaskDate(format(new Date(), 'yyyy-MM-dd'));
    setNewTaskStartTime('08:00');
    setNewTaskEndTime('17:00');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskUserId || !newTaskFactoryId || !newTaskDescription || !newTaskDate || !newTaskStartTime || !newTaskEndTime) return;
    
    if (editingTaskId) {
      updateManpowerTask({
        id: editingTaskId,
        userId: newTaskUserId,
        factoryId: newTaskFactoryId,
        description: newTaskDescription,
        date: newTaskDate,
        startTime: newTaskStartTime,
        endTime: newTaskEndTime,
      });
      setEditingTaskId(null);
    } else {
      addManpowerTask({
        id: `mt${Date.now()}`,
        userId: newTaskUserId,
        factoryId: newTaskFactoryId,
        description: newTaskDescription,
        date: newTaskDate,
        startTime: newTaskStartTime,
        endTime: newTaskEndTime,
      });
    }

    // Reset form fields
    setNewTaskUserId(currentUser?.id || '');
    setNewTaskFactoryId('');
    setNewTaskDescription('');
    setNewTaskDate(format(new Date(), 'yyyy-MM-dd'));
    setNewTaskStartTime('08:00');
    setNewTaskEndTime('17:00');
  };

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(`2000-01-01T${start}`).getTime();
    const endTime = new Date(`2000-01-01T${end}`).getTime();
    return (endTime - startTime) / (1000 * 60 * 60);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredTasks = useMemo(() => {
    let filtered = manpowerTasks.filter(task => {
      // Role-based filtering
      if (!currentUser?.isAdmin && task.userId !== currentUser?.id) return false;

      const taskDate = parseISO(task.date);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const inRange = isWithinInterval(taskDate, { start, end });
      
      if (!inRange) return false;
      if (!searchQuery) return true;

      const user = users.find(u => u.id === task.userId);
      const factory = factories.find(f => f.id === task.factoryId);
      const searchLower = searchQuery.toLowerCase();

      return (
        task.description.toLowerCase().includes(searchLower) ||
        (user?.name.toLowerCase() || '').includes(searchLower) ||
        (factory?.name.toLowerCase() || '').includes(searchLower)
      );
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        if (sortConfig.key === 'user') {
          aValue = users.find(u => u.id === a.userId)?.name || '';
          bValue = users.find(u => u.id === b.userId)?.name || '';
        } else if (sortConfig.key === 'factory') {
          aValue = factories.find(f => f.id === a.factoryId)?.name || '';
          bValue = factories.find(f => f.id === b.factoryId)?.name || '';
        } else if (sortConfig.key === 'duration') {
          aValue = calculateDuration(a.startTime, a.endTime);
          bValue = calculateDuration(b.startTime, b.endTime);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [manpowerTasks, startDate, endDate, searchQuery, sortConfig, users, factories, currentUser]);

  const userChartsData = useMemo(() => {
    const charts: Record<string, { userName: string, data: any[] }> = {};
    
    // Initialize charts for users we want to show
    const usersToShow = currentUser?.isAdmin ? users : users.filter(u => u.id === currentUser?.id);
    
    usersToShow.forEach(user => {
      charts[user.id] = { userName: user.name, data: [] };
      
      // Pre-fill data structure based on group by
      const dataMap: Record<string, number> = {};
      
      filteredTasks.filter(t => t.userId === user.id).forEach(task => {
        const date = parseISO(task.date);
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
  }, [filteredTasks, groupBy, users, currentUser]);

  const exportData = filteredTasks.map(task => {
    const user = users.find(u => u.id === task.userId);
    const factory = factories.find(f => f.id === task.factoryId);
    return {
      Date: task.date,
      User: user?.name || 'Unknown',
      Role: user?.role || 'Unknown',
      Factory: factory?.name || 'Unknown',
      Location: factory?.location || 'Unknown',
      Task: task.description,
      StartTime: task.startTime,
      EndTime: task.endTime,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Manpower Tracking</h1>
        <ExportButton data={exportData} filename="Manpower_Tracking" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h2>
        <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">User</label>
            <select
              value={newTaskUserId}
              onChange={(e) => setNewTaskUserId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              required
              disabled={!currentUser?.isAdmin}
            >
              <option value="" disabled>Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Factory</label>
            <select
              value={newTaskFactoryId}
              onChange={(e) => setNewTaskFactoryId(e.target.value)}
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
            <label className="text-sm font-medium text-slate-500 mb-1">Description</label>
            <input
              type="text"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Task description"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Start Time</label>
            <input
              type="time"
              value={newTaskStartTime}
              onChange={(e) => setNewTaskStartTime(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">End Time</label>
            <input
              type="time"
              value={newTaskEndTime}
              onChange={(e) => setNewTaskEndTime(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2 space-x-3">
            {editingTaskId && (
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
              {editingTaskId ? <><Check size={18} /><span>Save Changes</span></> : <span>Add Task</span>}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-slate-500 mb-1">Search Tasks</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by task, user, or factory..."
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
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Task Count - {chart.userName}</h2>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} name="Tasks" />
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
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('date')}>
                  <div className="flex items-center space-x-1"><span>Date</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('user')}>
                  <div className="flex items-center space-x-1"><span>User</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('factory')}>
                  <div className="flex items-center space-x-1"><span>Factory</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('description')}>
                  <div className="flex items-center space-x-1"><span>Task</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('duration')}>
                  <div className="flex items-center space-x-1"><span>Duration</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => {
                  const user = users.find(u => u.id === task.userId);
                  const factory = factories.find(f => f.id === task.factoryId);
                  const duration = calculateDuration(task.startTime, task.endTime);
                  const canEdit = currentUser?.isAdmin || currentUser?.id === task.userId;
                  return (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-700">{task.date}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{user?.name}</div>
                        <div className="text-xs text-slate-500">{user?.role}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">{factory?.name}</div>
                        <div className="text-xs text-slate-500">{factory?.location}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{task.description}</td>
                      <td className="px-6 py-4 text-slate-700">{task.startTime} - {task.endTime}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{duration.toFixed(1)} hrs</td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button 
                            onClick={() => handleEditClick(task)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit Task"
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
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No tasks found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
