import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import {
  FileText,
  Printer,
  ArrowLeft,
  XCircle,
  FileCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Info,
} from 'lucide-react';

// Indian Number-to-Words Converter
const numberToWords = (num: number): string => {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : '');
  };

  const g = (n: number, suffix: string): string => {
    if (n === 0) return '';
    if (n > 99) {
      return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + convert(n % 100) : '') + suffix + ' ';
    }
    return convert(n) + suffix + ' ';
  };

  if (num === 0) return 'Rupees Zero Only';
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let out = '';
  const crores = Math.floor(rupees / 10000000);
  const lakhs = Math.floor((rupees % 10000000) / 100000);
  const thousands = Math.floor((rupees % 100000) / 1000);
  const hundreds = rupees % 1000;

  out += g(crores, 'Crore');
  out += g(lakhs, 'Lakh');
  out += g(thousands, 'Thousand');
  out += g(hundreds, '');

  let result = 'Rupees ' + out.trim();
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  return result + ' Only';
};

export const InvoiceDetailsPage: React.FC = () => {
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Print selector state
  const [printFormat, setPrintFormat] = useState<'A4' | '80mm'>('A4');

  // Data states
  const [invoice, setInvoice] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInvoiceDetails = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const invRes = await api.get(`/invoices/${id}`);
      if (invRes.data?.success) {
        setInvoice(invRes.data.data);
        
        // Fetch customer profile details
        const custRes = await api.get(`/customers/${invRes.data.data.customerId}`);
        if (custRes.data?.success) {
          setCustomer(custRes.data.data);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve invoice details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  // Cancel Invoice
  const handleCancelInvoice = async () => {
    const confirmCancel = window.confirm(
      'Are you sure you want to CANCEL this generated invoice? This action is permanent and will revert all outstanding customer dues.'
    );
    if (!confirmCancel) return;

    try {
      await api.post(`/invoices/${id}/cancel`);
      alert('Invoice successfully cancelled and dues reverted!');
      fetchInvoiceDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invoice cancellation failed. Admin access required.');
    }
  };

  // Browser Print trigger
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Loading invoice printable layout...
      </div>
    );
  }

  if (errorMsg || !invoice) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
        {errorMsg || 'Invoice not found or shop context mismatch.'}
        <div className="mt-4">
          <Link to="/billing/invoices">
            <Button variant="secondary">Back to List</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Print styles injection for browser print overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header controls */}
      <div className="flex items-center justify-between no-print border-b border-slate-200 dark:border-slate-800 pb-5">
        <Link to="/billing/invoices" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {/* Format selector */}
          <div className="flex items-center gap-2 border-2 border-slate-350 dark:border-slate-800 rounded-xl px-3 py-1 bg-white dark:bg-slate-900">
            <span className="text-xs font-black text-slate-500 uppercase">Format:</span>
            <select
              value={printFormat}
              onChange={(e) => setPrintFormat(e.target.value as any)}
              className="text-xs font-bold bg-transparent text-slate-850 dark:text-white focus:outline-none border-none cursor-pointer"
            >
              <option value="A4">A4 Full Invoice</option>
              <option value="80mm">80mm Thermal Receipt</option>
            </select>
          </div>

          <Button onClick={handlePrint} variant="primary" className="inline-flex items-center gap-1.5 py-2 px-4 shadow-md font-bold">
            <Printer className="w-5 h-5" /> Print / Download PDF
          </Button>

          {isAdmin && invoice.billStatus !== 'CANCELLED' && (
            <Button onClick={handleCancelInvoice} variant="ghost" className="inline-flex items-center gap-1.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
              <XCircle className="w-4.5 h-4.5" /> Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {invoice.billStatus === 'CANCELLED' && (
        <div className="no-print p-4 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
          ⚠️ This invoice is CANCELLED. All financial dues have been reverted.
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. PRINTABLE AREA CONTAINER */}
      {/* ---------------------------------------------------- */}
      <div id="print-area" className="bg-white text-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg">
        {printFormat === 'A4' ? (
          /* A4 STANDARD WHOLESALE INVOICE FORMAT */
          <div className="space-y-6 font-sans">
            {/* Branding Shop Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-250 pb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeShop.name}</h2>
                <p className="text-xs font-bold text-slate-550 mt-1 uppercase max-w-[320px] leading-relaxed">
                  {activeShop.address}, {activeShop.city}, {activeShop.state} - {activeShop.pincode}
                </p>
                <p className="text-xs font-bold text-slate-550 mt-1">
                  Owner: {activeShop.ownerName} | Phone: {activeShop.mobileNumber}
                </p>
              </div>

              <div className="text-right">
                <h3 className="text-xl font-black text-slate-900 tracking-wider">TAX INVOICE</h3>
                <span className="block text-xs font-black text-slate-450 mt-1">NET WHOLESALE BILL</span>
                <div className="mt-4 space-y-1 text-xs text-slate-600 font-bold">
                  <div>Bill No: <span className="font-extrabold text-slate-900">{invoice.invoiceNumber}</span></div>
                  <div>Date: <span className="font-extrabold text-slate-900">{new Date(invoice.invoiceDate).toLocaleDateString()}</span></div>
                  {invoice.dueDate && (
                    <div>Due Date: <span className="font-extrabold text-slate-900">{new Date(invoice.dueDate).toLocaleDateString()}</span></div>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Details Block */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-150">
              <div>
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Billed To</span>
                <span className="block text-base font-extrabold text-slate-900 mt-1">{customer?.name || 'Loading Customer...'}</span>
                <span className="block text-xs text-slate-500 mt-0.5">Owner: {customer?.ownerName}</span>
                <span className="block text-xs text-slate-500 mt-0.5">Mobile: {customer?.mobileNumber}</span>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Delivery Location</span>
                <span className="block text-xs text-slate-800 font-bold mt-1 leading-snug">
                  {customer?.address}, {customer?.area}, {customer?.city}, {customer?.state} - {customer?.pincode}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-xs font-black text-slate-700 uppercase tracking-wider bg-slate-100/50">
                  <th className="py-2.5 px-3 w-[60px] text-center">Sl No</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 w-[80px] text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right w-[120px]">Quantity</th>
                  <th className="py-2.5 px-3 text-right w-[120px]">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-[140px]">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b border-slate-150 text-slate-850 font-semibold">
                    <td className="py-3 px-3 text-center text-slate-450">{idx + 1}</td>
                    <td className="py-3 px-3 font-extrabold text-slate-900 uppercase">{item.productName}</td>
                    <td className="py-3 px-3 text-center"><Badge variant="info">{item.unitType}</Badge></td>
                    <td className="py-3 px-3 text-right font-bold">{Number(item.quantity).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold">{formatCurrency(item.unitPrice).replace('₹', '')}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{formatCurrency(item.totalPrice).replace('₹', '')}</td>
                  </tr>
                ))}
                
                {/* Net wholesale totals */}
                <tr className="font-black text-slate-900 text-base">
                  <td colSpan={4} className="py-4"></td>
                  <td className="py-4 text-right pr-4 uppercase tracking-wider text-xs font-black text-slate-400">Total Net Amount</td>
                  <td className="py-4 text-right border-t-2 border-double border-slate-350 text-xl font-black text-market-900">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Price words and notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-150">
              <div className="space-y-2">
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Amount in Words</span>
                <p className="text-xs font-extrabold text-slate-800 leading-snug italic">
                  {numberToWords(invoice.totalAmount)}
                </p>
                {invoice.notes && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="block text-[10px] font-black text-slate-400 uppercase">Remarks notes</span>
                    <p className="text-xs text-slate-650 font-bold mt-1">{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Signature area */}
              <div className="flex flex-col justify-end items-end h-[100px]">
                <div className="w-[180px] border-t border-slate-350 text-center pt-2">
                  <span className="block text-xs font-black uppercase text-slate-750">Authorized Signature</span>
                  <span className="block text-[9px] text-slate-400 font-bold mt-1">For {activeShop.name}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-150 pt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
              Thank you for your wholesale business!
            </div>
          </div>
        ) : (
          /* 80mm THERMAL RECEIPT FORMAT */
          <div className="max-w-[280px] mx-auto font-mono text-xs text-slate-900 leading-normal">
            <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-350">
              <h3 className="font-extrabold uppercase tracking-tight text-sm">{activeShop.name}</h3>
              <p className="text-[10px]">{activeShop.city}, {activeShop.state}</p>
              <p className="text-[10px]">Phone: {activeShop.mobileNumber}</p>
              <h4 className="font-bold border border-slate-900 px-2 py-0.5 inline-block text-[10px] mt-2 tracking-widest uppercase">Invoice Details</h4>
            </div>

            <div className="py-3 border-b border-dashed border-slate-350 space-y-1 text-[10px] font-semibold">
              <div>Invoice No: {invoice.invoiceNumber}</div>
              <div>Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</div>
              <div>Customer: {customer?.name}</div>
            </div>

            {/* Product table list */}
            <table className="w-full text-left text-[10px] border-collapse py-2">
              <thead>
                <tr className="border-b border-dashed border-slate-300 font-black">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-100 font-medium">
                    <td className="py-1 uppercase font-bold">{item.productName.substring(0, 15)}</td>
                    <td className="py-1 text-right">{Number(item.quantity).toFixed(1)} {item.unitType}</td>
                    <td className="py-1 text-right font-black">₹{Number(item.totalPrice).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="font-black text-sm border-t border-dashed border-slate-900">
                  <td colSpan={2} className="py-2 uppercase font-black">Grand Total</td>
                  <td className="py-2 text-right font-black">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-center pt-4 text-[9px] font-bold border-t border-dashed border-slate-350">
              <span>* THANK YOU *</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
