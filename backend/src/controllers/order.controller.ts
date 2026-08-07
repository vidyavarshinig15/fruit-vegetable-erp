import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { orderRepository } from '../repositories/order.repository.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { uploadOrderSchema, verifyOrderItemsSchema } from '../validators/order.validator.js';
import { ShopId, UserRole } from '@raju-billing/shared';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { db } from '../database/index.js';
import { parsePdfContent } from '../utils/pdfParser.js';

// Helper to validate active shop context access
const validateShopContext = (req: AuthenticatedRequest, res: Response): ShopId | null => {
  const activeShopId = req.headers['x-shop-id'] as ShopId;
  if (!activeShopId) {
    res.status(400).json({
      success: false,
      message: 'Missing X-Shop-Id context header',
      error: { code: 'MISSING_SHOP_CONTEXT' },
    });
    return null;
  }

  // Cross-shop validation check
  if (req.user && req.user.role !== UserRole.SUPER_ADMIN) {
    if (!req.user.assignedShopIds.includes(activeShopId)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permissions to access this shop context',
        error: { code: 'FORBIDDEN_SHOP_CONTEXT' },
      });
      return null;
    }
  }

  return activeShopId;
};

export const getOrdersList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { search, customerId, status, page, limit } = req.query;

    const filters = {
      search: typeof search === 'string' ? search : undefined,
      customerId: typeof customerId === 'string' ? customerId : undefined,
      status: status as any,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    };

    const result = await orderRepository.findAllOrders(shopId, filters);

    return res.status(200).json({
      success: true,
      message: 'Orders queue list retrieved successfully',
      data: result.orders,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const order = await orderRepository.findOrderById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order document not found',
        error: { code: 'ORDER_NOT_FOUND' },
      });
    }

    if (order.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Order isolation breach',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order details and OCR raw text retrieved',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadOrderDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const validated = uploadOrderSchema.parse(req.body);

    // Confirm customer exists and belongs to the shop context
    const customer = await customerRepository.findById(validated.customerId);
    if (!customer || customer.shopId !== shopId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Customer context mapping',
        error: { code: 'INVALID_CUSTOMER_SHOP' },
      });
    }

    const order = await orderRepository.saveUploadedOrder(
      shopId,
      validated.customerId,
      validated.fileName,
      validated.fileType,
      validated.fileSizeBytes,
      validated.fileData,
      req.user?.id || ''
    );

    return res.status(201).json({
      success: true,
      message: 'Order file uploaded and matched successfully',
      data: order,
    });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_ORDER_UPLOAD') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate upload: An order file with this description has already been uploaded for this buyer customer today.',
        error: { code: 'DUPLICATE_ORDER_UPLOAD' },
      });
    }
    next(error);
  }
};

export const verifyOrderItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const order = await orderRepository.findOrderById(id);

    if (!order || order.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Order document not found',
        error: { code: 'ORDER_NOT_FOUND' },
      });
    }

    const validated = verifyOrderItemsSchema.parse(req.body);
    const updated = await orderRepository.verifyAndSaveOrderItems(
      id,
      validated.items,
      validated.notes || null,
      req.user?.id || ''
    );

    return res.status(200).json({
      success: true,
      message: 'OCR order items verified and matching status confirmed',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrderDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Only Admin / Super Admin roles can delete order documents
    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can delete uploaded files.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const { id } = req.params;
    const order = await orderRepository.findOrderById(id);

    if (!order || order.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: { code: 'ORDER_NOT_FOUND' },
      });
    }

    await orderRepository.deleteUploadedOrder(id, req.user?.id || '');

    return res.status(200).json({
      success: true,
      message: 'Order file deleted and metadata archived successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { orders } = await orderRepository.findAllOrders(shopId);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));

    const totalUploadedToday = todayOrders.length;
    const waitingVerification = orders.filter((o) => o.ocrStatus === 'VERIFICATION_PENDING').length;
    const totalVerified = orders.filter((o) => o.ocrStatus === 'VERIFIED').length;
    const invoicesGenerated = orders.filter((o) => o.ocrStatus === 'INVOICE_GENERATED').length;
    const failedOcr = orders.filter((o) => o.ocrStatus === 'CANCELLED').length; // Mock failed state mapped to cancelled

    return res.status(200).json({
      success: true,
      message: 'OCR Order statistics aggregated successfully',
      data: {
        ordersUploadedToday: totalUploadedToday,
        ordersWaitingVerification: waitingVerification,
        ordersVerified: totalVerified,
        invoicesGeneratedFromOcr: invoicesGenerated,
        failedOcrProcessing: failedOcr,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const linkOrderToInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const { invoiceId } = req.body;

    const order = await orderRepository.findOrderById(id);
    if (!order || order.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: { code: 'ORDER_NOT_FOUND' },
      });
    }

    await orderRepository.markOrderInvoiceGenerated(id, invoiceId, req.user?.id || '');

    return res.status(200).json({
      success: true,
      message: 'Order successfully linked to processed invoice reference',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const scanOrderSchema = z.object({
  customerId: z.string().optional(),
  fileName: z.string(),
  fileType: z.string(),
  fileSizeBytes: z.number(),
  fileData: z.string(),
});

export const scanOrderDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const validated = scanOrderSchema.parse(req.body);
    const buffer = Buffer.from(validated.fileData, 'base64');
    const productsRes = await db.query(`products?shop_id=eq.${shopId}&status=eq.active&is_deleted=eq.false`);

    let rawExtracted: any[] = [];
    let parsedSuccess = false;

    if (validated.fileType === 'application/pdf') {
      try {
        const extracted = await parsePdfContent(buffer);
        if (extracted.length > 0) {
          rawExtracted = extracted;
          parsedSuccess = true;
        }
      } catch (e) {
        console.error('Failed to scan PDF using pdf-parse:', e);
      }
    }

    if (!parsedSuccess) {
      rawExtracted = orderRepository.simulateOcrExtraction(validated.fileName, productsRes);
    }

    const matchedItems = await orderRepository.matchOcrItemsToShopCatalog(shopId, validated.customerId, rawExtracted);

    return res.status(200).json({
      success: true,
      message: 'Document scanned successfully',
      data: matchedItems,
    });
  } catch (error) {
    next(error);
  }
};
