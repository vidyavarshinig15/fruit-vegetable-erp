import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { UserRole, Permission, DEFAULT_ROLE_PERMISSIONS } from '@raju-billing/shared';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: { code: 'UNAUTHORIZED' },
      });
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden: Insufficient role privileges',
      error: { code: 'FORBIDDEN_ROLE' },
    });
  };
};

export const requirePermission = (permission: Permission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: { code: 'UNAUTHORIZED' },
      });
    }

    const userRole = req.user.role;
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
    const customPermissions = (req.user.customPermissions as Permission[]) || [];
    const effectivePermissions = new Set([...defaultPermissions, ...customPermissions]);

    if (effectivePermissions.has(permission) || userRole === UserRole.SUPER_ADMIN) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Missing required permission [${permission}]`,
      error: { code: 'FORBIDDEN_PERMISSION', details: { requiredPermission: permission } },
    });
  };
};
