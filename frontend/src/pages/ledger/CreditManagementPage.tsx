import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useShop } from '@/contexts/ShopContext';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  CreditCard,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';

export const CreditManagementPage: React.FC = () => {
  const { activeShop } = useShop();

  // Dashboard state
  const [stats, setStats] = useState<any>({
    totalOutstanding: 0,
    totalAdvanceBalance: 0,
    overdueCustomersCount: 0,
    creditHoldCustomersCount: 0,
    highestOutstandingCustomers: [],
    todayCollections: 0,
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, custRes] = await Promise.all([
        api.get('/ledgers/dashboard'),
        api.get('/customers'),
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }

      if (custRes.data?.success) {
        setCustomers((custRes.data.data || []).filter((c: any) => c.status === 'active'));
      }
    } catch (err) {
      console.error('Failed to load credit management dashboard', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeShop]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats, activeShop]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Analyzing customer credit limits and outstanding logs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-market-700 dark:text-market-400" />
            Credit & Outstanding Control
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Workspace: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>
      </div>

      {/* Credit Summary Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Outstanding', val: formatCurrency(stats.totalOutstanding), color: 'text-red-650' },
          { label: 'Customer Advances', val: formatCurrency(stats.totalAdvanceBalance), color: 'text-emerald-600' },
          { label: 'Overdue accounts', val: stats.overdueCustomersCount, color: 'text-amber-500 font-black' },
          { label: 'Credit Hold blocks', val: stats.creditHoldCustomersCount, color: 'text-red-750 font-black' },
          { label: "Today's Collections", val: formatCurrency(stats.todayCollections), color: 'text-sky-650' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">{stat.label}</span>
            <span className={`text-2xl font-black mt-2 ${stat.color}`}>{stat.val}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer Credit list */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Outstanding Ledger directory" subtitle="Search customers to view ledger balances.">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-market-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider pb-2">
                    <th className="py-2.5 px-3">Party Name</th>
                    <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit Limit (₹)</th>
                    <th className="py-2.5 px-3 text-center">Credit Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((cust) => {
                    const balance = cust.currentOutstanding ?? cust.current_balance ?? 0;
                    const limit = cust.creditLimit ?? cust.credit_limit ?? 0;
                    const outstanding = balance > 0 ? balance : 0;
                    const creditHold = outstanding > limit && limit > 0;

                    return (
                      <tr key={cust.id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/30">
                        <td className="py-3 px-3">
                          <span className="block font-black text-slate-900 dark:text-white uppercase">{cust.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{cust.customerCode}</span>
                        </td>
                        <td className={`py-3 px-3 text-right font-extrabold ${balance > 0 ? 'text-red-650' : 'text-emerald-650'}`}>
                          {formatCurrency(balance).replace('₹', '')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-500">
                          {limit > 0 ? formatCurrency(limit).replace('₹', '') : 'No Limit'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {creditHold ? (
                            <Badge variant="danger">Credit Hold</Badge>
                          ) : balance < 0 ? (
                            <Badge variant="success">Advance Credit</Badge>
                          ) : (
                            <Badge variant="neutral">Normal</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Link to={`/ledger?customerId=${cust.id}`}>
                            <Button variant="secondary" size="sm" className="inline-flex items-center gap-1 py-1 text-[10px] font-bold">
                              Inspect <ChevronRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Col: Top Holdings & Warning Alerts */}
        <div className="space-y-6">
          {/* Top Hold Customers */}
          <Card title="Highest outstanding accounts" subtitle="Top 5 customers owing dues.">
            <div className="space-y-3">
              {stats.highestOutstandingCustomers.map((cust: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-semibold"
                >
                  <div>
                    <span className="font-black text-slate-900 dark:text-white uppercase">{cust.name}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{cust.code}</span>
                  </div>

                  <div className="text-right">
                    <span className="block text-red-650 font-black">{formatCurrency(cust.outstanding)}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">Limit: {cust.creditLimit > 0 ? formatCurrency(cust.creditLimit) : 'None'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Overrides Approvals Info */}
          <Card title="Administrators overrides control" subtitle="Approval parameters guidelines.">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs text-slate-650 font-medium">
              <div className="flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Credit holds blocks can only be overridden during invoice checkout by authorized users (Admin/Super Admin roles).</span>
              </div>
              <div className="flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Override actions require double confirmation and write logs directly to activity registers.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default CreditManagementPage;
