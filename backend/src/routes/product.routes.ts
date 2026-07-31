import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  activateProduct,
  duplicateProduct,
  getCategories,
  createCategory,
  bulkUpdatePrices,
  getProductPriceHistory,
  getProductDashboard,
} from '../controllers/product.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission(Permission.VIEW_PRODUCTS), getProducts);
router.get('/categories', requirePermission(Permission.VIEW_PRODUCTS), getCategories);
router.post('/categories', requirePermission(Permission.MANAGE_PRODUCTS), createCategory);
router.get('/dashboard', requirePermission(Permission.VIEW_PRODUCTS), getProductDashboard);
router.post('/bulk-update', requirePermission(Permission.MANAGE_PRODUCTS), bulkUpdatePrices);

router.get('/:id', requirePermission(Permission.VIEW_PRODUCTS), getProductById);
router.post('/', requirePermission(Permission.MANAGE_PRODUCTS), createProduct);
router.put('/:id', requirePermission(Permission.MANAGE_PRODUCTS), updateProduct);
router.delete('/:id', requirePermission(Permission.MANAGE_PRODUCTS), archiveProduct);
router.post('/:id/activate', requirePermission(Permission.MANAGE_PRODUCTS), activateProduct);
router.post('/:id/duplicate', requirePermission(Permission.MANAGE_PRODUCTS), duplicateProduct);
router.get('/:id/history', requirePermission(Permission.VIEW_PRODUCTS), getProductPriceHistory);

export default router;
