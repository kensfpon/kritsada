import React, { useState } from 'react';
import { useAppContext } from '../lib/AppContext';

export function Settings() {
  const { users, factories, addUser, addFactory } = useAppContext();
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  
  const [newFactoryName, setNewFactoryName] = useState('');
  const [newFactoryLocation, setNewFactoryLocation] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername || !newUserPassword || !newUserRole) return;
    addUser({
      id: `u${Date.now()}`,
      name: newUserName,
      username: newUserUsername,
      password: newUserPassword,
      role: newUserRole,
      isAdmin: newUserIsAdmin,
    });
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserRole('');
    setNewUserIsAdmin(false);
  };

  const handleAddFactory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactoryName || !newFactoryLocation) return;
    addFactory({
      id: `f${Date.now()}`,
      name: newFactoryName,
      location: newFactoryLocation,
    });
    setNewFactoryName('');
    setNewFactoryLocation('');
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add User Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">Add New User</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Somchai"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. somchai"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input
                type="text"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Engineer"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={newUserIsAdmin}
                onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isAdmin" className="text-sm font-medium text-slate-700">
                Is Administrator
              </label>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add User
            </button>
          </form>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Current Users</h3>
            <ul className="space-y-2">
              {users.map(user => (
                <li key={user.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="font-medium text-slate-800">{user.name}</span>
                    <span className="text-xs text-slate-400 ml-2">(@{user.username})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.isAdmin && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">Admin</span>}
                    <span className="text-sm text-slate-500">{user.role}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Add Factory Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">Add New Factory</h2>
          <form onSubmit={handleAddFactory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Factory Name</label>
              <input
                type="text"
                value={newFactoryName}
                onChange={(e) => setNewFactoryName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Factory A"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={newFactoryLocation}
                onChange={(e) => setNewFactoryLocation(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Bangkok"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Factory
            </button>
          </form>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Current Factories</h3>
            <ul className="space-y-2">
              {factories.map(factory => (
                <li key={factory.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-800">{factory.name}</span>
                  <span className="text-sm text-slate-500">{factory.location}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
