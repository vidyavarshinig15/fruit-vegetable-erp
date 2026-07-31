import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';

export const ReceiptsPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white">Payment Receipts</h1>
      <p className="text-sm font-bold text-slate-500">Issued payment receipts for {activeShop.name}</p>
      <Card>
        <EmptyState title="No Receipts Generated" description={`Issued receipts for ${activeShop.name} will appear here.`} />
      </Card>
    </div>
  );
};
