import { ShopId } from './shop.js';

export interface MessageTemplate {
  id: string;
  shopId: ShopId;
  name: string;
  channel: 'WHATSAPP' | 'EMAIL';
  subject?: string | null;
  templateBody: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageHistory {
  id: string;
  shopId: ShopId;
  customerId?: string | null;
  channel: 'WHATSAPP' | 'EMAIL';
  messageType: 'INVOICE' | 'RECEIPT' | 'STATEMENT' | 'REMINDER' | 'CUSTOM';
  recipient: string;
  content: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string | null;
  createdAt: string;
  createdByName?: string;
}

export interface CommunicationSettings {
  id: string;
  shopId: ShopId;
  whatsappProvider: 'META_CLOUD' | 'TWILIO' | 'WHATSAPP_BUSINESS';
  whatsappConfig: {
    accessToken?: string;
    phoneNumberId?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioFromNumber?: string;
  };
  emailProvider: 'SMTP' | 'RESEND';
  emailConfig: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    resendApiKey?: string;
    fromEmail?: string;
  };
}

export interface NotificationDTO {
  id: string;
  shopId: ShopId;
  userId?: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  readAt?: string | null;
  actionUrl?: string | null;
  createdAt: string;
}
