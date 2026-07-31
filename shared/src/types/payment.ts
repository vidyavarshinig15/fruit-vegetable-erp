import { ShopId } from './shop.js';

export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export interface Payment {
  id: string;
  shopId: ShopId;
  customerId: string;
  invoiceId?: string | null;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export interface PaymentReceipt {
  id: string;
  shopId: ShopId;
  paymentId: string;
  customerId: string;
  receiptNumber: string;
  receiptDate: string;
  totalPaid: number;
  balanceRemaining: number;
  receiptPdfUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDTO {
  customerId: string;
  invoiceId?: string | null;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface PaymentFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  invoiceId?: string;
  paymentMode?: PaymentMode;
  startDate?: string;
  endDate?: string;
}

export const mapModeToEnum = (mode: string): string => {
  const clean = mode.toUpperCase().replace(/\s/g, '_');
  if (['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'].includes(clean)) {
    return clean;
  }
  return 'OTHER';
};
