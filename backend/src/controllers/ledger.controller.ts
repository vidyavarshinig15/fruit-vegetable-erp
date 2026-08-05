import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { ledgerRepository } from '../repositories/ledger.repository.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { manualAdjustmentSchema } from '../validators/ledger.validator.js';
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

export const getLedgerTimeline = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { search, customerId, transactionType, startDate, endDate, page, limit } = req.query;

    const filters = {
      search: typeof search === 'string' ? search : undefined,
      customerId: typeof customerId === 'string' ? customerId : undefined,
      transactionType: transactionType as any,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    };

    const result = await ledgerRepository.findAllLedgerEntries(shopId, filters);

    return res.status(200).json({
      success: true,
      message: 'Customer ledger entries retrieved successfully',
      data: result.entries,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerStatement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { customerId, startDate, endDate } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Missing required customerId query parameter',
        error: { code: 'MISSING_CUSTOMER_ID' },
      });
    }

    if (!startDate || typeof startDate !== 'string' || !endDate || typeof endDate !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Statement generation requires startDate and endDate range query parameters',
        error: { code: 'MISSING_DATE_RANGE' },
      });
    }

    // Confirm customer matches shop context
    const customer = await customerRepository.findById(customerId);
    if (!customer || customer.shopId !== shopId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer account mapping for statement',
        error: { code: 'INVALID_CUSTOMER_SHOP' },
      });
    }

    const statement = await ledgerRepository.getCustomerStatement(shopId, customerId, startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Period customer statement compiled successfully',
      data: {
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        transactions: statement.transactions,
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const recordManualAdjustment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Authorized manual adjustments check (restricted to Super Admin / Admin roles only)
    if (req.user && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators are authorized to execute manual ledger adjustments.',
        error: { code: 'FORBIDDEN_ROLE_ACTION' },
      });
    }

    const validated = manualAdjustmentSchema.parse(req.body);

    const customer = await customerRepository.findById(validated.customerId);
    if (!customer || customer.shopId !== shopId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer context mapping',
        error: { code: 'INVALID_CUSTOMER_SHOP' },
      });
    }

    const isDebit = validated.type === 'DEBIT';
    const todayStr = new Date().toISOString().split('T')[0];

    // Record ledger entry (JS logic automatically updates customer outstanding balance too)
    const entry = await ledgerRepository.createLedgerEntry(shopId, {
      customerId: validated.customerId,
      transactionDate: todayStr,
      transactionType: isDebit ? 'ADJUSTMENT_DEBIT' : 'ADJUSTMENT_CREDIT',
      description: `Manual Adjustment: ${validated.reason}`,
      debitAmount: isDebit ? validated.amount : 0.00,
      creditAmount: isDebit ? 0.00 : validated.amount,
    }, req.user?.id || '');

    // Log adjustment detail audit trail
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: shopId,
        user_id: req.user?.id,
        action_type: 'MANUAL_ADJUSTMENT',
        description: `Recorded manual ledger adjustment of ₹${validated.amount} (${validated.type}) for customer ${customer.name}. Reason: ${validated.reason}`,
        created_at: new Date().toISOString(),
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Manual ledger adjustment recorded and customer outstanding balance synchronized successfully',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerOutstandingSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { customerId } = req.params;
    const summary = await ledgerRepository.getCustomerOutstandingSummary(shopId, customerId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Customer summary not found',
        error: { code: 'CUSTOMER_NOT_FOUND' },
      });
    }

    const overdue = await ledgerRepository.getCustomerOverdueInvoices(customerId);
    const aging = await ledgerRepository.getAgingReportData(customerId);

    return res.status(200).json({
      success: true,
      message: 'Customer outstanding summaries loaded',
      data: {
        summary,
        overdue,
        aging,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLedgerDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    // Load active customers of this shop context
    const customers = await db.query(`customers?shop_id=eq.${shopId}&is_deleted=eq.false`);

    let totalOutstanding = 0.00;
    let totalAdvance = 0.00;
    let overdueCount = 0;
    let holdCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    let todayCollections = 0.00;

    for (const cust of customers) {
      const bal = Number(cust.current_balance);
      if (bal > 0) {
        totalOutstanding += bal;
      } else {
        totalAdvance += Math.abs(bal);
      }

      if (bal > Number(cust.credit_limit) && Number(cust.credit_limit) > 0) {
        holdCount++;
      }

      // Check if they have overdue invoices
      const overdueList = await ledgerRepository.getCustomerOverdueInvoices(cust.id);
      if (overdueList.length > 0) {
        overdueCount++;
      }
    }

    // Query today's payments collections
    const payments = await db.query(`payments?shop_id=eq.${shopId}&is_deleted=eq.false&status=eq.active`);
    const todayPayments = payments.filter((p) => p.payment_date === todayStr);
    todayCollections = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0.00);

    // Highest outstanding customers
    const sortedHoldings = [...customers]
      .filter((c) => Number(c.current_balance) > 0)
      .sort((a, b) => Number(b.current_balance) - Number(a.current_balance))
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        code: c.customer_code,
        outstanding: Number(c.current_balance),
        creditLimit: Number(c.credit_limit),
      }));

    return res.status(200).json({
      success: true,
      message: 'Ledger dashboard aggregations generated successfully',
      data: {
        totalOutstanding,
        totalAdvanceBalance: totalAdvance,
        overdueCustomersCount: overdueCount,
        creditHoldCustomersCount: holdCount,
        highestOutstandingCustomers: sortedHoldings,
        todayCollections,
      },
    });
  } catch (error) {
    next(error);
  }
};
