import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { userRepository } from '../repositories/user.repository.js';
import { authService } from '../services/auth.service.js';
import { JwtTokenPayload, ShopId, UserRole, Permission } from '@raju-billing/shared';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    assignedShopIds: ShopId[];
    customPermissions?: Permission[];
  };
}

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Access token missing',
        error: { code: 'UNAUTHORIZED' },
      });
    }

    if (authService.isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token has been revoked',
        error: { code: 'TOKEN_REVOKED' },
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtTokenPayload;
    const userRecord = await userRepository.findById(decoded.sub);

    if (!userRecord || userRecord.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User account is invalid or inactive',
        error: { code: 'USER_INACTIVE' },
      });
    }

    req.user = {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      assignedShopIds: userRecord.assignedShopIds,
      customPermissions: userRecord.customPermissions,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired access token',
      error: { code: 'INVALID_TOKEN' },
    });
  }
};
