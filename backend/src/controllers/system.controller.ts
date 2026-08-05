import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { backupRepository } from '../repositories/backup.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { ShopId, UserRole, SystemHealth } from '@raju-billing/shared';
import { db } from '../database/index.js';

const validateShopContext = (req: AuthenticatedRequest, res: Response): ShopId | null => {
  const activeShopId = req.headers['x-shop-id'] as ShopId;
  if (!activeShopId) {
    res.status(400).json({
      success: false,
      message: 'Missing X-Shop-Id header context',
      error: { code: 'MISSING_SHOP_CONTEXT' },
    });
    return null;
  }
  return activeShopId;
};

// Health Dashboard
export const getSystemHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Load recent backups
    const backups = await backupRepository.getBackupsList(shopId);
    
    // Count activity events today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const logs = await db.query(`activity_logs?shop_id=eq.${shopId}`);
    const logsToday = logs.filter((l: any) => new Date(l.created_at).getTime() >= startOfDay.getTime());

    // Check if maintenance mode is enabled
    let maintenanceActive = false;
    try {
      const modeKey = `${shopId}_maintenance_mode`;
      const rows = await db.query(`system_settings?setting_key=eq.${modeKey}`);
      if (rows.length > 0 && rows[0].setting_value === 'true' && rows[0].status === 'active') {
        maintenanceActive = true;
      }
    } catch (e) {}

    // Mock/simulate memory stats
    const health: SystemHealth = {
      serverStatus: maintenanceActive ? 'MAINTENANCE' : 'ONLINE',
      databaseStatus: 'CONNECTED',
      storageUsageBytes: backups.reduce((acc, curr) => acc + curr.sizeBytes, 0) + 1048576, // backups size + base storage
      recentBackups: backups.slice(0, 3),
      lastRestoreDate: backups.find(b => b.backupType === 'DATABASE')?.createdAt || null,
      failedLoginAttemptsToday: logs.filter((l: any) => l.action === 'LOGIN_FAILED').length,
      activeUsersCount: 2,
      activeSessionsCount: 4,
      auditEventsCountToday: logsToday.length,
      pendingSecurityAlertsCount: logs.filter((l: any) => l.action === 'LOGIN_FAILED').length > 3 ? 1 : 0,
    };

    return res.status(200).json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
};

// Immutable Audit Logs
export const getActivityLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { action, userId, page = '1', limit = '20' } = req.query;

    const rows = await db.query(`activity_logs?shop_id=eq.${shopId}`);
    let list = rows.map((r: any) => ({
      id: r.id,
      shopId: r.shop_id,
      userId: r.user_id,
      action: r.action_type || r.action,
      details: r.description || r.details,
      metadata: r.metadata || {},
      createdAt: r.created_at,
    }));

    if (action) {
      list = list.filter((e) => e.action === action);
    }
    if (userId) {
      list = list.filter((e) => e.userId === userId);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Basic Pagination
    const p = parseInt(page as string, 10);
    const lim = parseInt(limit as string, 10);
    const startIdx = (p - 1) * lim;
    const paginated = list.slice(startIdx, startIdx + lim);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        page: p,
        limit: lim,
        totalItems: list.length,
        totalPages: Math.ceil(list.length / lim),
      }
    });
  } catch (error) {
    next(error);
  }
};

// Backups list & Manual create trigger
export const getBackups = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const list = await backupRepository.getBackupsList(shopId);
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

export const createBackup = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { log, payload } = await backupRepository.runBackup(shopId, req.user?.id || '');

    // Record activity log
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: shopId,
        user_id: req.user?.id,
        action_type: 'BACKUP_CREATED',
        description: `Created database manual backup log. Size: ${log.sizeBytes} bytes.`,
        created_at: new Date().toISOString(),
      }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Database backup compiled successfully.',
      data: log,
      payload, // returns the JSON for browser-level download saving
    });
  } catch (error) {
    next(error);
  }
};

export const restoreBackup = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Admin authorization check
    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required to restore data backup.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Missing backup payload body' });
    }

    const success = await backupRepository.runRestore(shopId, payload, req.user?.id || '');
    if (success) {
      return res.status(200).json({ success: true, message: 'Database backup restored successfully.' });
    } else {
      return res.status(400).json({ success: false, message: 'Failed to restore database from backup.' });
    }
  } catch (error) {
    next(error);
  }
};

// Users management list & role updates
export const getUsersList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Get all users who are assigned to this shopId
    const result = await userRepository.findAll();
    const shopUsers = (result.users || []).filter((u: any) => u.assignedShopIds && u.assignedShopIds.includes(shopId));
    return res.status(200).json({ success: true, data: shopUsers });
  } catch (error) {
    next(error);
  }
};

export const updateUserManage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can update user access parameters.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const { id } = req.params;
    const { status, role, assignedShopIds } = req.body;

    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Protect super admin role changes
    if (user.role === UserRole.SUPER_ADMIN && req.user?.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: 'Cannot modify Super Admin details.' });
    }

    const updated = await userRepository.update(id, {
      status,
      role,
      assignedShopIds,
    });

    if (updated) {
      // Record activity
      await db.query('activity_logs', {
        method: 'POST',
        body: {
          shop_id: shopId,
          user_id: req.user?.id,
          action_type: 'USER_UPDATED',
          description: `Modified user ${user.fullName} access status to ${status} and role to ${role}.`,
          created_at: new Date().toISOString(),
        }
      }).catch(() => {});

      return res.status(200).json({ success: true, message: 'User settings updated successfully', data: updated });
    }

    return res.status(400).json({ success: false, message: 'Failed to save user settings' });
  } catch (error) {
    next(error);
  }
};

// Toggle Maintenance Mode
export const toggleMaintenanceMode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required to toggle maintenance mode.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const { enabled, message } = req.body;
    const key = `${shopId}_maintenance_mode`;

    const existing = await db.query(`system_settings?setting_key=eq.${key}`);
    const body = {
      setting_key: key,
      setting_value: enabled ? 'true' : 'false',
      description: message || 'System is currently undergoing scheduled maintenance.',
      is_public: true,
      status: 'active',
      is_deleted: false,
      updated_at: new Date().toISOString(),
    };

    if (existing.length > 0) {
      await db.query(`system_settings?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        body,
      });
    } else {
      await db.query('system_settings', {
        method: 'POST',
        body: {
          ...body,
          created_at: new Date().toISOString(),
        }
      });
    }

    // Record activity
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: shopId,
        user_id: req.user?.id,
        action_type: 'SETTINGS_CHANGED',
        description: `Maintenance Mode toggled to ${enabled ? 'ENABLED' : 'DISABLED'}.`,
        created_at: new Date().toISOString(),
      }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Maintenance Mode is now ${enabled ? 'enabled' : 'disabled'}.`
    });
  } catch (error) {
    next(error);
  }
};
