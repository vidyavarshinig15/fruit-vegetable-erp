import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  activateCustomer,
  addNote,
  deleteNote,
  uploadDocument,
  addContactHistory,
} from '../controllers/customer.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission(Permission.VIEW_CUSTOMERS), getCustomers);
router.get('/:id', requirePermission(Permission.VIEW_CUSTOMERS), getCustomerById);

router.post('/', requirePermission(Permission.MANAGE_CUSTOMERS), createCustomer);
router.put('/:id', requirePermission(Permission.MANAGE_CUSTOMERS), updateCustomer);
router.delete('/:id', requirePermission(Permission.MANAGE_CUSTOMERS), archiveCustomer);
router.post('/:id/activate', requirePermission(Permission.MANAGE_CUSTOMERS), activateCustomer);

router.post('/:id/notes', requirePermission(Permission.MANAGE_CUSTOMERS), addNote);
router.delete('/:id/notes/:noteId', requirePermission(Permission.MANAGE_CUSTOMERS), deleteNote);
router.post('/:id/documents', requirePermission(Permission.MANAGE_CUSTOMERS), uploadDocument);
router.post('/:id/contact-history', requirePermission(Permission.MANAGE_CUSTOMERS), addContactHistory);

export default router;
