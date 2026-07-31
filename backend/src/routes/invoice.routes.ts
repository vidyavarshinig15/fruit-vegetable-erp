import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  cancelInvoice,
} from '../controllers/invoice.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission(Permission.VIEW_INVOICE), getInvoices);
router.get('/:id', requirePermission(Permission.VIEW_INVOICE), getInvoiceById);
router.post('/', requirePermission(Permission.GENERATE_INVOICE), createInvoice);
router.post('/:id/cancel', requirePermission(Permission.GENERATE_INVOICE), cancelInvoice);

export default router;
