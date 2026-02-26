import React, { useMemo, useState } from 'react';
import { useAppContext, MasterPlanTask } from '../lib/AppContext';
import { ExportButton } from './ExportButton';
import { differenceInDays, parseISO, format, addDays, startOfWeek, endOfWeek, differenceInWeeks, addWeeks, startOfMonth, differenceInMonths, addMonths } from 'date-fns';
import { Search, ArrowUpDown, Edit2, X, Check } from 'lucide-react';

export function MasterPlan() {
  const { currentUser, masterPlanTasks, projects, addMasterPlanTask, updateMasterPlanTask } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [ganttView, setGanttView] = useState<'day' | 'week' | 'month'>('day');

  // New/Edit master plan task form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('Not Started');
  const [newTaskProgress, setNewTaskProgress] = useState(0);
  const [newTaskStartDate, setNewTaskStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTaskEndDate, setNewTaskEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleEditClick = (task: MasterPlanTask) => {
    setEditingTaskId(task.id);
    setNewTaskProjectId(task.projectId);
    setNewTaskName(task.name);
    setNewTaskStatus(task.status);
    setNewTaskProgress(task.progress);
    setNewTaskStartDate(task.startDate);
    setNewTaskEndDate(task.endDate);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setNewTaskProjectId('');
    setNewTaskName('');
    setNewTaskStatus('Not Started');
    setNewTaskProgress(0);
    setNewTaskStartDate(format(new Date(), 'yyyy-MM-dd'));
    setNewTaskEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskProjectId || !newTaskName || !newTaskStartDate || !newTaskEndDate) return;
    
    if (editingTaskId) {
      updateMasterPlanTask({
        id: editingTaskId,
        projectId: newTaskProjectId,
        name: newTaskName,
        status: newTaskStatus,
        progress: newTaskProgress,
        startDate: newTaskStartDate,
        endDate: newTaskEndDate,
      });
      setEditingTaskId(null);
    } else {
      addMasterPlanTask({
        id: `mpt${Date.now()}`,
        projectId: newTaskProjectId,
        name: newTaskName,
        status: newTaskStatus,
        progress: newTaskProgress,
        startDate: newTaskStartDate,
        endDate: newTaskEndDate,
      });
    }

    // Reset form fields
    setNewTaskProjectId('');
    setNewTaskName('');
    setNewTaskProgress(0);
    setNewTaskStatus('Not Started');
    setNewTaskStartDate(format(new Date(), 'yyyy-MM-dd'));
    setNewTaskEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter projects based on user role
  const visibleProjects = useMemo(() => {
    if (currentUser?.isAdmin) return projects;
    return projects.filter(p => p.assignedUserIds.includes(currentUser?.id || ''));
  }, [projects, currentUser]);

  const filteredTasks = useMemo(() => {
    let filtered = masterPlanTasks.filter(task => {
      // Role-based filtering: only show tasks for projects the user is assigned to
      const project = projects.find(p => p.id === task.projectId);
      if (!currentUser?.isAdmin && (!project || !project.assignedUserIds.includes(currentUser?.id || ''))) {
        return false;
      }

      if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) return false;
      if (!searchQuery) return true;

      const searchLower = searchQuery.toLowerCase();

      return (
        task.name.toLowerCase().includes(searchLower) ||
        (project?.name.toLowerCase() || '').includes(searchLower)
      );
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        if (sortConfig.key === 'project') {
          aValue = projects.find(p => p.id === a.projectId)?.name || '';
          bValue = projects.find(p => p.id === b.projectId)?.name || '';
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
  }, [masterPlanTasks, projects, searchQuery, selectedProjectId, sortConfig, currentUser]);

  const exportData = filteredTasks.map(task => {
    const project = projects.find(p => p.id === task.projectId);
    return {
      Project: project?.name || 'Unknown',
      TaskName: task.name,
      Status: task.status,
      Progress: `${task.progress}%`,
      StartDate: task.startDate,
      EndDate: task.endDate,
    };
  });

  // Calculate global start and end dates for the Gantt chart
  const { minDate, maxDate, totalDays, totalWeeks, totalMonths } = useMemo(() => {
    if (filteredTasks.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 0, totalWeeks: 0, totalMonths: 0 };
    
    let min = parseISO(filteredTasks[0].startDate);
    let max = parseISO(filteredTasks[0].endDate);

    filteredTasks.forEach(task => {
      const start = parseISO(task.startDate);
      const end = parseISO(task.endDate);
      if (start < min) min = start;
      if (end > max) max = end;
    });

    // Add a little padding
    min = addDays(min, -2);
    max = addDays(max, 2);

    return { 
      minDate: min, 
      maxDate: max, 
      totalDays: differenceInDays(max, min) + 1,
      totalWeeks: differenceInWeeks(max, min) + 1,
      totalMonths: differenceInMonths(max, min) + 1
    };
  }, [filteredTasks]);

  const timeArray = useMemo(() => {
    if (ganttView === 'week') {
      return Array.from({ length: totalWeeks || 1 }, (_, i) => addWeeks(startOfWeek(minDate), i));
    } else if (ganttView === 'month') {
      return Array.from({ length: totalMonths || 1 }, (_, i) => addMonths(startOfMonth(minDate), i));
    }
    return Array.from({ length: totalDays || 1 }, (_, i) => addDays(minDate, i));
  }, [ganttView, minDate, totalDays, totalWeeks, totalMonths]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Master Plan</h1>
        <ExportButton data={exportData} filename="Master_Plan" />
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
              placeholder="Search by task or project..."
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col min-w-[200px]">
          <label className="text-sm font-medium text-slate-500 mb-1">Filter by Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="all">All Projects</option>
            {visibleProjects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h2>
        <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Project</label>
            <select
              value={newTaskProjectId}
              onChange={(e) => setNewTaskProjectId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              required
              disabled={!currentUser?.isAdmin && !!editingTaskId}
            >
              <option value="" disabled>Select Project</option>
              {visibleProjects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Task Name</label>
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Design Phase"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Status</label>
            <select
              value={newTaskStatus}
              onChange={(e) => setNewTaskStatus(e.target.value as any)}
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
              value={newTaskProgress}
              onChange={(e) => setNewTaskProgress(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={newTaskStartDate}
              onChange={(e) => setNewTaskStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={newTaskEndDate}
              onChange={(e) => setNewTaskEndDate(e.target.value)}
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Task List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('project')}>
                  <div className="flex items-center space-x-1"><span>Project</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center space-x-1"><span>Task</span><ArrowUpDown size={14} /></div>
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
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => {
                  const project = projects.find(p => p.id === task.projectId);
                  const duration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1;
                  const canEdit = currentUser?.isAdmin || project?.assignedUserIds.includes(currentUser?.id || '');
                  return (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{project?.name}</td>
                      <td className="px-6 py-4 text-slate-700">{task.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-full bg-slate-200 rounded-full h-2 max-w-[100px]">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${task.progress}%` }}></div>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <div className="text-xs">{task.startDate}</div>
                        <div className="text-xs text-slate-500">to {task.endDate}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{duration} days</td>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Gantt Chart</h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setGanttView('day')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${ganttView === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Day
            </button>
            <button
              onClick={() => setGanttView('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${ganttView === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Week
            </button>
            <button
              onClick={() => setGanttView('month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${ganttView === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Month
            </button>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <div className="min-w-max">
            {/* Timeline Header */}
            <div className="flex border-b border-slate-200 pb-2 mb-4">
              <div className="w-48 shrink-0 font-medium text-slate-500 text-sm">Task</div>
              <div className="flex flex-1">
                {timeArray.map((time, i) => (
                  <div key={i} className="w-12 shrink-0 flex flex-col items-center justify-end text-xs text-slate-400">
                    {ganttView === 'day' && <span>{format(time, 'dd')}</span>}
                    {ganttView === 'week' && <span>W{format(time, 'w')}</span>}
                    {ganttView === 'month' && <span>{format(time, 'MMM')}</span>}
                    <span className="text-[10px]">{ganttView === 'day' ? format(time, 'MMM') : format(time, 'yy')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-4">
              {filteredTasks.map(task => {
                let startOffset = 0;
                let duration = 0;

                if (ganttView === 'day') {
                  startOffset = differenceInDays(parseISO(task.startDate), minDate);
                  duration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1;
                } else if (ganttView === 'week') {
                  startOffset = differenceInWeeks(parseISO(task.startDate), minDate);
                  duration = differenceInWeeks(parseISO(task.endDate), parseISO(task.startDate)) + 1;
                } else if (ganttView === 'month') {
                  startOffset = differenceInMonths(parseISO(task.startDate), minDate);
                  duration = differenceInMonths(parseISO(task.endDate), parseISO(task.startDate)) + 1;
                }
                
                return (
                  <div key={task.id} className="flex items-center">
                    <div className="w-48 shrink-0 text-sm font-medium text-slate-700 truncate pr-4" title={task.name}>
                      {task.name}
                    </div>
                    <div className="flex flex-1 relative h-6 bg-slate-50 rounded-md">
                      {/* Grid lines */}
                      {timeArray.map((_, i) => (
                        <div key={i} className="w-12 shrink-0 border-r border-slate-100 h-full"></div>
                      ))}
                      
                      {/* Task Bar */}
                      <div 
                        className="absolute h-full bg-indigo-500 rounded-md shadow-sm flex items-center px-2 overflow-hidden"
                        style={{
                          left: `${startOffset * 3}rem`,
                          width: `${duration * 3}rem`,
                        }}
                      >
                        <div 
                          className="absolute left-0 top-0 h-full bg-indigo-600 opacity-50"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                        <span className="text-[10px] text-white font-medium relative z-10 truncate">
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
