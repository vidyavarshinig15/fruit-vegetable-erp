import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { createCustomerSchema, updateCustomerSchema, createNoteSchema, createDocumentSchema, createContactLogSchema } from '../validators/customer.validator.js';
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

// Helper to resolve user full name from repository
const getUserName = async (req: AuthenticatedRequest): Promise<string> => {
  if (!req.user?.id) return 'System';
  const userRecord = await userRepository.findById(req.user.id);
  return userRecord ? userRecord.fullName : 'System';
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const {
      search,
      businessType,
      status,
      city,
      area,
      outstandingOnly,
      page,
      limit,
    } = req.query;

    const filters = {
      search: typeof search === 'string' ? search : undefined,
      businessType: businessType as any,
      status: status as any,
      city: typeof city === 'string' ? city : undefined,
      area: typeof area === 'string' ? area : undefined,
      outstandingOnly: outstandingOnly === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10000,
    };

    const result = await customerRepository.findAll(shopId, filters);

    return res.status(200).json({
      success: true,
      message: 'Customers list retrieved',
      data: result.customers,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    // Security: Prevent direct URL access to another shop's customer
    if (customer.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: This customer belongs to a different shop and cannot be viewed here',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer details retrieved',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const validated = createCustomerSchema.parse(req.body);
    const userName = await getUserName(req);
    const customer = await customerRepository.create(shopId, validated, userName);

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: customer,
    });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_BUSINESS_NAME') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Business Name: A customer with this trade name already exists in this shop.',
        error: { code: 'DUPLICATE_BUSINESS_NAME' },
      });
    }
    if (error.message === 'DUPLICATE_MOBILE_NUMBER') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Mobile Number: This phone number is already registered under another account in this shop.',
        error: { code: 'DUPLICATE_MOBILE_NUMBER' },
      });
    }
    if (error.message === 'DUPLICATE_WHATSAPP_NUMBER') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate WhatsApp Number: This WhatsApp number is already registered under another account in this shop.',
        error: { code: 'DUPLICATE_WHATSAPP_NUMBER' },
      });
    }
    next(error);
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    if (customer.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Customer data isolation breach',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    const validated = updateCustomerSchema.parse(req.body);
    const userName = await getUserName(req);
    const updated = await customerRepository.update(id, validated, userName);

    return res.status(200).json({
      success: true,
      message: 'Customer profile updated successfully',
      data: updated,
    });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_BUSINESS_NAME') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Business Name: Already exists in this shop.',
        error: { code: 'DUPLICATE_BUSINESS_NAME' },
      });
    }
    if (error.message === 'DUPLICATE_MOBILE_NUMBER') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Mobile Number: Already registered.',
        error: { code: 'DUPLICATE_MOBILE_NUMBER' },
      });
    }
    if (error.message === 'DUPLICATE_WHATSAPP_NUMBER') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate WhatsApp Number: Already registered.',
        error: { code: 'DUPLICATE_WHATSAPP_NUMBER' },
      });
    }
    next(error);
  }
};

export const archiveCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    if (customer.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Customer data isolation breach',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    const userName = await getUserName(req);
    await customerRepository.archive(id, userName);

    return res.status(200).json({
      success: true,
      message: 'Customer archived successfully (Soft Delete complete)',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const activateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    if (customer.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Customer data isolation breach',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    const userName = await getUserName(req);
    await customerRepository.activate(id, userName);

    return res.status(200).json({
      success: true,
      message: 'Customer activated successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const addNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer || customer.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    const { text } = createNoteSchema.parse(req.body);
    const userRecord = req.user ? await userRepository.findById(req.user.id) : null;
    const note = await customerRepository.addNote(id, text, {
      email: req.user?.email || '',
      fullName: userRecord?.fullName || 'System',
    });

    return res.status(201).json({
      success: true,
      message: 'Internal note added',
      data: note,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Only admins or super admins can delete notes
    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can edit or delete internal customer notes',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id, noteId } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer || customer.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    const userName = await getUserName(req);
    const deleted = await customerRepository.deleteNote(id, noteId, userName);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
        error: { code: 'NOTE_NOT_FOUND' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Internal note deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer || customer.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    const { type, name, filePath } = createDocumentSchema.parse(req.body);
    const userName = await getUserName(req);
    const doc = await customerRepository.uploadDocument(id, type, name, filePath, userName);

    return res.status(201).json({
      success: true,
      message: 'Document stored in customer profile',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const addContactHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const customer = await customerRepository.findById(id);

    if (!customer || customer.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    const { type, remarks, date } = createContactLogSchema.parse(req.body);
    const userName = await getUserName(req);
    const contact = await customerRepository.addContactHistory(
      id,
      type,
      remarks,
      date || new Date().toISOString(),
      userName
    );

    return res.status(201).json({
      success: true,
      message: 'Discussion history logged successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};
