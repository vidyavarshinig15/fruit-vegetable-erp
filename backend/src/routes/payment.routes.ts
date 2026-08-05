import { Router } from 'express';
import {
  getPaymentsList,
  getPaymentById,
  recordPayment,
  cancelPaymentRecord,
  getReceiptsList,
} from '../controllers/payment.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission(Permission.VIEW_INVOICE), getPaymentsList);
router.get('/receipts', requirePermission(Permission.VIEW_INVOICE), getReceiptsList);
router.get('/:id', requirePermission(Permission.VIEW_INVOICE), getPaymentById);
router.post('/', requirePermission(Permission.GENERATE_INVOICE), recordPayment);
router.delete('/:id', requirePermission(Permission.GENERATE_INVOICE), cancelPaymentRecord);

export default router;
