import { ShopId, Invoice, InvoiceItem, CreateInvoiceDTO, InvoiceFilterQuery, PaymentStatus, BillStatus, mapUnitToEnum } from '@raju-billing/shared';
import { db } from '../database/index.js';
import { ledgerRepository } from './ledger.repository.js';
import { notificationService } from '../services/notification.service.js';

// Mappers from SQL snake_case fields to Typescript camelCase fields
export const mapDbToInvoiceItem = (dbRow: any): InvoiceItem => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    invoiceId: dbRow.invoice_id,
    productId: dbRow.product_id,
    productName: dbRow.product_name,
    unitType: dbRow.unit_type,
    quantity: Number(dbRow.quantity),
    unitPrice: Number(dbRow.unit_price),
    totalPrice: Number(dbRow.total_price),
    itemNotes: dbRow.item_notes || '',
    status: dbRow.status,
    createdAt: dbRow.created_at,
  };
};

export const mapDbToInvoice = (dbRow: any): Invoice => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    customerId: dbRow.customer_id,
    invoiceNumber: dbRow.invoice_number,
    invoiceDate: dbRow.invoice_date,
    dueDate: dbRow.due_date || null,
    subtotalAmount: Number(dbRow.subtotal_amount),
    totalAmount: Number(dbRow.total_amount),
    paidAmount: Number(dbRow.paid_amount),
    balanceAmount: Number(dbRow.balance_amount),
    paymentStatus: dbRow.payment_status as PaymentStatus,
    billStatus: dbRow.bill_status as BillStatus,
    pdfUrl: dbRow.pdf_url || null,
    printCount: dbRow.print_count ?? 0,
    lastPrintedAt: dbRow.last_printed_at || null,
    notes: dbRow.notes || '',
    status: dbRow.status,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
};

class InvoiceRepository {

  async findInvoiceById(id: string): Promise<Invoice | null> {
    const rows = await db.query(`invoices?id=eq.${id}`);
    if (rows.length === 0) return null;

    const invoice = mapDbToInvoice(rows[0]);
    
    // Fetch line items
    const itemRows = await db.query(`invoice_items?invoice_id=eq.${id}&is_deleted=eq.false`);
    invoice.items = itemRows.map(mapDbToInvoiceItem);

    return invoice;
  }

  private async generateNextInvoiceNumber(shopId: ShopId): Promise<string> {
    // 1. Get Shop Code
    let shopCode = 'RAJ';
    if (shopId === ShopId.G_R_FRUITS_AND_VEGETABLES) {
      shopCode = 'GR';
    } else if (shopId === ShopId.PRIYAKRISHNA_FRUITS_AND_VEGETABLES) {
      shopCode = 'PK';
    }

    const currentYear = new Date().getFullYear();
    const pattern = `${shopCode}-${currentYear}-`;

    // Query invoices count for this year
    const existing = await db.query(`invoices?shop_id=eq.${shopId}&invoice_number=ilike.${pattern}*`);
    const count = existing.length + 1;

    return `${pattern}${String(count).padStart(6, '0')}`;
  }

  async findAllInvoices(shopId: ShopId, query: InvoiceFilterQuery = {}): Promise<{ invoices: Invoice[]; total: number }> {
    const rows = await db.query(`invoices?shop_id=eq.${shopId}&is_deleted=eq.false`);
    let list = rows.map(mapDbToInvoice);

    if (query.customerId) {
      list = list.filter((i) => i.customerId === query.customerId);
    }
    if (query.billStatus) {
      list = list.filter((i) => i.billStatus === query.billStatus);
    }
    if (query.paymentStatus) {
      list = list.filter((i) => i.paymentStatus === query.paymentStatus);
    }
    if (query.startDate) {
      const start = new Date(query.startDate).getTime();
      list = list.filter((i) => new Date(i.invoiceDate).getTime() >= start);
    }
    if (query.endDate) {
      const end = new Date(query.endDate).getTime();
      list = list.filter((i) => new Date(i.invoiceDate).getTime() <= end);
    }

    if (query.search) {
      const s = query.search.toLowerCase().trim();
      // Search inside invoice numbers
      list = list.filter((i) => i.invoiceNumber.toLowerCase().includes(s));
    }

    // Sort: newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const startIndex = (page - 1) * limit;

    const paginated = list.slice(startIndex, startIndex + limit);

    // Fetch items count / map line items if needed
    return { invoices: paginated, total };
  }

