import { z } from 'zod';

export const manualAdjustmentSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  amount: z.number().gt(0, 'Adjustment amount must be greater than zero'),
  type: z.enum(['DEBIT', 'CREDIT'], {
    errorMap: () => ({ message: 'Adjustment type must be DEBIT or CREDIT' }),
  }),
  reason: z.string().min(5, 'A detailed reason of at least 5 characters is required for manual adjustments').max(500, 'Reason must not exceed 500 characters'),
});
