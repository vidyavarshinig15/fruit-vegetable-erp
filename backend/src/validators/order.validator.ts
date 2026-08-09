import { z } from 'zod';

const allowedMimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain'
];

export const uploadOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().refine((val) => allowedMimeTypes.includes(val), {
    message: 'Unsupported file type. Only PDF and PNG/JPEG/WEBP image uploads are allowed.',
  }),
  fileSizeBytes: z.number().max(20 * 1024 * 1024, 'File size exceeds the 20MB limit'),
  fileData: z.string().min(1, 'Base64 file data is required'), // Base64 encoded document content
});

const verificationItemSchema = z.object({
  productName: z.string().min(1, 'Item name must not be empty'),
  quantity: z.number().gt(0, 'Quantity must be greater than zero'),
  unitType: z.string().min(1, 'Unit type is required'),
  matchedProductId: z.string().uuid().nullable().optional(),
  confidence: z.enum(['High', 'Medium', 'Low']),
  status: z.enum(['Matched', 'Unmatched', 'Conflict']),
});

export const verifyOrderItemsSchema = z.object({
  items: z.array(verificationItemSchema).min(1, 'At least one line item is required for order verification'),
  notes: z.string().nullable().optional(),
});
