import { Router } from 'express';
import {
  getShops,
  getShopById,
  updateShop,
  getShopUsers,
  uploadShopLogo,
  getShopStatistics,
} from '../controllers/shop.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', getShops);
router.get('/:id', getShopById);
router.put('/:id', requirePermission(Permission.MANAGE_SETTINGS), updateShop);
router.get('/:id/users', requirePermission(Permission.MANAGE_USERS), getShopUsers);
router.post('/:id/logo', requirePermission(Permission.MANAGE_SETTINGS), uploadShopLogo);
router.get('/:id/statistics', getShopStatistics);

export default router;
