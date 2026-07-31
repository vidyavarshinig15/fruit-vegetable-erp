import { ShopId, Payment, PaymentReceipt, CreatePaymentDTO, PaymentFilterQuery, PaymentMode, mapModeToEnum } from '@raju-billing/shared';
import { db } from '../database/index.js';
import { ledgerRepository } from './ledger.repository.js';
import { notificationService } from '../services/notification.service.js';

export const mapDbToPayment = (dbRow: any, createdByName = 'System'): Payment => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    customerId: dbRow.customer_id,
    invoiceId: dbRow.invoice_id || null,
    paymentNumber: dbRow.payment_number,
    paymentDate: dbRow.payment_date,
    amount: Number(dbRow.amount),
    paymentMode: dbRow.payment_mode as PaymentMode,
    referenceNumber: dbRow.reference_number || null,
    notes: dbRow.notes || '',
    status: dbRow.status,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
    createdByName,
  };
};

export const mapDbToReceipt = (dbRow: any): PaymentReceipt => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    paymentId: dbRow.payment_id,
    customerId: dbRow.customer_id,
    receiptNumber: dbRow.receipt_number,
    receiptDate: dbRow.receipt_date,
    totalPaid: Number(dbRow.total_paid),
    balanceRemaining: Number(dbRow.balance_remaining),
    receiptPdfUrl: dbRow.receipt_pdf_url || null,
    status: dbRow.status,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
};

class PaymentRepository {

  async findPaymentById(id: string): Promise<Payment | null> {
    const rows = await db.query(`payments?id=eq.${id}`);
    if (rows.length === 0) return null;
    return mapDbToPayment(rows[0], 'Wholesale Operator');
  }

  async findReceiptByPaymentId(paymentId: string): Promise<PaymentReceipt | null> {
    const rows = await db.query(`payment_receipts?payment_id=eq.${paymentId}`);
    return rows.length > 0 ? mapDbToReceipt(rows[0]) : null;
  }

  private async generateNextPaymentAndReceiptNumbers(shopId: ShopId): Promise<{ paymentNum: string; receiptNum: string }> {
    let shopCode = 'RAJ';
    let receiptPrefix = 'RAJR';
    let paymentPrefix = 'RAJP';

    if (shopId === ShopId.G_R_FRUITS_AND_VEGETABLES) {
      shopCode = 'GR';
      receiptPrefix = 'GRR';
      paymentPrefix = 'GRP';
    } else if (shopId === ShopId.PRIYAKRISHNA_FRUITS_AND_VEGETABLES) {
      shopCode = 'PK';
      receiptPrefix = 'PKR';
      paymentPrefix = 'PKP';
    }

    const currentYear = new Date().getFullYear();
    const payPattern = `${paymentPrefix}-${currentYear}-`;
    const recPattern = `${receiptPrefix}-${currentYear}-`;

    // Query counts
    const paymentsExist = await db.query(`payments?shop_id=eq.${shopId}&payment_number=ilike.${payPattern}*`);
    const receiptsExist = await db.query(`payment_receipts?shop_id=eq.${shopId}&receipt_number=ilike.${recPattern}*`);

    const payCount = paymentsExist.length + 1;
    const recCount = receiptsExist.length + 1;

    return {
      paymentNum: `${payPattern}${String(payCount).padStart(6, '0')}`,
      receiptNum: `${recPattern}${String(recCount).padStart(6, '0')}`,
    };
  }

  async findAllPayments(shopId: ShopId, query: PaymentFilterQuery = {}): Promise<{ payments: Payment[]; total: number }> {
    const rows = await db.query(`payments?shop_id=eq.${shopId}&is_deleted=eq.false`);
    let list = rows.map((r) => mapDbToPayment(r, 'Wholesale Operator'));

    if (query.customerId) {
      list = list.filter((p) => p.customerId === query.customerId);
    }
    if (query.invoiceId) {
      list = list.filter((p) => p.invoiceId === query.invoiceId);
    }
    if (query.paymentMode) {
      list = list.filter((p) => p.paymentMode === query.paymentMode);
    }
    if (query.startDate) {
      const start = new Date(query.startDate).getTime();
      list = list.filter((p) => new Date(p.paymentDate).getTime() >= start);
    }
    if (query.endDate) {
      const end = new Date(query.endDate).getTime();
      list = list.filter((p) => new Date(p.paymentDate).getTime() <= end);
    }

    if (query.search) {
      const s = query.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.paymentNumber.toLowerCase().includes(s) ||
          (p.referenceNumber && p.referenceNumber.toLowerCase().includes(s))
      );
    }

