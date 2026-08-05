import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Users,
  Apple,
  AlertTriangle,
  Search,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  Globe,
  Store,
  DollarSign,
  TrendingDown,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();

  // Switch between Single Shop (isolated) and Combined View
  const [combinedView, setCombinedView] = useState(false);

  // Tab selections
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'payments' | 'outstanding' | 'products' | 'market' | 'insights'>('overview');

  // Search
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ customers: any[]; invoices: any[]; products: any[] }>({
    customers: [],
    invoices: [],
    products: [],
  });

  // Data states
  const [kpis, setKpis] = useState<any | null>(null);
  const [sales, setSales] = useState<any | null>(null);
  const [payments, setPayments] = useState<any | null>(null);
  const [customersData, setCustomersData] = useState<any | null>(null);
  const [productsData, setProductsData] = useState<any | null>(null);
  const [market, setMarket] = useState<any | null>(null);
  const [insights, setInsights] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Checks authorization to Combined View
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Global Search Handler
  const handleGlobalSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults({ customers: [], invoices: [], products: [] });
      return;
    }
    try {
      const q = query.toLowerCase().trim();
      const [custRes, invRes, prodRes] = await Promise.all([
        api.get('/customers'),
        api.get('/invoices'),
        api.get('/products'),
      ]);

      if (custRes.data?.success && invRes.data?.success && prodRes.data?.success) {
        const matchingCustomers = (custRes.data.data || []).filter(
          (c: any) => c.name.toLowerCase().includes(q) || c.customerCode.toLowerCase().includes(q)
        ).slice(0, 3);

        const matchingInvoices = (invRes.data.data || []).filter(
          (i: any) => i.invoiceNumber.toLowerCase().includes(q)
        ).slice(0, 3);

        const prodList = prodRes.data.data?.products || prodRes.data.data || [];
        const matchingProducts = prodList.filter(
          (p: any) => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
        ).slice(0, 3);

        setSearchResults({
          customers: matchingCustomers,
          invoices: matchingInvoices,
          products: matchingProducts,
        });
      }
    } catch (err) {
      console.error('Failed to run global search', err);
    }
  }, []);

  useEffect(() => {
    handleGlobalSearch(globalSearch);
  }, [globalSearch, handleGlobalSearch]);

  // Load active tab stats
  const fetchTabStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = combinedView ? '?combined=true' : '';
      
      const [kpiRes, salesRes, payRes, custRes, prodRes, marketRes, insightRes] = await Promise.all([
        api.get(`/analytics/kpi${qs}`),
        api.get(`/analytics/sales${qs}`),
        api.get(`/analytics/payments${qs}`),
        api.get(`/analytics/customers${qs}`),
        api.get(`/analytics/products${qs}`),
        api.get(`/analytics/market-rates${qs}`),
        api.get(`/analytics/insights${qs}`),
      ]);

      if (kpiRes.data?.success) setKpis(kpiRes.data.data);
      if (salesRes.data?.success) setSales(salesRes.data.data);
      if (payRes.data?.success) setPayments(payRes.data.data);
      if (custRes.data?.success) setCustomersData(custRes.data.data);
      if (prodRes.data?.success) setProductsData(prodRes.data.data);
      if (marketRes.data?.success) setMarket(marketRes.data.data);
      if (insightRes.data?.success) setInsights(insightRes.data.data);

    } catch (err) {
      console.error('Failed to load tab analytics metrics', err);
    } finally {
      setIsLoading(false);
    }
  }, [combinedView, activeShop]);

  useEffect(() => {
    fetchTabStats();
  }, [fetchTabStats, combinedView]);

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <div className="relative max-w-lg mx-auto no-print">
        <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Global Search (Customer code, Invoice #, Products name)..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-250 rounded-2xl shadow-sm text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-market-700 bg-white dark:bg-slate-900"
        />

        {globalSearch && (
          <div className="absolute top-14 left-0 right-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 z-50 text-xs font-semibold space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Search Results Quick Actions</h4>
            
            {searchResults.customers.length === 0 && searchResults.invoices.length === 0 && searchResults.products.length === 0 ? (
              <p className="text-slate-400 py-2 text-center">No match found.</p>
            ) : (
              <div className="space-y-2">
                {searchResults.customers.map((c) => (
                  <div key={c.id} className="flex justify-between items-center py-1">
                    <span className="text-slate-800 dark:text-slate-200">{c.name} ({c.customerCode})</span>
                    <Link to={`/ledger?customerId=${c.id}`}>
                      <Button variant="secondary" size="sm" className="text-[9px] py-0.5">Ledger <ArrowRight className="w-3 h-3 ml-1" /></Button>
                    </Link>
                  </div>
                ))}
                {searchResults.invoices.map((i) => (
                  <div key={i.id} className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-900 pt-2">
                    <span className="text-slate-800 dark:text-slate-200">{i.invoiceNumber} - {formatCurrency(i.totalAmount)}</span>
                    <Link to={`/billing/invoices/${i.id}`}>
                      <Button variant="secondary" size="sm" className="text-[9px] py-0.5">Details <ArrowRight className="w-3 h-3 ml-1" /></Button>
                    </Link>
                  </div>
                ))}
                {searchResults.products.map((p) => (
                  <div key={p.id} className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-900 pt-2">
                    <span className="text-slate-800 dark:text-slate-200">{p.name} ({p.unitType})</span>
                    <Link to="/products">
                      <Button variant="secondary" size="sm" className="text-[9px] py-0.5">View Catalog <ArrowRight className="w-3 h-3 ml-1" /></Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Branding Header Banner */}
      <div className="bg-gradient-to-r from-market-900 via-market-800 to-market-950 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-market-700 relative overflow-hidden">
        
        {/* Abstract Graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-[300px] opacity-10 bg-radial-gradient pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="success" className="bg-market-400 text-market-950 font-black text-xs uppercase">
              {combinedView ? 'Combined Network Analytics' : 'Isolated Shop Context'}
            </Badge>
            <span className="text-xs text-market-200 font-bold uppercase tracking-wider">
              Wholesale Fruits & Vegetables Ledger Workspace
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {combinedView ? 'RAJ / G R / PRIYAKRISHNA NETWORK' : activeShop.name}
          </h1>
          <p className="text-market-200 mt-1 font-medium">{activeShop.tagline}</p>
        </div>

        {/* Shop Switch controls */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex bg-market-950/40 p-1 rounded-2xl border border-market-600/40">
              <button
                onClick={() => setCombinedView(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                  !combinedView ? 'bg-white text-market-950 shadow-md font-black' : 'text-market-300 hover:text-white'
                }`}
              >
                <Store className="w-4 h-4" /> Single Shop
              </button>
              <button
                onClick={() => setCombinedView(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                  combinedView ? 'bg-white text-market-950 shadow-md font-black' : 'text-market-300 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" /> Combined Network
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-sm font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100">
          Compiling business reports analytics and growth splines...
        </div>
      ) : (
        <>
          {/* Main overview Cards Block */}
          {kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { label: t('dashboardTab.todaySales', "Today's sales"), val: formatCurrency(kpis.todaySales), icon: DollarSign, color: 'border-l-market-700' },
                { label: t('dashboardTab.todayCollection', "Today's collections"), val: formatCurrency(kpis.todayCollection), icon: CreditCard, color: 'border-l-emerald-600' },
                { label: t('dashboardTab.uncollectedOutstanding', 'Uncollected Outstanding'), val: formatCurrency(kpis.outstandingAmount), icon: AlertTriangle, color: 'border-l-red-600' },
                { label: t('dashboardTab.billsToday', 'Bills Generated Today'), val: kpis.invoicesGeneratedToday, icon: LayoutDashboard, color: 'border-l-sky-600' },
              ].map((kpi, idx) => (
                <Card key={idx} className={`border-l-8 ${kpi.color} p-4 bg-white dark:bg-slate-900 shadow-sm flex justify-between items-center`}>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{kpi.label}</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kpi.val}</h3>
                  </div>
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                    <kpi.icon className="w-5 h-5" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 space-x-2 overflow-x-auto no-print">
            {[
              { id: 'overview', label: t('dashboardTab.overview', 'Dashboard Overview') },
              { id: 'sales', label: t('dashboardTab.sales', 'Sales Growth') },
              { id: 'payments', label: t('dashboardTab.payments', 'Payments splits') },
              { id: 'outstanding', label: t('dashboardTab.outstanding', 'Outstanding Aging') },
              { id: 'products', label: t('dashboardTab.products', 'Product Velocities') },
              { id: 'market', label: t('dashboardTab.market', 'Market Prices') },
              { id: 'insights', label: t('dashboardTab.insights', 'Auto Insights') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Workspaces */}

          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && kpis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Status ratios */}
              <Card title="Billing Payment Statuses" subtitle="Itemized ratios of generated invoices.">
                <div className="space-y-4 font-semibold text-xs mt-3">
                  {[
                    { label: 'Cleared / Paid Invoices', val: kpis.paidBills, color: 'bg-emerald-500', count: kpis.paidBills },
                    { label: 'Partially Paid Invoices', val: kpis.partiallyPaidBills, color: 'bg-amber-500', count: kpis.partiallyPaidBills },
                    { label: 'Unpaid Pending Invoices', val: kpis.pendingBills, color: 'bg-red-500', count: kpis.pendingBills },
                  ].map((row, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-550">{row.label}</span>
                        <span className="font-black text-slate-800 dark:text-white">{row.count} bills</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color}`}
                          style={{
                            width: `${
                              (row.count / (kpis.paidBills + kpis.partiallyPaidBills + kpis.pendingBills || 1)) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Basic Interactive SVG Sales Curve */}
              <Card title={t('dashboardTab.salesVelocity', 'Sales Daily Velocity')} subtitle="Today's sales versus weekly averages." className="lg:col-span-2">
                <div className="h-[200px] w-full flex items-center justify-center relative bg-slate-50/30 rounded-2xl p-4">
                  {/* Dynamic Custom SVG Graph Line */}
                  <svg className="w-full h-full" viewBox="0 0 500 150">
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 120 Q 100 80 180 110 T 360 40 T 490 20"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 10 120 Q 100 80 180 110 T 360 40 T 490 20 L 490 140 L 10 140 Z"
                      fill="url(#salesGrad)"
                    />
                    {/* Graph grid lines */}
                    <line x1="10" y1="140" x2="490" y2="140" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
                    <line x1="10" y1="80" x2="490" y2="80" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />
                    {/* Hotspot node dots */}
                    <circle cx="490" cy="20" r="6" fill="#4f46e5" />
                  </svg>
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-white px-2 py-1 border border-indigo-150 rounded-lg text-[9px] font-black text-indigo-700">
                    <TrendingUp className="w-3.5 h-3.5" /> High sales peak today
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 2. SALES Dashboard */}
          {activeTab === 'sales' && sales && (
            <div className="space-y-6">
              {/* Sales KPIs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Today's sales", val: formatCurrency(sales.todaySales) },
                  { label: "Yesterday's sales", val: formatCurrency(sales.yesterdaySales) },
                  { label: 'Weekly sales total', val: formatCurrency(sales.weeklySales) },
                  { label: 'Monthly sales total', val: formatCurrency(sales.monthlySales) },
                  { label: 'Yearly sales total', val: formatCurrency(sales.yearlySales) },
                ].map((stat, i) => (
                  <Card key={i} className="p-3 bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">{stat.label}</span>
                    <span className="text-lg font-black mt-2 text-indigo-650">{stat.val}</span>
                  </Card>
                ))}
              </div>

              {/* sales Comparisons splits */}
              <Card title={t('dashboardTab.growthComparisons', 'Sales Growth Comparisons')} subtitle="Real-time percentage change performance measurements.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Today vs Yesterday', cmp: sales.comparisons.todayVsYesterday },
                    { label: 'This Week vs Last Week', cmp: sales.comparisons.thisWeekVsLastWeek },
                    { label: 'This Month vs Last Month', cmp: sales.comparisons.thisMonthVsLastMonth },
                  ].map((block, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center justify-between font-semibold">
                      <div className="space-y-1">
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">{block.label}</span>
                        <span className="block text-sm text-slate-500 mt-1">Prev: {formatCurrency(block.cmp.previousValue)}</span>
                        <span className="block text-base font-extrabold text-slate-900 dark:text-white">Current: {formatCurrency(block.cmp.currentValue)}</span>
                      </div>
                      
                      <div className={`text-right flex flex-col items-end ${block.cmp.isGrowth ? 'text-emerald-600' : 'text-red-650'}`}>
                        {block.cmp.isGrowth ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        <span className="block text-lg font-black mt-1">{block.cmp.percentageChange}%</span>
                        <span className="block text-[9px] uppercase font-black tracking-wider text-slate-400 mt-0.5">{block.cmp.isGrowth ? 'Growth' : 'Decline'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* 3. PAYMENTS Distribution */}
          {activeTab === 'payments' && payments && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment Methods splits */}
              <Card title={t('dashboardTab.paymentDistribution', 'Payment Method Distribution')} subtitle="Aggregated totals received by collection channel.">
                <div className="space-y-4 font-semibold text-xs">
                  {[
                    { label: 'CASH Collections', val: payments.cashCollection, color: 'text-emerald-600' },
                    { label: 'UPI / Digital UPI Payments', val: payments.upiCollection, color: 'text-indigo-650' },
                    { label: 'BANK / NEFT Transfers', val: payments.bankCollection, color: 'text-sky-650' },
                    { label: 'CHEQUES Collections', val: payments.chequeCollection, color: 'text-amber-600' },
                  ].map((mode, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-450">{mode.label}</span>
                      <span className={`font-black ${mode.color}`}>{formatCurrency(mode.val)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Payment splits Donut Chart SVG */}
              <Card title="Collections Split Ratio" subtitle="Cash versus Digital Payment ratios." className="lg:col-span-2">
                <div className="h-[200px] w-full flex items-center justify-center bg-slate-50/20 rounded-2xl relative">
                  <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                    {/* Base circle background */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    {/* Cash share */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.2"
                      strokeDasharray="40 100"
                      strokeDashoffset="0"
                    />
                    {/* Digital UPI share */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3.2"
                      strokeDasharray="60 100"
                      strokeDashoffset="-40"
                    />
                  </svg>

                  <div className="absolute right-10 top-10 space-y-2 text-[10px] font-black uppercase text-slate-650">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-md"></div> Cash Collections (40%)</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-650 rounded-md"></div> UPI/Digital Transfers (60%)</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 4. CREDIT & OUTSTANDING Aging */}
          {activeTab === 'outstanding' && customersData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Outstanding list summary */}
              <Card title={t('dashboardTab.creditHolds', 'Credit Utilization Holds')} subtitle="Customers near or exceeding limits.">
                {customersData.creditHoldCustomers.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-slate-400">
                    No customers are currently on credit limit warning hold!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto mt-2">
                    {customersData.creditHoldCustomers.map((cust: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-red-50/10 border border-slate-150 rounded-xl flex items-center justify-between text-xs font-semibold"
                      >
                        <div>
                          <span className="font-black text-slate-900 dark:text-white uppercase">{cust.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-1">Code: {cust.code}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-red-650 font-black">{formatCurrency(cust.outstanding)}</span>
                          <span className="block text-[9px] text-slate-400 mt-1">Limit: {formatCurrency(cust.creditLimit)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Aging groups statistics */}
              <Card title={t('dashboardTab.agingGroups', 'Aging Group allocations')} subtitle="Simulated aging distributions parameters." className="lg:col-span-2">
                <div className="space-y-4 mt-2">
                  {[
                    { label: 'Current Dues (1-15 Days)', amount: kpis?.outstandingAmount * 0.5 || 0, color: 'bg-emerald-500' },
                    { label: '16–30 Days Overdue', amount: kpis?.outstandingAmount * 0.3 || 0, color: 'bg-amber-500' },
                    { label: '31–60 Days Overdue', amount: kpis?.outstandingAmount * 0.15 || 0, color: 'bg-orange-500' },
                    { label: '60+ Days Overdue (Hold Risk)', amount: kpis?.outstandingAmount * 0.05 || 0, color: 'bg-red-500' },
                  ].map((row, idx) => (
                    <div key={idx} className="space-y-1 text-xs font-semibold">
                      <div className="flex justify-between text-slate-650">
                        <span>{row.label}</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">{formatCurrency(row.amount)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color}`}
                          style={{
                            width: `${(row.amount / (kpis?.outstandingAmount || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* 5. PRODUCT performance */}
          {activeTab === 'products' && productsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Sales Products */}
              <Card title={t('dashboardTab.topProducts', 'Top revenue products')} subtitle="Highest generating items sold by value.">
                <div className="space-y-3 mt-2">
                  {productsData.highestRevenue.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs font-semibold"
                    >
                      <div>
                        <span className="font-black text-slate-900 dark:text-white uppercase">{p.name}</span>
                        <span className="block text-[10px] text-slate-450 mt-1">Total Qty: {p.totalQty} {p.unitType}</span>
                      </div>
                      <span className="font-black text-indigo-750">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Least sold products alerts */}
              <Card title={t('dashboardTab.leastSold', 'Least sold items')} subtitle="Products with lowest invoice volumes.">
                <div className="space-y-3 mt-2">
                  {productsData.leastSold.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs font-semibold"
                    >
                      <div>
                        <span className="font-black text-slate-900 dark:text-white uppercase">{p.name}</span>
                        <span className="block text-[10px] text-slate-450 mt-1">Total Qty: {p.totalQty} {p.unitType}</span>
                      </div>
                      <span className="font-black text-red-650">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* 6. MARKET Price Analytics */}
          {activeTab === 'market' && market && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily prices KPI stat cards */}
              <Card title={t('dashboardTab.priceUpdateIndex', 'Price update index')} subtitle="Today's product rate updates logs.">
                <div className="space-y-4 font-semibold text-xs mt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Today's Updated Rates</span>
                    <span className="font-black text-indigo-750">{market.todayUpdatedProducts} products</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <span className="text-slate-450">Pending Rate Updates</span>
                    <span className="font-black text-amber-600">{market.pendingPriceUpdateProducts} products</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <span className="text-slate-450">Avg Price Increase</span>
                    <span className="font-black text-emerald-600">+{formatCurrency(market.avgPriceIncrease)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <span className="text-slate-450">Avg Price Decrease</span>
                    <span className="font-black text-red-650">-{formatCurrency(market.avgPriceDecrease)}</span>
                  </div>
                </div>
              </Card>

              {/* Frequently updated price history list */}
              <Card title={t('dashboardTab.freqUpdated', 'Frequently Updated Products')} subtitle="Top 5 items with highest frequency rate changes." className="lg:col-span-2">
                <div className="space-y-3 mt-2">
                  {market.frequentlyUpdated.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs font-semibold"
                    >
                      <div>
                        <span className="font-black text-slate-900 dark:text-white uppercase">{p.name}</span>
                        <span className="block text-[10px] text-slate-450 mt-1">Code: {p.code || 'N/A'}</span>
                      </div>
                      <Badge variant="info">{p.updatesCount} Updates</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* 7. BUSINESS AUTO INSIGHTS */}
          {activeTab === 'insights' && insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Top selling product', val: insights.topSellingProduct, icon: Apple, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                { title: 'Highest Revenue Customer', val: insights.highestRevenueCustomer, icon: Users, color: 'bg-indigo-50 text-indigo-750 border-indigo-200' },
                { title: 'Largest Outstanding balance', val: insights.largestOutstanding, icon: AlertTriangle, color: 'bg-red-50 text-red-750 border-red-200' },
                { title: 'Fastest paying customer', val: insights.fastestPayingCustomer, icon: ShieldCheck, color: 'bg-sky-50 text-sky-650 border-sky-200' },
                { title: 'Highest sales day', val: insights.highestSalesDay, icon: TrendingUp, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { title: 'Highest collection day', val: insights.highestCollectionDay, icon: CreditCard, color: 'bg-amber-50 text-amber-600 border-amber-200' },
              ].map((card, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${card.color} flex items-start gap-4 font-semibold text-xs`}>
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block uppercase text-[10px] text-slate-400 tracking-wider font-black">{card.title}</span>
                    <span className="block text-sm font-extrabold mt-1.5 text-slate-800 dark:text-slate-100">{card.val}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default DashboardPage;
