import { Response, NextFunction } from 'express';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, UserRole } from '@raju-billing/shared';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const getRolesAndPermissions = async (
  _req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction
) => {
  const roles = Object.values(UserRole).map((role) => ({
    role,
    permissions: DEFAULT_ROLE_PERMISSIONS[role],
  }));

  return res.status(200).json({
    success: true,
    message: 'Role & permission definitions retrieved',
    data: {
      roles,
      allPermissions: ALL_PERMISSIONS,
    },
  });
};
