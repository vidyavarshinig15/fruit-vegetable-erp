import { Response, NextFunction } from 'express';
import { activityService } from '../services/activity.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const getActivityLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, userId, action, shopId } = req.query;
    const result = await activityService.getActivityLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      userId: userId as string,
      action: action as string,
      shopId: shopId as string,
    });

    return res.status(200).json({
      success: true,
      message: 'Activity logs retrieved successfully',
      data: result.logs,
      meta: {
        total: result.total,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      },
    });
  } catch (error) {
    next(error);
  }
};
