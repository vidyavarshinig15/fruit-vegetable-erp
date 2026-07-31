import { z } from 'zod';

const invoiceItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  productName: z.string().min(1, 'Product name is required'),
  unitType: z.string().min(1, 'Unit type is required'),
  quantity: z.number().gt(0, 'Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Price cannot be negative'),
  itemNotes: z.string().nullable().optional(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Invoice must contain at least one product line item'),
});

const billStatuses = ['DRAFT', 'GENERATED', 'PRINTED', 'CANCELLED', 'PAID'] as const;
const paymentStatuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'] as const;

export const updateInvoiceStatusSchema = z.object({
  billStatus: z.enum(billStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
});
