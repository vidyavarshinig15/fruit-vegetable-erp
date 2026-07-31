import { Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { createUserSchema, updateUserSchema, resetUserPasswordSchema } from '../validators/user.validator.js';
import { getClientIp, getUserAgent } from '../middlewares/activity.middleware.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, role, shopId, status } = req.query;
    const result = await userService.getAllUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string,
      role: role as any,
      shopId: shopId as any,
      status: status as any,
    });

    return res.status(200).json({
      success: true,
      message: 'Users list retrieved successfully',
      data: result.users,
      meta: {
        total: result.total,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'User details retrieved',
      data: user,
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: { code: 'NOT_FOUND' },
      });
    }
    next(error);
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createUserSchema.parse(req.body);
    const creatorId = req.user!.id;
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    const newUser = await userService.createUser(validated, creatorId, ip, agent);

    return res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: newUser,
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        message: 'A user account with this email address already exists.',
        error: { code: 'DUPLICATE_EMAIL' },
      });
    }
    if (error.message === 'MOBILE_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        message: 'A user account with this mobile number already exists.',
        error: { code: 'DUPLICATE_MOBILE' },
      });
    }
    next(error);
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = updateUserSchema.parse(req.body);
    const editorId = req.user!.id;
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    const updatedUser = await userService.updateUser(req.params.id, validated, editorId, ip, agent);

    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.message === 'MOBILE_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        message: 'A user with this mobile number already exists.',
        error: { code: 'DUPLICATE_MOBILE' },
      });
    }
    next(error);
  }
};

export const resetUserPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = resetUserPasswordSchema.parse(req.body);
    const adminId = req.user!.id;
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    await userService.resetUserPassword(req.params.id, validated.newPassword, adminId, ip, agent);

    return res.status(200).json({
      success: true,
      message: 'User password reset successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
