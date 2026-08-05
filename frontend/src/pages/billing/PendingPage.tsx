import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  FileText,
  Search,
  Calendar,
  Eye,
  Filter,
} from 'lucide-react';

export const PendingPage: React.FC = () => {
  const { activeShop } = useShop();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
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

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/invoices');
      if (res.data?.success) {
        // Only get UNPAID bills that are not cancelled
        const unpaidList = (res.data.data || []).filter(
          (inv: any) => inv.paymentStatus === 'UNPAID' && inv.billStatus !== 'CANCELLED'
        );
        setInvoices(unpaidList);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch pending invoices');
    } finally {
      setIsLoading(false);
    }
  }, [activeShop]);

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, [fetchCustomers, fetchInvoices, activeShop]);

  // Filter logic in frontend
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = search
      ? inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesCustomer = customerId ? inv.customerId === customerId : true;
    const matchesStartDate = startDate ? inv.invoiceDate >= startDate : true;
    const matchesEndDate = endDate ? inv.invoiceDate <= endDate : true;

    return matchesSearch && matchesCustomer && matchesStartDate && matchesEndDate;
  });

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-amber-700" />
            Pending Unpaid Bills
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Shop: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search Invoice #..."
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

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-450 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-450 pointer-events-none" />
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
          Loading unpaid pending bills...
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <EmptyState
            title="No Pending Bills"
            description="All customer bills are currently cleared or up to date."
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
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
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
                      <td className="py-4 px-5 text-slate-500 font-bold">
                        {new Date(inv.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {custName}
                      </td>
                      <td className="py-4 px-5 text-right font-black text-slate-900 dark:text-white">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-red-600">
                        {formatCurrency(inv.balanceAmount)}
                      </td>
                      <td className="py-4 px-5">
                        <Badge variant="danger">Pending</Badge>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <Link to={`/billing/invoices/${inv.id}`} title="View Details">
                          <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5 py-1 text-xs font-bold shadow-sm">
                            <Eye className="w-4 h-4" /> View Details
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
export default PendingPage;
