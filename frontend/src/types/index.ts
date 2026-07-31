import { ShopId } from '@raju-billing/shared';

export interface Customer {
  id: string;
  shopId: ShopId;
  name: string;
  phone: string;
  city: string;
  outstandingBalance: number;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: ShopId;
  name: string;
  nameKannada?: string;
  category: 'VEGETABLE' | 'FRUIT';
  unit: string;
  defaultRate: number;
}

/**
 * Wholesale Bill Item Structure (NO TAX, NO GST, NO DISCOUNT)
 */
export interface BillItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number; // calculated as quantity * rate
}

/**
 * Wholesale Bill (NO TAX, NO GST, NO DISCOUNT)
 */
export interface Bill {
  id: string;
  billNumber: string;
  shopId: ShopId;
  customerId: string;
  customerName: string;
  items: BillItem[];
  subtotal: number;
  totalAmount: number; // Net total amount equal to subtotal
  paidAmount: number;
  dueAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'CLEARED';
  createdAt: string;
}
