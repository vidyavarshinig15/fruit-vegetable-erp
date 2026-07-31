import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';

export const HistoryPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white">Bill History</h1>
      <p className="text-sm font-bold text-slate-500">Historical invoice logs for {activeShop.name}</p>
      <Card>
        <EmptyState title="No Bills Generated Yet" description={`Historical bills for ${activeShop.name} will appear here.`} />
      </Card>
    </div>
  );
};
