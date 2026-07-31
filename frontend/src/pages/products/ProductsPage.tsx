import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { Plus, Apple } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Product Catalog & Daily Rates</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            Vegetables & Fruits Rates for {activeShop.name}
          </p>
        </div>
        <Button variant="primary" className="inline-flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Product / Set Rates
        </Button>
      </div>

      <Card>
        <EmptyState
          title="No Products Configured"
          description={`Vegetable & Fruit item rates for ${activeShop.name} will appear here.`}
          actionButton={
            <Button variant="primary" className="mt-2">
              Add First Product
            </Button>
          }
        />
      </Card>
    </div>
  );
};
