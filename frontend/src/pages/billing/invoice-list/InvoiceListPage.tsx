import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  FileText,
  Search,
  PlusCircle,
  TrendingUp,
  Calendar,
  XCircle,
  Eye,
  CheckSquare,
} from 'lucide-react';

export const InvoiceListPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [billStatus, setBillStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data States
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Customers for filters mapping
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      if (res.data?.success) {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load customers for filters', err);
    }
  }, []);

  // Fetch Invoices catalog
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/invoices', {
        params: {
          search: search || undefined,
          customerId: customerId || undefined,
          paymentStatus: paymentStatus || undefined,
          billStatus: billStatus || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      if (res.data?.success) {
        setInvoices(res.data.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch invoices directory');
    } finally {
      setIsLoading(false);
    }
  }, [search, customerId, paymentStatus, billStatus, startDate, endDate]);

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, [fetchCustomers, fetchInvoices, activeShop]);

  // Payment badge render helpers
  const getPaymentBadge = (status: string) => {
    const maps: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral'; text: string }> = {
      PAID: { variant: 'success', text: 'Paid' },
      PARTIALLY_PAID: { variant: 'warning', text: 'Partial' },
      UNPAID: { variant: 'danger', text: 'Pending' },
      CANCELLED: { variant: 'neutral', text: 'Cancelled' },
    };
    const mapped = maps[status] || { variant: 'neutral', text: status };
    return <Badge variant={mapped.variant}>{mapped.text}</Badge>;
  };

  const getBillBadge = (status: string) => {
    const maps: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; text: string }> = {
      GENERATED: { variant: 'success', text: 'Generated' },
      PRINTED: { variant: 'info', text: 'Printed' },
      CANCELLED: { variant: 'danger', text: 'Cancelled' },
      DRAFT: { variant: 'neutral', text: 'Draft' },
    };
    const mapped = maps[status] || { variant: 'neutral', text: status };
    return <Badge variant={mapped.variant as any}>{mapped.text}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-market-700 dark:text-market-400" />
            Shop Invoices Directory
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Workspace: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        <Link to="/billing">
          <Button variant="primary" className="inline-flex items-center gap-2 shadow-lg py-2.5">
            <PlusCircle className="w-5 h-5" /> Generate New Invoice
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Filters Card */}
      <Card className="p-4 bg-white dark:bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2 lg:col-span-2 relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Search Invoice</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Invoice number code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700"
              />
            </div>
          </div>

          <Select
            label="Filter Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'All Customers' },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            label="Payment Status"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'UNPAID', label: 'Pending' },
              { value: 'PARTIALLY_PAID', label: 'Partial' },
              { value: 'PAID', label: 'Paid' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </Card>

      {/* Directory Table Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          Loading active billing records from database...
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <EmptyState
            title="No Invoices Recorded"
            description="Create daily wholesale bills for your hotels/catering buyers."
            actionButton={
              <Link to="/billing">
                <Button variant="primary" className="mt-2">
                  Create First Invoice
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
                  <th className="py-4 px-5">Invoice Number</th>
                  <th className="py-4 px-5">Billing Date</th>
                  <th className="py-4 px-5">Wholesale Customer</th>
                  <th className="py-4 px-5 text-right">Grand Total</th>
                  <th className="py-4 px-5 text-right">Balance Due</th>
                  <th className="py-4 px-5">Payment status</th>
                  <th className="py-4 px-5">Bill status</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const custName = customers.find((c) => c.id === inv.customerId)?.name || 'Loading customer...';
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors text-sm font-semibold"
                    >
                      <td className="py-4 px-5 font-black text-slate-900 dark:text-white">
                        <Link to={`/billing/invoices/${inv.id}`} className="hover:underline hover:text-market-700">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-4 px-5 text-slate-650 flex items-center gap-1.5 mt-2 md:mt-0">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(inv.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-705 dark:text-slate-300">
                        {custName}
                      </td>
                      <td className="py-4 px-5 text-right font-black text-slate-900 dark:text-white text-base">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-slate-500">
                        {formatCurrency(inv.balanceAmount)}
                      </td>
                      <td className="py-4 px-5">
                        {getPaymentBadge(inv.paymentStatus)}
                      </td>
                      <td className="py-4 px-5">
                        {getBillBadge(inv.billStatus)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <Link to={`/billing/invoices/${inv.id}`} title="View Details">
                          <button className="p-2 text-slate-505 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
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
