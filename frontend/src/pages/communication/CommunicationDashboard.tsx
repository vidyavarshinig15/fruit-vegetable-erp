import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import { formatCurrency } from '@/utils/formatters';
import {
  Send,
  MessageSquare,
  Mail,
  History,
  Settings,
  Edit,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export const CommunicationDashboard: React.FC = () => {
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'history' | 'settings'>('send');

  // Loaders & states
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Send form states
  const [msgChannel, setMsgChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [msgType, setMsgType] = useState<'INVOICE' | 'RECEIPT' | 'STATEMENT' | 'REMINDER' | 'CUSTOM'>('INVOICE');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  
  // Custom message body
  const [customText, setCustomText] = useState('');

  // Editing template state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSubject, setEditSubject] = useState('');

  // Settings configs form states
  const [whatsappProvider, setWhatsappProvider] = useState('META_CLOUD');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [emailProvider, setEmailProvider] = useState('SMTP');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(2525);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  // Search & Filter timelines logs
  const [searchHistory, setSearchHistory] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Load Initial Lists
  useEffect(() => {
    const loadContext = async () => {
      try {
        const [custRes, invRes, payRes, tempRes, configRes, histRes] = await Promise.all([
          api.get('/customers'),
          api.get('/billing/invoices'),
          api.get('/payments'),
          api.get('/communication/templates'),
          api.get('/communication/settings'),
          api.get('/communication/history'),
        ]);

        if (custRes.data?.success) setCustomers((custRes.data.data || []).filter((c: any) => c.status === 'active'));
        if (invRes.data?.success) setInvoices((invRes.data.data || []).filter((i: any) => i.billStatus !== 'CANCELLED'));
        if (payRes.data?.success) setPayments((payRes.data.data || []).filter((p: any) => p.status === 'active'));
        if (tempRes.data?.success) setTemplates(tempRes.data.data || []);
        if (configRes.data?.success && configRes.data?.data) {
          const cfg = configRes.data.data;
          setSettings(cfg);
          setWhatsappProvider(cfg.whatsappProvider);
          setWhatsappToken(cfg.whatsappConfig.accessToken || '');
          setWhatsappPhoneId(cfg.whatsappConfig.phoneNumberId || '');
          setEmailProvider(cfg.emailProvider);
          setSmtpHost(cfg.emailConfig.smtpHost || '');
          setSmtpPort(cfg.emailConfig.smtpPort || 2525);
          setSmtpUser(cfg.emailConfig.smtpUser || '');
          setSmtpPass(cfg.emailConfig.smtpPass || '');
          setResendApiKey(cfg.emailConfig.resendApiKey || '');
          setFromEmail(cfg.emailConfig.fromEmail || '');
        }
        if (histRes.data?.success) setHistory(histRes.data.data || []);
      } catch (err) {
        console.error('Failed to load communication dashboard resources', err);
      }
    };
    loadContext();
  }, [activeShop]);

  // Load message template preview compiling variables
  const compileTemplateVariables = useCallback(() => {
    if (msgType === 'CUSTOM') {
      setMsgContent(customText);
      setMsgSubject('Custom Message Notification');
      return;
    }

    const templateName = msgChannel === 'WHATSAPP' 
      ? msgType 
      : `${msgType}_EMAIL`;

    const template = templates.find((t) => t.name === templateName) || templates.find((t) => t.channel === msgChannel && t.name.includes(msgType));
    if (!template) {
      setMsgContent('Template body not found.');
      return;
    }

    let body = template.templateBody;
    let subject = template.subject || 'Notification from ' + activeShop.name;

    const cust = customers.find((c) => c.id === selectedCustomerId);
    const invoice = invoices.find((i) => i.id === selectedInvoiceId);
    const payment = payments.find((p) => p.id === selectedPaymentId);

    const variables: Record<string, string> = {
      CustomerName: cust ? cust.name : 'Valued Customer',
      InvoiceNumber: invoice ? invoice.invoiceNumber : 'INV-2026-XXXXXX',
      Amount: invoice ? String(invoice.totalAmount) : '0.00',
      PaymentAmount: payment ? String(payment.amount) : '0.00',
      OutstandingAmount: cust ? String(cust.currentOutstanding) : '0.00',
    };

    // Replace placeholders
    for (const [key, val] of Object.entries(variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), val);
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }

    setMsgContent(body);
    setMsgSubject(subject);
  }, [msgChannel, msgType, selectedCustomerId, selectedInvoiceId, selectedPaymentId, customText, templates, customers, invoices, payments, activeShop]);

  useEffect(() => {
    compileTemplateVariables();
  }, [compileTemplateVariables]);

  // Recipient contact updates
  useEffect(() => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (cust) {
      setRecipientContact(msgChannel === 'WHATSAPP' ? cust.mobileNumber : cust.email || '');
    } else {
      setRecipientContact('');
    }
  }, [selectedCustomerId, msgChannel, customers]);

  // Template select trigger
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const t = templates.find((temp) => temp.id === templateId);
    if (t) {
      setEditBody(t.templateBody);
      setEditSubject(t.subject || '');
    }
  };

  // Save template settings
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !editBody) return;

    setIsSavingTemplate(true);
    try {
      const res = await api.patch(`/communication/templates/${selectedTemplateId}`, {
        templateBody: editBody,
        subject: editSubject,
      });

      if (res.data?.success) {
        alert('Template saved successfully.');
        // Reload templates
        const tempRes = await api.get('/communication/templates');
        if (tempRes.data?.success) setTemplates(tempRes.data.data || []);
      }
    } catch (err) {
      alert('Failed to save template changes.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Save Config Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        whatsappProvider,
        whatsappConfig: { accessToken: whatsappToken, phoneNumberId: whatsappPhoneId },
        emailProvider,
        emailConfig: { smtpHost, smtpPort, smtpUser, smtpPass, resendApiKey, fromEmail },
      };

      const res = await api.patch('/communication/settings', payload);
      if (res.data?.success) {
        alert('Communication settings saved successfully.');
      }
    } catch (err) {
      alert('Failed to save configurations settings.');
    }
  };

  // Dispatch Messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientContact || !msgContent) return;

    setIsSending(true);
    try {
      if (msgChannel === 'WHATSAPP') {
        // 1. Direct Web WhatsApp trigger
        const cleanPhone = recipientContact.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
        const webUrl = `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(msgContent)}`;
        window.open(webUrl, '_blank');

        // 2. Post to backend to record in DB history log
        await api.post('/communication/send-whatsapp', {
          recipient: recipientContact,
          content: msgContent,
          customerId: selectedCustomerId || null,
          messageType: msgType,
        });

        alert('Opened WhatsApp Web chat window. Dispatch logged to timeline history.');
      } else {
        // Send email
        const res = await api.post('/communication/send-email', {
          recipient: recipientContact,
          subject: msgSubject,
          content: msgContent,
          customerId: selectedCustomerId || null,
        });

        if (res.data?.success) {
          alert('Email sent successfully!');
        }
      }

      // Reload timeline logs
      const histRes = await api.get('/communication/history');
      if (histRes.data?.success) setHistory(histRes.data.data || []);
    } catch (err) {
      alert('Message dispatch failed.');
    } finally {
      setIsSending(false);
    }
  };

  // Filtering histories
  const filteredHistory = history.filter((h) => {
    const cust = customers.find((c) => c.id === h.customerId);
    const custName = cust ? cust.name.toLowerCase() : '';
    const code = cust ? cust.customerCode.toLowerCase() : '';
    const matchSearch = custName.includes(searchHistory.toLowerCase()) || code.includes(searchHistory.toLowerCase()) || h.recipient.includes(searchHistory);
    const matchChannel = filterChannel ? h.channel === filterChannel : true;
    return matchSearch && matchChannel;
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 no-print">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-market-700 dark:text-market-400" />
            Communication Cockpit
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Shop context: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 space-x-2 no-print">
        {[
          { id: 'send', label: 'Share message', icon: Send },
          { id: 'templates', label: 'Message templates', icon: Edit },
          { id: 'history', label: 'Communication History', icon: History },
          { id: 'settings', label: 'Gateway Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB PANELS */}

      {/* 1. SEND WORKSPACE */}
      {activeTab === 'send' && (
        <form onSubmit={handleSendMessage} className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-semibold text-xs">
          {/* Form parameters */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Configure sharing dispatch" subtitle="Select message parameters and target customer.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Channel Select */}
                <Select
                  label="Communication Channel *"
                  value={msgChannel}
                  onChange={(e) => {
                    setMsgChannel(e.target.value as any);
                    setSelectedCustomerId('');
                  }}
                  options={[
                    { value: 'WHATSAPP', label: 'WhatsApp Messenger Web' },
                    { value: 'EMAIL', label: 'Official Email Dispatch' },
                  ]}
                />

                {/* Message type select */}
                <Select
                  label="Select message details *"
                  value={msgType}
                  onChange={(e) => {
                    setMsgType(e.target.value as any);
                    setSelectedInvoiceId('');
                    setSelectedPaymentId('');
                  }}
                  options={[
                    { value: 'INVOICE', label: 'Invoice Share Template' },
                    { value: 'RECEIPT', label: 'Receipt Confirmation' },
                    { value: 'STATEMENT', label: 'Latest Account Statement' },
                    { value: 'REMINDER', label: 'Unpaid Outstanding Reminder' },
                    { value: 'CUSTOM', label: 'Custom Freeform Text' },
                  ]}
                />

                {/* Customer Select */}
                <Select
                  label="Select Wholesale Customer *"
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  options={[
                    { value: '', label: 'Select customer account' },
                    ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.name}` })),
                  ]}
                />

                {/* Conditional Invoice Select */}
                {msgType === 'INVOICE' && (
                  <Select
                    label="Link Invoice Number"
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    options={[
                      { value: '', label: 'Select invoice item' },
                      ...invoices
                        .filter((i) => i.customerId === selectedCustomerId)
                        .map((i) => ({ value: i.id, label: `${i.invoiceNumber} (₹${i.totalAmount})` })),
                    ]}
                  />
                )}

                {/* Conditional Payment Select */}
                {msgType === 'RECEIPT' && (
                  <Select
                    label="Link Receipt / Payment"
                    value={selectedPaymentId}
                    onChange={(e) => setSelectedPaymentId(e.target.value)}
                    options={[
                      { value: '', label: 'Select payment item' },
                      ...payments
                        .filter((p) => p.customerId === selectedCustomerId)
                        .map((p) => ({ value: p.id, label: `${p.paymentNumber} (₹${p.amount})` })),
                    ]}
                  />
                )}
              </div>
            </Card>

            {/* Recipient inputs */}
            {selectedCustomerId && (
              <Card title="Recipient information" subtitle="Set phone or email destination parameters.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={msgChannel === 'WHATSAPP' ? 'Mobile Phone Number *' : 'Recipient Email address *'}
                    type="text"
                    required
                    value={recipientContact}
                    onChange={(e) => setRecipientContact(e.target.value)}
                  />

                  {msgChannel === 'EMAIL' && (
                    <Input
                      label="Subject line"
                      type="text"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Custom text panel */}
            {msgType === 'CUSTOM' && (
              <Card title="Custom freeform message content" subtitle="Write custom message parameters.">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={4}
                  placeholder="Enter message details here..."
                  className="w-full px-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-market-700 bg-slate-50 dark:bg-slate-800"
                />
              </Card>
            )}
          </div>

          {/* Right Col: Live Previews */}
          <div className="space-y-6">
            <Card title="Live preview message" subtitle="Review template variable compiles before dispatch.">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all">
                {msgContent || 'Select customer to view preview logs.'}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSending || !selectedCustomerId || !recipientContact}
                  className="inline-flex items-center gap-1.5 font-bold shadow-lg"
                >
                  <Send className="w-4 h-4" /> {msgChannel === 'WHATSAPP' ? 'Send via WhatsApp' : 'Dispatch Email'}
                </Button>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* 2. EDIT TEMPLATES VIEW */}
      {activeTab === 'templates' && (
        <form onSubmit={handleSaveTemplate} className="max-w-2xl mx-auto space-y-6 font-semibold text-xs">
          <Card title="Modify Message templates" subtitle="Edit variables and subjects parameters.">
            <div className="space-y-4">
              <Select
                label="Select template to edit"
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                options={[
                  { value: '', label: 'Choose template' },
                  ...templates.map((t) => ({ value: t.id, label: `${t.channel} - ${t.name}` })),
                ]}
              />

              {selectedTemplateId && (
                <>
                  {/* Subject line (Email only) */}
                  {templates.find((t) => t.id === selectedTemplateId)?.channel === 'EMAIL' && (
                    <Input
                      label="Email Subject Line Template"
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                    />
                  )}

                  {/* Body Textarea */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Message Body Template</label>
                    <textarea
                      required
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-slate-250 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-market-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </>
              )}
            </div>
            
            {selectedTemplateId && isAdmin && (
              <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
                <Button type="submit" variant="primary" disabled={isSavingTemplate}>
                  Save Template Changes
                </Button>
              </div>
            )}
          </Card>
        </form>
      )}

      {/* 3. MESSAGE HISTORY LOG TIMELINE */}
      {activeTab === 'history' && (
        <Card title="Communication logs timeline" subtitle="Historic audit reports of sent receipts, invoices, and reminders.">
          <div className="flex gap-3 mb-4 no-print">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search recipient..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>
            <Select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              options={[
                { value: '', label: 'All Channels' },
                { value: 'WHATSAPP', label: 'WhatsApp' },
                { value: 'EMAIL', label: 'Email' },
              ]}
            />
          </div>

          <div className="overflow-x-auto text-xs font-semibold">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider pb-2">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3 text-center">Channel</th>
                  <th className="py-2.5 px-3">Message Type</th>
                  <th className="py-2.5 px-3">Content Snippet</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50/20">
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">{item.recipient}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={item.channel === 'WHATSAPP' ? 'success' : 'info'}>{item.channel}</Badge>
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-black text-indigo-750">{item.messageType}</td>
                    <td className="py-3 px-3 max-w-[200px] truncate text-slate-450" title={item.content}>
                      {item.content}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={item.status === 'SENT' ? 'success' : 'danger'}>
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. GATEWAY CONFIGURATION SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="max-w-2xl mx-auto space-y-6 font-semibold text-xs">
          <Card title="Configure Communications Providers" subtitle="Manage WhatsApp and SMTP Mail Server parameters.">
            <div className="space-y-6">
              
              {/* WhatsApp provider */}
              <div className="space-y-4">
                <h4 className="text-sm font-black border-b border-slate-100 pb-2 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Gateway Config</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="WhatsApp Provider Gateway"
                    value={whatsappProvider}
                    onChange={(e) => setWhatsappProvider(e.target.value)}
                    options={[
                      { value: 'META_CLOUD', label: 'Meta Cloud API Direct' },
                      { value: 'TWILIO', label: 'Twilio WhatsApp Sandbox' },
                      { value: 'WHATSAPP_BUSINESS', label: 'Mock/Sandbox Simulator' },
                    ]}
                  />
                  {whatsappProvider === 'META_CLOUD' && (
                    <>
                      <Input
                        label="Meta Cloud Token (Permanent Access Token)"
                        type="password"
                        value={whatsappToken}
                        onChange={(e) => setWhatsappToken(e.target.value)}
                      />
                      <Input
                        label="WhatsApp Phone Number ID"
                        type="text"
                        value={whatsappPhoneId}
                        onChange={(e) => setWhatsappPhoneId(e.target.value)}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Email SMTP Provider */}
              <div className="space-y-4 border-t border-slate-150 pt-5">
                <h4 className="text-sm font-black border-b border-slate-100 pb-2 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-600" /> SMTP Mail / Resend API Setup</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Email API Provider"
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value)}
                    options={[
                      { value: 'SMTP', label: 'SMTP Mail Server' },
                      { value: 'RESEND', label: 'Resend API Integration' },
                    ]}
                  />
                  {emailProvider === 'SMTP' ? (
                    <>
                      <Input
                        label="SMTP Hostname Address"
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                      />
                      <Input
                        label="SMTP Port number"
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                      />
                      <Input
                        label="SMTP Auth Username"
                        type="text"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                      />
                      <Input
                        label="SMTP Auth Password"
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                      />
                    </>
                  ) : (
                    <Input
                      label="Resend API Auth Key (re_XXXXXX)"
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                    />
                  )}
                  <Input
                    label="Sender Address (From Email)"
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                </div>
              </div>

            </div>

            {isAdmin && (
              <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
                <Button type="submit" variant="primary">
                  Save Configurations
                </Button>
              </div>
            )}
          </Card>
        </form>
      )}
    </div>
  );
};
export default CommunicationDashboard;
