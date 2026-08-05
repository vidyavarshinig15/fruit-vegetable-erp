import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import {
  CreditCard,
  PlusCircle,
  Search,
  Eye,
  FileText,
  Calendar,
  Filter,
} from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const { activeShop } = useShop();

  // Data states
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Search & Filter states
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Customers for select mapping
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      if (res.data?.success) {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load customers for payments mapping', err);
    }
  }, []);

  // Fetch Invoices list for number mapping
  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.get('/invoices');
      if (res.data?.success) {
        setInvoices(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load invoices list', err);
    }
  }, []);

  // Fetch payments list
  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (customerId) params.append('customerId', customerId);
      if (paymentMode) params.append('paymentMode', paymentMode);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/payments?${params.toString()}`);
      if (res.data?.success) {
        setPayments(res.data.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load payments.');
    } finally {
      setIsLoading(false);
    }
  }, [search, customerId, paymentMode, startDate, endDate, activeShop]);

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
    fetchPayments();
  }, [fetchCustomers, fetchInvoices, fetchPayments, activeShop]);

  // Mode badges
  const getModeBadge = (mode: string) => {
    const maps: Record<string, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
      CASH: 'success',
      UPI: 'info',
      BANK_TRANSFER: 'warning',
      CHEQUE: 'neutral',
      OTHER: 'neutral',
    };
    return <Badge variant={maps[mode] || 'neutral'}>{mode.replace('_', ' ')}</Badge>;
  };

  // Status badges
  const getStatusBadge = (status: string) => {
    if (status === 'cancelled') {
      return <Badge variant="danger">Cancelled</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-market-700 dark:text-market-400" />
            Payments Ledger
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Shop: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        <Link to="/payments/new">
          <Button variant="primary" className="inline-flex items-center gap-2 shadow-lg py-2.5">
            <PlusCircle className="w-5 h-5" /> Record Collection
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Filter Deck */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-black uppercase text-xs text-slate-450 tracking-wider">
          <Filter className="w-4 h-4" /> Filter Options
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Payment # / Ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-market-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* Customer Select */}
          <Select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'All Customers' },
              ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
            ]}
          />

          {/* Mode Select */}
          <Select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            options={[
              { value: '', label: 'All Payment Modes' },
              { value: 'CASH', label: 'Cash' },
              { value: 'UPI', label: 'UPI' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>
      </Card>

      {/* Directory Queue */}
      {isLoading ? (
        <div className="p-12 text-center text-sm font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100">
          Loading payment receipts...
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <EmptyState
            title="No Payment Records Found"
            description="Collect unpaid bills or receive customer advance credits."
            actionButton={
              <Link to="/payments/new">
                <Button variant="primary" className="mt-2">
                  Record Collection
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-4 px-5">Receipt # / Ref</th>
                  <th className="py-4 px-5">Collection Date</th>
                  <th className="py-4 px-5">Customer Party</th>
                  <th className="py-4 px-5">Linked Invoice</th>
                  <th className="py-4 px-5 text-right">Received Amount</th>
                  <th className="py-4 px-5 text-center">Payment Mode</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const custName = customers.find((c) => c.id === p.customerId)?.name || 'Loading Customer...';
                  const invNum = p.invoiceId
                    ? invoices.find((inv) => inv.id === p.invoiceId)?.invoiceNumber || 'Linked Invoice'
                    : 'Advance Credit';

                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/40 transition-colors text-sm font-semibold ${
                        p.status === 'cancelled' ? 'opacity-60 line-through' : ''
                      }`}
                    >
                      <td className="py-4 px-5 font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {p.paymentNumber}
                      </td>
                      <td className="py-4 px-5 text-slate-500 font-bold">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5 font-extrabold text-slate-800 dark:text-slate-250">
                        {custName}
                      </td>
                      <td className={`py-4 px-5 font-bold ${p.invoiceId ? 'text-market-700' : 'text-emerald-600 font-black'}`}>
                        {p.invoiceId ? (
                          <Link to={`/billing/invoices/${p.invoiceId}`} className="hover:underline">
                            {invNum}
                          </Link>
                        ) : (
                          <span>Advance</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right font-black text-slate-900 dark:text-white">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {getModeBadge(p.paymentMode)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <Link to={`/payments/${p.id}`}>
                          <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5 py-1 text-xs font-bold shadow-sm">
                            <Eye className="w-4 h-4" /> View Receipt
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
      )}
    </div>
  );
};
export default PaymentsPage;
