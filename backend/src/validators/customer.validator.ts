import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const pinRegex = /^\d{6}$/;

const businessTypes = [
  'Hotel',
  'Restaurant',
  'Resort',
  'Cafe',
  'Bakery',
  'Retail Shop',
  'Hostel',
  'Catering',
  'Juice Shop',
  'Other',
] as const;

const customerStatuses = ['active', 'inactive', 'blocked', 'archived'] as const;

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  contactPerson: z.string().min(1, 'Contact person name is required'),
  mobileNumber: z.string().regex(phoneRegex, 'Invalid Indian mobile number (10 digits starting with 6-9)'),
  alternateMobile: z
    .string()
    .regex(phoneRegex, 'Invalid alternate mobile number')
    .nullable()
    .or(z.literal(''))
    .optional(),
  whatsappNumber: z
    .string()
    .regex(phoneRegex, 'Invalid WhatsApp mobile number')
    .nullable()
    .or(z.literal(''))
    .optional(),
  email: z.string().email('Invalid email address format').nullable().or(z.literal('')).optional(),
  address: z.string().min(1, 'Business address is required'),
  area: z.string().min(1, 'Area is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(pinRegex, 'Pincode must be exactly 6 digits'),
  businessType: z.enum(businessTypes, {
    errorMap: () => ({ message: 'Invalid business type selected' }),
  }),
  openingBalance: z.number().default(0),
  creditLimit: z.number().nonnegative('Credit limit must be a positive number').default(0),
  paymentTerms: z.string().min(1, 'Payment terms selection is required'),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().nullable().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Business name must not be empty').optional(),
  ownerName: z.string().min(1, 'Owner name must not be empty').optional(),
  contactPerson: z.string().min(1, 'Contact person must not be empty').optional(),
  mobileNumber: z
    .string()
    .regex(phoneRegex, 'Invalid Indian mobile number (10 digits starting with 6-9)')
    .optional(),
  alternateMobile: z
    .string()
    .regex(phoneRegex, 'Invalid alternate mobile number')
    .nullable()
    .or(z.literal(''))
    .optional(),
  whatsappNumber: z
    .string()
    .regex(phoneRegex, 'Invalid WhatsApp mobile number')
    .nullable()
    .or(z.literal(''))
    .optional(),
  email: z.string().email('Invalid email address format').nullable().or(z.literal('')).optional(),
  address: z.string().min(1, 'Address must not be empty').optional(),
  area: z.string().min(1, 'Area must not be empty').optional(),
  city: z.string().min(1, 'City must not be empty').optional(),
  state: z.string().min(1, 'State must not be empty').optional(),
  pincode: z.string().regex(pinRegex, 'Pincode must be exactly 6 digits').optional(),
  businessType: z.enum(businessTypes).optional(),
  creditLimit: z.number().nonnegative('Credit limit must be a positive number').optional(),
  paymentTerms: z.string().min(1, 'Payment terms must not be empty').optional(),
  status: z.enum(customerStatuses).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

export const createNoteSchema = z.object({
  text: z.string().min(1, 'Note content must not be empty'),
});

export const createDocumentSchema = z.object({
  type: z.enum([
    'GST Certificate',
    'Business License',
    'Visiting Card',
    'Shop Photo',
    'Customer Agreement',
    'Other Documents',
  ]),
  name: z.string().min(1, 'Document name is required'),
  filePath: z.string().min(1, 'Document file data is required'),
});

export const createContactLogSchema = z.object({
  type: z.enum(['Call', 'Meeting', 'Discussion']),
  remarks: z.string().min(1, 'Remarks description is required'),
  date: z.string().optional(),
});
