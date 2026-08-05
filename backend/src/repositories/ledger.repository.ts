import { ShopId, LedgerEntry, LedgerFilterQuery, CustomerOutstandingSummary, OverdueItem, AgingReportData } from '@raju-billing/shared';
import { db } from '../database/index.js';
import { customerRepository } from './customer.repository.js';

export const mapDbToLedger = (dbRow: any, createdByName = 'System'): LedgerEntry => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    customerId: dbRow.customer_id,
    transactionDate: dbRow.transaction_date,
    transactionType: dbRow.transaction_type,
    referenceId: dbRow.reference_id || null,
    referenceNumber: dbRow.reference_number || null,
    description: dbRow.description,
    debitAmount: Number(dbRow.debit_amount),
    creditAmount: Number(dbRow.credit_amount),
    runningBalance: Number(dbRow.running_balance),
    status: dbRow.status,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
    createdByName,
  };
};

class LedgerRepository {

  async createLedgerEntry(
    shopId: ShopId,
    entry: {
      customerId: string;
      transactionDate: string;
      transactionType: string;
      referenceId?: string | null;
      referenceNumber?: string | null;
      description: string;
      debitAmount: number;
      creditAmount: number;
    },
    userId: string
  ): Promise<LedgerEntry> {
    // 1. Get customer current balance as the base
    const custRows = await db.query(`customers?id=eq.${entry.customerId}`);
    if (custRows.length === 0) throw new Error('Customer not found');
    const prevBalance = Number(custRows[0].current_balance);

    // 2. Calculate running balance
    const runningBalance = prevBalance + Number(entry.debitAmount) - Number(entry.creditAmount);

    // 3. Save ledger row
    const body = {
      shop_id: shopId,
      customer_id: entry.customerId,
      transaction_date: entry.transactionDate,
      transaction_type: entry.transactionType,
      reference_id: entry.referenceId || null,
      reference_number: entry.referenceNumber || null,
      description: entry.description,
      debit_amount: entry.debitAmount,
      credit_amount: entry.creditAmount,
      running_balance: runningBalance,
      status: 'active',
      is_deleted: false,
      created_by: userId || null,
      updated_by: userId || null,
    };

    const rows = await db.query('customer_ledger', { method: 'POST', body });

    // 4. Update Customer's current_balance
    await db.query(`customers?id=eq.${entry.customerId}`, {
      method: 'PATCH',
      body: {
        current_balance: runningBalance,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      }
    });

    customerRepository.updateCurrentOutstanding(entry.customerId, runningBalance);

    return mapDbToLedger(rows[0], 'System');
  }

  async findAllLedgerEntries(shopId: ShopId, query: LedgerFilterQuery = {}): Promise<{ entries: LedgerEntry[]; total: number }> {
    const rows = await db.query(`customer_ledger?shop_id=eq.${shopId}&is_deleted=eq.false`);
    let list = rows.map((r) => mapDbToLedger(r, 'System'));

    if (query.customerId) {
      list = list.filter((e) => e.customerId === query.customerId);
    }
    if (query.transactionType) {
      list = list.filter((e) => e.transactionType === query.transactionType);
    }
    if (query.startDate) {
      const start = new Date(query.startDate).getTime();
      list = list.filter((e) => new Date(e.transactionDate).getTime() >= start);
    }
    if (query.endDate) {
      const end = new Date(query.endDate).getTime();
      list = list.filter((e) => new Date(e.transactionDate).getTime() <= end);
    }

    if (query.search) {
      const s = query.search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(s) ||
          (e.referenceNumber && e.referenceNumber.toLowerCase().includes(s))
      );
    }

    // Sort: chronological timeline
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const startIndex = (page - 1) * limit;

