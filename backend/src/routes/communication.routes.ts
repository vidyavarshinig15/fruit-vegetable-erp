import { Router } from 'express';
import {
  getTemplates,
  updateTemplate,
  getSettings,
  updateSettings,
  getHistory,
  sendEmail,
  sendWhatsApp,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/communication.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

// Communication channels
router.get('/templates', requirePermission(Permission.VIEW_INVOICE), getTemplates);
router.patch('/templates/:id', requirePermission(Permission.GENERATE_INVOICE), updateTemplate);
router.get('/settings', requirePermission(Permission.VIEW_INVOICE), getSettings);
router.patch('/settings', requirePermission(Permission.GENERATE_INVOICE), updateSettings);
router.get('/history', requirePermission(Permission.VIEW_INVOICE), getHistory);
router.post('/send-email', requirePermission(Permission.GENERATE_INVOICE), sendEmail);
router.post('/send-whatsapp', requirePermission(Permission.GENERATE_INVOICE), sendWhatsApp);

// Notification Center
router.get('/notifications', requirePermission(Permission.VIEW_INVOICE), getNotifications);
router.patch('/notifications/:id/read', requirePermission(Permission.VIEW_INVOICE), markNotificationRead);
router.post('/notifications/read-all', requirePermission(Permission.VIEW_INVOICE), markAllNotificationsRead);

export default router;
