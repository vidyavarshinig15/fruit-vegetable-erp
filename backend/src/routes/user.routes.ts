import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
} from '../controllers/user.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRole, requirePermission } from '../middlewares/rbac.middleware.js';
import { UserRole, Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission(Permission.MANAGE_USERS), getUsers);
router.get('/:id', requirePermission(Permission.MANAGE_USERS), getUserById);
router.post('/', requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), requirePermission(Permission.MANAGE_USERS), createUser);
router.put('/:id', requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), requirePermission(Permission.MANAGE_USERS), updateUser);
router.post('/:id/reset-password', requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), requirePermission(Permission.MANAGE_USERS), resetUserPassword);

export default router;
