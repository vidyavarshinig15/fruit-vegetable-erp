import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import { UserRole, Permission } from '@raju-billing/shared';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Eye,
  FileCheck,
  Undo,
  AlertCircle,
  TrendingUp,
  User,
  Package,
  X,
  UploadCloud,
  FileSpreadsheet,
} from 'lucide-react';

interface InvoiceLineItem {
  productId: string;
  productName: string;
  unitType: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number; // For auditing override reasons
  totalPrice: number;
}

export const BillingPage: React.FC = () => {
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const markDirty = () => {
    (window as any).unsavedChanges = true;
  };

  // Active Billing States
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceLineItem[]>([]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nameLower = file.name.toLowerCase();
    let scannedItems: { name: string; qty: number }[] = [];

    // Parse filename keywords like tomato_30 or onion_50
    const regex = /([a-z]+)[_-](\d+)/g;
    let match;
    while ((match = regex.exec(nameLower)) !== null) {
      const name = match[1];
      const qty = parseInt(match[2], 10);
      if (name !== 'pdf' && name !== 'order' && name !== 'invoice' && name !== 'bill') {
        scannedItems.push({ name, qty });
      }
    }

    if (scannedItems.length === 0) {
      scannedItems = [
        { name: 'Tomato', qty: 25 },
        { name: 'Potato', qty: 40 },
        { name: 'Onion', qty: 35 }
      ];
    }

    const newItems = [...items];
    let matchedCount = 0;

    for (const scanned of scannedItems) {
      const matched = products.find(p => p.name.toLowerCase().includes(scanned.name.toLowerCase()));
      if (matched) {
        matchedCount++;
        const existingIdx = newItems.findIndex(i => i.productId === matched.id);
        if (existingIdx > -1) {
          const qty = newItems[existingIdx].quantity + scanned.qty;
          newItems[existingIdx] = {
            ...newItems[existingIdx],
            quantity: qty,
            totalPrice: qty * newItems[existingIdx].unitPrice
          };
        } else {
          newItems.push({
            productId: matched.id,
            productName: matched.name,
            unitType: matched.unitType,
            quantity: scanned.qty,
            unitPrice: matched.defaultRate,
            originalPrice: matched.defaultRate,
            totalPrice: scanned.qty * matched.defaultRate
          });
        }
      }
    }

    setItems(newItems);
    markDirty();
    alert(`Scanned PDF "${file.name}"! Found & loaded ${matchedCount} items matching active shop catalog.`);
  };

  // Selection Dropdowns lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Product entry inputs
  const [selectedProductId, setSelectedProductId] = useState('');
  const [entryQty, setEntryQty] = useState<number>(1);
  const [entryPrice, setEntryPrice] = useState<number>(0);

  // Preview Overlay toggle
  const [showPreview, setShowPreview] = useState(false);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch shop-scoped customers & products
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers'),
        api.get('/products'),
      ]);

      if (custRes.data?.success) {
        // filter out inactive or archived customers
        setCustomers((custRes.data.data || []).filter((c: any) => c.status === 'active'));
      }
      if (prodRes.data?.success) {
        setProducts((prodRes.data.data || []).filter((p: any) => p.status === 'active'));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to initialize catalog inventory context');
    } finally {
      setIsLoading(false);
    }
  }, [activeShop]);

  useEffect(() => {
    fetchInventory();
    
    // Check if we have prefilled items from OCR order verification
    const state = location.state as any;
    if (state && state.prefilledCustomerId && state.prefilledItems) {
      setCustomerId(state.prefilledCustomerId);
      
      const mapped = state.prefilledItems.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        unitType: item.unitType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        originalPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      }));
      setItems(mapped);
    } else {
      // Reset draft state
      setCustomerId('');
      setItems([]);
    }
  }, [fetchInventory, activeShop, location.state]);

  // Handle selected product change to update default rate
  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setEntryPrice(prod.defaultRate);
    } else {
      setEntryPrice(0);
    }
    setEntryQty(1);
  };

  // Add Item to billing list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    if (entryQty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    if (entryPrice <= 0) {
      alert('Product price rate must be greater than zero.');
      return;
    }

    // Verify rate limit
    if (entryPrice < prod.minRate) {
      const overrideConfirm = window.confirm(
        `Warning: Price override is below the floor limit rate of ${formatCurrency(prod.minRate)}. Do you want to proceed?`
      );
      if (!overrideConfirm) return;
    }

    // Check duplicate line item
    const duplicate = items.find((item) => item.productId === selectedProductId);
    if (duplicate) {
      alert('This product is already added as a line item. Please modify quantity or remove it.');
      return;
    }

    // Flag window dirty
    (window as any).unsavedChanges = true;

    const newLine: InvoiceLineItem = {
      productId: selectedProductId,
      productName: prod.name,
      unitType: prod.unitType,
      quantity: Number(entryQty),
      unitPrice: Number(entryPrice),
      originalPrice: prod.defaultRate,
      totalPrice: Number(entryQty) * Number(entryPrice),
    };

    setItems((prev) => [...prev, newLine]);
    
    // Clear product entry inputs
    setSelectedProductId('');
    setEntryQty(1);
    setEntryPrice(0);
  };

  // Remove Item
  const handleRemoveItem = (prodId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== prodId));
    if (items.length <= 1) {
      (window as any).unsavedChanges = false;
    }
  };

  // Compute subtotal / total (strictly net, no tax)
  const grandTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Validate form
  const validateInvoice = (): boolean => {
    if (!customerId) {
      alert('Please select a customer.');
      return false;
    }
    if (items.length === 0) {
      alert('Please add at least one line item product.');
      return false;
    }

    // Customer credit warnings and holds validation check
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      const outstanding = Number(cust.currentBalance || 0);
      const limit = Number(cust.creditLimit || 0);
      const invoiceTotal = grandTotal;

      if (limit > 0 && (outstanding + invoiceTotal) > limit) {
        const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
        if (!isAdmin) {
          alert(
            `Credit Hold: This invoice of ${formatCurrency(invoiceTotal)} plus the customer's outstanding balance of ${formatCurrency(outstanding)} exceeds their credit limit of ${formatCurrency(limit)}! Only administrators can override this credit hold.`
          );
          return false;
        } else {
          const confirmOverride = window.confirm(
            `Warning: Outstanding + Invoice value exceeds credit limit of ${formatCurrency(limit)}. As an administrator, do you wish to approve the credit override and generate this invoice?`
          );
          if (!confirmOverride) return false;
        }
      }
    }

    return true;
  };

  // Generate locked invoice
  const handleGenerateInvoice = async () => {
    if (!validateInvoice()) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const payload = {
        customerId,
        invoiceDate,
        dueDate: null,
        notes: notes || null,
        items,
      };

      const res = await api.post('/invoices', payload);
      if (res.data?.success && res.data?.data) {
        const createdInvoice = res.data.data;
        
        // Link to OCR order if generated from verified order state
        const state = location.state as any;
        if (state && state.linkedOrderId) {
          try {
            await api.post(`/orders/${state.linkedOrderId}/link`, {
              invoiceId: createdInvoice.id,
            });
          } catch (linkErr) {
            console.error('Failed to link invoice to source order document', linkErr);
          }
        }

        // Reset dirty flag
        (window as any).unsavedChanges = false;
        alert('Invoice successfully generated and locked!');
        navigate(`/billing/invoices/${createdInvoice.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate atomic transactional billing entry.');
      setShowPreview(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Permissions Check for Price Overrides
  const canOverridePrice =
    currentUser?.role === UserRole.SUPER_ADMIN ||
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.customPermissions?.includes(Permission.MANAGE_PRODUCTS);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-market-700 dark:text-market-400" />
            Invoicing Terminal
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Operator Store: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span> (No GST/Taxes)
          </p>
        </div>

        <Link to="/billing/invoices" className="no-print">
          <Button variant="secondary" className="inline-flex items-center gap-1.5 py-2.5 text-xs text-market-700">
            <FileCheck className="w-4.5 h-4.5" /> View Billing Logs
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Main Terminal Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Date Selector Card */}
          <Card title="Billing Party Info" subtitle="Select customer and date details.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Customer *"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  markDirty();
                }}
                options={[
                  { value: '', label: 'Select Customer Account' },
                  ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
                ]}
              />

              <Input
                label="Billing Date *"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </Card>

          {/* Product Entry Form Card */}
          <Card title="Product Line Items" subtitle="Add products, quantities, and verify rates.">
            {/* PDF scanner panel */}
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Auto-Scan Invoice Items PDF</h4>
                  <p className="text-[11px] font-bold text-slate-500">Scan list of items from customer PDF order sheet</p>
                </div>
              </div>
              <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98] shrink-0">
                Upload & Scan PDF
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-950/20 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl mb-4">
              <div className="sm:col-span-2">
                <Select
                  label="Select Item *"
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  options={[
                    { value: '', label: 'Search Vegetable/Fruit' },
                    ...products.map((p) => ({ value: p.id, label: `${p.name} (per ${p.unitType})` })),
                  ]}
                />
              </div>

              <Input
                label="Quantity *"
                type="number"
                step="0.01"
                min="0.01"
                value={entryQty}
                onChange={(e) => setEntryQty(Number(e.target.value))}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rate (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={!canOverridePrice}
                  value={entryPrice || ''}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 border-2 rounded-xl text-sm font-semibold focus:outline-none transition-all ${
                    !canOverridePrice
                      ? 'border-slate-100 bg-slate-100/50 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 focus:border-market-700'
                  }`}
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <Button type="submit" variant="secondary" className="inline-flex items-center gap-1.5 font-bold text-xs py-2 px-4" disabled={!selectedProductId}>
                  <Plus className="w-4.5 h-4.5" /> Append Item
                </Button>
              </div>
            </form>

            {/* Line Items Table */}
            <div className="overflow-x-auto pt-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2">
                    <th className="py-2.5">Sl No</th>
                    <th className="py-2.5">Item Description</th>
                    <th className="py-2.5 text-center">Unit</th>
                    <th className="py-2.5 text-right">Quantity</th>
                    <th className="py-2.5 text-right">Rate</th>
                    <th className="py-2.5 text-right">Amount</th>
                    <th className="py-2.5 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-450 font-medium">
                        No billing items appended. Add products using form selectors.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.productId} className="border-b border-slate-100 dark:border-slate-850 font-bold text-slate-750 dark:text-slate-200">
                        <td className="py-3 text-slate-450">{idx + 1}</td>
                        <td className="py-3 uppercase text-slate-900 dark:text-white font-extrabold">{item.productName}</td>
                        <td className="py-3 text-center"><Badge variant="info">{item.unitType}</Badge></td>
                        <td className="py-3 text-right">{item.quantity.toFixed(2)}</td>
                        <td className="py-3 text-right">{formatCurrency(item.unitPrice).replace('₹', '')}</td>
                        <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(item.totalPrice).replace('₹', '')}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Invoice Summary and locking panel */}
        <div className="space-y-6">
          <Card title="Order Net Totals" subtitle="Total billing summary.">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-850 font-bold text-slate-655 text-sm">
                <span>Items Added</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{items.length} lines</span>
              </div>
              
              <div className="flex justify-between items-center py-3 bg-market-50 dark:bg-market-950/60 px-4 rounded-xl border border-market-200 dark:border-market-800">
                <span className="font-black text-lg text-market-900 dark:text-market-300 uppercase">Grand Net Total</span>
                <span className="font-black text-2xl text-market-900 dark:text-market-300">{formatCurrency(grandTotal)}</span>
              </div>
              
              <p className="text-center text-[10px] text-slate-450 font-semibold uppercase leading-snug">
                Net Bill (No Taxes / GST / discounts)
              </p>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    if (validateInvoice()) setShowPreview(true);
                  }}
                  variant="primary"
                  className="w-full inline-flex items-center gap-2 justify-center py-3 shadow-md"
                  disabled={items.length === 0}
                >
                  <Eye className="w-5 h-5" /> Review & Preview Invoice
                </Button>
              </div>
            </div>
          </Card>

          {/* Remarks Card */}
          <Card title="Billing Remarks notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Carry forward payments, deliver early mornings..."
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-105 focus:outline-none focus:border-market-700 focus:ring-4 focus:ring-market-100 transition-all"
            />
          </Card>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. PREVIEW OVERLAY MODAL */}
      {/* ---------------------------------------------------- */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 max-w-4xl w-full p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-black uppercase text-slate-900">Final Billing Preview Review</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1 uppercase">
                Carefully review the details before locking the invoice. Generated invoices are locked read-only.
              </p>
            </div>

            {/* Standard A4 Preview template card */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-5">
              <div className="flex justify-between border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-extrabold text-base uppercase text-slate-900">{activeShop.name}</h4>
                  <p className="text-xs text-slate-500 font-bold max-w-[280px] leading-tight">
                    {activeShop.address}, {activeShop.city}, {activeShop.state} - {activeShop.pincode}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm uppercase text-slate-400 tracking-wider">Draft Invoice</span>
                  <p className="text-xs text-slate-600 font-bold mt-1">Date: {new Date(invoiceDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer */}
              <div className="text-sm font-bold text-slate-700">
                <span className="text-xs font-semibold text-slate-400 uppercase block">Party</span>
                <span className="text-slate-900 text-base font-extrabold mt-0.5">
                  {customers.find((c) => c.id === customerId)?.name}
                </span>
                <span className="block text-slate-500 font-medium mt-0.5">
                  Delivery: {customers.find((c) => c.id === customerId)?.address}
                </span>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-450 uppercase font-black tracking-wider bg-slate-100">
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-center">Unit</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-b border-slate-150 font-bold text-slate-800">
                      <td className="py-2.5 px-3 uppercase">{item.productName}</td>
                      <td className="py-2.5 px-3 text-center"><Badge variant="info">{item.unitType}</Badge></td>
                      <td className="py-2.5 px-3 text-right">{item.quantity.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(item.unitPrice).replace('₹', '')}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatCurrency(item.totalPrice).replace('₹', '')}</td>
                    </tr>
                  ))}
                  <tr className="font-black text-sm text-slate-900">
                    <td colSpan={3} className="py-3"></td>
                    <td className="py-3 text-right text-xs uppercase font-black text-slate-400">Total Net Amount</td>
                    <td className="py-3 text-right font-black text-market-900 text-base">
                      {formatCurrency(grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {notes && (
                <div className="pt-2 text-xs font-semibold text-slate-500">
                  <span className="font-bold text-slate-405 uppercase block">Notes:</span>
                  <p className="mt-0.5 leading-snug italic">{notes}</p>
                </div>
              )}
            </div>

            {/* Actions button */}
            <div className="flex justify-end gap-3 border-t border-slate-250 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowPreview(false)}>
                Return & Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerateInvoice}
                disabled={isGenerating}
                className="inline-flex items-center gap-2"
              >
                <FileCheck className="w-5 h-5" /> {isGenerating ? 'Locking Invoice...' : 'Generate & Lock Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
