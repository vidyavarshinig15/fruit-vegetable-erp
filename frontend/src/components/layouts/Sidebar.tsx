import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useShop } from '@/contexts/ShopContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Apple,
  CreditCard,
  Receipt,
  BookOpen,
  BarChart3,
  History,
  Clock,
  CheckCircle2,
  HardDriveDownload,
  Settings,
  UserCheck,
  Percent,
  UploadCloud,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { activeShop } = useShop();

  const navItems = [
    { label: t('dashboard'), path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: t('billing'), path: ROUTES.BILLING, icon: ShoppingCart },
    { label: t('orders', 'Inbound Orders'), path: ROUTES.ORDERS, icon: UploadCloud },
    { label: t('customers'), path: ROUTES.CUSTOMERS, icon: Users },
    { label: t('products'), path: ROUTES.PRODUCTS, icon: Apple },
    { label: t('payments'), path: ROUTES.PAYMENTS, icon: CreditCard },
    { label: t('receipts'), path: ROUTES.RECEIPTS, icon: Receipt },
    { label: t('ledger'), path: ROUTES.LEDGER, icon: BookOpen },
    { label: t('credit_control', 'Credit Control'), path: ROUTES.CREDIT_CONTROL, icon: ShieldAlert },
    { label: t('reports'), path: ROUTES.REPORTS, icon: BarChart3 },
    { label: t('communication', 'Communication'), path: ROUTES.COMMUNICATION, icon: MessageSquare },
    { label: t('history'), path: ROUTES.HISTORY, icon: History },
    { label: t('pending'), path: ROUTES.PENDING, icon: Clock },
    { label: t('partial'), path: ROUTES.PARTIAL, icon: Percent },
    { label: t('cleared'), path: ROUTES.CLEARED, icon: CheckCircle2 },
    { label: t('backup'), path: ROUTES.BACKUP, icon: HardDriveDownload },
    { label: t('settings'), path: ROUTES.SETTINGS, icon: Settings },
    { label: t('profile'), path: ROUTES.PROFILE, icon: UserCheck },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-market-950 text-white flex flex-col transition-transform duration-300 border-r border-market-900 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Title */}
        <div className="p-5 border-b border-market-900 bg-market-900/60 flex flex-col gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide leading-tight">
              RAJU VEGETABLES
            </h1>
            <p className="text-xs text-market-300 font-bold uppercase tracking-wider mt-0.5">
              Wholesale Billing System
            </p>
          </div>

          {/* Active Shop Indicator */}
          <div className="border-t border-b border-market-800/80 py-3.5 my-1 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-black tracking-widest text-market-300 uppercase flex items-center gap-1.5 justify-center mb-1">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: activeShop.themeColor === 'orange' ? '#f97316' : activeShop.themeColor === 'blue' ? '#3b82f6' : '#22c55e' }}></span>
              CURRENT SHOP
            </span>
            <span className="text-sm font-extrabold text-white uppercase tracking-wide leading-tight px-1">
              {activeShop.name}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-bold text-base transition-all duration-200 ${
                    isActive
                      ? 'bg-market-700 text-white shadow-lg border border-market-500/30'
                      : 'text-market-200 hover:bg-market-900 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
