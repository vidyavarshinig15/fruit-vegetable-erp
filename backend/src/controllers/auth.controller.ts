import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { getClientIp, getUserAgent } from '../middlewares/activity.middleware.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    const result = await authService.login(validated, ip, agent);

    // Set secure cookie option
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.expiresIn * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: { code: 'INVALID_CREDENTIALS' },
      });
    }
    if (error.message === 'ACCOUNT_INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact system administrator.',
        error: { code: 'ACCOUNT_INACTIVE' },
      });
    }
    if (error.message === 'ACCOUNT_LOCKED') {
      return res.status(429).json({
        success: false,
        message: 'Account locked due to 5 consecutive failed login attempts. Try again in 15 minutes.',
        error: { code: 'ACCOUNT_LOCKED' },
      });
    }
    next(error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || 'unknown';
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.cookies?.accessToken || '';
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    await authService.logout(userId, token, ip, agent);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        error: { code: 'MISSING_REFRESH_TOKEN' },
      });
    }

    const result = await authService.refreshToken(token);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: { code: 'INVALID_REFRESH_TOKEN' },
    });
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    const resetToken = await authService.requestForgotPassword(validated.email, ip, agent);

    return res.status(200).json({
      success: true,
      message: 'If the email exists in our system, password reset instructions have been sent.',
      data: { resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    await authService.resetPassword(validated, ip, agent);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
      data: null,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired password reset link.',
      error: { code: 'RESET_FAILED' },
    });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const validated = changePasswordSchema.parse(req.body);
    const ip = getClientIp(req);
    const agent = getUserAgent(req);

    await authService.changePassword(userId, validated, ip, agent);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: null,
    });
  } catch (error: any) {
    if (error.message === 'INVALID_CURRENT_PASSWORD') {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect',
        error: { code: 'INVALID_CURRENT_PASSWORD' },
      });
    }
    next(error);
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'User profile retrieved',
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};
