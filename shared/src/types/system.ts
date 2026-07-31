import { ShopId } from './shop.js';
import { UserRole } from './role.js';

export interface BackupLog {
  id: string;
  shopId: ShopId | null;
  backupType: 'FULL' | 'SETTINGS' | 'DATABASE';
  filePath: string;
  sizeBytes: number;
  backupStatus: 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
  createdByName?: string;
}

export interface SystemHealth {
  serverStatus: 'ONLINE' | 'MAINTENANCE' | 'OFFLINE';
  databaseStatus: 'CONNECTED' | 'DISCONNECTED';
  storageUsageBytes: number;
  recentBackups: BackupLog[];
  lastRestoreDate: string | null;
  failedLoginAttemptsToday: number;
  activeUsersCount: number;
  activeSessionsCount: number;
  auditEventsCountToday: number;
  pendingSecurityAlertsCount: number;
}

export interface UserManageDTO {
  id: string;
  status: 'active' | 'inactive';
  role: UserRole;
  assignedShopIds: string[];
}
