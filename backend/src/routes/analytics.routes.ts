import { Router } from 'express';
import {
  getDashboardKpis,
  getSalesAnalytics,
  getCustomerAnalytics,
  getProductAnalytics,
  getPaymentAnalytics,
  getMarketRateAnalytics,
  getBusinessInsights,
  getReportData,
} from '../controllers/analytics.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { Permission } from '@raju-billing/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/kpi', requirePermission(Permission.VIEW_INVOICE), getDashboardKpis);
router.get('/sales', requirePermission(Permission.VIEW_INVOICE), getSalesAnalytics);
router.get('/customers', requirePermission(Permission.VIEW_INVOICE), getCustomerAnalytics);
router.get('/products', requirePermission(Permission.VIEW_INVOICE), getProductAnalytics);
router.get('/payments', requirePermission(Permission.VIEW_INVOICE), getPaymentAnalytics);
router.get('/market-rates', requirePermission(Permission.VIEW_INVOICE), getMarketRateAnalytics);
router.get('/insights', requirePermission(Permission.VIEW_INVOICE), getBusinessInsights);
router.get('/reports', requirePermission(Permission.VIEW_INVOICE), getReportData);

export default router;
