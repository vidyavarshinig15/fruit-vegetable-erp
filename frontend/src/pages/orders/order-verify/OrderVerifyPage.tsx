import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useShop } from '@/contexts/ShopContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  UploadCloud,
  FileCheck,
  Undo,
  ArrowLeft,
  Info,
  CheckCircle,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export const OrderVerifyPage: React.FC = () => {
  const { activeShop } = useShop();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data states
  const [order, setOrder] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]); // Extracted OCR verification items list
  const [notes, setNotes] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize and load
  const loadOrderVerificationContext = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ordRes, prodRes] = await Promise.all([
        api.get(`/orders/${id}`),
        api.get('/products'),
      ]);

      if (ordRes.data?.success && ordRes.data?.data) {
        const orderData = ordRes.data.data;
        setOrder(orderData);
        setNotes(orderData.notes || '');

        // Fetch customer profile
        const custRes = await api.get(`/customers/${orderData.customerId}`);
        if (custRes.data?.success) {
          setCustomer(custRes.data.data);
        }

        // Deserialize OCR items list
        let parsedItems: any[] = [];
        if (orderData.ocrRawText) {
          try {
            const parsed = JSON.parse(orderData.ocrRawText);
            parsedItems = parsed.items || [];
          } catch (e) {
            console.error('Failed to parse ocrRawText', e);
          }
        }
        setItems(parsedItems);
      }

      if (prodRes.data?.success) {
        const prodList = prodRes.data.data?.products || prodRes.data.data || [];
        setProducts(prodList.filter((p: any) => p.status === 'active'));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to initialize manual verification page.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrderVerificationContext();
  }, [id, activeShop]);

  // Handle changes in grid items
  const handleItemFieldChange = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const updated = { ...item, [field]: value };
          
          // Re-evaluate matching status if product dropdown changes
          if (field === 'matchedProductId') {
            const prod = products.find((p) => p.id === value);
            updated.status = prod ? 'Matched' : 'Unmatched';
            updated.confidence = 'High'; // Manually confirmed matches are High confidence
            if (prod) {
              updated.productName = prod.name;
              updated.unitType = prod.unitType;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Add Item row
  const handleAddRow = () => {
    const firstProduct = products[0];
    const newRow = {
      productName: firstProduct ? firstProduct.name : 'New Item',
      quantity: 1,
      unitType: firstProduct ? firstProduct.unitType : 'Kg',
      matchedProductId: firstProduct ? firstProduct.id : null,
      confidence: 'High',
      status: firstProduct ? 'Matched' : 'Unmatched',
    };
    setItems((prev) => [...prev, newRow]);
  };

  // Remove Item row
  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculate estimated amount based on matched product rates
  const getEstimatedAmount = (): number => {
    return items.reduce((sum, item) => {
      if (!item.matchedProductId) return sum;
      const prod = products.find((p) => p.id === item.matchedProductId);
      if (!prod) return sum;
      return sum + item.quantity * prod.defaultRate;
    }, 0);
  };

  // Validate items
  const validateItems = (): boolean => {
    for (const item of items) {
      if (item.quantity <= 0) {
        alert('Quantity must be greater than zero for all items.');
        return false;
      }
      if (!item.matchedProductId) {
        const confirmSkip = window.confirm(
          `Item "${item.productName || 'Unlabeled'}" is not matched to any catalog product. Unmatched products will be skipped during invoice generation. Proceed?`
        );
        if (!confirmSkip) return false;
      }
    }
    return true;
  };

  // Save Manual Verification
  const handleSaveVerification = async () => {
    if (!validateItems()) return;

    setIsSaving(true);
    try {
      const payload = {
        items: items.map((i) => ({
          productName: i.productName || 'Unlabeled',
          quantity: Number(i.quantity),
          unitType: i.unitType,
          matchedProductId: i.matchedProductId || null,
          confidence: i.confidence,
          status: i.status,
        })),
        notes,
      };

      const res = await api.post(`/orders/${id}/verify`, payload);
      if (res.data?.success) {
        alert('Verification complete! Order set to Verified status.');
        loadOrderVerificationContext();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate pre-populated invoice
  const handleGenerateInvoice = () => {
    if (!order || order.ocrStatus !== 'VERIFIED') {
      alert('Order must be verified and locked before invoice generation.');
      return;
    }

    // Prefill billing products arrays
    const prefilledItems = items
      .filter((i) => i.matchedProductId)
      .map((i) => {
        const prod = products.find((p) => p.id === i.matchedProductId);
        return {
          productId: i.matchedProductId,
          productName: prod ? prod.name : i.productName,
          unitType: i.unitType,
          quantity: i.quantity,
          unitPrice: prod ? prod.defaultRate : 0,
        };
      });

    // Navigate to Billing screen with state parameters
    navigate('/billing', {
      state: {
        prefilledCustomerId: order.customerId,
        prefilledItems,
        linkedOrderId: order.id,
      },
    });
  };

  // Render indicators color badges
  const getConfidenceBadge = (conf: string) => {
    const maps: Record<string, { variant: 'success' | 'warning' | 'danger'; text: string }> = {
      High: { variant: 'success', text: 'High' },
      Medium: { variant: 'warning', text: 'Medium' },
      Low: { variant: 'danger', text: 'Low' },
    };
    const mapped = maps[conf] || { variant: 'warning', text: conf };
    return <Badge variant={mapped.variant}>{mapped.text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Loading order details and verification lists...
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
        {errorMsg || 'Order not found.'}
        <div className="mt-4">
          <Link to="/orders">
            <Button variant="secondary">Back to Queue</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fileUrl = `${api.defaults.baseURL?.replace('/api/v1', '')}/${order.filePath}`;

  // Counter metrics
  const totalItems = items.length;
  const matchedCount = items.filter((i) => i.status === 'Matched').length;
  const unmatchedCount = items.filter((i) => i.status === 'Unmatched').length;
  const lowConfidenceCount = items.filter((i) => i.confidence === 'Low').length;

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <Link to="/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2 flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-market-700 dark:text-market-400" />
            Verify Extracted Order
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Order Reference: <span className="text-market-700 dark:text-market-400 font-black">{order.orderNumber}</span> | Status: <span className="font-extrabold text-slate-700">{order.ocrStatus}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveVerification}
            variant="secondary"
            disabled={isSaving || order.ocrStatus === 'INVOICE_GENERATED'}
            className="inline-flex items-center gap-1.5 font-bold"
          >
            Save Verification
          </Button>
          
          <Button
            onClick={handleGenerateInvoice}
            variant="primary"
            disabled={order.ocrStatus !== 'VERIFIED'}
            className="inline-flex items-center gap-2 font-bold shadow-lg"
          >
            <CheckCircle className="w-5 h-5" /> Generate Wholesale Invoice
          </Button>
        </div>
      </div>

      {/* Grid Summaries board */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Items', val: totalItems },
          { label: 'Matched Catalog', val: matchedCount, color: 'text-emerald-600' },
          { label: 'Unmatched Products', val: unmatchedCount, color: 'text-red-550' },
          { label: 'Low Confidence Items', val: lowConfidenceCount, color: 'text-amber-500' },
          { label: 'Est. Total Value', val: formatCurrency(getEstimatedAmount()), color: 'text-market-900' },
        ].map((stat, i) => (
          <Card key={i} className="p-3 bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">{stat.label}</span>
            <span className={`text-xl font-black mt-2 ${stat.color || 'text-slate-900 dark:text-white'}`}>
              {stat.val}
            </span>
          </Card>
        ))}
      </div>

      {/* Split screen preview and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left pane: File document viewer */}
        <Card title="Ingested File document preview" subtitle="Verify visual order lines against matched items.">
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden h-[600px] bg-slate-100">
            {order.fileType === 'application/pdf' ? (
              <iframe src={fileUrl} className="w-full h-full border-none" title="PDF Order Document" />
            ) : (
              <div className="w-full h-full flex justify-center items-center p-4 overflow-auto">
                <img src={fileUrl} alt="Order document" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
        </Card>

        {/* Right pane: Match verification items grid */}
        <Card title="Extracted matching table" subtitle="Manual edits of names, matched IDs, units, and quantities.">
          <div className="space-y-4">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2">
                    <th className="py-2.5 px-1">Extracted Item Text</th>
                    <th className="py-2.5 px-2">Matched Product</th>
                    <th className="py-2.5 text-right w-[80px]">Qty</th>
                    <th className="py-2.5 text-center w-[90px]">Unit</th>
                    <th className="py-2.5 text-center">Confidence</th>
                    <th className="py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-100 dark:border-slate-850 font-bold text-sm ${
                        item.confidence === 'Low' ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* OCR Name */}
                      <td className="py-3 px-1 w-[150px]">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemFieldChange(idx, 'productName', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-market-700 focus:outline-none text-xs font-bold uppercase"
                        />
                      </td>

                      {/* Matched Product Select */}
                      <td className="py-3 px-2">
                        <select
                          value={item.matchedProductId || ''}
                          onChange={(e) => handleItemFieldChange(idx, 'matchedProductId', e.target.value || null)}
                          className="w-full max-w-[170px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold focus:outline-none"
                        >
                          <option value="">-- Product Not Found --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>

                        {item.suggestion && (
                          <div className="mt-1.5 p-2 bg-amber-50 border border-amber-250 rounded-xl text-[10px] text-amber-900 leading-snug">
                            <span className="font-extrabold block">💡 Suggested Match:</span>
                            <span className="font-extrabold text-slate-800">{item.suggestion.productName}</span>
                            <span className="block text-[9px] text-slate-500 font-medium">Reason: {item.suggestion.reason} ({item.suggestion.confidence} conf)</span>
                            <div className="flex gap-3 mt-1.5 font-bold uppercase tracking-wider text-[9px]">
                              <button
                                type="button"
                                onClick={() => {
                                  handleItemFieldChange(idx, 'matchedProductId', item.suggestion.matchedProductId);
                                  handleItemFieldChange(idx, 'suggestion', null);
                                }}
                                className="text-emerald-700 hover:underline"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleItemFieldChange(idx, 'suggestion', null);
                                }}
                                className="text-red-600 hover:underline"
                              >
                                Ignore
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-market-700 focus:outline-none text-xs font-bold"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-3 text-center">
                        <select
                          value={item.unitType || 'Kg'}
                          onChange={(e) => handleItemFieldChange(idx, 'unitType', e.target.value)}
                          className="bg-transparent border-b border-transparent text-xs font-bold cursor-pointer"
                        >
                          <option value="Kg">Kg</option>
                          <option value="Crate">Crate</option>
                          <option value="Bag">Bag</option>
                          <option value="Box">Box</option>
                          <option value="Piece">Piece</option>
                          <option value="Dozen">Dozen</option>
                        </select>
                      </td>

                      {/* Confidence status */}
                      <td className="py-3 text-center">
                        {getConfidenceBadge(item.confidence)}
                      </td>

                      {/* Remove Row */}
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-650 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grid control buttons */}
            <div className="flex justify-between items-center pt-2">
              <Button onClick={handleAddRow} variant="secondary" className="inline-flex items-center gap-1 text-xs py-1.5 px-3">
                <Plus className="w-4 h-4" /> Add Missing Item
              </Button>
              <Link to="/products/new" target="_blank" rel="noreferrer">
                <Button variant="secondary" className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Plus className="w-4 h-4" /> Create New Product
                </Button>
              </Link>
            </div>

            {/* Verification Remarks Notes */}
            <div className="pt-4 border-t border-slate-150">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Order Comments notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Delivery requested early morning, call customer before shipping..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-market-700"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
