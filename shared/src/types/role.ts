import { Permission } from './permission.js';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER',
}

export interface RoleDefinition {
  id: string;
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.VIEW_CUSTOMERS,
    Permission.MANAGE_CUSTOMERS,
    Permission.VIEW_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.GENERATE_INVOICE,
    Permission.VIEW_INVOICE,
    Permission.SHARE_INVOICE,
    Permission.COLLECT_PAYMENT,
    Permission.GENERATE_RECEIPT,
    Permission.VIEW_REPORTS,
    Permission.MANAGE_SETTINGS,
  ],
  [UserRole.STAFF]: [
    Permission.VIEW_CUSTOMERS,
    Permission.GENERATE_INVOICE,
    Permission.VIEW_INVOICE,
    Permission.SHARE_INVOICE,
    Permission.COLLECT_PAYMENT,
    Permission.GENERATE_RECEIPT,
  ],
  [UserRole.VIEWER]: [
    Permission.VIEW_CUSTOMERS,
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_INVOICE,
    Permission.VIEW_REPORTS,
  ],
};
