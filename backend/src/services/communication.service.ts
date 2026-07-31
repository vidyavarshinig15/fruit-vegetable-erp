import { ShopId, MessageHistory } from '@raju-billing/shared';
import { communicationRepository } from '../repositories/communication.repository.js';

class CommunicationService {

  async sendEmail(
    shopId: ShopId,
    recipient: string,
    subject: string,
    content: string,
    userId: string,
    customerId?: string | null,
    attachmentBase64?: string | null,
    attachmentFilename?: string | null
  ): Promise<MessageHistory> {
    const settings = await communicationRepository.getSettings(shopId);
    
    let status: 'SENT' | 'FAILED' = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (settings.emailProvider === 'RESEND' && settings.emailConfig.resendApiKey) {
        // Native Resend REST API Post Dispatch
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.emailConfig.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: settings.emailConfig.fromEmail || 'onboarding@resend.dev',
            to: recipient,
            subject,
            html: content.replace(/\n/g, '<br/>'),
            attachments: attachmentBase64 
              ? [{ filename: attachmentFilename || 'Attachment.pdf', content: attachmentBase64 }] 
              : [],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend Dispatch failed: ${errText}`);
        }
      } else {
        // Fallback or SMTP simulation logging
        console.log(`[Email Service Simulation (${settings.emailProvider})]`, {
          to: recipient,
          subject,
          bodyLength: content.length,
          hasAttachment: !!attachmentBase64,
        });
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || 'SMTP/Email dispatch failed';
    }

    // Log the transaction in message history
    return await communicationRepository.logMessage(shopId, {
      customerId,
      channel: 'EMAIL',
      messageType: subject.toLowerCase().includes('invoice') ? 'INVOICE' : subject.toLowerCase().includes('receipt') ? 'RECEIPT' : 'STATEMENT',
      recipient,
      content,
      status,
      errorMessage,
    }, userId);
  }

  async sendWhatsApp(
    shopId: ShopId,
    recipient: string,
    content: string,
    userId: string,
    customerId?: string | null,
    messageType: 'INVOICE' | 'RECEIPT' | 'STATEMENT' | 'REMINDER' | 'CUSTOM' = 'CUSTOM',
    attachmentBase64?: string | null,
    attachmentFilename?: string | null
  ): Promise<MessageHistory> {
    const settings = await communicationRepository.getSettings(shopId);

    let status: 'SENT' | 'FAILED' = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (settings.whatsappProvider === 'META_CLOUD' && settings.whatsappConfig.accessToken && settings.whatsappConfig.phoneNumberId) {
        // Native Meta Cloud WhatsApp API REST dispatch
        const res = await fetch(`https://graph.facebook.com/v18.0/${settings.whatsappConfig.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.whatsappConfig.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient,
            type: 'text',
            text: { body: content },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Meta Cloud WhatsApp Dispatch failed: ${errText}`);
        }
      } else if (settings.whatsappProvider === 'TWILIO' && settings.whatsappConfig.twilioAccountSid) {
        // Twilio SMS/WhatsApp dispatcher
        console.log('[Twilio dispatch simulation]', recipient, content);
      } else {
        // Fallback simulation log
        console.log(`[WhatsApp Service Simulation (${settings.whatsappProvider})]`, {
          to: recipient,
          content,
          hasAttachment: !!attachmentBase64,
        });
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || 'WhatsApp message dispatch failed';
    }

    return await communicationRepository.logMessage(shopId, {
      customerId,
      channel: 'WHATSAPP',
      messageType,
      recipient,
      content,
      status,
      errorMessage,
    }, userId);
  }
}

export const communicationService = new CommunicationService();
export default communicationService;
