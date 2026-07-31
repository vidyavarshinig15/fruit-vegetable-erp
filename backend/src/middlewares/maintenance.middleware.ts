import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { ShopId, UserRole } from '@raju-billing/shared';
import { db } from '../database/index.js';

export const maintenanceModeMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const shopId = req.headers['x-shop-id'] as ShopId;
  if (!shopId) {
    return next();
  }

  try {
    // Check if maintenance mode setting is enabled for this shop
    const settingKey = `${shopId}_maintenance_mode`;
    const rows = await db.query(`system_settings?setting_key=eq.${settingKey}`);
    
    if (rows.length > 0) {
      const mode = rows[0];
      if (mode.setting_value === 'true' && mode.status === 'active') {
        // Only SUPER_ADMIN and ADMIN are allowed bypass access
        const userRole = req.user?.role;
        if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.ADMIN) {
          return res.status(503).json({
            success: false,
            message: mode.description || 'System is currently undergoing scheduled maintenance. Please try again later.',
            error: { code: 'MAINTENANCE_MODE_ACTIVE' },
          });
        }
      }
    }
  } catch (error) {
    // If table doesn't exist yet, proceed
  }

  next();
};

export default maintenanceModeMiddleware;
