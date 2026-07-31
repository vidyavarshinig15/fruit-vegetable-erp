import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import {
  BookOpen,
  Printer,
  Calendar,
  Filter,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const LedgerPage: React.FC = () => {
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();

  // Selection & Timeline states
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);

  // Search & Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState('');
  const [search, setSearch] = useState('');

  // Summary & Overdue details
  const [summary, setSummary] = useState<any | null>(null);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [aging, setAging] = useState<any | null>(null);

  // Manual Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [adjustReason, setAdjustReason] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitAdjust, setIsSubmitAdjust] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        if (res.data?.success) {
          setCustomers((res.data.data || []).filter((c: any) => c.status === 'active'));
        }
      } catch (err) {
        console.error('Failed to load customers', err);
      }
    };
    fetchCustomers();
  }, [activeShop]);

  // Load Customer Ledger and summaries
  const loadLedgerContext = useCallback(async () => {
    if (!customerId) {
      setEntries([]);
      setSummary(null);
      setOverdue([]);
      setAging(null);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({ customerId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (transactionType) params.append('transactionType', transactionType);
      if (search) params.append('search', search);

      const [ledgerRes, summaryRes] = await Promise.all([
        api.get(`/ledgers?${params.toString()}`),
        api.get(`/ledgers/outstanding/${customerId}`),
      ]);

      if (ledgerRes.data?.success) {
        setEntries(ledgerRes.data.data || []);
      }

      if (summaryRes.data?.success && summaryRes.data?.data) {
        const { summary: s, overdue: o, aging: a } = summaryRes.data.data;
        setSummary(s);
        setOverdue(o);
        setAging(a);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load customer ledger.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, startDate, endDate, transactionType, search]);

  useEffect(() => {
    loadLedgerContext();
  }, [loadLedgerContext]);

  // Submit manual adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || adjustAmount <= 0 || !adjustReason) return;

    setIsSubmitAdjust(true);
    try {
      const res = await api.post('/ledgers/adjustments', {
        customerId,
        amount: Number(adjustAmount),
        type: adjustType,
        reason: adjustReason,
      });

      if (res.data?.success) {
        alert('Manual adjustment recorded successfully.');
        setShowAdjustModal(false);
        setAdjustAmount(0);
        setAdjustReason('');
        loadLedgerContext();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Adjustment failed.');
    } finally {
      setIsSubmitAdjust(false);
    }
  };

  const getTxBadge = (type: string) => {
    const maps: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; text: string }> = {
      INVOICE: { variant: 'info', text: 'Invoice' },
      PAYMENT: { variant: 'success', text: 'Payment' },
      OPENING_BALANCE: { variant: 'neutral', text: 'Opening Bal' },
      ADJUSTMENT_DEBIT: { variant: 'danger', text: 'Debit Adjust' },
      ADJUSTMENT_CREDIT: { variant: 'warning', text: 'Credit Adjust' },
    };
    const mapped = maps[type] || { variant: 'neutral', text: type };
    return <Badge variant={mapped.variant as any}>{mapped.text}</Badge>;
  };

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-market-700 dark:text-market-400" />
            Customer Ledger Timeline
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Shop: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        {customerId && (
          <div className="flex items-center gap-2.5">
            <Link to={`/ledger/statement?customerId=${customerId}&startDate=${startDate}&endDate=${endDate}`}>
              <Button variant="secondary" className="inline-flex items-center gap-1.5 font-bold py-2">
                <Printer className="w-4.5 h-4.5" /> Printable Statement
              </Button>
            </Link>

            {isAdmin && (
              <Button onClick={() => setShowAdjustModal(true)} variant="primary" className="inline-flex items-center gap-1.5 font-bold py-2 shadow-lg">
                <PlusCircle className="w-4.5 h-4.5" /> Manual Adjustment
              </Button>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-xl text-center text-sm">
          {errorMsg}
        </div>
      )}

      {/* Select Customer Card */}
      <Card title="Select Ledger Account" subtitle="Inspect running balances and historical financial adjustments.">
        <div className="max-w-md">
          <Select
            label="Wholesale Buyer Customer *"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'Select customer account' },
              ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
            ]}
          />
        </div>
      </Card>

      {customerId && summary && (
        <>
          {/* Credit Alerts Warn Cards */}
          {summary.isCreditHold && (
            <div className="p-4 bg-red-50 border border-red-250 text-red-750 font-bold rounded-2xl flex items-start gap-2 text-sm leading-snug">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="block font-black text-red-800 uppercase tracking-wide">Credit Warning Hold</span>
                <span>
                  Customer's outstanding balance of {formatCurrency(summary.currentOutstanding)} exceeds their assigned credit limit of {formatCurrency(summary.creditLimit)}. Immediate payment required.
                </span>
              </div>
            </div>
          )}

          {/* Account Summary Stats Deck */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Opening Balance', val: formatCurrency(summary.openingBalance) },
              { label: 'Current Outstanding', val: formatCurrency(summary.currentOutstanding), color: 'text-red-650' },
              { label: 'Advance Credit', val: formatCurrency(summary.advanceBalance), color: 'text-emerald-600' },
              { label: 'Available Credit', val: formatCurrency(summary.availableCredit), color: 'text-slate-900 dark:text-white' },
              { label: 'Overdue invoices', val: overdue.length, color: overdue.length > 0 ? 'text-amber-500 font-black' : 'text-slate-400' },
            ].map((stat, i) => (
              <Card key={i} className="p-3 bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">{stat.label}</span>
                <span className={`text-xl font-black mt-2 ${stat.color || 'text-slate-800'}`}>{stat.val}</span>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Ledger timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Timeline filters */}
              <Card title="Ledger Period filters" subtitle="Adjust dates ranges or filter transaction types.">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <Select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    options={[
                      { value: '', label: 'All Transactions' },
                      { value: 'INVOICE', label: 'Invoice' },
                      { value: 'PAYMENT', label: 'Payment' },
                      { value: 'ADJUSTMENT_DEBIT', label: 'Manual Debit' },
                      { value: 'ADJUSTMENT_CREDIT', label: 'Manual Credit' },
                    ]}
                  />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </Card>

              {/* Transactions Timeline */}
              {isLoading ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100">
                  Loading ledger entries...
                </div>
              ) : entries.length === 0 ? (
                <Card>
                  <EmptyState title="No Ledger Entries Found" description="Select another date range or transaction type filter." />
                </Card>
              ) : (
                <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Transaction Details</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4 text-right">Debit (₹)</th>
                          <th className="py-3 px-4 text-right">Credit (₹)</th>
                          <th className="py-3 px-4 text-right bg-slate-50/20 dark:bg-slate-950/5 font-extrabold sticky right-0">Running Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/40 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-250"
                          >
                            <td className="py-3 px-4 text-slate-500">
                              {new Date(entry.transactionDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 max-w-[200px] truncate" title={entry.description}>
                              {entry.description}
                            </td>
                            <td className="py-3 px-4">
                              {getTxBadge(entry.transactionType)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-red-650">
                              {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount).replace('₹', '') : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600">
                              {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount).replace('₹', '') : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-black bg-slate-50/40 dark:bg-slate-850/20 text-slate-900 dark:text-white sticky right-0">
                              {formatCurrency(entry.runningBalance).replace('₹', '')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>

            {/* Right col: Aging & Overdue summary */}
            <div className="space-y-6">
              {/* Aging Summary cards */}
              {aging && (
                <Card title="Outstanding Aging Analysis" subtitle="Overdue balances aggregated by delay days.">
                  <div className="space-y-3 font-semibold text-xs">
                    {[
                      { label: 'Current (Not Overdue)', val: aging.current, color: 'text-slate-800' },
                      { label: '1–30 Days Overdue', val: aging.aging1To30, color: 'text-amber-500' },
                      { label: '31–60 Days Overdue', val: aging.aging31To60, color: 'text-orange-500' },
                      { label: '61–90 Days Overdue', val: aging.aging61To90, color: 'text-red-500 font-extrabold' },
                      { label: '90+ Days Overdue', val: aging.aging90Plus, color: 'text-red-750 font-black' },
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                        <span className="text-slate-450">{row.label}</span>
                        <span className={row.color}>{formatCurrency(row.val)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Overdue Bills checklist */}
              <Card title="Unpaid Overdue Bills" subtitle="Individual overdue invoice items requiring payment.">
                {overdue.length === 0 ? (
                  <div className="p-4 text-center text-xs font-bold text-slate-400">
                    No overdue invoices found for this customer.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {overdue.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-red-50/10 border border-slate-150 rounded-xl flex items-center justify-between text-xs font-semibold"
                      >
                        <div>
                          <Link to={`/billing/invoices/${item.invoiceId}`} className="font-black text-slate-900 dark:text-white uppercase hover:underline flex items-center gap-1">
                            {item.invoiceNumber} <ExternalLink className="w-3 h-3" />
                          </Link>
                          <span className="block text-[10px] text-slate-500 mt-1">Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="block text-red-650 font-black">{formatCurrency(item.amount)}</span>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase">
                            <Clock className="w-2.5 h-2.5" /> {item.daysOverdue} days
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Manual Adjustment Form Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 no-print">
          <Card
            title="Create Manual Adjustment Entry"
            subtitle="Perform debit or credit adjustments. This action is logged to the audit log."
            className="w-[450px] shadow-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl"
          >
            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-left">
              {/* Type select */}
              <Select
                label="Adjustment Type *"
                required
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                options={[
                  { value: 'DEBIT', label: 'Debit (Increases customer dues)' },
                  { value: 'CREDIT', label: 'Credit (Reduces customer dues)' },
                ]}
              />

              {/* Amount */}
              <Input
                label="Adjustment Amount (₹) *"
                type="number"
                step="0.01"
                required
                value={adjustAmount || ''}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
              />

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Detailed Reason *</label>
                <textarea
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={3}
                  placeholder="Provide transaction details e.g., Rate discrepancy credit, writing off outstanding balance..."
                  className="w-full px-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-market-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="secondary" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitAdjust || adjustAmount <= 0} className="shadow-lg">
                  Record Entry
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
export default LedgerPage;
