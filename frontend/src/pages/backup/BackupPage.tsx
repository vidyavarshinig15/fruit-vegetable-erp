import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useShop } from '@/contexts/ShopContext';
import { Download, Database } from 'lucide-react';

export const BackupPage: React.FC = () => {
  const { activeShop } = useShop();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Data Export & Backup</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Export records for {activeShop.name}</p>
        </div>
        <Button variant="primary" className="inline-flex items-center gap-2">
          <Download className="w-5 h-5" /> Download Full CSV Export
        </Button>
      </div>

      <Card title="Database Storage Status" subtitle="Supabase automated snapshot status">
        <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <Database className="w-8 h-8 text-market-700 dark:text-market-400" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">Supabase Cloud Database Isolated Scope</h4>
            <p className="text-xs text-slate-500">Shop ID: {activeShop.id}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
