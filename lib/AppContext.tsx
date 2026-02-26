'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type User = {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: string;
  isAdmin: boolean;
};

export type Factory = {
  id: string;
  name: string;
  location: string;
};

export type ManpowerTask = {
  id: string;
  userId: string;
  factoryId: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type Project = {
  id: string;
  name: string;
  factoryId: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  startDate: string;
  endDate: string;
  assignedUserIds: string[];
};

export type MasterPlanTask = {
  id: string;
  projectId: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  startDate: string;
  endDate: string;
};

type AppContextType = {
  currentUser: User | null;
  users: User[];
  factories: Factory[];
  manpowerTasks: ManpowerTask[];
  projects: Project[];
  masterPlanTasks: MasterPlanTask[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  addFactory: (factory: Factory) => void;
  addManpowerTask: (task: ManpowerTask) => void;
  updateManpowerTask: (task: ManpowerTask) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  addMasterPlanTask: (task: MasterPlanTask) => void;
  updateMasterPlanTask: (task: MasterPlanTask) => void;
};

const defaultUsers: User[] = [
  { id: 'admin', username: 'Admin', password: 'Pass@5601', name: 'Administrator', role: 'Admin', isAdmin: true },
  { id: 'u1', username: 'somchai', password: 'password', name: 'Somchai', role: 'Engineer', isAdmin: false },
  { id: 'u2', username: 'somsri', password: 'password', name: 'Somsri', role: 'Technician', isAdmin: false },
];

const defaultFactories: Factory[] = [
  { id: 'f1', name: 'Factory A', location: 'Bangkok' },
  { id: 'f2', name: 'Factory B', location: 'Rayong' },
];

const defaultManpowerTasks: ManpowerTask[] = [
  { id: 'mt1', userId: 'u1', factoryId: 'f1', description: 'Maintenance', date: '2026-02-25', startTime: '08:00', endTime: '12:00' },
  { id: 'mt2', userId: 'u2', factoryId: 'f2', description: 'Inspection', date: '2026-02-25', startTime: '13:00', endTime: '17:00' },
];

const defaultProjects: Project[] = [
  { id: 'p1', name: 'Upgrade Line 1', factoryId: 'f1', status: 'In Progress', progress: 45, startDate: '2026-02-01', endDate: '2026-03-15', assignedUserIds: ['u1'] },
  { id: 'p2', name: 'New Installation', factoryId: 'f2', status: 'Not Started', progress: 0, startDate: '2026-03-01', endDate: '2026-04-30', assignedUserIds: ['u1', 'u2'] },
];

const defaultMasterPlanTasks: MasterPlanTask[] = [
  { id: 'mpt1', projectId: 'p1', name: 'Design Phase', status: 'Completed', progress: 100, startDate: '2026-02-01', endDate: '2026-02-10' },
  { id: 'mpt2', projectId: 'p1', name: 'Implementation', status: 'In Progress', progress: 30, startDate: '2026-02-11', endDate: '2026-03-10' },
  { id: 'mpt3', projectId: 'p2', name: 'Planning', status: 'Not Started', progress: 0, startDate: '2026-03-01', endDate: '2026-03-15' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(defaultUsers);
  const [factories, setFactories] = useState<Factory[]>(defaultFactories);
  const [manpowerTasks, setManpowerTasks] = useState<ManpowerTask[]>(defaultManpowerTasks);
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [masterPlanTasks, setMasterPlanTasks] = useState<MasterPlanTask[]>(defaultMasterPlanTasks);

  const login = (username: string, password: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addUser = (user: User) => setUsers([...users, user]);
  const addFactory = (factory: Factory) => setFactories([...factories, factory]);
  
  const addManpowerTask = (task: ManpowerTask) => setManpowerTasks([...manpowerTasks, task]);
  const updateManpowerTask = (updatedTask: ManpowerTask) => {
    setManpowerTasks(manpowerTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const addProject = (project: Project) => setProjects([...projects, project]);
  const updateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const addMasterPlanTask = (task: MasterPlanTask) => setMasterPlanTasks([...masterPlanTasks, task]);
  const updateMasterPlanTask = (updatedTask: MasterPlanTask) => {
    setMasterPlanTasks(masterPlanTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, factories, manpowerTasks, projects, masterPlanTasks,
      login, logout, addUser, addFactory, 
      addManpowerTask, updateManpowerTask, 
      addProject, updateProject, 
      addMasterPlanTask, updateMasterPlanTask
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

