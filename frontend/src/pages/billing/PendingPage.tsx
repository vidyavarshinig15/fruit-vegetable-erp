import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';

export const PendingPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-amber-700 dark:text-amber-400">Pending Unpaid Bills</h1>
      <p className="text-sm font-bold text-slate-500">Bills with zero payments recorded for {activeShop.name}</p>
      <Card>
        <EmptyState title="No Pending Bills" description="All customer bills are currently cleared or up to date." />
      </Card>
    </div>
  );
};
