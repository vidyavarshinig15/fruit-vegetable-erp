import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { UserPlus, Users } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Customer Directory</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            Wholesale Customer Accounts for {activeShop.name}
          </p>
        </div>
        <Button variant="primary" className="inline-flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Add New Customer
        </Button>
      </div>

      <Card>
        <EmptyState
          title="No Customers Registered Yet"
          description={`Customer accounts added here will be strictly isolated to ${activeShop.name}.`}
          actionButton={
            <Button variant="primary" className="mt-2">
              Add First Customer
            </Button>
          }
        />
      </Card>
    </div>
  );
};
