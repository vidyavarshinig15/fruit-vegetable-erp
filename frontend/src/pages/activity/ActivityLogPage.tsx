import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { ActivityLog } from '@raju-billing/shared';
import { History, ShieldAlert, Monitor, Globe, Clock, User, Filter } from 'lucide-react';

export const ActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/activity', {
        params: { action: actionFilter || undefined },
      });
      setLogs(response.data.data);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center border border-emerald-200">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              System Audit & Activity Logs
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Immutable record of all security, authentication, and system events
            </p>
          </div>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold"
        >
          <option value="">All Action Types</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="FAILED_LOGIN">FAILED_LOGIN</option>
          <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
          <option value="PASSWORD_RESET">PASSWORD_RESET</option>
          <option value="USER_CREATE">USER_CREATE</option>
          <option value="ROLE_CHANGE">ROLE_CHANGE</option>
          <option value="SHOP_SWITCH">SHOP_SWITCH</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] font-black border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User Account</th>
                <th className="px-6 py-4">Action Recorded</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Device Information</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">
                    Loading Activity Log Entries...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-bold">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {log.userEmail || log.userId || 'System'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${
                          log.action === 'FAILED_LOGIN'
                            ? 'bg-red-100 text-red-700'
                            : log.action === 'LOGIN'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.ipAddress}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={log.userAgent}>
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{log.userAgent}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
