import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/contexts/ShopContext';
import { ShopId } from '@raju-billing/shared';
import { Store, ArrowRight, ShieldCheck, CheckCircle2, User, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const SelectShopPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeShopId, setActiveShopId, availableShops, reloadShops } = useShop();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      reloadShops();
    }
  }, [user, navigate, reloadShops]);

  if (!user) return null;

  const assignedShops = availableShops.filter((shop) =>
    user.role === 'SUPER_ADMIN' ? true : user.assignedShopIds.includes(shop.id)
  );

  const handleSelectShop = (shopId: ShopId) => {
    setActiveShopId(shopId);
    navigate('/dashboard');
  };

  // Maps theme colors for each shop to tailwind classes
  const colorThemes: Record<string, {
    border: string;
    borderActive: string;
    bg: string;
    bgActive: string;
    text: string;
    btn: string;
    logoBg: string;
    logoText: string;
  }> = {
    green: {
      border: 'hover:border-emerald-400 dark:hover:border-emerald-800',
      borderActive: 'border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20',
      bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      bgActive: 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-600 dark:border-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
      logoBg: 'bg-emerald-100 dark:bg-emerald-950',
      logoText: 'text-emerald-700 dark:text-emerald-400',
    },
    blue: {
      border: 'hover:border-blue-400 dark:hover:border-blue-800',
      borderActive: 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20',
      bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      bgActive: 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500',
      text: 'text-blue-700 dark:text-blue-400',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
      logoBg: 'bg-blue-100 dark:bg-blue-950',
      logoText: 'text-blue-700 dark:text-blue-400',
    },
    orange: {
      border: 'hover:border-orange-400 dark:hover:border-orange-800',
      borderActive: 'border-orange-600 dark:border-orange-500 ring-2 ring-orange-500/20',
      bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      bgActive: 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-600 dark:border-orange-500',
      text: 'text-orange-700 dark:text-orange-400',
      btn: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20',
      logoBg: 'bg-orange-100 dark:bg-orange-950',
      logoText: 'text-orange-700 dark:text-orange-400',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-10 border border-emerald-100 dark:border-slate-800 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {t('selectShop.title')}
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {t('selectShop.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {assignedShops.map((shop) => {
            const isSelected = activeShopId === shop.id;
            const theme = colorThemes[shop.themeColor || 'green'];

            return (
              <div
                key={shop.id}
                onClick={() => handleSelectShop(shop.id)}
                className={`flex flex-col justify-between p-6 rounded-2xl text-left border-2 transition-all hover:scale-[1.02] shadow-md cursor-pointer ${
                  isSelected ? theme.bgActive : theme.bg
                } ${theme.border}`}
              >
                <div>
                  {/* Shop Card Header: Logo/Fallback and Status */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border font-black text-sm shadow-sm ${
                      shop.logoUrl ? 'bg-white overflow-hidden border-slate-200' : `${theme.logoBg} ${theme.logoText} border-transparent`
                    }`}>
                      {shop.logoUrl ? (
                        <img src={shop.logoUrl} alt={shop.shortName} className="w-full h-full object-cover" />
                      ) : (
                        shop.shortName.charAt(0)
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={shop.status === 'active' ? 'success' : 'danger'}>
                        {shop.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </div>
                  </div>

                  {/* Business Name and Tagline */}
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight mb-1">
                    {shop.name}
                  </h3>
                  <p className={`text-[11px] font-semibold mb-4 leading-snug ${theme.text}`}>
                    {shop.tagline}
                  </p>

                  {/* Shop Details */}
                  <div className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">
                        <span className="text-slate-400 font-medium">Owner: </span>
                        {shop.ownerName}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">
                        <span className="text-slate-400 font-medium">Phone: </span>
                        {shop.mobileNumber}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">
                        <span className="text-slate-400 font-medium">Address: </span>
                        {shop.address}, {shop.city}, {shop.state} - {shop.pincode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Select Shop Action Button */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectShop(shop.id);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${theme.btn}`}
                  >
                    <span>{isSelected ? 'Active Workspace' : 'Select Shop'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
            {t('selectShop.isolationNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

