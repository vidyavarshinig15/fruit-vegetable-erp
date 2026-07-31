import { z } from 'zod';

const productStatuses = ['active', 'inactive', 'archived'] as const;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  kannadaName: z.string().nullable().optional(),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  unitType: z.string().min(1, 'Unit type is required'),
  defaultRate: z.number().gt(0, 'Selling price must be greater than zero'),
  minRate: z.number().gt(0, 'Minimum floor price must be greater than zero'),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isFavourite: z.boolean().optional().default(false),
}).refine((data) => data.minRate <= data.defaultRate, {
  message: 'Minimum floor price cannot exceed the default selling price',
  path: ['minRate'],
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name must not be empty').optional(),
  kannadaName: z.string().nullable().optional(),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  unitType: z.string().min(1, 'Unit type must not be empty').optional(),
  defaultRate: z.number().gt(0, 'Selling price must be greater than zero').optional(),
  minRate: z.number().gt(0, 'Minimum floor price must be greater than zero').optional(),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isFavourite: z.boolean().optional(),
  status: z.enum(productStatuses).optional(),
}).refine((data) => {
  if (data.minRate !== undefined && data.defaultRate !== undefined) {
    return data.minRate <= data.defaultRate;
  }
  return true;
}, {
  message: 'Minimum floor price cannot exceed the default selling price',
  path: ['minRate'],
});

export const priceChangeItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  defaultRate: z.number().gt(0, 'Price must be greater than zero'),
  minRate: z.number().gt(0, 'Floor price must be greater than zero'),
  remarks: z.string().nullable().optional(),
}).refine((data) => data.minRate <= data.defaultRate, {
  message: 'Minimum price cannot exceed the selling price',
  path: ['minRate'],
});

export const bulkPriceUpdateSchema = z.object({
  updates: z.array(priceChangeItemSchema).min(1, 'At least one price update is required'),
});
