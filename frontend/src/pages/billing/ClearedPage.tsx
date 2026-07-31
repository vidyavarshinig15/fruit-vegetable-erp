import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';

export const ClearedPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-emerald-700 dark:text-emerald-400">Fully Cleared Bills</h1>
      <p className="text-sm font-bold text-slate-500">Fully paid bill archive for {activeShop.name}</p>
      <Card>
        <EmptyState title="No Cleared Bills Yet" description="Fully settled customer bills will be archived here." />
      </Card>
    </div>
  );
};
