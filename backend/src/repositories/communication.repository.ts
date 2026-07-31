import { ShopId, MessageTemplate, MessageHistory, CommunicationSettings } from '@raju-billing/shared';
import { db } from '../database/index.js';

export const mapDbToTemplate = (r: any): MessageTemplate => ({
  id: r.id,
  shopId: r.shop_id,
  name: r.name,
  channel: r.channel,
  subject: r.subject || null,
  templateBody: r.template_body,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const mapDbToMessageHistory = (r: any, createdByName = 'System'): MessageHistory => ({
  id: r.id,
  shopId: r.shop_id,
  customerId: r.customer_id || null,
  channel: r.channel,
  messageType: r.message_type,
  recipient: r.recipient,
  content: r.content,
  status: r.status,
  errorMessage: r.error_message || null,
  createdAt: r.created_at,
  createdByName,
});

export const mapDbToSettings = (r: any): CommunicationSettings => ({
  id: r.id,
  shopId: r.shop_id,
  whatsappProvider: r.whatsapp_provider,
  whatsappConfig: r.whatsapp_config || {},
  emailProvider: r.email_provider,
  emailConfig: r.email_config || {},
});

class CommunicationRepository {

  // Seed default templates if they do not exist
  async seedDefaultTemplatesIfEmpty(shopId: ShopId): Promise<void> {
    try {
      const rows = await db.query(`communication_templates?shop_id=eq.${shopId}&is_deleted=eq.false`);
      if (rows.length > 0) return;

      const defaults = [
        {
          shop_id: shopId,
          name: 'INVOICE',
          channel: 'WHATSAPP',
          template_body: 'Hello {{CustomerName}},\nYour invoice {{InvoiceNumber}} is attached.\nAmount: ₹{{Amount}}\nThank you for your business!',
          status: 'active',
        },
        {
          shop_id: shopId,
          name: 'RECEIPT',
          channel: 'WHATSAPP',
          template_body: 'Hello {{CustomerName}},\nWe have received your payment of ₹{{PaymentAmount}} against invoice {{InvoiceNumber}}.\nReceipt attached.\nThank you!',
          status: 'active',
        },
        {
          shop_id: shopId,
          name: 'REMINDER',
          channel: 'WHATSAPP',
          template_body: 'Hello {{CustomerName}},\nThis is a reminder that your outstanding balance is ₹{{OutstandingAmount}}.\nPlease make the payment at your earliest convenience.\nThank you!',
          status: 'active',
        },
        {
          shop_id: shopId,
          name: 'STATEMENT',
          channel: 'WHATSAPP',
          template_body: 'Hello {{CustomerName}},\nPlease find your latest account statement attached.\nThank you!',
          status: 'active',
        },
        {
          shop_id: shopId,
          name: 'INVOICE_EMAIL',
          channel: 'EMAIL',
          subject: 'Invoice {{InvoiceNumber}} from G R Fruits & Vegetables',
          template_body: 'Hello {{CustomerName}},\n\nPlease find attached your invoice {{InvoiceNumber}} for the amount of ₹{{Amount}}.\n\nThank you for your business!',
          status: 'active',
        },
        {
          shop_id: shopId,
          name: 'REMINDER_EMAIL',
          channel: 'EMAIL',
          subject: 'Payment Reminder - Raju Fruits & Vegetables',
          template_body: 'Hello {{CustomerName}},\n\nThis is a friendly reminder that you have an outstanding balance of ₹{{OutstandingAmount}} on your account.\n\nPlease clear the balance at your earliest convenience.\n\nThank you!',
          status: 'active',
        }
      ];

      for (const item of defaults) {
        await db.query('communication_templates', { method: 'POST', body: item }).catch((e) => {
          console.warn('Seeding template failed. Table might not exist yet:', e.message);
        });
      }
    } catch (err) {
      console.warn('Communication templates seeding skipped:', (err as any).message);
    }
  }

  async getTemplates(shopId: ShopId): Promise<MessageTemplate[]> {
    await this.seedDefaultTemplatesIfEmpty(shopId);
    try {
      const rows = await db.query(`communication_templates?shop_id=eq.${shopId}&is_deleted=eq.false`);
      return rows.map(mapDbToTemplate);
    } catch (err) {
      console.warn('Fallback to seeded templates list due to missing DB schema');
      return [];
    }
  }

  async updateTemplate(id: string, shopId: ShopId, body: { templateBody: string; subject?: string }, userId: string): Promise<boolean> {
    try {
      await db.query(`communication_templates?id=eq.${id}&shop_id=eq.${shopId}`, {
        method: 'PATCH',
        body: {
          template_body: body.templateBody,
          subject: body.subject || null,
          updated_at: new Date().toISOString(),
          updated_by: userId || null,
        }
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  async getSettings(shopId: ShopId): Promise<CommunicationSettings> {
    try {
      const rows = await db.query(`communication_settings?shop_id=eq.${shopId}`);
      if (rows.length > 0) {
        return mapDbToSettings(rows[0]);
      }

      // Default mock setting fallback
      const defaultSettings = {
        shop_id: shopId,
        whatsapp_provider: 'META_CLOUD',
        whatsapp_config: { accessToken: 'MOCK_TOKEN', phoneNumberId: 'MOCK_PHONE_ID' },
        email_provider: 'SMTP',
        email_config: { smtpHost: 'smtp.mailtrap.io', smtpPort: 2525, smtpUser: 'mock', smtpPass: 'mock', fromEmail: 'no-reply@rajuwholesale.com' },
      };

      const created = await db.query('communication_settings', { method: 'POST', body: defaultSettings });
      return mapDbToSettings(created[0] || defaultSettings);
    } catch (err) {
      // Return hardcoded in-memory settings if tables do not exist
      return {
        id: 'mock_settings_id',
        shopId,
        whatsappProvider: 'META_CLOUD',
        whatsappConfig: { accessToken: 'MOCK_TOKEN' },
        emailProvider: 'SMTP',
        emailConfig: { smtpHost: 'smtp.mailtrap.io', smtpPort: 2525 },
      };
    }
  }

  async updateSettings(shopId: ShopId, body: any): Promise<boolean> {
    try {
      const settings = await this.getSettings(shopId);
      await db.query(`communication_settings?id=eq.${settings.id}`, {
        method: 'PATCH',
        body: {
          whatsapp_provider: body.whatsappProvider,
          whatsapp_config: body.whatsappConfig,
          email_provider: body.emailProvider,
          email_config: body.emailConfig,
          updated_at: new Date().toISOString(),
        }
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  async logMessage(
    shopId: ShopId,
    msg: {
      customerId?: string | null;
      channel: 'WHATSAPP' | 'EMAIL';
      messageType: 'INVOICE' | 'RECEIPT' | 'STATEMENT' | 'REMINDER' | 'CUSTOM';
      recipient: string;
      content: string;
      status: 'SENT' | 'FAILED';
      errorMessage?: string | null;
    },
    userId: string
  ): Promise<MessageHistory> {
    const body = {
      shop_id: shopId,
      customer_id: msg.customerId || null,
      channel: msg.channel,
      message_type: msg.messageType,
      recipient: msg.recipient,
      content: msg.content,
      status: msg.status,
      error_message: msg.errorMessage || null,
      created_at: new Date().toISOString(),
      created_by: userId || null,
    };

    try {
      const rows = await db.query('message_history', { method: 'POST', body });
      return mapDbToMessageHistory(rows[0] || body, 'System');
    } catch (err) {
      // In-memory fallback log
      console.log('[MessageHistory Log simulation fallback]', body);
      return mapDbToMessageHistory({ id: `mock_history_${Date.now()}`, ...body });
    }
  }

  async getHistory(shopId: ShopId, query: any = {}): Promise<MessageHistory[]> {
    try {
      const rows = await db.query(`message_history?shop_id=eq.${shopId}`);
      let list = rows.map((r) => mapDbToMessageHistory(r));

      if (query.customerId) {
        list = list.filter((e) => e.customerId === query.customerId);
      }
      if (query.channel) {
        list = list.filter((e) => e.channel === query.channel);
      }
      if (query.status) {
        list = list.filter((e) => e.status === query.status);
      }

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      return [];
    }
  }
}

export const communicationRepository = new CommunicationRepository();
