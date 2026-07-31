import { z } from 'zod';
import { UserRole, ShopId, Permission } from '@raju-billing/shared';

const shopIdEnum = z.nativeEnum(ShopId);
const userRoleEnum = z.nativeEnum(UserRole);
const permissionEnum = z.nativeEnum(Permission);

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  mobileNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting with 6-9)'),
  role: userRoleEnum,
  assignedShopIds: z.array(shopIdEnum).min(1, 'At least one shop must be assigned'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  customPermissions: z.array(permissionEnum).optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  mobileNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting with 6-9)')
    .optional(),
  role: userRoleEnum.optional(),
  assignedShopIds: z.array(shopIdEnum).min(1, 'At least one shop must be assigned').optional(),
  status: z.enum(['active', 'inactive', 'locked']).optional(),
  customPermissions: z.array(permissionEnum).optional(),
  profilePictureUrl: z.string().nullable().optional(),
});

export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});
