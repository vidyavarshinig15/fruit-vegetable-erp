import { ShopId } from './shop.js';

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DEACTIVATE'
  | 'USER_ACTIVATE'
  | 'ROLE_CHANGE'
  | 'SHOP_SWITCH'
  | 'PERMISSION_CHANGE'
  | 'PROFILE_UPDATE'
  | 'SHOP_UPDATE'
  | 'LOGO_UPLOAD';

export interface ActivityLog {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  shopId?: ShopId | null;
  action: ActivityAction;
  details?: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface CreateActivityLogDTO {
  userId?: string | null;
  userEmail?: string | null;
  shopId?: ShopId | null;
  action: ActivityAction;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}
