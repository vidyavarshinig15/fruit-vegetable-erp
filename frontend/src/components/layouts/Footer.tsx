import React from 'react';
import { useShop } from '@/contexts/ShopContext';

export const Footer: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 flex flex-col md:flex-row items-center justify-between gap-2">
      <div>
        <span>System Active for: </span>
        <span className="text-market-700 dark:text-market-400 font-extrabold">{activeShop.name}</span>
      </div>
      <div>
        <span>Production Wholesale Billing & Customer Management System • </span>
        <span className="text-slate-400">NO GST / NO TAX Model</span>
      </div>
    </footer>
  );
};
