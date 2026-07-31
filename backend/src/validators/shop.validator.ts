import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const pinRegex = /^\d{6}$/;

export const updateShopDetailsSchema = z.object({
  name: z.string().min(3, 'Business name must be at least 3 characters').optional(),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').optional(),
  mobileNumber: z.string().regex(phoneRegex, 'Invalid Indian mobile number (10 digits starting with 6-9)').optional(),
  alternateNumber: z
    .string()
    .regex(phoneRegex, 'Invalid alternate mobile number')
    .nullable()
    .or(z.literal(''))
    .optional(),
  email: z.string().email('Invalid email address format').nullable().or(z.literal('')).optional(),
  address: z.string().min(5, 'Address must be at least 5 characters').optional(),
  city: z.string().min(2, 'City must be at least 2 characters').optional(),
  state: z.string().min(2, 'State must be at least 2 characters').optional(),
  pincode: z.string().regex(pinRegex, 'Pincode must be exactly 6 digits').optional(),
  description: z.string().max(500, 'Description must not exceed 500 characters').nullable().optional(),
});

export const updateShopSettingsSchema = z.object({
  invoicePrefix: z
    .string()
    .min(2, 'Invoice prefix must be at least 2 characters')
    .max(10, 'Invoice prefix must not exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Invoice prefix must be uppercase alphanumeric')
    .optional(),
  receiptPrefix: z
    .string()
    .min(2, 'Receipt prefix must be at least 2 characters')
    .max(10, 'Receipt prefix must not exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Receipt prefix must be uppercase alphanumeric')
    .optional(),
  defaultLanguage: z.enum(['en', 'kn']).optional(),
  currency: z.string().min(1, 'Currency is required').optional(),
  themeColor: z.enum(['green', 'blue', 'orange']).optional(),
  notificationPreferences: z
    .object({
      email: z.boolean(),
      sms: z.boolean(),
      whatsapp: z.boolean(),
    })
    .optional(),
  backupPreferences: z
    .object({
      daily: z.boolean(),
      retentionDays: z.number().int().min(1).max(365),
    })
    .optional(),
});

export const uploadLogoSchema = z.object({
  logo: z.string().refine((val) => {
    const base64Regex = /^data:image\/(png|jpeg|svg\+xml);base64,/;
    return base64Regex.test(val);
  }, 'Invalid logo format. Only PNG, JPEG, and SVG images in Base64 are supported.'),
});
