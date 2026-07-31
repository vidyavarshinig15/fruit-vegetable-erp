import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useShop } from '@/contexts/ShopContext';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import { Printer, ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';

export const CustomerStatementPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Parse query parameters
  const customerId = searchParams.get('customerId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  // Statement data states
  const [customer, setCustomer] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0.00);
  const [closingBalance, setClosingBalance] = useState(0.00);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatementDetails = async () => {
      if (!customerId || !startDate || !endDate) {
        setErrorMsg('Missing required customer statement filters parameters.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);
      try {
        const params = new URLSearchParams({ customerId, startDate, endDate });
        const res = await api.get(`/ledgers/statement?${params.toString()}`);
        
        if (res.data?.success && res.data?.data) {
          const { transactions: list, openingBalance: op, closingBalance: cl, customer: cust } = res.data.data;
          setTransactions(list);
          setOpeningBalance(op);
          setClosingBalance(cl);
          setCustomer(cust);
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Failed to retrieve statement.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatementDetails();
  }, [customerId, startDate, endDate, activeShop]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Compiling customer statement ledger...
      </div>
    );
  }

  if (errorMsg || !customer) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
        {errorMsg || 'Statement could not be generated.'}
        <div className="mt-4">
          <Link to="/ledger">
            <Button variant="secondary">Back to Ledger</Button>
          </Link>
        </div>
      </div>
    );
  }

  const outstandingDues = closingBalance > 0 ? closingBalance : 0;
  const advanceCredit = closingBalance < 0 ? Math.abs(closingBalance) : 0;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 no-print">
        <div>
          <Link to="/ledger" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase">
            <ArrowLeft className="w-4 h-4" /> Back to Ledger
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-market-700 dark:text-market-400" />
            Print Account Statement
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Statement Period: <span className="font-extrabold text-slate-800">{new Date(startDate).toLocaleDateString()}</span> to <span className="font-extrabold text-slate-800">{new Date(endDate).toLocaleDateString()}</span>
          </p>
        </div>

        <Button onClick={handlePrint} variant="primary" className="inline-flex items-center gap-2 font-bold shadow-lg">
          <Printer className="w-5 h-5" /> Print Statement
        </Button>
      </div>

      {/* Printable Sheet */}
      <div className="flex justify-center">
        <div className="w-[800px] min-h-[700px] bg-white text-slate-850 p-10 border border-slate-200 shadow-md rounded-2xl font-sans text-sm relative">
          
          {/* Branding Shop Header */}
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
              <h3 className="text-xl font-black text-slate-900 tracking-wider">ACCOUNT STATEMENT</h3>
              <span className="block text-xs font-black text-slate-450 mt-1">CUSTOMER TRANSACTION RECORD</span>
              <div className="mt-4 space-y-1 text-xs text-slate-650 font-bold">
                <div>Period: <span className="font-extrabold text-slate-900">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</span></div>
                <div>Issued: <span className="font-extrabold text-slate-900">{new Date().toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>

          {/* Customer Details info */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-150 mt-6 font-semibold">
            <div>
              <span className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Statement For</span>
              <span className="block text-base font-extrabold text-slate-900 mt-1">{customer.name}</span>
              <span className="block text-xs text-slate-500 mt-0.5">Code: {customer.customerCode}</span>
              <span className="block text-xs text-slate-500 mt-0.5">Mobile: {customer.mobileNumber}</span>
              <span className="block text-xs text-slate-500 mt-0.5">Address: {customer.address}</span>
            </div>

            <div className="text-right space-y-1">
              <span className="block text-[10px] font-black uppercase text-slate-450 tracking-wider text-right">Balance Overview</span>
              <div className="text-xs text-slate-650 space-y-0.5 mt-2">
                <div>Opening Balance: <span className="font-extrabold text-slate-900">{formatCurrency(openingBalance)}</span></div>
                <div>Closing Balance: <span className="font-black text-slate-900">{formatCurrency(closingBalance)}</span></div>
                {advanceCredit > 0 && (
                  <div className="text-emerald-700 font-extrabold">Advance credit Credit: {formatCurrency(advanceCredit)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Transactions timeline Table */}
          <table className="w-full text-left text-xs border-collapse mt-8 font-semibold">
            <thead>
              <tr className="border-b-2 border-slate-350 text-xs font-black text-slate-500 uppercase tracking-wider bg-slate-100/50">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Transaction Description</th>
                <th className="py-2.5 px-3">Ref Code</th>
                <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                <th className="py-2.5 px-3 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening row */}
              <tr className="border-b border-slate-150 text-slate-600 font-bold bg-slate-50/30">
                <td className="py-3 px-3">{new Date(startDate).toLocaleDateString()}</td>
                <td className="py-3 px-3 uppercase text-[10px] font-black tracking-wider text-slate-400">Opening Balance Forward</td>
                <td className="py-3 px-3">-</td>
                <td className="py-3 px-3 text-right">-</td>
                <td className="py-3 px-3 text-right">-</td>
                <td className="py-3 px-3 text-right font-black text-slate-850">{formatCurrency(openingBalance).replace('₹', '')}</td>
              </tr>

              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-150 text-slate-800">
                  <td className="py-3 px-3 text-slate-500">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                  <td className="py-3 px-3 font-semibold uppercase">{tx.description}</td>
                  <td className="py-3 px-3 text-slate-500 uppercase text-[10px] font-extrabold">{tx.referenceNumber || 'N/A'}</td>
                  <td className="py-3 px-3 text-right font-bold text-red-650">
                    {tx.debitAmount > 0 ? formatCurrency(tx.debitAmount).replace('₹', '') : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600">
                    {tx.creditAmount > 0 ? formatCurrency(tx.creditAmount).replace('₹', '') : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    {formatCurrency(tx.runningBalance).replace('₹', '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Statement Summary footer */}
          <div className="grid grid-cols-2 gap-10 mt-12 pt-8 border-t border-slate-200 text-xs font-bold text-slate-500 leading-snug">
            <div>
              <span className="block uppercase text-[9px] font-black tracking-wider text-slate-400">Summary notes</span>
              <p className="mt-1 text-slate-700 italic font-semibold">
                Please check the transactions list above. In case of discrepancies, notify the office within 7 days of statement issue date.
              </p>
            </div>

            <div className="text-right flex flex-col justify-end items-end">
              <div className="w-[180px] border-b border-slate-350 pb-16 text-center text-slate-350 font-semibold uppercase tracking-widest text-[9px]">
                Authorized Signature
              </div>
              <span className="block mt-2 font-black uppercase text-[9px] text-slate-400">{activeShop.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CustomerStatementPage;
