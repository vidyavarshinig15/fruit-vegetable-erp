import React from 'react';
import { useShop } from '@/contexts/ShopContext';
import { ShopId } from '@raju-billing/shared';
import { Store, ChevronDown } from 'lucide-react';

export const ShopSwitcher: React.FC = () => {
  const { activeShop, activeShopId, setActiveShopId, availableShops } = useShop();

  return (
    <div className="relative group">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-market-900 text-white rounded-xl shadow-md border border-market-700 cursor-pointer hover:bg-market-950 transition-colors">
        <Store className="w-5 h-5 text-market-300" />
        <div className="flex flex-col text-left">
          <span className="text-xs uppercase font-extrabold text-market-200 tracking-wide">Active Wholesale Shop</span>
          <span className="text-base font-extrabold leading-tight">{activeShop.name}</span>
        </div>
        <ChevronDown className="w-5 h-5 text-market-300 ml-2" />
      </div>

      <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-market-700/30 p-2 hidden group-hover:block z-50 animate-fade-in">
        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Select Independent Shop</div>
        {availableShops.map((shop) => {
          const isSelected = shop.id === activeShopId;
          return (
            <button
              key={shop.id}
              onClick={() => setActiveShopId(shop.id as ShopId)}
              className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
                isSelected
                  ? 'bg-market-800 text-white font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div>
                <div className="font-bold text-sm">{shop.name}</div>
                <div className={`text-xs ${isSelected ? 'text-market-200' : 'text-slate-500'}`}>{shop.tagline}</div>
              </div>
              {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-market-300 animate-pulse" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
