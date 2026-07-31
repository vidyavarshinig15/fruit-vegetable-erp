import { Router } from 'express';
import {
  getLedgerTimeline,
  getCustomerStatement,
  recordManualAdjustment,
  getCustomerOutstandingSummary,
  getLedgerDashboardStats,
} from '../controllers/ledger.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission(Permission.VIEW_INVOICE), getLedgerTimeline);
router.get('/dashboard', requirePermission(Permission.VIEW_INVOICE), getLedgerDashboardStats);
router.get('/statement', requirePermission(Permission.VIEW_INVOICE), getCustomerStatement);
router.get('/outstanding/:customerId', requirePermission(Permission.VIEW_INVOICE), getCustomerOutstandingSummary);
router.post('/adjustments', requirePermission(Permission.GENERATE_INVOICE), recordManualAdjustment);

export default router;
