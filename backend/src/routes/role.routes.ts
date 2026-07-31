import { Router } from 'express';
import { getRolesAndPermissions } from '../controllers/role.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);
router.get('/', requirePermission(Permission.MANAGE_USERS), getRolesAndPermissions);

export default router;
