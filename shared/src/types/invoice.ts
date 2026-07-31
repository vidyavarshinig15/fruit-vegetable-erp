import { ShopId } from './shop.js';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type BillStatus = 'DRAFT' | 'GENERATED' | 'PRINTED' | 'CANCELLED' | 'PAID';

export interface InvoiceItem {
  id: string;
  shopId: ShopId;
  invoiceId: string;
  productId: string;
  productName: string;
  unitType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemNotes?: string | null;
  status: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  shopId: ShopId;
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  subtotalAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  billStatus: BillStatus;
  pdfUrl?: string | null;
  printCount: number;
  lastPrintedAt?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface CreateInvoiceDTO {
  customerId: string;
  invoiceDate: string;
  dueDate?: string | null;
  notes?: string | null;
  items: {
    productId: string;
    productName: string;
    unitType: string;
    quantity: number;
    unitPrice: number;
    itemNotes?: string | null;
  }[];
}

export interface InvoiceFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  billStatus?: BillStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}
