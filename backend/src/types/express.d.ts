import { ShopId, UserRole, Permission } from '@raju-billing/shared';

declare global {
  namespace Express {
    interface Request {
      activeShopId?: ShopId;
      user?: {
        id: string;
        email: string;
        role: UserRole;
        assignedShopIds: ShopId[];
        customPermissions?: Permission[];
      };
    }
  }
}
