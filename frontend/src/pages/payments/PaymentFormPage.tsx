import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useShop } from '@/contexts/ShopContext';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import { ArrowLeft, CheckCircle2, CreditCard, HelpCircle, AlertCircle } from 'lucide-react';

export const PaymentFormPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Selected parameters from query (e.g. if redirected from an invoice details page)
  const initialInvoiceId = searchParams.get('invoiceId') || '';
  const initialCustomerId = searchParams.get('customerId') || '';

  // Party Selection & Dues
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Invoices list of customer
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Form states
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // UI confirmation and loader
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Customers
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/customers');
        if (res.data?.success) {
          setCustomers((res.data.data || []).filter((c: any) => c.status === 'active'));
        }
      } catch (err) {
        console.error('Failed to fetch customers', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, [activeShop]);

  // Load Customer Invoices and profile details
  const fetchCustomerInvoices = useCallback(async (custId: string) => {
    if (!custId) {
      setInvoices([]);
      setSelectedCustomer(null);
      return;
    }

    try {
      // Find customer info
      const custRes = await api.get(`/customers/${custId}`);
      if (custRes.data?.success) {
        setSelectedCustomer(custRes.data.data);
      }

      // Find unpaid/partially paid invoices of this customer
      const invRes = await api.get('/billing/invoices');
      if (invRes.data?.success) {
        const list = (invRes.data.data || []).filter(
          (i: any) =>
            i.customerId === custId &&
            i.billStatus !== 'CANCELLED' &&
            (i.paymentStatus === 'UNPAID' || i.paymentStatus === 'PARTIALLY_PAID')
        );
        setInvoices(list);
      }
    } catch (err) {
      console.error('Failed to load customer context', err);
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomerInvoices(customerId);
    }
  }, [customerId, fetchCustomerInvoices]);

  // Trigger invoice selection change
  useEffect(() => {
    if (invoiceId && invoices.length > 0) {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        setSelectedInvoice(inv);
        // Default payment amount to outstanding invoice dues
        setAmount(inv.balanceAmount);
      }
    } else {
      setSelectedInvoice(null);
      if (!initialInvoiceId) setAmount(0);
    }
  }, [invoiceId, invoices, initialInvoiceId]);

  // Handle customer choice changes
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCustomerId(val);
    setInvoiceId('');
    setSelectedInvoice(null);
    setAmount(0);
  };

  // Form validations
  const validateForm = (): boolean => {
    setErrorMsg(null);

    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return false;
    }

    if (selectedInvoice && amount > selectedInvoice.balanceAmount) {
      setErrorMsg(`Payment amount ₹${amount} exceeds invoice outstanding balance of ₹${selectedInvoice.balanceAmount}.`);
      return false;
    }

    return true;
  };

  // Confirm trigger
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirm(true);
    }
  };

  // Submit payment
  const handleSavePayment = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        customerId,
        invoiceId: invoiceId || null,
        paymentDate,
        amount: Number(amount),
        paymentMode,
        referenceNumber: referenceNumber || null,
        notes: notes || '',
      };

      const res = await api.post('/payments', payload);
      if (res.data?.success && res.data?.data) {
        alert('Payment successfully confirmed!');
        navigate(`/payments/${res.data.data.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to record payment transaction.');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <Link to="/payments" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2 flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-market-700 dark:text-market-400" />
            Receive Customer Payment
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Shop context: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {showConfirm ? (
        /* CONFIRMATION WORKFLOW VIEW */
        <Card title="Review Receipt & Confirm Payment" subtitle="Verify entries before writing to ledger.">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-semibold">
              <div className="space-y-2">
                <span className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Party Details</span>
                <span className="block text-base font-extrabold text-slate-900 dark:text-white">{selectedCustomer?.name}</span>
                <span className="block text-xs text-slate-500">Code: {selectedCustomer?.customerCode}</span>
              </div>
              
              <div className="space-y-1 text-right">
                <span className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Linked Account</span>
                <span className={`block text-xs font-black uppercase ${invoiceId ? 'text-market-700' : 'text-emerald-600'}`}>
                  {invoiceId ? `Invoice: ${selectedInvoice?.invoiceNumber}` : 'Advance credit credit'}
                </span>
                <span className="block text-xs text-slate-500">Date: {new Date(paymentDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="p-5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Payment Breakdown</h4>
              
              <div className="flex justify-between text-sm font-semibold text-slate-600">
                <span>{invoiceId ? 'Invoice Total Amount' : 'Customer Dues Balance'}</span>
                <span>{invoiceId ? formatCurrency(selectedInvoice?.totalAmount) : formatCurrency(selectedCustomer?.current_balance)}</span>
              </div>

              {invoiceId && (
                <div className="flex justify-between text-sm font-semibold text-slate-650">
                  <span>Already Paid Amount</span>
                  <span className="text-emerald-600 font-extrabold">{formatCurrency(selectedInvoice?.paidAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white border-t border-slate-150 pt-2.5">
                <span>Received Payment amount</span>
                <span className="text-market-800">{formatCurrency(amount)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-500 border-t border-slate-150 pt-2.5">
                <span>Remaining Balance Dues</span>
                <span>
                  {invoiceId
                    ? formatCurrency(selectedInvoice?.balanceAmount - amount)
                    : formatCurrency(selectedCustomer?.current_balance - amount)}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs font-bold text-amber-900 leading-snug flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Confirm this payment? Outstanding balances and invoices statuses will update automatically.</span>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>
                Back to Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSavePayment}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 shadow-lg"
              >
                <CheckCircle2 className="w-4.5 h-4.5" /> Confirm & Generate Receipt
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* FORM ENTRY VIEW */
        <form onSubmit={handleProceedToConfirm} className="space-y-6">
          <Card title="Wholesale customer selector" subtitle="Identify the party paying outstanding balances.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Wholesale Buyer Customer *"
                required
                value={customerId}
                onChange={handleCustomerChange}
                options={[
                  { value: '', label: 'Select customer account' },
                  ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
                ]}
              />

              {selectedCustomer && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800 font-semibold text-xs text-slate-550 flex flex-col justify-center">
                  <span className="block uppercase text-[9px] font-black tracking-wider text-slate-400">Current Outstanding Dues</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(selectedCustomer.current_balance)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {customerId && (
            <Card title="Link payment to specific invoice" subtitle="Select an outstanding invoice or collect as general advance.">
              <div className="max-w-md">
                <Select
                  label="Select Outstanding Invoice (Optional)"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  options={[
                    { value: '', label: 'No Specific Invoice (Record as Customer Advance Credit)' },
                    ...invoices.map((inv) => ({
                      value: inv.id,
                      label: `${inv.invoiceNumber} - Bal: ${formatCurrency(inv.balanceAmount)} (Total: ${formatCurrency(inv.totalAmount)})`,
                    })),
                  ]}
                />
              </div>
            </Card>
          )}

          {customerId && (
            <Card title="Receipting parameters" subtitle="Record payment mode, reference codes, and amounts.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Amount */}
                <Input
                  label="Received Payment Amount (₹) *"
                  type="number"
                  step="0.01"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />

                {/* Date */}
                <Input
                  label="Collection Date *"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />

                {/* Mode */}
                <Select
                  label="Payment Mode *"
                  required
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { value: 'CHEQUE', label: 'Cheque' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />

                {/* Reference Number */}
                <Input
                  label="Reference Details (UPI Ref / Cheque # / Bank Tx ID)"
                  type="text"
                  placeholder="e.g. Transaction Reference ID"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>

              {/* Remarks Notes */}
              <div className="mt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Remarks notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes or remarks regarding this transaction..."
                  className="w-full px-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-market-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Link to="/payments">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={!customerId || amount <= 0}
              className="inline-flex items-center gap-2 shadow-lg"
            >
              Verify & Proceed
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
export default PaymentFormPage;
