import { z } from 'zod';

const paymentModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'] as const;

export const createPaymentSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  invoiceId: z.string().uuid('Invalid invoice ID').nullable().optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format'),
  amount: z.number().gt(0, 'Payment amount must be greater than zero'),
  paymentMode: z.enum(paymentModes, {
    errorMap: () => ({ message: 'Payment mode must be CASH, UPI, BANK_TRANSFER, CHEQUE, or OTHER' }),
  }),
  referenceNumber: z.string().max(100, 'Reference number is too long').nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updatePaymentSchema = z.object({
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format').optional(),
  amount: z.number().gt(0, 'Payment amount must be greater than zero').optional(),
  paymentMode: z.enum(paymentModes).optional(),
  referenceNumber: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});
