import { Router } from 'express';
import {
  getSystemHealth,
  getActivityLogs,
  getBackups,
  createBackup,
  restoreBackup,
  getUsersList,
  updateUserManage,
  toggleMaintenanceMode,
} from '../controllers/system.controller.js';
import { authenticateJwt, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';
import { Response, NextFunction } from 'express';

const router = Router();

router.use(authenticateJwt);

const requireOwnerOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.email !== 'vidyavarshini15@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Access restricted to owner email only',
      error: { code: 'FORBIDDEN' },
    });
  }
  next();
};

router.use(requireOwnerOnly);

router.get('/health', requirePermission(Permission.VIEW_INVOICE), getSystemHealth);
router.get('/activity-logs', requirePermission(Permission.VIEW_INVOICE), getActivityLogs);
router.get('/backups', requirePermission(Permission.VIEW_INVOICE), getBackups);
router.post('/backups', requirePermission(Permission.GENERATE_INVOICE), createBackup);
router.post('/restore', requirePermission(Permission.GENERATE_INVOICE), restoreBackup);
router.get('/users', requirePermission(Permission.VIEW_INVOICE), getUsersList);
router.patch('/users/:id', requirePermission(Permission.GENERATE_INVOICE), updateUserManage);
router.patch('/maintenance-mode', requirePermission(Permission.GENERATE_INVOICE), toggleMaintenanceMode);

export default router;
