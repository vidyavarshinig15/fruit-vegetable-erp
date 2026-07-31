import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';

export const PartialPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-sky-700 dark:text-sky-400">Partially Paid Bills</h1>
      <p className="text-sm font-bold text-slate-500">Bills with partial payments recorded for {activeShop.name}</p>
      <Card>
        <EmptyState title="No Partially Paid Bills" description="No partially paid bills found." />
      </Card>
    </div>
  );
};
