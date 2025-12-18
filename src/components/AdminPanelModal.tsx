'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, ModuleType, MODULE_CONFIG } from '@/types';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

interface UserWithEmail extends User {
  email?: string;
}

interface WebhookSettings {
  webhook_url: string;
}

// Loading spinner
const Spinner = memo(() => (
  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
));
Spinner.displayName = 'Spinner';

// Tab Button Component
const TabButton = memo(({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode 
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
      active 
        ? 'bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] text-white' 
        : 'text-gray-400 hover:text-white hover:bg-[#242938]'
    }`}
  >
    {children}
  </button>
));
TabButton.displayName = 'TabButton';

// User Row Component
const UserRow = memo(({ 
  user, 
  onToggleActive, 
  onToggleAdmin,
  onModuleChange,
  onDelete,
  isCurrentUser,
  saving
}: { 
  user: UserWithEmail;
  onToggleActive: (userId: string, isActive: boolean) => void;
  onToggleAdmin: (userId: string, isAdmin: boolean) => void;
  onModuleChange: (userId: string, modules: ModuleType[]) => void;
  onDelete: (userId: string, username: string) => void;
  isCurrentUser: boolean;
  saving: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const allModules = Object.keys(MODULE_CONFIG) as ModuleType[];

  const handleModuleToggle = (module: ModuleType) => {
    const currentModules = user.modules || [];
    const newModules = currentModules.includes(module)
      ? currentModules.filter(m => m !== module)
      : [...currentModules, module];
    onModuleChange(user.id, newModules);
  };

  return (
    <div className="border border-[#2a3144] rounded-lg overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 bg-[#1a1f2e]/50 cursor-pointer hover:bg-[#1a1f2e]/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
            user.is_active !== false ? 'bg-gradient-to-br from-[#4A90F5] to-[#C74AFF]' : 'bg-gray-600'
          }`}>
            {user.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-white font-medium">{user.username}</p>
            <p className="text-gray-400 text-sm">{user.email || `${user.username}@app.local`}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {user.is_admin && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">Admin</span>
          )}
          <span className={`px-2 py-1 text-xs rounded-full ${
            user.is_active !== false 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {user.is_active !== false ? 'Active' : 'Disabled'}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-[#2a3144] bg-[#0d1117]/50 space-y-4">
          {/* Access Controls */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.is_active !== false}
                onChange={() => onToggleActive(user.id, user.is_active === false)}
                disabled={isCurrentUser || saving}
                className="w-4 h-4 rounded border-[#2a3144] bg-[#242938] text-[#4A90F5] focus:ring-[#4A90F5]/50 disabled:opacity-50"
              />
              <span className="text-sm text-gray-300">Dashboard Access</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.is_admin === true}
                onChange={() => onToggleAdmin(user.id, !user.is_admin)}
                disabled={isCurrentUser || saving}
                className="w-4 h-4 rounded border-[#2a3144] bg-[#242938] text-[#4A90F5] focus:ring-[#4A90F5]/50 disabled:opacity-50"
              />
              <span className="text-sm text-gray-300">Admin Privileges</span>
            </label>
          </div>
          
          {/* Module Permissions */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Module Access:</p>
            <div className="flex flex-wrap gap-2">
              {allModules.map((module) => (
                <button
                  key={module}
                  onClick={() => handleModuleToggle(module)}
                  disabled={saving}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    (user.modules || []).includes(module)
                      ? 'bg-[#4A90F5]/20 text-[#4A90F5] border border-[#4A90F5]/50'
                      : 'bg-[#242938] text-gray-400 border border-[#2a3144] hover:border-gray-500'
                  } disabled:opacity-50`}
                >
                  {MODULE_CONFIG[module].icon} {MODULE_CONFIG[module].name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Delete Button */}
          {!isCurrentUser && (
            <div className="pt-2 border-t border-[#2a3144]">
              <button
                onClick={() => onDelete(user.id, user.username)}
                disabled={saving}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                Delete User
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
UserRow.displayName = 'UserRow';

// Create User Form Component
const CreateUserForm = memo(({ 
  onUserCreated, 
  saving, 
  setSaving 
}: { 
  onUserCreated: () => void; 
  saving: boolean;
  setSaving: (saving: boolean) => void;
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedModules, setSelectedModules] = useState<ModuleType[]>(['invoice']);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allModules = Object.keys(MODULE_CONFIG) as ModuleType[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !username || !password) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || '9f3c2b7e-41d8-4c0c-9a46-ccf2e7b1a8d4',
        },
        body: JSON.stringify({
          username,
          password,
          modules: selectedModules,
          is_admin: isAdmin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess(`User "${username}" created successfully!`);
      setUsername('');
      setPassword('');
      setSelectedModules(['invoice']);
      setIsAdmin(false);
      onUserCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (module: ModuleType) => {
    setSelectedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          required
          className="w-full px-4 py-2 bg-[#242938] border border-[#2a3144] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4A90F5]"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
          minLength={6}
          className="w-full px-4 py-2 bg-[#242938] border border-[#2a3144] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4A90F5]"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-2">Module Access</label>
        <div className="flex flex-wrap gap-2">
          {allModules.map((module) => (
            <button
              key={module}
              type="button"
              onClick={() => toggleModule(module)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                selectedModules.includes(module)
                  ? 'bg-[#4A90F5]/20 text-[#4A90F5] border border-[#4A90F5]/50'
                  : 'bg-[#242938] text-gray-400 border border-[#2a3144] hover:border-gray-500'
              }`}
            >
              {MODULE_CONFIG[module].icon} {MODULE_CONFIG[module].name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="w-4 h-4 rounded border-[#2a3144] bg-[#242938] text-[#4A90F5] focus:ring-[#4A90F5]/50"
        />
        <span className="text-sm text-gray-300">Grant Admin Privileges</span>
      </label>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !username || !password}
        className="w-full py-2 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? <Spinner /> : null}
        {saving ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
});
CreateUserForm.displayName = 'CreateUserForm';

// Webhook Settings Component
const WebhookSettingsForm = memo(({ 
  saving, 
  setSaving 
}: { 
  saving: boolean;
  setSaving: (saving: boolean) => void;
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setWebhookUrl(data.webhook_url || '');
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (webhookUrl && !validateUrl(webhookUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Webhook URL updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">n8n Webhook URL</label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://your-n8n-instance.com/webhook/..."
          className="w-full px-4 py-2 bg-[#242938] border border-[#2a3144] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#4A90F5]"
        />
        <p className="text-xs text-gray-500 mt-1">The webhook URL that receives chat messages</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2 bg-gradient-to-r from-[#4A90F5] to-[#C74AFF] text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? <Spinner /> : null}
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
});
WebhookSettingsForm.displayName = 'WebhookSettingsForm';

// Main Admin Panel Modal
export default function AdminPanelModal({ isOpen, onClose, currentUserId }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'settings'>('users');
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const handleToggleActive = useCallback(async (userId: string, isActive: boolean) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, is_active: isActive }),
      });
      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleToggleAdmin = useCallback(async (userId: string, isAdmin: boolean) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, is_admin: isAdmin }),
      });
      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: isAdmin } : u));
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleModuleChange = useCallback(async (userId: string, modules: ModuleType[]) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modules }),
      });
      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, modules } : u));
      }
    } catch (err) {
      console.error('Failed to update user modules:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleDeleteUser = useCallback(async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0d1117] border border-[#2a3144] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a3144]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A90F5] to-[#C74AFF] flex items-center justify-center">
              <span className="text-xl">⚙️</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
              <p className="text-sm text-gray-400">Manage users and settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1a1f2e] text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-[#2a3144]">
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
            👥 Users
          </TabButton>
          <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')}>
            ➕ Create User
          </TabButton>
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
            🔧 Settings
          </TabButton>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)] hide-scrollbar">
          {activeTab === 'users' && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No users found</p>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onToggleActive={handleToggleActive}
                    onToggleAdmin={handleToggleAdmin}
                    onModuleChange={handleModuleChange}
                    onDelete={handleDeleteUser}
                    isCurrentUser={user.id === currentUserId}
                    saving={saving}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <CreateUserForm 
              onUserCreated={fetchUsers} 
              saving={saving} 
              setSaving={setSaving} 
            />
          )}

          {activeTab === 'settings' && (
            <WebhookSettingsForm saving={saving} setSaving={setSaving} />
          )}
        </div>
      </div>
    </div>
  );
}
