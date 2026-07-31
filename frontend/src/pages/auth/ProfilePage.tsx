import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import { ALL_SHOPS } from '@raju-billing/shared';
import { User, Mail, Phone, Shield, Store, Lock, Key, Clock, CheckCircle, Camera } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateProfileState } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  const assignedShopNames = ALL_SHOPS.filter((s) => user.assignedShopIds.includes(s.id)).map(
    (s) => s.name
  );

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password. Please check current password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6">
      {/* Profile Header Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 bg-white text-emerald-800 rounded-full flex items-center justify-center font-black text-3xl shadow-2xl ring-4 ring-emerald-400/40">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-500 shadow-md">
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center sm:text-left space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-black">{user.fullName}</h1>
            <span className="px-3 py-1 bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs font-black rounded-full uppercase">
              {user.role}
            </span>
            <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{user.status.toUpperCase()}</span>
            </span>
          </div>

          <p className="text-xs font-bold text-emerald-200">{user.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-emerald-300 pt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'First Session'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {t('profile.personalInfo')}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                {t('profile.fullName')}
              </label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{user.fullName}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                {t('profile.email')}
              </label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>{user.email}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                {t('profile.mobile')}
              </label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>+91 {user.mobileNumber}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                {t('profile.assignedShops')}
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2">
                {assignedShopNames.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security / Password Change Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Key className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {t('profile.changePassword')}
            </h2>
          </div>

          {passwordMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold text-center ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.currentPassword')}
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.newPassword')}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 special"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.confirmNewPassword')}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-2xl shadow-lg shadow-emerald-600/30 transition-all mt-2"
            >
              {isChangingPassword ? 'Updating Password...' : t('profile.updatePasswordBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
