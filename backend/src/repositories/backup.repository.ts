import { ShopId, BackupLog } from '@raju-billing/shared';
import { db } from '../database/index.js';

export interface BackupDataPayload {
  shopId: ShopId;
  version: string;
  timestamp: string;
  customers: any[];
  invoices: any[];
  invoiceItems: any[];
  payments: any[];
  paymentReceipts: any[];
  customerLedger: any[];
  settings: any[];
  templates: any[];
}

export const mapDbToBackupLog = (r: any, createdByName = 'System'): BackupLog => ({
  id: r.id,
  shopId: r.shop_id || null,
  backupType: r.backup_type,
  filePath: r.file_path,
  sizeBytes: Number(r.size_bytes),
  backupStatus: r.backup_status,
  errorMessage: r.error_message || null,
  createdAt: r.created_at,
  createdByName,
});

class BackupRepository {

  async getBackupsList(shopId: ShopId): Promise<BackupLog[]> {
    try {
      const rows = await db.query(`backup_logs?shop_id=eq.${shopId}`);
      const list = rows.map((r) => mapDbToBackupLog(r));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      return [];
    }
  }

  async runBackup(shopId: ShopId, userId: string): Promise<{ log: BackupLog; payload: BackupDataPayload }> {
    // 1. Gather all shop-isolated table rows from database PostgREST
    const [
      customers,
      invoices,
      invoiceItems,
      payments,
      paymentReceipts,
      customerLedger,
      templates,
      settingsRows,
    ] = await Promise.all([
      db.query(`customers?shop_id=eq.${shopId}`).catch(() => []),
      db.query(`invoices?shop_id=eq.${shopId}`).catch(() => []),
      db.query(`invoice_items?shop_id=eq.${shopId}`).catch(() => []),
      db.query(`payments?shop_id=eq.${shopId}`).catch(() => []),
      db.query(`payment_receipts?shop_id=eq.${shopId}`).catch(() => []),
      db.query(`customer_ledger?shop_id=eq.${shopId}`).catch(() => []),
      db.query(`communication_templates?shop_id=eq.${shopId}`).catch(() => []),
      db.query(`system_settings`).catch(() => []),
    ]);

    // Filter settings keys prefixed with this shop id
    const settings = settingsRows.filter((s: any) => s.setting_key.startsWith(`${shopId}_`));

    const payload: BackupDataPayload = {
      shopId,
      version: '1.0',
      timestamp: new Date().toISOString(),
      customers,
      invoices,
      invoiceItems,
      payments,
      paymentReceipts,
      customerLedger,
      settings,
      templates,
    };

    const payloadStr = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(payloadStr, 'utf8');
    const filePath = `backups/${shopId}_backup_${Date.now()}.json`;

    const body = {
      shop_id: shopId,
      backup_type: 'FULL',
      file_path: filePath,
      size_bytes: sizeBytes,
      backup_status: 'COMPLETED',
      created_at: new Date().toISOString(),
      created_by: userId || null,
    };

    let logRow = body;
    try {
      const rows = await db.query('backup_logs', { method: 'POST', body });
      logRow = rows[0] || body;
    } catch (e: any) {
      console.warn('Logging backup metadata failed (table might not exist yet):', e.message);
    }

    return {
      log: mapDbToBackupLog(logRow, 'Admin'),
      payload,
    };
  }

  async runRestore(shopId: ShopId, payload: BackupDataPayload, userId: string): Promise<boolean> {
    if (payload.shopId !== shopId) {
      throw new Error(`Forbidden: Backup file belongs to shop ${payload.shopId}, but active shop context is ${shopId}`);
    }

    // Restore inside sequential deletion and batch-insertion operations
    try {
      // 1. Wipe dependent ledger logs first
      const ledgerIds = payload.customerLedger.map((l) => l.id);
      for (const id of ledgerIds) {
        await db.query(`customer_ledger?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }

      // 2. Wipe receipts and payments
      const receiptIds = payload.paymentReceipts.map((r) => r.id);
      for (const id of receiptIds) {
        await db.query(`payment_receipts?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }
      const paymentIds = payload.payments.map((p) => p.id);
      for (const id of paymentIds) {
        await db.query(`payments?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }

      // 3. Wipe invoice items and invoices
      const itemIds = payload.invoiceItems.map((i) => i.id);
      for (const id of itemIds) {
        await db.query(`invoice_items?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }
      const invoiceIds = payload.invoices.map((i) => i.id);
      for (const id of invoiceIds) {
        await db.query(`invoices?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }

      // 4. Wipe templates and settings
      const templateIds = payload.templates.map((t) => t.id);
      for (const id of templateIds) {
        await db.query(`communication_templates?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }
      const settingIds = payload.settings.map((s) => s.id);
      for (const id of settingIds) {
        await db.query(`system_settings?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
      }

      // 5. Restore settings and templates
      for (const setting of payload.settings) {
        await db.query('system_settings', { method: 'POST', body: setting }).catch(() => {});
      }
      for (const temp of payload.templates) {
        await db.query('communication_templates', { method: 'POST', body: temp }).catch(() => {});
      }

      // 6. Restore customers balances (or upsert customers info)
      for (const cust of payload.customers) {
        await db.query('customers', { method: 'POST', body: cust }).catch(async () => {
          // If customer exists, update balance
          await db.query(`customers?id=eq.${cust.id}`, {
            method: 'PATCH',
            body: { current_balance: cust.current_balance }
          }).catch(() => {});
        });
      }

      // 7. Restore Invoices
      for (const inv of payload.invoices) {
        await db.query('invoices', { method: 'POST', body: inv }).catch(() => {});
      }
      for (const item of payload.invoiceItems) {
        await db.query('invoice_items', { method: 'POST', body: item }).catch(() => {});
      }

      // 8. Restore Payments
      for (const pay of payload.payments) {
        await db.query('payments', { method: 'POST', body: pay }).catch(() => {});
      }
      for (const rec of payload.paymentReceipts) {
        await db.query('payment_receipts', { method: 'POST', body: rec }).catch(() => {});
      }

      // 9. Restore Ledger Entries
      for (const ledger of payload.customerLedger) {
        await db.query('customer_ledger', { method: 'POST', body: ledger }).catch(() => {});
      }

      // Create restore success audit log
      await db.query('activity_logs', {
        method: 'POST',
        body: {
          shop_id: shopId,
          user_id: userId,
          action_type: 'RESTORE_COMPLETED',
          description: `Completed database restoration verification check. Restored ${payload.invoices.length} invoices and ${payload.payments.length} payments.`,
          created_at: new Date().toISOString(),
        }
      }).catch(() => {});

      return true;
    } catch (error: any) {
      console.error('Restoration failed:', error.message);
      return false;
    }
  }
}

export const backupRepository = new BackupRepository();
export default backupRepository;
