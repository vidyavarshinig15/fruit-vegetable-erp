import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { communicationRepository } from '../repositories/communication.repository.js';
import { communicationService } from '../services/communication.service.js';
import { notificationService } from '../services/notification.service.js';
import { ShopId, UserRole } from '@raju-billing/shared';
import { db } from '../database/index.js';

// Shop isolation header validator
const validateShopContext = (req: AuthenticatedRequest, res: Response): ShopId | null => {
  const activeShopId = req.headers['x-shop-id'] as ShopId;
  if (!activeShopId) {
    res.status(400).json({
      success: false,
      message: 'Missing X-Shop-Id header context',
      error: { code: 'MISSING_SHOP_CONTEXT' },
    });
    return null;
  }
  return activeShopId;
};

// Templates
export const getTemplates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const list = await communicationRepository.getTemplates(shopId);
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Admin authorization check
    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can modify communication templates.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const { id } = req.params;
    const { templateBody, subject } = req.body;

    if (!templateBody) {
      return res.status(400).json({ success: false, message: 'templateBody is required' });
    }

    const success = await communicationRepository.updateTemplate(id, shopId, { templateBody, subject }, req.user?.id || '');
    if (success) {
      return res.status(200).json({ success: true, message: 'Template updated successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Failed to update template' });
    }
  } catch (error) {
    next(error);
  }
};

// Settings
export const getSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const config = await communicationRepository.getSettings(shopId);
    return res.status(200).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required to change SMTP/Meta settings.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const success = await communicationRepository.updateSettings(shopId, req.body);
    if (success) {
      return res.status(200).json({ success: true, message: 'Communication settings updated successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Failed to save communication configurations' });
    }
  } catch (error) {
    next(error);
  }
};

// History
export const getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const list = await communicationRepository.getHistory(shopId, req.query);
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

// Send Dispatch Actions
export const sendEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { recipient, subject, content, customerId, attachmentBase64, attachmentFilename } = req.body;

    if (!recipient || !subject || !content) {
      return res.status(400).json({ success: false, message: 'recipient, subject, and content are required' });
    }

    const log = await communicationService.sendEmail(
      shopId,
      recipient,
      subject,
      content,
      req.user?.id || '',
      customerId,
      attachmentBase64,
      attachmentFilename
    );

    return res.status(200).json({
      success: true,
      message: log.status === 'SENT' ? 'Email sent successfully' : 'Email dispatch failed',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

export const sendWhatsApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { recipient, content, customerId, messageType, attachmentBase64, attachmentFilename } = req.body;

    if (!recipient || !content) {
      return res.status(400).json({ success: false, message: 'recipient and content parameters are required' });
    }

    const log = await communicationService.sendWhatsApp(
      shopId,
      recipient,
      content,
      req.user?.id || '',
      customerId,
      messageType || 'CUSTOM',
      attachmentBase64,
      attachmentFilename
    );

    return res.status(200).json({
      success: true,
      message: log.status === 'SENT' ? 'WhatsApp message dispatched successfully' : 'WhatsApp message failed to send',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

// Notifications dropdown
export const getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const list = await notificationService.getNotifications(shopId);
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const success = await notificationService.markAsRead(id, shopId);
    return res.status(200).json({ success, message: success ? 'Notification read status updated' : 'Read patch failed' });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const success = await notificationService.markAllAsRead(shopId);
    return res.status(200).json({ success, message: success ? 'All notifications marked read' : 'Read all failed' });
  } catch (error) {
    next(error);
  }
};