    // Sort: newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const startIndex = (page - 1) * limit;

    const paginated = list.slice(startIndex, startIndex + limit);
    return { payments: paginated, total };
  }

  async createPayment(shopId: ShopId, dto: CreatePaymentDTO, userId: string): Promise<Payment> {
    const { paymentNum, receiptNum } = await this.generateNextPaymentAndReceiptNumbers(shopId);

    // Call Supabase PL/pgSQL transaction stored procedure (record_payment_rpc)
    const result = await db.query('rpc/record_payment_rpc', {
      method: 'POST',
      body: {
        p_shop_id: shopId,
        p_customer_id: dto.customerId,
        p_invoice_id: dto.invoiceId || null,
        p_payment_number: paymentNum,
        p_receipt_number: receiptNum,
        p_payment_date: dto.paymentDate,
        p_amount: dto.amount,
        p_payment_mode: mapModeToEnum(dto.paymentMode),
        p_reference_number: dto.referenceNumber || null,
        p_notes: dto.notes || '',
        p_created_by: userId,
      },
    });

    const paymentId = (result as any) as string;

    const created = await this.findPaymentById(paymentId);
    if (!created) {
      throw new Error('Failed to retrieve payment after transactional RPC execution.');
    }

    // Automatically record ledger credit entry
    await ledgerRepository.createLedgerEntry(shopId, {
      customerId: dto.customerId,
      transactionDate: dto.paymentDate,
      transactionType: 'PAYMENT',
      referenceId: created.id,
      referenceNumber: created.paymentNumber,
      description: `Payment Received: ${created.paymentNumber} (${created.paymentMode})`,
      debitAmount: 0.00,
      creditAmount: created.amount,
    }, userId);

    // Enqueue payment notification
    await notificationService.createNotification(
      shopId,
      'Payment Received',
      `Payment reference ${created.paymentNumber} of ₹${created.amount} has been received.`,
      'SUCCESS',
      `/payments/${created.id}`
    );

    return created;
  }

  async cancelPayment(id: string, userId: string): Promise<boolean> {
    const payment = await this.findPaymentById(id);
    if (!payment) return false;
    if (payment.status === 'cancelled') return true;

    // 1. Soft-delete Payment and Receipt records
    await db.query(`payments?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        status: 'cancelled',
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      }
    });

    await db.query(`payment_receipts?payment_id=eq.${id}`, {
      method: 'PATCH',
      body: {
        status: 'cancelled',
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      }
    });

    // 2. Revert Invoice balances if linked
    if (payment.invoiceId) {
      const invoiceRows = await db.query(`invoices?id=eq.${payment.invoiceId}`);
      if (invoiceRows.length > 0) {
        const inv = invoiceRows[0];
        const newPaid = Number(inv.paid_amount) - payment.amount;
        const newBalance = Number(inv.balance_amount) + payment.amount;
        const newStatus = newPaid === 0 ? 'UNPAID' : 'PARTIALLY_PAID';

        await db.query(`invoices?id=eq.${payment.invoiceId}`, {
          method: 'PATCH',
          body: {
            paid_amount: newPaid,
            balance_amount: newBalance,
            payment_status: newStatus,
            updated_by: userId || null,
            updated_at: new Date().toISOString(),
          }
        });
      }
    }

    // 3. Revert Customer Outstanding Balance via ledger debit adjustment entry
    await ledgerRepository.createLedgerEntry(payment.shopId, {
      customerId: payment.customerId,
      transactionDate: new Date().toISOString().split('T')[0],
      transactionType: 'ADJUSTMENT_DEBIT',
      referenceId: payment.id,
      referenceNumber: payment.paymentNumber,
      description: `Payment Cancelled: ${payment.paymentNumber}`,
      debitAmount: payment.amount,
      creditAmount: 0.00,
    }, userId);

    // 4. Log Activity
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: payment.shopId,
        user_id: userId,
        action: 'PAYMENT_CANCELLED',
        details: `Cancelled payment reference ${payment.paymentNumber}. Added back ₹${payment.amount} to outstanding balance.`,
        created_at: new Date().toISOString(),
      }
    });

    // Enqueue payment cancellation notification
    await notificationService.createNotification(
      payment.shopId,
      'Payment Cancelled',
      `Payment reference ${payment.paymentNumber} of ₹${payment.amount} was cancelled.`,
      'ALERT',
      `/payments/${payment.id}`
    );

    return true;
  }
}

export const paymentRepository = new PaymentRepository();
