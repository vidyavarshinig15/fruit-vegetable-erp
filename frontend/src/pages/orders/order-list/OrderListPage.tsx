import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
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

  // Upload states integrated directly
  const [ingestMode, setIngestMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const allowedExtensions = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedExtensions.includes(file.type)) {
      setErrorMsg('Invalid format: Only PDF documents and PNG/JPEG/WEBP orders are supported.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('Size limit exceeded: Order file exceeds the maximum 20MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSuccessMsg(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    if (ingestMode === 'file' && !selectedFile) return;
    if (ingestMode === 'text' && !pastedText.trim()) return;

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      let payload;
      if (ingestMode === 'file' && selectedFile) {
        const base64Data = await fileToBase64(selectedFile);
        payload = {
          customerId,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSizeBytes: selectedFile.size,
          fileData: base64Data,
        };
      } else {
        const textBytes = new TextEncoder().encode(pastedText);
        const base64Data = btoa(unescape(encodeURIComponent(pastedText)));
        payload = {
          customerId,
          fileName: 'pasted_order_message.txt',
          fileType: 'text/plain',
          fileSizeBytes: textBytes.length,
          fileData: base64Data,
        };
      }

      const res = await api.post('/orders', payload);
      if (res.data?.success && res.data?.data) {
        navigate(`/orders/${res.data.data.id}/verify`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Ingestion upload failed.');
    } finally {
      setIsProcessing(false);
    }
  };

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

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold text-sm">
          <span>{successMsg}</span>
        </div>
      )}

      {isProcessing ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm flex flex-col justify-center items-center">
          <UploadCloud className="w-12 h-12 text-market-700 dark:text-market-400 animate-bounce" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">OCR Ingestion & Match Processing</h3>
          <p className="text-xs font-bold text-slate-450 max-w-[325px]">
            Reading document streams, matching items to active catalog rates...
          </p>
        </div>
      ) : (
        <Card title="Direct Ingest Inbound Order" subtitle="Process and match item listings instantly.">
          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <button
              type="button"
              onClick={() => setIngestMode('file')}
              className={`pb-2 text-xs font-black uppercase tracking-wider transition-colors border-b-2 ${
                ingestMode === 'file'
                  ? 'border-market-700 text-market-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              📄 Upload PDF / Image Photo
            </button>
            <button
              type="button"
              onClick={() => setIngestMode('text')}
              className={`pb-2 text-xs font-black uppercase tracking-wider transition-colors border-b-2 ${
                ingestMode === 'text'
                  ? 'border-market-700 text-market-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              ✍️ Paste WhatsApp / Raw Text
            </button>
          </div>

          <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col justify-between h-full">
              <Select
                label="Select Wholesale Customer *"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={[
                  { value: '', label: 'Select Buyer Account' },
                  ...customers.filter(c => c.status === 'active').map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
                ]}
              />
              <div className="pt-4 flex justify-start">
                <Button type="submit" variant="primary" disabled={!customerId || (ingestMode === 'file' ? !selectedFile : !pastedText.trim())} className="w-full md:w-auto">
                  <UploadCloud className="w-4 h-4 mr-2" /> {ingestMode === 'file' ? 'Upload & Process File' : 'Process Raw Text Order'}
                </Button>
              </div>
            </div>
            
            {ingestMode === 'file' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) validateAndSetFile(file);
                }}
                className={`border-4 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col justify-center items-center cursor-pointer ${
                  dragOver
                    ? 'border-market-700 bg-market-50/20'
                    : 'border-slate-250 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50'
                }`}
                onClick={() => document.getElementById('direct-file-input')?.click()}
              >
                <input
                  id="direct-file-input"
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) validateAndSetFile(file);
                  }}
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {selectedFile ? selectedFile.name : 'Drag Order PDF/Image Here or Click'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 uppercase block">PDF / PNG / JPEG (max 20MB)</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 h-full">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Paste Order Text *</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={4}
                  placeholder="Paste raw text here...&#10;e.g.&#10;Palak. 10&#10;mango . 15kg&#10;orange . 5kg"
                  className="w-full flex-grow px-4 py-3 bg-slate-50 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-700 min-h-[120px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </div>
            )}
          </form>
        </Card>
      )}

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
