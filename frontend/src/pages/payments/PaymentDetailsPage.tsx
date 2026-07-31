import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import {
  Printer,
  Trash2,
  ArrowLeft,
  FileCheck,
  CreditCard,
  CheckCircle,
  FileText,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

// Number to Indian Words converter
const convertNumberToIndianWords = (num: number): string => {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const g = ['', 'Thousand', 'Lakh', 'Crore'];

  const formatTens = (n: number) => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + ' ' + a[n % 10];
  };

  const formatChunk = (n: number) => {
    let s = '';
    if (n >= 100) {
      s += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      s += formatTens(n);
    }
    return s;
  };

  if (num === 0) return 'Zero';

  let parts = [];
  let hundred = num % 1000;
  num = Math.floor(num / 1000);

  if (hundred > 0) {
    parts.push(formatChunk(hundred));
  }

  let index = 1;
  while (num > 0) {
    let divisor = index === 1 ? 100 : 100; // Lakh and Crore use 2 digits grouping
    let chunk = num % divisor;
    num = Math.floor(num / divisor);

    if (chunk > 0) {
      parts.push(formatChunk(chunk) + g[index] + ' ');
    }
    index++;
  }

  return parts.reverse().join('').trim() + ' Rupees Only';
};

export const PaymentDetailsPage: React.FC = () => {
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data states
  const [payment, setPayment] = useState<any | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);

  // UI States
  const [printFormat, setPrintFormat] = useState<'A4' | '80mm'>('A4');
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPaymentDetails = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/payments/${id}`);
      if (res.data?.success && res.data?.data) {
        const { payment: payData, receipt: recData, customer: custData } = res.data.data;
        setPayment(payData);
        setReceipt(recData);
        setCustomer(custData);

        // If payment is linked to an invoice, load invoice details
        if (payData.invoiceId) {
          const invRes = await api.get(`/billing/invoices/${payData.invoiceId}`);
          if (invRes.data?.success) {
            setInvoice(invRes.data.data);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve payment details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentDetails();
  }, [id, activeShop]);

  const handlePrint = () => {
    window.print();
  };

  const handleCancelPayment = async () => {
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this payment? This will void the receipt and restore the customer outstanding balance. Cancelled payments cannot be deleted.'
    );
    if (!confirmCancel) return;

    setIsCancelling(true);
    try {
      const res = await api.delete(`/payments/${id}`);
      if (res.data?.success) {
        alert('Payment successfully cancelled!');
        fetchPaymentDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cancellation failed. Admin privileges required.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Loading payment receipt details...
      </div>
    );
  }

  if (errorMsg || !payment || !receipt) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
        {errorMsg || 'Payment record not found.'}
        <div className="mt-4">
          <Link to="/payments">
            <Button variant="secondary">Back to Payments</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 no-print">
        <div>
          <Link to="/payments" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
            <ArrowLeft className="w-4 h-4" /> Back to Payments
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2 flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-market-700 dark:text-market-400" />
            Payment Receipt details
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Receipt: <span className="text-market-700 dark:text-market-400 font-black">{receipt.receiptNumber}</span> | Status: <span className="font-extrabold text-slate-700">{payment.status}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Format Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setPrintFormat('A4')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                printFormat === 'A4'
                  ? 'bg-white dark:bg-slate-900 shadow-sm text-market-750 font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              A4 Format
            </button>
            <button
              onClick={() => setPrintFormat('80mm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                printFormat === '80mm'
                  ? 'bg-white dark:bg-slate-900 shadow-sm text-market-750 font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              80mm Thermal
            </button>
          </div>

          <Button onClick={handlePrint} variant="primary" className="inline-flex items-center gap-2 font-bold shadow-lg">
            <Printer className="w-5 h-5" /> Print Receipt
          </Button>

          {isAdmin && payment.status === 'active' && (
            <Button
              onClick={handleCancelPayment}
              variant="danger"
              disabled={isCancelling}
              className="inline-flex items-center gap-1.5 font-bold shadow-md"
            >
              <Trash2 className="w-4.5 h-4.5" /> Cancel Payment
            </Button>
          )}
        </div>
      </div>

      {payment.status === 'cancelled' && (
        <div className="p-4 bg-red-55/15 border border-red-200 text-red-750 font-bold rounded-2xl flex items-center gap-2 text-sm no-print">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Caution: This payment receipt is voided and customer balances have been restored.</span>
        </div>
      )}

      {/* Printing Shell Layout */}
      <div className="flex justify-center">
        {printFormat === 'A4' ? (
          /* A4 STANDARD OFFICE RECEIPT FORMAT */
          <div className="w-[800px] min-h-[500px] bg-white text-slate-850 p-10 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl font-sans relative">
            
            {/* Stamp/Watermark for Cancelled status */}
            {payment.status === 'cancelled' && (
              <div className="absolute top-[35%] left-[25%] -rotate-12 border-8 border-red-500 text-red-500 text-6xl font-black px-12 py-4 rounded-3xl opacity-30 select-none uppercase tracking-widest">
                CANCELLED / VOID
              </div>
            )}

            {/* Shop Header branding */}
            <div className="flex justify-between items-start border-b-2 border-slate-250 pb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeShop.name}</h2>
                <p className="text-xs font-bold text-slate-550 mt-1 uppercase max-w-[320px] leading-relaxed">
                  {activeShop.address}, {activeShop.city}, {activeShop.state} - {activeShop.pincode}
                </p>
                <p className="text-xs font-bold text-slate-550 mt-1">
                  Phone: {activeShop.mobileNumber} | Owner: {activeShop.ownerName}
                </p>
              </div>

              <div className="text-right">
                <h3 className="text-xl font-black text-slate-900 tracking-wider">OFFICIAL RECEIPT</h3>
                <span className="block text-xs font-black text-slate-450 mt-1">PAYMENT ACKNOWLEDGEMENT</span>
                <div className="mt-4 space-y-1 text-xs text-slate-600 font-bold">
                  <div>Receipt No: <span className="font-extrabold text-slate-900">{receipt.receiptNumber}</span></div>
                  <div>Date: <span className="font-extrabold text-slate-900">{new Date(receipt.receiptDate).toLocaleDateString()}</span></div>
                </div>
              </div>
            </div>

            {/* Customer Details Block */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-150 mt-6 text-sm font-semibold">
              <div>
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Received From</span>
                <span className="block text-base font-extrabold text-slate-900 mt-1">{customer?.name}</span>
                <span className="block text-xs text-slate-500 mt-0.5">Code: {customer?.customerCode}</span>
                <span className="block text-xs text-slate-500 mt-0.5">Mobile: {customer?.mobileNumber}</span>
              </div>
              <div className="text-right space-y-1">
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Account Reference</span>
                <span className={`block text-xs font-black uppercase ${payment.invoiceId ? 'text-market-700' : 'text-emerald-600'}`}>
                  {payment.invoiceId ? `Linked Invoice: ${invoice?.invoiceNumber}` : 'Customer Advance Account'}
                </span>
                <span className="block text-xs text-slate-500">Collected By: Wholesale Operator</span>
              </div>
            </div>

            {/* Financial table summary */}
            <table className="w-full text-left text-sm border-collapse mt-8 text-semibold">
              <thead>
                <tr className="border-b-2 border-slate-350 text-xs font-black text-slate-500 uppercase tracking-wider bg-slate-100/50">
                  <th className="py-3 px-3">Transaction details</th>
                  <th className="py-3 px-3 text-center">Payment Mode</th>
                  <th className="py-3 px-3">Reference Information</th>
                  <th className="py-3 px-3 text-right">Paid Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 text-slate-900 font-extrabold">
                  <td className="py-4 px-3 uppercase">
                    {payment.invoiceId ? 'Invoice Dues Collection' : 'Customer Account Advance Balance Credit'}
                  </td>
                  <td className="py-4 px-3 text-center">
                    <Badge variant="info">{payment.paymentMode}</Badge>
                  </td>
                  <td className="py-4 px-3 text-slate-500 text-xs uppercase font-extrabold">
                    {payment.referenceNumber || 'N/A'}
                  </td>
                  <td className="py-4 px-3 text-right font-black text-xl text-market-900">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>

                {/* Balance Summary Row */}
                <tr className="font-bold text-slate-550 text-sm">
                  <td colSpan={2} className="py-4"></td>
                  <td className="py-4 text-right pr-4 uppercase tracking-wider text-xs font-black text-slate-400">Remaining Balance</td>
                  <td className="py-4 text-right border-t-2 border-slate-300 font-black text-slate-850">
                    {formatCurrency(receipt.balanceRemaining)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Indian Number to words */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-150 rounded-xl font-bold text-xs text-slate-600">
              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Amount in Words</span>
              <span className="block text-sm text-slate-800 mt-1 capitalize font-extrabold">
                {convertNumberToIndianWords(payment.amount)}
              </span>
            </div>

            {/* Sign and footer remarks */}
            <div className="grid grid-cols-2 gap-10 mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-500 leading-snug">
              <div>
                <span className="block uppercase text-[9px] font-black tracking-wider text-slate-400">Remarks Notes</span>
                <p className="mt-1 text-slate-700 italic font-semibold">{payment.notes || 'No remarks notes.'}</p>
              </div>

              <div className="text-right flex flex-col justify-end items-end">
                <div className="w-[180px] border-b border-slate-350 pb-16 text-center text-slate-350 font-semibold uppercase tracking-widest text-[9px]">
                  Authorized Signature
                </div>
                <span className="block mt-2 font-black uppercase text-[9px] text-slate-400">RAJU VEGETABLES AND FRUITS</span>
              </div>
            </div>
          </div>
        ) : (
          /* 80mm THERMAL RECEIPT FORMAT */
          <div className="w-[302px] bg-white text-black p-4 border border-slate-250 shadow-sm rounded-xl font-mono text-[11px] leading-relaxed relative">
            
            {payment.status === 'cancelled' && (
              <div className="absolute top-[35%] left-[5%] -rotate-12 border-4 border-red-500 text-red-500 text-3xl font-black px-4 py-2 rounded-xl opacity-30 select-none uppercase tracking-widest text-center">
                CANCELLED / VOID
              </div>
            )}

            {/* Business Header info */}
            <div className="text-center space-y-1">
              <h2 className="text-sm font-black uppercase tracking-tight">{activeShop.name}</h2>
              <p className="text-[10px] uppercase font-bold">
                {activeShop.address}, {activeShop.city}
              </p>
              <p className="text-[10px] font-bold">Phone: {activeShop.mobileNumber}</p>
              <p className="text-xs font-black tracking-widest mt-3">=== PAYMENT RECEIPT ===</p>
            </div>

            <div className="mt-4 space-y-1 font-bold">
              <div>Receipt No: {receipt.receiptNumber}</div>
              <div>Date: {new Date(receipt.receiptDate).toLocaleDateString()}</div>
              <div>Customer: {customer?.name} ({customer?.customerCode})</div>
              {payment.invoiceId && <div>Invoice No: {invoice?.invoiceNumber}</div>}
            </div>

            <div className="border-t border-dashed border-black my-3"></div>

            <div className="flex justify-between font-black text-xs">
              <span>RECEIVED AMOUNT</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>

            <div className="flex justify-between font-bold text-[10px] mt-1 text-slate-650">
              <span>PAYMENT MODE</span>
              <span>{payment.paymentMode}</span>
            </div>

            {payment.referenceNumber && (
              <div className="flex justify-between font-bold text-[9px] mt-0.5 text-slate-650">
                <span>REF DETAILS</span>
                <span>{payment.referenceNumber}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-[10px] mt-1 border-t border-dotted border-black pt-1.5">
              <span>REMAINING BAL</span>
              <span>{formatCurrency(receipt.balanceRemaining)}</span>
            </div>

            <div className="border-t border-dashed border-black my-3"></div>

            {/* Words */}
            <div className="text-[9px] font-bold text-slate-650 italic leading-snug">
              Amt in words: {convertNumberToIndianWords(payment.amount)}
            </div>

            {payment.notes && (
              <div className="text-[9px] font-bold text-slate-650 mt-1.5">
                Note: {payment.notes}
              </div>
            )}

            <div className="text-center mt-6 space-y-1 text-[9px] font-bold text-slate-500">
              <p>Thank you for your business!</p>
              <p>Raju Vegetables & Fruits Billing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default PaymentDetailsPage;
