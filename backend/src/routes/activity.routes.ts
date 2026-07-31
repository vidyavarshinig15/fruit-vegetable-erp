import { Router } from 'express';
import { getActivityLogs } from '../controllers/activity.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { UserRole } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);
router.get('/', requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]), getActivityLogs);

export default router;
