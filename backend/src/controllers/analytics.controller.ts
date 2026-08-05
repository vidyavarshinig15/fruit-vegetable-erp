import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import { ShopId, UserRole } from '@raju-billing/shared';
import { db } from '../database/index.js';

// Helper to determine target shop context based on combined query parameter and permissions
const resolveShopContext = (req: AuthenticatedRequest, res: Response): ShopId | null | 'FORBIDDEN' => {
  const activeShopId = req.headers['x-shop-id'] as ShopId;
  const combined = req.query.combined === 'true';

  if (combined) {
    const isAdmin = req.user?.role === UserRole.SUPER_ADMIN || req.user?.role === UserRole.ADMIN;
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators are authorized to access the Combined Analytics View.',
        error: { code: 'FORBIDDEN_COMBINED_VIEW' },
      });
      return 'FORBIDDEN';
    }
    return null; // Combined View across all shops
  }

  if (!activeShopId) {
    res.status(400).json({
      success: false,
      message: 'Missing X-Shop-Id context header',
      error: { code: 'MISSING_SHOP_CONTEXT' },
    });
    return 'FORBIDDEN';
  }

  if (req.user && req.user.role !== UserRole.SUPER_ADMIN) {
    if (!req.user.assignedShopIds.includes(activeShopId)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permissions to access this isolated shop context.',
        error: { code: 'FORBIDDEN_SHOP_CONTEXT' },
      });
      return 'FORBIDDEN';
    }
  }

  return activeShopId;
};

export const getDashboardKpis = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const data = await analyticsRepository.getDashboardKpis(shopId);

    return res.status(200).json({
      success: true,
      message: 'Dashboard KPIs loaded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const data = await analyticsRepository.getSalesAnalytics(shopId);

    return res.status(200).json({
      success: true,
      message: 'Sales analytics statistics loaded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const data = await analyticsRepository.getCustomerAnalytics(shopId);

    return res.status(200).json({
      success: true,
      message: 'Customer analytics loaded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const data = await analyticsRepository.getProductAnalytics(shopId);

    return res.status(200).json({
      success: true,
      message: 'Product velocities analytics loaded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const data = await analyticsRepository.getPaymentAnalytics(shopId);

    return res.status(200).json({
      success: true,
      message: 'Payment collection distribution loaded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMarketRateAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const data = await analyticsRepository.getMarketRateAnalytics(shopId);

    return res.status(200).json({
      success: true,
      message: 'Market price updates analytics loaded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getBusinessInsights = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const data = await analyticsRepository.getBusinessInsights(shopId);

    return res.status(200).json({
      success: true,
      message: 'Business highlight insights cards loaded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getReportData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = resolveShopContext(req, res);
    if (shopId === 'FORBIDDEN') return;

    const { type, startDate, endDate, customerId, productId, paymentStatus, paymentMethod, customerStatus, productStatus, action, format } = req.query;

    const filters = {
      type: typeof type === 'string' ? type : 'sales',
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      customerId: typeof customerId === 'string' ? customerId : undefined,
      productId: typeof productId === 'string' ? productId : undefined,
      paymentStatus: typeof paymentStatus === 'string' ? paymentStatus : undefined,
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined,
      customerStatus: typeof customerStatus === 'string' ? customerStatus : undefined,
      productStatus: typeof productStatus === 'string' ? productStatus : undefined,
    };

    const data = await analyticsRepository.getReportData(shopId, filters);

    // Audit logs for report exports
    if (action === 'export') {
      const exportFormat = typeof format === 'string' ? format.toUpperCase() : 'PDF';
      const activeShopId = req.headers['x-shop-id'] as ShopId;

      await db.query('activity_logs', {
        method: 'POST',
        body: {
          shop_id: activeShopId || null,
          user_id: req.user?.id || null,
          action_type: 'REPORT_EXPORTED',
          description: `Exported ${filters.type.toUpperCase()} report in ${exportFormat} format. Filter: ${startDate || 'All'} to ${endDate || 'All'}.`,
          created_at: new Date().toISOString(),
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Report data retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};
