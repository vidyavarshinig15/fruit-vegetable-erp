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
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/health', requirePermission(Permission.VIEW_INVOICE), getSystemHealth);
router.get('/activity-logs', requirePermission(Permission.VIEW_INVOICE), getActivityLogs);
router.get('/backups', requirePermission(Permission.VIEW_INVOICE), getBackups);
router.post('/backups', requirePermission(Permission.GENERATE_INVOICE), createBackup);
router.post('/restore', requirePermission(Permission.GENERATE_INVOICE), restoreBackup);
router.get('/users', requirePermission(Permission.VIEW_INVOICE), getUsersList);
router.patch('/users/:id', requirePermission(Permission.GENERATE_INVOICE), updateUserManage);
router.patch('/maintenance-mode', requirePermission(Permission.GENERATE_INVOICE), toggleMaintenanceMode);

export default router;
