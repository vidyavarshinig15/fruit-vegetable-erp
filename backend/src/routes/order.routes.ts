import { Router } from 'express';
import {
  getOrdersList,
  getOrderById,
  uploadOrderDocument,
  verifyOrderItems,
  deleteOrderDocument,
  getOrderDashboardStats,
  linkOrderToInvoice,
} from '../controllers/order.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission(Permission.VIEW_INVOICE), getOrdersList);
router.get('/dashboard', requirePermission(Permission.VIEW_INVOICE), getOrderDashboardStats);
router.get('/:id', requirePermission(Permission.VIEW_INVOICE), getOrderById);
router.post('/', requirePermission(Permission.GENERATE_INVOICE), uploadOrderDocument);
router.post('/:id/verify', requirePermission(Permission.GENERATE_INVOICE), verifyOrderItems);
router.post('/:id/link', requirePermission(Permission.GENERATE_INVOICE), linkOrderToInvoice);
router.delete('/:id', requirePermission(Permission.GENERATE_INVOICE), deleteOrderDocument);

export default router;
