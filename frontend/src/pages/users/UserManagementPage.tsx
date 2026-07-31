import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { User, UserRole, ShopId, ALL_SHOPS } from '@raju-billing/shared';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Store,
  Edit,
  Key,
  CheckCircle2,
  XCircle,
  Lock,
  Mail,
  Phone,
  X,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [shopFilter, setShopFilter] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    mobileNumber: '',
    role: UserRole.STAFF,
    assignedShopIds: [ShopId.RAJ_FRUITS_AND_VEGETABLES],
    password: 'Admin@12345',
  });

  const [newResetPassword, setNewResetPassword] = useState('Reset@12345');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users', {
        params: { search, role: roleFilter || undefined, shopId: shopFilter || undefined },
      });
      setUsers(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, shopFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.post('/users', formData);
      setActionSuccess('User account created successfully.');
      setIsAddModalOpen(false);
      fetchUsers();
      setFormData({
        email: '',
        fullName: '',
        mobileNumber: '',
        role: UserRole.STAFF,
        assignedShopIds: [ShopId.RAJ_FRUITS_AND_VEGETABLES],
        password: 'Admin@12345',
      });
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to create user account.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionError(null);
    try {
      await api.put(`/users/${editingUser.id}`, {
        fullName: editingUser.fullName,
        mobileNumber: editingUser.mobileNumber,
        role: editingUser.role,
        assignedShopIds: editingUser.assignedShopIds,
        status: editingUser.status,
      });
      setActionSuccess('User updated successfully.');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/users/${user.id}`, { status: nextStatus });
      setActionSuccess(`User status changed to ${nextStatus}.`);
      fetchUsers();
    } catch (err: any) {
      alert('Failed to change user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    try {
      await api.post(`/users/${resettingUser.id}/reset-password`, {
        newPassword: newResetPassword,
      });
      setActionSuccess(`Password reset successfully for ${resettingUser.email}.`);
      setResettingUser(null);
    } catch (err: any) {
      alert('Failed to reset password.');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {t('userManagement.title')}
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {t('userManagement.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('userManagement.addUser')}</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold flex justify-between items-center">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('userManagement.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 shadow-sm"
        >
          <option value="">{t('userManagement.filterRole')}</option>
          <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
          <option value={UserRole.ADMIN}>Admin</option>
          <option value={UserRole.STAFF}>Staff</option>
          <option value={UserRole.VIEWER}>Viewer</option>
        </select>

        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 shadow-sm"
        >
          <option value="">{t('userManagement.filterShop')}</option>
          {ALL_SHOPS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] font-black border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">{t('userManagement.table.user')}</th>
                <th className="px-6 py-4">{t('userManagement.table.contact')}</th>
                <th className="px-6 py-4">{t('userManagement.table.role')}</th>
                <th className="px-6 py-4">{t('userManagement.table.shops')}</th>
                <th className="px-6 py-4">{t('userManagement.table.status')}</th>
                <th className="px-6 py-4 text-right">{t('userManagement.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                    Loading Users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No users found matching query filters.
                  </td>
                </tr>
              ) : (
                users.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedUserDetail(usr)}
                        className="flex items-center gap-3 text-left group"
                      >
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-black rounded-2xl flex items-center justify-center text-sm border border-emerald-200">
                          {usr.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600">
                            {usr.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400">{usr.email}</div>
                        </div>
                      </button>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">
                      +91 {usr.mobileNumber}
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-black uppercase">
                        {usr.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {usr.assignedShopIds.map((sid) => (
                          <span
                            key={sid}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold"
                          >
                            {sid === 'RAJ_FRUITS_AND_VEGETABLES'
                              ? 'RAJ'
                              : sid === 'G_R_FRUITS_AND_VEGETABLES'
                              ? 'G R'
                              : 'PRIYA'}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit ${
                          usr.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : usr.status === 'locked'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {usr.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{usr.status}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(usr)}
                          title="Edit User"
                          className="p-2 text-slate-500 hover:text-emerald-600 bg-slate-100 dark:bg-slate-800 rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setResettingUser(usr)}
                          title="Reset Password"
                          className="p-2 text-slate-500 hover:text-amber-600 bg-slate-100 dark:bg-slate-800 rounded-xl"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(usr)}
                          title={usr.status === 'active' ? 'Deactivate' : 'Activate'}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition-all ${
                            usr.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {usr.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Add New User Account
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="suresh@rajuvegetables.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  System Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                >
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.STAFF}>Staff</option>
                  <option value={UserRole.VIEWER}>Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                  Assigned Wholesale Shops
                </label>
                <div className="space-y-2">
                  {ALL_SHOPS.map((shop) => (
                    <label key={shop.id} className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignedShopIds.includes(shop.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              assignedShopIds: [...formData.assignedShopIds, shop.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              assignedShopIds: formData.assignedShopIds.filter((id) => id !== shop.id),
                            });
                          }
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{shop.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl shadow-lg"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-6 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase">
                Edit User Account
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={editingUser.mobileNumber}
                  onChange={(e) => setEditingUser({ ...editingUser, mobileNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold"
                >
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.STAFF}>Staff</option>
                  <option value={UserRole.VIEWER}>Viewer</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 text-white font-black text-xs uppercase rounded-xl shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase">
              Reset Password for {resettingUser.fullName}
            </h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  New Temporary Password
                </label>
                <input
                  type="text"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
