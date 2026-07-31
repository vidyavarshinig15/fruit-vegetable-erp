import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { createInvoiceSchema, updateInvoiceStatusSchema } from '../validators/invoice.validator.js';
import { ShopId, UserRole } from '@raju-billing/shared';

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

// Helper to resolve user name dynamically from repository
const getUserDetails = async (req: AuthenticatedRequest) => {
  if (!req.user?.id) return { id: '', fullName: 'System' };
  const userRecord = await userRepository.findById(req.user.id);
  return {
    id: req.user.id,
    fullName: userRecord ? userRecord.fullName : 'System',
  };
};

export const getInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { search, customerId, paymentStatus, billStatus, startDate, endDate, page, limit } = req.query;

    const filters = {
      search: typeof search === 'string' ? search : undefined,
      customerId: typeof customerId === 'string' ? customerId : undefined,
      paymentStatus: paymentStatus as any,
      billStatus: billStatus as any,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 15) : 50,
    };

    const result = await invoiceRepository.findAllInvoices(shopId, filters);

    return res.status(200).json({
      success: true,
      message: 'Invoices list retrieved successfully',
      data: result.invoices,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const invoice = await invoiceRepository.findInvoiceById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        error: { code: 'INVOICE_NOT_FOUND' },
      });
    }

    if (invoice.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invoice data isolation breach',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Invoice details retrieved successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const validated = createInvoiceSchema.parse(req.body);
    
    // Verify customer exists and matches active shop context
    const customer = await customerRepository.findById(validated.customerId);
    if (!customer || customer.shopId !== shopId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Customer Context: Customer does not exist or belongs to a different shop.',
        error: { code: 'INVALID_CUSTOMER_SHOP' },
      });
    }

    const user = await getUserDetails(req);
    const invoice = await invoiceRepository.createInvoice(shopId, validated, user.id);

    return res.status(201).json({
      success: true,
      message: 'Invoice generated and locked successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Only Admin or Super Admin roles can cancel invoices
    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can cancel invoices.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const { id } = req.params;
    const invoice = await invoiceRepository.findInvoiceById(id);

    if (!invoice || invoice.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        error: { code: 'INVOICE_NOT_FOUND' },
      });
    }

    const user = await getUserDetails(req);
    await invoiceRepository.cancelInvoice(id, user.id, user.fullName);

    return res.status(200).json({
      success: true,
      message: 'Invoice cancelled successfully. Customer balance reverted.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
