import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { createPaymentSchema, updatePaymentSchema } from '../validators/payment.validator.js';
import { ShopId, UserRole } from '@raju-billing/shared';
import { db } from '../database/index.js';

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

export const getPaymentsList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { search, customerId, invoiceId, paymentMode, startDate, endDate, page, limit } = req.query;

    const filters = {
      search: typeof search === 'string' ? search : undefined,
      customerId: typeof customerId === 'string' ? customerId : undefined,
      invoiceId: typeof invoiceId === 'string' ? invoiceId : undefined,
      paymentMode: paymentMode as any,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    };

    const result = await paymentRepository.findAllPayments(shopId, filters);

    return res.status(200).json({
      success: true,
      message: 'Payments queue list retrieved successfully',
      data: result.payments,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const payment = await paymentRepository.findPaymentById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
        error: { code: 'PAYMENT_NOT_FOUND' },
      });
    }

    if (payment.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cross-shop data breach prevented',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    const receipt = await paymentRepository.findReceiptByPaymentId(id);
    const customer = await customerRepository.findById(payment.customerId);

    return res.status(200).json({
      success: true,
      message: 'Payment and receipt details loaded successfully',
      data: {
        payment,
        receipt,
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const validated = createPaymentSchema.parse(req.body);

    // 1. Confirm customer exists and belongs to the shop context
    const customer = await customerRepository.findById(validated.customerId);
    if (!customer || customer.shopId !== shopId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer context mapping',
        error: { code: 'INVALID_CUSTOMER_SHOP' },
      });
    }

    // 2. Validate Invoice if present
    if (validated.invoiceId) {
      const invoice = await invoiceRepository.findInvoiceById(validated.invoiceId);
      if (!invoice || invoice.shopId !== shopId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invoice context mapping',
          error: { code: 'INVALID_INVOICE_SHOP' },
        });
      }

      if (invoice.customerId !== validated.customerId) {
        return res.status(400).json({
          success: false,
          message: 'Invoice belongs to a different customer',
          error: { code: 'CUSTOMER_INVOICE_MISMATCH' },
        });
      }

      if (invoice.billStatus === 'CANCELLED' || invoice.paymentStatus === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot record payments against cancelled invoices.',
          error: { code: 'INVOICE_CANCELLED' },
        });
      }

      if (invoice.paymentStatus === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'This invoice is already fully paid.',
          error: { code: 'INVOICE_FULLY_PAID' },
        });
      }

      if (validated.amount > invoice.balanceAmount) {
        return res.status(400).json({
          success: false,
          message: `Payment amount ₹${validated.amount} exceeds the outstanding balance ₹${invoice.balanceAmount} of this invoice.`,
          error: { code: 'EXCEEDS_INVOICE_BALANCE' },
        });
      }
    }

    // 3. Duplicate transaction reference check (UPI, Cheque, Bank Transfer references)
    if (validated.referenceNumber) {
      const existing = await db.query(
        `payments?shop_id=eq.${shopId}&reference_number=eq.${validated.referenceNumber}&status=eq.active`
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate reference: A payment transaction with reference number "${validated.referenceNumber}" is already registered.`,
          error: { code: 'DUPLICATE_REFERENCE_NUMBER' },
        });
      }
    }

    // 4. Record transaction in database calling RPC
    const payment = await paymentRepository.createPayment(shopId, validated, req.user?.id || '');

    return res.status(201).json({
      success: true,
      message: 'Payment recorded and receipt generated successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelPaymentRecord = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // 1. Authorized users check (Admin / Super Admin roles only)
    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators are authorized to cancel financial payments.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const { id } = req.params;
    const payment = await paymentRepository.findPaymentById(id);

    if (!payment || payment.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
        error: { code: 'PAYMENT_NOT_FOUND' },
      });
    }

    if (payment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This payment has already been cancelled.',
        error: { code: 'PAYMENT_ALREADY_CANCELLED' },
      });
    }

    await paymentRepository.cancelPayment(id, req.user?.id || '');

    return res.status(200).json({
      success: true,
      message: 'Payment cancelled, receipt voided, and customer outstanding balance restored successfully.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
