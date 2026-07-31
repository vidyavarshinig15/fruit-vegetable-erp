import { ShopId } from './shop.js';
import { UserRole } from './role.js';
import { Permission } from './permission.js';

export type UserStatus = 'active' | 'inactive' | 'locked';

export interface User {
  id: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  role: UserRole;
  assignedShopIds: ShopId[];
  profilePictureUrl?: string | null;
  status: UserStatus;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customPermissions?: Permission[];
}

export interface CreateUserDTO {
  email: string;
  password?: string;
  fullName: string;
  mobileNumber: string;
  role: UserRole;
  assignedShopIds: ShopId[];
  customPermissions?: Permission[];
}

export interface UpdateUserDTO {
  fullName?: string;
  mobileNumber?: string;
  role?: UserRole;
  assignedShopIds?: ShopId[];
  status?: UserStatus;
  customPermissions?: Permission[];
  profilePictureUrl?: string | null;
}

export interface UserFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  shopId?: ShopId;
  status?: UserStatus;
}
