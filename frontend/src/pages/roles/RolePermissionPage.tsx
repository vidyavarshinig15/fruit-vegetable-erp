import React, { useState } from 'react';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, UserRole, Permission } from '@raju-billing/shared';
import { Shield, Check, Lock, Info } from 'lucide-react';

export const RolePermissionPage: React.FC = () => {
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, Permission[]>>(
    DEFAULT_ROLE_PERMISSIONS
  );

  const roles = [
    { key: UserRole.SUPER_ADMIN, name: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
    { key: UserRole.ADMIN, name: 'Admin', color: 'bg-emerald-100 text-emerald-800' },
    { key: UserRole.STAFF, name: 'Staff', color: 'bg-blue-100 text-blue-800' },
    { key: UserRole.VIEWER, name: 'Viewer', color: 'bg-slate-100 text-slate-800' },
  ];

  const handleTogglePermission = (role: UserRole, perm: Permission) => {
    if (role === UserRole.SUPER_ADMIN) return; // Super admin cannot lose permissions

    setRolePermissions((prev) => {
      const current = prev[role] || [];
      const has = current.includes(perm);
      const updated = has ? current.filter((p) => p !== perm) : [...current, perm];
      return { ...prev, [role]: updated };
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center border border-purple-200">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Role & Permission Control Matrix
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Configure granular system permissions across wholesale operational roles
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] font-black border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">System Permission</th>
                <th className="px-6 py-4">Category</th>
                {roles.map((r) => (
                  <th key={r.key} className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${r.color}`}>
                      {r.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-extrabold text-slate-900 dark:text-white">{perm.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{perm.description}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold">
                      {perm.category}
                    </span>
                  </td>

                  {roles.map((r) => {
                    const isGranted = (rolePermissions[r.key] || []).includes(perm.key);
                    const isLocked = r.key === UserRole.SUPER_ADMIN;

                    return (
                      <td key={r.key} className="px-6 py-4 text-center">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleTogglePermission(r.key, perm.key)}
                          className={`w-7 h-7 rounded-xl inline-flex items-center justify-center transition-all ${
                            isGranted
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
                          } ${isLocked ? 'cursor-not-allowed opacity-80' : 'hover:scale-110'}`}
                        >
                          {isGranted ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
