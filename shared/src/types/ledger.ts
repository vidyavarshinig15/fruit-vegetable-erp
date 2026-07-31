import { ShopId } from './shop.js';

export type TransactionType = 'INVOICE' | 'PAYMENT' | 'OPENING_BALANCE' | 'ADJUSTMENT_DEBIT' | 'ADJUSTMENT_CREDIT';

export interface LedgerEntry {
  id: string;
  shopId: ShopId;
  customerId: string;
  transactionDate: string;
  transactionType: TransactionType;
  referenceId?: string | null;
  referenceNumber?: string | null;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export interface LedgerFilterQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  transactionType?: TransactionType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ManualAdjustmentDTO {
  customerId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  reason: string;
}

export interface CustomerOutstandingSummary {
  customerId: string;
  customerName: string;
  customerCode: string;
  openingBalance: number;
  currentOutstanding: number;
  advanceBalance: number;
  creditLimit: number;
  availableCredit: number;
  creditDays: number;
  isCreditHold: boolean;
  totalInvoices: number;
  totalPayments: number;
  totalPartialPayments: number;
  lastPaymentDate?: string | null;
  lastInvoiceDate?: string | null;
  averagePaymentTimeDays: number;
}

export interface OverdueItem {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface AgingReportData {
  current: number;       // not overdue
  aging1To30: number;    // 1-30 days overdue
  aging31To60: number;   // 31-60 days overdue
  aging61To90: number;   // 61-90 days overdue
  aging90Plus: number;   // 90+ days overdue
}
