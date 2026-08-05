import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();

  // Filters
  const [reportType, setReportType] = useState('sales');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [combinedView, setCombinedView] = useState(false);

  // Filter listings
  const [customers, setCustomers] = useState<any[]>([]);

  // Generated report data
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Load Customers for filter dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        if (res.data?.success) {
          setCustomers((res.data.data || []).filter((c: any) => c.status === 'active'));
        }
      } catch (err) {
        console.error('Failed to load customers for report filters', err);
      }
    };
    fetchCustomers();
  }, [activeShop]);

  // Fetch Report Data
  const generateReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
      });

      if (customerId) params.append('customerId', customerId);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      if (paymentMethod) params.append('paymentMethod', paymentMethod);
      if (combinedView && isAdmin) params.append('combined', 'true');

      const res = await api.get(`/analytics/reports?${params.toString()}`);
      if (res.data?.success) {
        setReportData(res.data.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  }, [reportType, startDate, endDate, customerId, paymentStatus, paymentMethod, combinedView, activeShop]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  // Export Data Audit Logger & Downloader
  const handleExport = async (format: 'CSV' | 'EXCEL') => {
    if (reportData.length === 0) return;

    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
        action: 'export',
        format,
      });

      if (customerId) params.append('customerId', customerId);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      if (paymentMethod) params.append('paymentMethod', paymentMethod);
      if (combinedView && isAdmin) params.append('combined', 'true');

      // Trigger audit log registration on backend
      await api.get(`/analytics/reports?${params.toString()}`);

      // Generate simple download file
      const headers = Object.keys(reportData[0]).join(',');
      const rows = reportData.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csvContent = [headers, ...rows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format.toLowerCase() === 'csv' ? 'csv' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Report exported successfully and recorded in audit log.`);
    } catch (err) {
      console.error('Export failed', err);
      alert('Report export failed.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Render correct reporting headers
  const getHeaders = () => {
    const maps: Record<string, string[]> = {
      sales: ['Invoice No', 'Invoice Date', 'Customer Name', 'Dues Status', 'Total Sales (₹)', 'Paid (₹)', 'Dues (₹)'],
      payment: ['Receipt No', 'Payment Date', 'Customer Name', 'Payment Mode', 'Reference Details', 'Collected (₹)'],
      outstanding: ['Customer Code', 'Party Name', 'Outstanding Dues (₹)', 'Credit Limit (₹)', 'Status'],
      customer: ['Customer Code', 'Party Name', 'Mobile Number', 'Credit Limit (₹)', 'Status'],
    };
    return maps[reportType] || ['Date', 'Description', 'Ref No', 'Amount'];
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 no-print">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-market-700 dark:text-market-400" />
            {t('reportsTab.title', 'Wholesale Financial Reports')}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Shop context: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="secondary" className="inline-flex items-center gap-1.5 font-bold">
            <Printer className="w-4.5 h-4.5" /> {t('reportsTab.printReport', 'Print Report')}
          </Button>
          <Button onClick={() => handleExport('CSV')} variant="primary" disabled={reportData.length === 0} className="inline-flex items-center gap-1.5 font-bold shadow-lg">
            <Download className="w-4.5 h-4.5" /> {t('reportsTab.exportCsv', 'Export CSV')}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center text-sm no-print">
          {errorMsg}
        </div>
      )}

      {/* Filter panel deck */}
      <Card title="Reporting Filters" subtitle="Generate specific sales, payments, or outstanding reports." className="no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Report Type *"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'sales', label: 'Sales & Invoices Report' },
              { value: 'payment', label: 'Payments & Collections Report' },
              { value: 'outstanding', label: 'Outstanding Dues Report' },
              { value: 'customer', label: 'Customer Directory Report' },
            ]}
          />

          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">End Date</label>
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

          <Select
            label="Customer filter"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'All Customers' },
              ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
            ]}
          />

          {reportType === 'sales' && (
            <Select
              label="Invoice Status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'UNPAID', label: 'Unpaid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'PAID', label: 'Paid' },
              ]}
            />
          )}

          {reportType === 'payment' && (
            <Select
              label="Payment Mode"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: '', label: 'All Modes' },
                { value: 'CASH', label: 'Cash' },
                { value: 'UPI', label: 'UPI' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'CHEQUE', label: 'Cheque' },
              ]}
            />
          )}

          {isAdmin && (
            <div className="flex items-center gap-2 pt-8">
              <input
                type="checkbox"
                id="combined"
                checked={combinedView}
                onChange={(e) => setCombinedView(e.target.checked)}
                className="w-4 h-4 rounded text-market-700"
              />
              <label htmlFor="combined" className="text-xs font-bold uppercase tracking-wider text-slate-650 cursor-pointer">
                Combined View
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Printing / Reports Sheet Layout */}
      <div className="bg-white text-black p-8 border border-slate-200 shadow-md rounded-2xl font-sans text-xs">
        
        {/* Printable Document Header */}
        <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-6">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">
              {combinedView ? 'Combined network analytics' : activeShop.name}
            </h2>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">
              Wholesale Fruits & Vegetables Billing System
            </p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-black uppercase tracking-wider">
              {reportType.toUpperCase()} STATEMENT REPORT
            </h3>
            <span className="block text-[9px] text-slate-500 font-bold uppercase mt-1">
              Period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Querying report database...
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            No report data found matching selected parameters filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-semibold">
              <thead>
                <tr className="border-b-2 border-slate-350 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-50">
                  {getHeaders().map((h, i) => (
                    <th key={i} className="py-2 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => {
                  if (reportType === 'sales') {
                    const invNo = row.invoiceNumber || row.invoice_number || '';
                    const invDate = row.invoiceDate || row.invoice_date || '';
                    const custId = row.customerId || row.customer_id || '';
                    const payStatus = row.paymentStatus || row.payment_status || '';
                    const totalAmt = row.totalAmount !== undefined ? row.totalAmount : (row.total_amount || 0);
                    const paidAmt = row.paidAmount !== undefined ? row.paidAmount : (row.paid_amount || 0);
                    const balAmt = row.balanceAmount !== undefined ? row.balanceAmount : (row.balance_amount || 0);

                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2.5 px-3 uppercase font-black">{invNo}</td>
                        <td className="py-2.5 px-3">{new Date(invDate).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 uppercase">{customers.find((c) => c.id === custId)?.name || 'Loading customer...'}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={payStatus === 'PAID' ? 'success' : payStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}>
                            {payStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">{formatCurrency(totalAmt).replace('₹', '')}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatCurrency(paidAmt).replace('₹', '')}</td>
                        <td className="py-2.5 px-3 text-right font-black text-red-650">{formatCurrency(balAmt).replace('₹', '')}</td>
                      </tr>
                    );
                  }

                  if (reportType === 'payment') {
                    const payNo = row.paymentNumber || row.payment_number || '';
                    const payDate = row.paymentDate || row.payment_date || '';
                    const custId = row.customerId || row.customer_id || '';
                    const payMode = row.paymentMode || row.payment_mode || '';
                    const refNo = row.referenceNumber || row.reference_number || '';
                    const amt = row.amount !== undefined ? row.amount : (row.amount || 0);

                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2.5 px-3 uppercase font-black">{payNo}</td>
                        <td className="py-2.5 px-3">{new Date(payDate).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 uppercase">{customers.find((c) => c.id === custId)?.name || 'Loading customer...'}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="info">{payMode}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 uppercase text-[9px] font-bold">{refNo || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-right font-black">{formatCurrency(amt).replace('₹', '')}</td>
                      </tr>
                    );
                  }

                  if (reportType === 'outstanding') {
                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2.5 px-3 uppercase font-black">{row.customer_code || row.customerCode}</td>
                        <td className="py-2.5 px-3 uppercase">{row.name}</td>
                        <td className="py-2.5 px-3 text-right font-black text-red-650">{formatCurrency(row.current_balance || row.currentOutstanding).replace('₹', '')}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-500">{formatCurrency(row.credit_limit || row.creditLimit).replace('₹', '')}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge>
                        </td>
                      </tr>
                    );
                  }

                  if (reportType === 'customer') {
                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2.5 px-3 uppercase font-black">{row.customer_code || row.customerCode}</td>
                        <td className="py-2.5 px-3 uppercase">{row.name}</td>
                        <td className="py-2.5 px-3">{row.mobile_number || row.mobileNumber}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-500">{formatCurrency(row.credit_limit || row.creditLimit).replace('₹', '')}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="py-2.5 px-3">{JSON.stringify(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 border-t border-slate-200 pt-4 flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Generated Date: {new Date().toLocaleString()}</span>
          <span>Generated By: Raju Wholesale operator</span>
        </div>
      </div>
    </div>
  );
};
export default ReportsPage;
