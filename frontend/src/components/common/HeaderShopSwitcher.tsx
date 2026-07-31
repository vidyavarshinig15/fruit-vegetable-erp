import React from 'react';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShopId, UserRole } from '@raju-billing/shared';
import { Store, ChevronDown } from 'lucide-react';

export const HeaderShopSwitcher: React.FC = () => {
  const { activeShop, activeShopId, setActiveShopId, availableShops } = useShop();
  const { user } = useAuth();

  if (!user) return null;

  // Filter available shops based on user assignment
  const userShops = availableShops.filter((shop) =>
    user.role === UserRole.SUPER_ADMIN ? true : user.assignedShopIds.includes(shop.id)
  );

  const canSwitch = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

  const handleSelectShop = (shopId: ShopId) => {
    // If there is any unsaved work in the window session, prompt confirmation
    const hasUnsaved = (window as any).unsavedChanges || false;
    if (hasUnsaved) {
      const confirmSwitch = window.confirm('You have unsaved changes. Do you want to switch shops?');
      if (!confirmSwitch) return;
      (window as any).unsavedChanges = false; // Reset flag after confirmation
    }
    setActiveShopId(shopId);
  };

  return (
    <div className="relative inline-block text-left">
      {canSwitch && userShops.length > 1 ? (
        <div className="flex items-center gap-2 bg-market-800 hover:bg-market-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border border-market-700 transition-colors">
          <Store className="w-4 h-4 text-market-200" />
          <select
            value={activeShopId}
            onChange={(e) => handleSelectShop(e.target.value as ShopId)}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-2"
          >
            {userShops.map((shop) => (
              <option key={shop.id} value={shop.id} className="bg-slate-900 text-white py-1">
                {shop.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-market-200 pointer-events-none -ml-2" />
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-market-900/60 border border-market-700 text-market-100 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
          <Store className="w-4 h-4 text-market-400" />
          <span>{activeShop.name}</span>
        </div>
      )}
    </div>
  );
};