    const paginated = list.slice(startIndex, startIndex + limit);
    return { entries: paginated, total };
  }

  async getCustomerStatement(
    shopId: ShopId,
    customerId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    openingBalance: number;
    closingBalance: number;
    transactions: LedgerEntry[];
  }> {
    // 1. Fetch transactions within range
    const rows = await db.query(
      `customer_ledger?shop_id=eq.${shopId}&customer_id=eq.${customerId}&is_deleted=eq.false`
    );
    const all = rows.map((r) => mapDbToLedger(r)).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const rangeTx = all.filter(
      (tx) => new Date(tx.transactionDate).getTime() >= start && new Date(tx.transactionDate).getTime() <= end
    );

    // 2. Compute opening balance (running balance of the entry just before the start date)
    let openingBalance = 0.00;
    const pastTx = all.filter((tx) => new Date(tx.transactionDate).getTime() < start);
    if (pastTx.length > 0) {
      openingBalance = pastTx[pastTx.length - 1].runningBalance;
    } else {
      // Fallback to customer profile opening balance
      const cust = await customerRepository.findById(customerId);
      openingBalance = cust ? cust.openingBalance : 0.00;
    }

    // 3. Closing balance matches the last running balance in range, or opening balance if empty
    const closingBalance = rangeTx.length > 0 ? rangeTx[rangeTx.length - 1].runningBalance : openingBalance;

    return {
      openingBalance,
      closingBalance,
      transactions: rangeTx,
    };
  }

  async getCustomerOutstandingSummary(shopId: ShopId, customerId: string): Promise<CustomerOutstandingSummary | null> {
    const cust = await customerRepository.findById(customerId);
    if (!cust || cust.shopId !== shopId) return null;

    // Fetch invoices and payments count
    const invoices = await db.query(`invoices?customer_id=eq.${customerId}&is_deleted=eq.false`);
    const payments = await db.query(`payments?customer_id=eq.${customerId}&is_deleted=eq.false`);

    const activeInvoices = invoices.filter((i) => i.bill_status !== 'CANCELLED');
    const activePayments = payments.filter((p) => p.status === 'active');
    const partialPayments = invoices.filter((i) => i.payment_status === 'PARTIALLY_PAID');

    // Sort to find last dates
    const sortedInvoices = [...activeInvoices].sort(
      (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );
    const sortedPayments = [...activePayments].sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );

    // Fetch live balance from Supabase database to override seed in-memory value
    const dbCustRows = await db.query(`customers?id=eq.${customerId}`);
    const liveBalance = dbCustRows.length > 0 ? Number(dbCustRows[0].current_balance) : cust.openingBalance;

    const outstanding = liveBalance > 0 ? liveBalance : 0;
    const advance = liveBalance < 0 ? Math.abs(liveBalance) : 0;
    const isCreditHold = liveBalance > cust.creditLimit && cust.creditLimit > 0;

    return {
      customerId: cust.id,
      customerName: cust.name,
      customerCode: cust.customerCode,
      openingBalance: cust.openingBalance,
      currentOutstanding: outstanding,
      advanceBalance: advance,
      creditLimit: cust.creditLimit,
      availableCredit: Math.max(0, cust.creditLimit - outstanding),
      creditDays: 15, // Default credit days parameter
      isCreditHold,
      totalInvoices: activeInvoices.length,
      totalPayments: activePayments.length,
      totalPartialPayments: partialPayments.length,
      lastInvoiceDate: sortedInvoices.length > 0 ? sortedInvoices[0].invoice_date : null,
      lastPaymentDate: sortedPayments.length > 0 ? sortedPayments[0].payment_date : null,
      averagePaymentTimeDays: 7, // Default simulated parameter
    };
  }

  async getCustomerOverdueInvoices(customerId: string): Promise<OverdueItem[]> {
    const rows = await db.query(
      `invoices?customer_id=eq.${customerId}&payment_status=neq.PAID&bill_status=neq.CANCELLED&is_deleted=eq.false`
    );
    
    const today = new Date();
    const overdueList: OverdueItem[] = [];

    for (const inv of rows) {
      if (inv.due_date) {
        const dueDate = new Date(inv.due_date);
        if (dueDate < today) {
          const diffTime = Math.abs(today.getTime() - dueDate.getTime());
          const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          overdueList.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoice_number,
            amount: Number(inv.balance_amount),
            dueDate: inv.due_date,
            daysOverdue,
          });
        }
      }
    }

    return overdueList;
  }

  async getAgingReportData(customerId: string): Promise<AgingReportData> {
    const rows = await db.query(
      `invoices?customer_id=eq.${customerId}&payment_status=neq.PAID&bill_status=neq.CANCELLED&is_deleted=eq.false`
    );

    const today = new Date();
    const aging = {
      current: 0.00,
      aging1To30: 0.00,
      aging31To60: 0.00,
      aging61To90: 0.00,
      aging90Plus: 0.00,
    };

    for (const inv of rows) {
      const balance = Number(inv.balance_amount);
      if (!inv.due_date) {
        aging.current += balance;
        continue;
      }

      const due = new Date(inv.due_date);
      if (due >= today) {
        aging.current += balance;
      } else {
        const diffTime = Math.abs(today.getTime() - due.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (days <= 30) {
          aging.aging1To30 += balance;
        } else if (days <= 60) {
          aging.aging31To60 += balance;
        } else if (days <= 90) {
          aging.aging61To90 += balance;
        } else {
          aging.aging90Plus += balance;
        }
      }
    }

    return aging;
  }
}

export const ledgerRepository = new LedgerRepository();