  async createInvoice(shopId: ShopId, dto: CreateInvoiceDTO, userId: string): Promise<Invoice> {
    const nextInvoiceNumber = await this.generateNextInvoiceNumber(shopId);

    // Calculate subtotal & total (strictly NET, no taxes or discounts)
    let subtotal = 0;
    const mappedItems = dto.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      return {
        product_id: item.productId,
        product_name: item.productName,
        unit_type: mapUnitToEnum(item.unitType),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: lineTotal,
      };
    });

    const body = {
      p_shop_id: shopId,
      p_customer_id: dto.customerId,
      p_invoice_number: nextInvoiceNumber,
      p_invoice_date: dto.invoiceDate,
      p_due_date: dto.dueDate || null,
      p_subtotal: subtotal,
      p_total: subtotal, // Net wholesale total matches subtotal
      p_notes: dto.notes || '',
      p_created_by: userId,
      p_items: mappedItems,
    };

    // Call Supabase PL/pgSQL transaction stored procedure (generate_invoice_rpc)
    const result = await db.query('rpc/generate_invoice_rpc', {
      method: 'POST',
      body,
    });

    // The RPC returns the generated UUID
    const invoiceId = (result as any) as string;

    const created = await this.findInvoiceById(invoiceId);
    if (!created) {
      throw new Error('Failed to retrieve created invoice after transactional RPC execution.');
    }

    // Automatically record ledger debit entry
    await ledgerRepository.createLedgerEntry(shopId, {
      customerId: dto.customerId,
      transactionDate: dto.invoiceDate,
      transactionType: 'INVOICE',
      referenceId: created.id,
      referenceNumber: created.invoiceNumber,
      description: `Invoice Generated: ${created.invoiceNumber}`,
      debitAmount: created.totalAmount,
      creditAmount: 0.00,
    }, userId);

    // Enqueue invoice generation alert
    await notificationService.createNotification(
      shopId,
      'Invoice Generated',
      `Invoice ${created.invoiceNumber} has been generated for amount of ₹${created.totalAmount}.`,
      'SUCCESS',
      `/billing/invoices/${created.id}`
    );

    return created;
  }

  async cancelInvoice(id: string, userId: string, userName: string): Promise<boolean> {
    const invoice = await this.findInvoiceById(id);
    if (!invoice) return false;
    if (invoice.billStatus === 'CANCELLED') return true;

    // 1. Update Invoice status columns in database
    await db.query(`invoices?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        bill_status: 'CANCELLED',
        payment_status: 'CANCELLED',
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      }
    });

    // 2. Revert Customer Outstanding Balance via ledger credit adjustment entry
    await ledgerRepository.createLedgerEntry(invoice.shopId, {
      customerId: invoice.customerId,
      transactionDate: new Date().toISOString().split('T')[0],
      transactionType: 'ADJUSTMENT_CREDIT',
      referenceId: invoice.id,
      referenceNumber: invoice.invoiceNumber,
      description: `Invoice Cancelled: ${invoice.invoiceNumber}`,
      debitAmount: 0.00,
      creditAmount: invoice.totalAmount,
    }, userId);

    // 3. Log Activity
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: invoice.shopId,
        user_id: userId,
        action: 'INVOICE_CANCELLED',
        details: `Cancelled invoice ${invoice.invoiceNumber}. Deducted dues ₹${invoice.totalAmount} from customer outstanding balance.`,
        created_at: new Date().toISOString(),
      }
    });

    // Enqueue invoice cancellation alert
    await notificationService.createNotification(
      invoice.shopId,
      'Invoice Cancelled',
      `Invoice ${invoice.invoiceNumber} of ₹${invoice.totalAmount} has been cancelled.`,
      'WARNING',
      `/billing/invoices/${invoice.id}`
    );

    return true;
  }
}

export const invoiceRepository = new InvoiceRepository();
