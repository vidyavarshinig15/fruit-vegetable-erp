import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import {
  UploadCloud,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

export const OrderListPage: React.FC = () => {
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({
    ordersUploadedToday: 0,
    ordersWaitingVerification: 0,
    ordersVerified: 0,
    invoicesGeneratedFromOcr: 0,
    failedOcrProcessing: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Customers mapping list
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      if (res.data?.success) {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load customers for listing mapping', err);
    }
  }, []);

  // Fetch Orders directory
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/orders');
      if (res.data?.success) {
        setOrders(res.data.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve uploaded orders queue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await api.get('/orders/dashboard');
      if (res.data?.success) {
        setDashboardStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to compute orders dashboard aggregates', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchOrders();
    fetchDashboardStats();
  }, [fetchCustomers, fetchOrders, fetchDashboardStats, activeShop]);

  // Handle document deletion
  const handleDeleteOrder = async (id: string, fileName: string) => {
    const confirmDelete = window.confirm(
      `Confirm delete order file "${fileName}"? This will erase the file permanently and archive all verification data.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/orders/${id}`);
      fetchOrders();
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete operation failed. Admin access required.');
    }
  };

  // Status Badge Mapper
  const getStatusBadge = (status: string) => {
    const maps: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; text: string }> = {
      INVOICE_GENERATED: { variant: 'success', text: 'Invoice Created' },
      VERIFIED: { variant: 'info', text: 'Verified' },
      VERIFICATION_PENDING: { variant: 'warning', text: 'Needs Review' },
      CANCELLED: { variant: 'danger', text: 'Failed' },
      UPLOADED: { variant: 'neutral', text: 'Uploaded' },
    };
    const mapped = maps[status] || { variant: 'neutral', text: status };
    return <Badge variant={mapped.variant as any}>{mapped.text}</Badge>;
  };

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <UploadCloud className="w-8 h-8 text-market-700 dark:text-market-400" />
            Inbound Orders Queue (OCR)
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Workspace: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>

        <Link to="/orders/upload">
          <Button variant="primary" className="inline-flex items-center gap-2 shadow-lg py-2.5">
            <PlusCircle className="w-5 h-5" /> Ingest Order PDF/Image
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Uploaded Today', val: dashboardStats.ordersUploadedToday, color: 'text-slate-900 dark:text-white' },
          { label: 'Waiting Verify', val: dashboardStats.ordersWaitingVerification, color: 'text-amber-500' },
          { label: 'Verified Orders', val: dashboardStats.ordersVerified, color: 'text-sky-650' },
          { label: 'Invoices Generated', val: dashboardStats.invoicesGeneratedFromOcr, color: 'text-emerald-600' },
          { label: 'Failed OCR', val: dashboardStats.failedOcrProcessing, color: 'text-red-550' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">{stat.label}</span>
            <span className={`text-3xl font-black mt-2 ${stat.color}`}>
              {isStatsLoading ? '...' : stat.val}
            </span>
          </Card>
        ))}
      </div>

      {/* Directory Queue Table */}
      {isLoading ? (
        <div className="p-12 text-center text-sm font-bold text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          Loading uploaded orders queues...
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState
            title="Inbound Queue Empty"
            description="Drag and drop order PDFs or images from hotels or restaurant buyers."
            actionButton={
              <Link to="/orders/upload">
                <Button variant="primary" className="mt-2">
                  Upload First Order
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
                  <th className="py-4 px-5">Order Reference</th>
                  <th className="py-4 px-5">Upload Date</th>
                  <th className="py-4 px-5">Wholesale Customer</th>
                  <th className="py-4 px-5">File Reference</th>
                  <th className="py-4 px-5">OCR Status</th>
                  <th className="py-4 px-5 text-center">Verify Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const custName = customers.find((c) => c.id === ord.customerId)?.name || 'Loading Customer...';
                  const fileUrl = `${api.defaults.baseURL?.replace('/api/v1', '')}/${ord.filePath}`;
                  const fileBasename = ord.filePath.split(/[/\\]/).pop() || 'Order doc';

                  return (
                    <tr
                      key={ord.id}
                      className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors text-sm font-semibold"
                    >
                      <td className="py-4 px-5 font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {ord.orderNumber}
                      </td>
                      <td className="py-4 px-5 text-slate-500 font-bold">
                        {new Date(ord.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 font-extrabold text-slate-800 dark:text-slate-250">
                        {custName}
                      </td>
                      <td className="py-4 px-5 text-market-700">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 font-bold text-xs"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="max-w-[150px] truncate" title={fileBasename}>
                            {fileBasename.replace(/^\d+-/, '')}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                      <td className="py-4 px-5">
                        {getStatusBadge(ord.ocrStatus)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {ord.ocrStatus === 'INVOICE_GENERATED' ? (
                            <Link to={`/billing/invoices/${ord.processedInvoiceId}`}>
                              <Button variant="secondary" size="sm" className="inline-flex items-center gap-1 py-1 font-bold text-xs">
                                <FileCheck className="w-4 h-4" /> View Invoice
                              </Button>
                            </Link>
                          ) : (
                            <Link to={`/orders/${ord.id}/verify`}>
                              <Button variant="primary" size="sm" className="inline-flex items-center gap-1 py-1 font-bold text-xs shadow-md">
                                <CheckCircle2 className="w-4 h-4" /> Verify Order
                              </Button>
                            </Link>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteOrder(ord.id, fileBasename)}
                              title="Delete Order File"
                              className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
