import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import {
  Building,
  PhoneCall,
  FileText,
  Settings,
  Users,
  Database,
  ShieldAlert,
  Clock,
  History,
  Activity,
  Download,
  Upload,
  UserCheck,
  Power,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeShop, updateShop } = useShop();
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.email === 'vidyavarshini15@gmail.com';

  // Tabs selections
  const [activeTab, setActiveTab] = useState<'profile' | 'backup' | 'security' | 'audit' | 'health'>('profile');

  useEffect(() => {
    if (!isOwner && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [isOwner, activeTab]);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    ownerName: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    mobileNumber: '',
    alternateNumber: '',
    email: '',
  });

  const [billingForm, setBillingForm] = useState({
    invoicePrefix: '',
    receiptPrefix: '',
  });

  // Automated backup preferences settings
  const [dailyBackup, setDailyBackup] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  // Security preferences settings
  const [sessionTimeout, setSessionTimeout] = useState(1800); // 30 mins
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('System is currently undergoing scheduled maintenance.');

  // User accounts list
  const [usersList, setUsersList] = useState<any[]>([]);

  // Health data
  const [healthData, setHealthData] = useState<any | null>(null);

  // Backup log list
  const [backupLogs, setBackupLogs] = useState<any[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [searchAudit, setSearchAudit] = useState('');

  // UI Loaders & feedbacks
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Load shop settings
  useEffect(() => {
    if (activeShop) {
      setProfileForm({
        name: activeShop.name || '',
        ownerName: activeShop.ownerName || '',
        description: activeShop.description || '',
        address: activeShop.address || '',
        city: activeShop.city || '',
        state: activeShop.state || '',
        pincode: activeShop.pincode || '',
        mobileNumber: activeShop.mobileNumber || '',
        alternateNumber: activeShop.alternateNumber || '',
        email: activeShop.email || '',
      });

      setBillingForm({
        invoicePrefix: activeShop.invoicePrefix || '',
        receiptPrefix: activeShop.receiptPrefix || '',
      });

      setDailyBackup(activeShop.backupPreferences?.daily ?? true);
      setRetentionDays(activeShop.backupPreferences?.retentionDays ?? 30);
    }
  }, [activeShop]);

  // Load active tab dependencies
  const loadTabDependencies = useCallback(async () => {
    if (!isOwner) return;
    try {
      if (activeTab === 'backup') {
        const res = await api.get('/system/backups');
        if (res.data?.success) setBackupLogs(res.data.data || []);
      }

      if (activeTab === 'security') {
        // Load assigned shop users
        const usersRes = await api.get('/system/users');
        if (usersRes.data?.success) setUsersList(usersRes.data.data || []);

        // Load maintenance status
        const settingKey = `${activeShop.id}_maintenance_mode`;
        const setRes = await api.get('/communication/settings'); // settings context
      }

      if (activeTab === 'audit') {
        const params = new URLSearchParams({
          page: String(auditPage),
          limit: '15',
        });
        if (searchAudit) params.append('action', searchAudit);
        
        const res = await api.get(`/system/activity-logs?${params.toString()}`);
        if (res.data?.success) {
          setAuditLogs(res.data.data || []);
          setAuditTotalPages(res.data.pagination?.totalPages || 1);
        }
      }

      if (activeTab === 'health') {
        const res = await api.get('/system/health');
        if (res.data?.success) setHealthData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load settings tab dependencies', err);
    }
  }, [activeTab, auditPage, searchAudit, activeShop]);

  useEffect(() => {
    loadTabDependencies();
  }, [loadTabDependencies]);

  // Save profile and invoicing settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const payload = {
        ...profileForm,
        ...billingForm,
        backupPreferences: { daily: dailyBackup, retentionDays },
      };

      await updateShop(activeShop.id, payload);
      setFeedback({ type: 'success', message: 'Shop preferences saved successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save preferences.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger manual JSON backup download
  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.post('/system/backups');
      if (res.data?.success && res.data.payload) {
        // Trigger browser-level JSON download
        const blob = new Blob([JSON.stringify(res.data.payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${activeShop.name.replace(/\s+/g, '_')}_Backup_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('Database backup completed and JSON file downloaded successfully.');
        loadTabDependencies();
      }
    } catch (err) {
      alert('Manual backup compilation failed.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore uploaded JSON backup payload
  const handleRestoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Warning confirmation
    const confirmRestore = window.confirm(
      'WARNING: Restoring a database backup will overwrite existing billing, customer, and payments records for this shop! This action cannot be undone. Are you sure you want to proceed?'
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const payload = JSON.parse(reader.result as string);
          const res = await api.post('/system/restore', { payload });
          if (res.data?.success) {
            alert('Database restored from backup successfully! Refreshing dashboard context...');
            window.location.reload();
          }
        } catch (parseErr) {
          alert('Failed to parse backup JSON file. Ensure it is a valid recovery file.');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      alert('Data restoration process failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  // User status deactivation
  const handleUpdateUserStatus = async (userId: string, currentStatus: string, currentRole: any) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const res = await api.patch(`/system/users/${userId}`, {
        status: newStatus,
        role: currentRole,
      });

      if (res.data?.success) {
        alert(`User status changed successfully to ${newStatus}.`);
        loadTabDependencies();
      }
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  // Toggle Maintenance Mode
  const handleToggleMaintenance = async () => {
    const nextState = !maintenanceMode;
    try {
      const res = await api.patch('/system/maintenance-mode', {
        enabled: nextState,
        message: maintenanceMessage,
      });

      if (res.data?.success) {
        setMaintenanceMode(nextState);
        alert(`Maintenance Mode is now ${nextState ? 'ENABLED' : 'DISABLED'}.`);
      }
    } catch (err) {
      alert('Failed to toggle maintenance mode.');
    }
  };

  // Export audit logs
  const handleExportAudits = () => {
    if (auditLogs.length === 0) return;
    const headers = 'ID,Date,Action,Details,UserID\n';
    const rows = auditLogs.map(l => `"${l.id}","${l.createdAt}","${l.action}","${l.details.replace(/"/g, '""')}","${l.userId}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Audit_Logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs font-semibold">
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 no-print">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {t('settingsTab.title', 'Settings & Security Center')}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Manage database backups, restore disaster recovery logs, configure parameters and monitor system health.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-center ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-2 no-print">
          {[
            { id: 'profile', label: 'Business Profile', icon: Building },
            ...(isOwner ? [
              { id: 'backup', label: 'Backup & Restore', icon: Database },
              { id: 'security', label: 'Security & Users', icon: ShieldAlert },
              { id: 'audit', label: 'Immutable Audit Logs', icon: History },
              { id: 'health', label: 'System Health Dials', icon: Activity },
            ] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all border ${
                activeTab === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md font-black'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contents Panels */}
        <div className="lg:col-span-3">

          {/* 1. PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <Card title="Business Profile Details" subtitle="Physical address, currency, and defaults.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Business Name *"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                  <Input
                    label="Business Owner *"
                    required
                    value={profileForm.ownerName}
                    onChange={(e) => setProfileForm({ ...profileForm, ownerName: e.target.value })}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Business Description"
                      value={profileForm.description}
                      onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Address *"
                      required
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    />
                  </div>
                  <Input
                    label="City *"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  />
                  <Input
                    label="State *"
                    required
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  />
                </div>
              </Card>

              <Card title="Invoice Sequences & Formats" subtitle="Prefix variables for numbering paths.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Invoice Prefix *"
                    required
                    value={billingForm.invoicePrefix}
                    onChange={(e) => setBillingForm({ ...billingForm, invoicePrefix: e.target.value })}
                  />
                  <Input
                    label="Receipt Prefix *"
                    required
                    value={billingForm.receiptPrefix}
                    onChange={(e) => setBillingForm({ ...billingForm, receiptPrefix: e.target.value })}
                  />
                </div>
              </Card>

              {isAdmin && (
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    Save Preferences Settings
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* 2. BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup manual download */}
                <Card title="Disaster Recovery Backup" subtitle="Compile and download all database entries for this shop.">
                  <p className="text-slate-450 leading-relaxed mb-4">
                    Creates an isolated JSON file containing complete invoices, customers balances, payments records, and ledger timelines.
                  </p>
                  <Button
                    onClick={handleManualBackup}
                    variant="primary"
                    disabled={isBackingUp}
                    className="inline-flex items-center gap-1.5 font-bold shadow-lg"
                  >
                    <Download className="w-4.5 h-4.5" /> Download Manual Backup
                  </Button>
                </Card>

                {/* Backup restoration dropzone */}
                <Card title="Restore Data Backup" subtitle="Overwrites database state from a verified JSON backup file.">
                  <p className="text-red-650 leading-relaxed mb-4 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Restoring a backup is irreversible and overwrites all existing invoices!
                  </p>
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-400 font-bold rounded-xl transition-all shadow-sm text-red-750">
                    <Upload className="w-4 h-4" /> Upload JSON Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreUpload}
                      disabled={isRestoring || !isAdmin}
                      className="hidden"
                    />
                  </label>
                </Card>
              </div>

              {/* Automatic settings check */}
              <Card title="Automated Backup Preferences" subtitle="Configure automated ledger recovery parameters.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dailyBackup}
                      onChange={(e) => setDailyBackup(e.target.checked)}
                      className="w-4 h-4 text-market-700"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">Daily Automated Backups</span>
                      <span className="block text-[10px] text-slate-400 mt-1">Logs a scheduled restore checkpoint daily</span>
                    </div>
                  </label>
                  <Input
                    label="Retention Limit (Days)"
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                  />
                </div>
              </Card>

              {/* Backup Logs History */}
              <Card title="Backup History Log" subtitle="Audit list of manual and automated backups.">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Date/Time</th>
                        <th className="py-2.5 px-3">Backup Path</th>
                        <th className="py-2.5 px-3 text-center">Type</th>
                        <th className="py-2.5 px-3 text-right">Size (Bytes)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/20">
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-450 truncate max-w-[200px]" title={log.filePath}>
                            {log.filePath}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant="info">{log.backupType}</Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-bold">{log.sizeBytes.toLocaleString()}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={log.backupStatus === 'COMPLETED' ? 'success' : 'danger'}>
                              {log.backupStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 3. SECURITY & USER MANAGEMENT */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* User management active users */}
              <Card title="User Account Management" subtitle="Manage role authorizations and active statuses.">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Last Login</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/20">
                          <td className="py-3 px-3">
                            <span className="block font-bold text-slate-800 dark:text-slate-100">{usr.fullName}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{usr.email}</span>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={usr.role === 'SUPER_ADMIN' ? 'danger' : usr.role === 'ADMIN' ? 'warning' : 'info'}>
                              {usr.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant={usr.status === 'active' ? 'success' : 'neutral'}>
                              {usr.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 text-[10px]">
                            {usr.lastLoginAt ? new Date(usr.lastLoginAt).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isAdmin && usr.role !== 'SUPER_ADMIN' && (
                              <Button
                                onClick={() => handleUpdateUserStatus(usr.id, usr.status, usr.role)}
                                variant="secondary"
                                size="sm"
                                className="text-[10px] py-1"
                              >
                                {usr.status === 'active' ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Maintenance mode configuration */}
              <Card title="System Maintenance Controls" subtitle="Lock workspace activities for audit updates.">
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl">
                    <div>
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">Enable Maintenance Lockout</span>
                      <span className="block text-[10px] text-slate-450 mt-1">Only Super Administrators can log in while active</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={handleToggleMaintenance}
                        className={`p-2 rounded-xl flex items-center gap-1.5 font-bold uppercase transition-all border ${
                          maintenanceMode ? 'bg-red-650 text-white border-red-650' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        <Power className="w-4.5 h-4.5" /> {maintenanceMode ? 'Lock Active' : 'Lock Disabled'}
                      </button>
                    )}
                  </div>

                  <Input
                    label="Maintenance Banner Message"
                    type="text"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                  />
                </div>
              </Card>

              {/* Session security timeout slider */}
              <Card title="Security Settings" subtitle="Configure password policies and timeout intervals.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Password Complexity Requirements"
                    value="strong"
                    disabled
                    options={[
                      { value: 'strong', label: 'Strong (Min 8 chars, 1 number, 1 special char)' },
                    ]}
                  />
                  <Input
                    label="Inactivity Logout Session Timeout (Seconds)"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* 4. IMMUTABLE AUDIT LOGS */}
          {activeTab === 'audit' && (
            <Card title="Audit Event logs (Immutable)" subtitle="Sentiments actions audit trail history. Log entries are legally protected and cannot be deleted.">
              <div className="flex justify-between items-center gap-3 mb-4 no-print">
                <div className="flex gap-2">
                  <Select
                    value={searchAudit}
                    onChange={(e) => setSearchAudit(e.target.value)}
                    options={[
                      { value: '', label: 'All Event Actions' },
                      { value: 'LOGIN', label: 'Login Success' },
                      { value: 'LOGIN_FAILED', label: 'Failed Login Attempt' },
                      { value: 'INVOICE_CREATED', label: 'Invoice Generated' },
                      { value: 'INVOICE_CANCELLED', label: 'Invoice Cancelled' },
                      { value: 'PAYMENT_RECEIVED', label: 'Payment Recorded' },
                      { value: 'PAYMENT_CANCELLED', label: 'Payment Cancelled' },
                      { value: 'SETTINGS_CHANGED', label: 'Settings Changed' },
                      { value: 'BACKUP_CREATED', label: 'Backup Created' },
                      { value: 'RESTORE_COMPLETED', label: 'Database Restored' },
                    ]}
                  />
                </div>
                <Button onClick={handleExportAudits} variant="secondary" className="inline-flex items-center gap-1">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </div>

              <div className="overflow-x-auto text-xs font-semibold">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider pb-2">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action Type</th>
                      <th className="py-2.5 px-3">Description DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/20">
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={log.action.includes('FAIL') || log.action.includes('CANCEL') ? 'danger' : 'info'}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-650 font-medium leading-normal">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100 no-print">
                <Button
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
                  variant="secondary"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-slate-450 font-bold">
                  Page {auditPage} of {auditTotalPages}
                </span>
                <Button
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage(prev => prev + 1)}
                  variant="secondary"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </Card>
          )}

          {/* 5. SYSTEM HEALTH DASHBOARD */}
          {activeTab === 'health' && healthData && (
            <div className="space-y-6">
              {/* Circular KPI indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: 'Server Engine', status: healthData.serverStatus, badge: 'success' as const },
                  { title: 'Supabase DB Ping', status: healthData.databaseStatus, badge: 'success' as const },
                  { title: 'Events Logged Today', status: `${healthData.auditEventsCountToday} events`, badge: 'info' as const },
                  { title: 'Security Alerts', status: `${healthData.pendingSecurityAlertsCount} alerts`, badge: healthData.pendingSecurityAlertsCount > 0 ? ('danger' as const) : ('success' as const) },
                ].map((item, idx) => (
                  <Card key={idx} className="p-4 flex flex-col justify-center items-center text-center">
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">{item.title}</span>
                    <Badge variant={item.badge} className="text-sm font-black tracking-wide py-1 px-3 uppercase">
                      {item.status}
                    </Badge>
                  </Card>
                ))}
              </div>

              {/* Server storage allocations */}
              <Card title="System Diagnostics & Hardware Allocations" subtitle="Cloud statistics metrics.">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-slate-450 mb-1">
                      <span>Database Storage Space (Backup logs allocation)</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {(healthData.storageUsageBytes / (1024 * 1024)).toFixed(2)} MB / 500 MB
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-650"
                        style={{
                          width: `${(healthData.storageUsageBytes / (500 * 1024 * 1024)) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-black">Active User Sessions</span>
                      <span className="block text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{healthData.activeSessionsCount} active</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-black">Failed Login Attempts</span>
                      <span className="block text-lg font-black text-slate-800 dark:text-slate-100 mt-1 text-red-650">{healthData.failedLoginAttemptsToday} attempts</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
