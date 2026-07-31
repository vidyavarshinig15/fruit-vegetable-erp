import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useShop } from '@/contexts/ShopContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { api } from '@/api/client';
import { Select } from '@/components/ui/Select';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  FilePlus,
  PlusCircle,
  History,
  FileText,
  CreditCard,
  Notebook,
  FileUp,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  Video,
  CheckSquare,
  X,
  FileCheck,
  Globe,
  Save,
  Users,
} from 'lucide-react';

export const CustomerProfilePage: React.FC = () => {
  const { activeShop } = useShop();
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'dashboard' | 'documents' | 'notes' | 'contact' | 'activity'>('overview');

  // Customer Data State
  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Notes state
  const [noteText, setNoteText] = useState('');
  
  // Document state
  const [docType, setDocType] = useState<'GST Certificate' | 'Business License' | 'Visiting Card' | 'Shop Photo' | 'Customer Agreement' | 'Other Documents'>('Visiting Card');
  const [docName, setDocName] = useState('');
  const [docPreview, setDocPreview] = useState<string | null>(null);

  // Contact log state
  const [contactType, setContactType] = useState<'Call' | 'Meeting' | 'Discussion'>('Call');
  const [contactRemarks, setContactRemarks] = useState('');

  // Fetch Customer Profile
  const fetchCustomer = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get(`/customers/${id}`);
      if (response.data?.success) {
        setCustomer(response.data.data);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch customer profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  // Quick Action Handler
  const handleQuickAction = (module: string) => {
    if (module === 'billing') {
      navigate('/billing', { state: { customerId: id } });
    } else if (module === 'payments') {
      navigate('/payments', { state: { customerId: id } });
    } else if (module === 'ledger') {
      navigate('/ledger', { state: { customerId: id } });
    } else {
      alert(`Navigating to ${module} module. This module is scoped for upcoming implementations.`);
    }
  };

  // Add Note Handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      await api.post(`/customers/${id}/notes`, { text: noteText });
      setNoteText('');
      fetchCustomer();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add note');
    }
  };

  // Delete Note Handler
  const handleDeleteNote = async (noteId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this internal note?');
    if (!confirmDelete) return;

    try {
      await api.delete(`/customers/${id}/notes/${noteId}`);
      fetchCustomer();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete note. Ensure you have admin privileges.');
    }
  };

  // Base64 Document Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'application/pdf', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Only PDF, PNG, JPEG and SVG documents are accepted.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docPreview || !docName.trim()) return;

    try {
      await api.post(`/customers/${id}/documents`, {
        type: docType,
        name: docName,
        filePath: docPreview,
      });
      setDocName('');
      setDocPreview(null);
      fetchCustomer();
      alert('Document uploaded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload document.');
    }
  };

  // Add Contact Log History Handler
  const handleAddContactLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactRemarks.trim()) return;

    try {
      await api.post(`/customers/${id}/contact-history`, {
        type: contactType,
        remarks: contactRemarks,
      });
      setContactRemarks('');
      fetchCustomer();
      alert('Discussion contact logged successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log discussion.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Loading customer dashboard profile...
      </div>
    );
  }

  if (errorMsg || !customer) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 border border-red-200 text-red-750 font-bold rounded-2xl text-center">
        {errorMsg || 'Customer profile not found or permission denied.'}
        <div className="mt-4">
          <Link to="/customers">
            <Button variant="secondary">Back to Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Dashboard mock listings
  const mockInvoices = [
    { id: 'inv_1', num: `${activeShop.code}-2026-000021`, date: '2026-07-28', total: 18500, paid: 18500, status: 'PAID' },
    { id: 'inv_2', num: `${activeShop.code}-2026-000034`, date: '2026-07-29', total: 24500, paid: 0, status: 'UNPAID' },
  ];

  const mockPayments = [
    { id: 'pay_1', num: `${activeShop.code}R-2026-000015`, date: '2026-07-28', amount: 18500, mode: 'UPI' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. TOP OVERVIEW PROFILE BANNER */}
      <div className="bg-gradient-to-r from-market-900 via-market-800 to-market-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border border-market-700">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-black tracking-widest text-market-300 bg-market-950/60 border border-market-850 px-2 py-0.5 rounded-sm uppercase">
              {customer.customerCode}
            </span>
            <Badge variant="success" className="bg-white text-market-900 px-2 py-0.5 rounded-full border-none">
              {customer.status}
            </Badge>
            <span className="text-xs text-market-200 font-bold">
              Since {new Date(customer.customerSince).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight">{customer.name}</h1>
          <p className="text-sm font-medium text-market-200 mt-1 flex items-center gap-2">
            <span>Owner: {customer.ownerName}</span>
            <span>•</span>
            <span>Type: {customer.businessType}</span>
          </p>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {customer.tags?.map((tag: string) => (
              <span
                key={tag}
                className="text-[9px] font-black uppercase bg-market-950/80 text-market-200 border border-market-800/60 px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic credit metrics widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-market-950/60 border border-market-800/60 p-5 rounded-2xl w-full lg:w-auto shrink-0 shadow-inner">
          <div className="text-center sm:border-r sm:border-market-800/80 pr-2">
            <span className="block text-[10px] font-black uppercase text-market-300 tracking-wider">Outstanding</span>
            <span className="block text-xl font-black text-amber-400 mt-1">{formatCurrency(customer.currentOutstanding)}</span>
          </div>
          <div className="text-center sm:border-r sm:border-market-800/80 px-2">
            <span className="block text-[10px] font-black uppercase text-market-300 tracking-wider">Credit Limit</span>
            <span className="block text-xl font-black text-slate-100 mt-1">{formatCurrency(customer.creditLimit)}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 text-center pl-2">
            <span className="block text-[10px] font-black uppercase text-market-300 tracking-wider">Payment Cycle</span>
            <span className="block text-sm font-black text-slate-200 mt-2 truncate max-w-[120px]">{customer.paymentTerms}</span>
          </div>
        </div>
      </div>

      {/* 2. CUSTOMER QUICK ACTIONS PANEL */}
      <Card title="Quick Action Operations" subtitle="Navigate directly to corresponding workflows pre-scoped for this customer.">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Button variant="secondary" onClick={() => handleQuickAction('billing')} className="inline-flex items-center gap-1.5 justify-center py-2.5 text-xs text-market-700">
            <FilePlus className="w-4 h-4" /> Generate Invoice
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('upload order')} className="inline-flex items-center gap-1.5 justify-center py-2.5 text-xs text-market-700">
            <FileUp className="w-4 h-4" /> Upload Order PDF
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('payments')} className="inline-flex items-center gap-1.5 justify-center py-2.5 text-xs text-market-700">
            <CreditCard className="w-4 h-4" /> Record Payment
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('ledger')} className="inline-flex items-center gap-1.5 justify-center py-2.5 text-xs text-market-700">
            <Notebook className="w-4 h-4" /> View Ledger
          </Button>
          <Button variant="secondary" onClick={() => handleQuickAction('share')} className="inline-flex items-center gap-1.5 justify-center col-span-2 sm:col-span-1 py-2.5 text-xs text-market-700">
            <Globe className="w-4 h-4" /> Share Details
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar Tabs */}
        <div className="space-y-2">
          {[
            { id: 'overview', label: 'Business Overview', icon: User },
            { id: 'dashboard', label: 'Dashboard Transactions', icon: FileText },
            { id: 'documents', label: 'Customer Documents', icon: FileCheck },
            { id: 'notes', label: 'Internal Notes Feed', icon: MessageSquare },
            { id: 'contact', label: 'Contact History Logs', icon: CheckSquare },
            { id: 'activity', label: 'Account Activity Trails', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all text-left border ${
                  isActive
                    ? 'bg-market-800 text-white border-market-800 shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content panels */}
        <div className="lg:col-span-3">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card title="Business Contact Card" className="md:col-span-2">
                <div className="space-y-4 text-sm font-bold text-slate-700 dark:text-slate-350">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 text-xs font-semibold uppercase">Primary Owner</span>
                      <span className="block text-slate-900 dark:text-white mt-0.5">{customer.ownerName}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 text-xs font-semibold uppercase">Contact Person</span>
                      <span className="block text-slate-900 dark:text-white mt-0.5">{customer.contactPerson}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-slate-400 text-xs font-semibold uppercase">Mobile Contacts</span>
                      <span className="block text-slate-900 dark:text-white mt-0.5">{customer.mobileNumber}</span>
                      {customer.alternateMobile && <span className="block text-xs font-medium text-slate-400 mt-1">Alt: {customer.alternateMobile}</span>}
                      {customer.whatsappNumber && <span className="block text-xs font-medium text-slate-400 mt-1">WA: {customer.whatsappNumber}</span>}
                    </div>
                  </div>

                  {customer.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-slate-400 text-xs font-semibold uppercase">Email Address</span>
                        <span className="block text-slate-900 dark:text-white mt-0.5">{customer.email}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Billing Address">
                <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-350 text-sm font-bold leading-tight">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-slate-900 dark:text-white">{customer.address}</span>
                    <span className="block text-slate-400 font-semibold text-xs uppercase mt-2">Area / Yard</span>
                    <span className="block text-slate-900 dark:text-white">{customer.area}</span>
                    <span className="block text-slate-900 dark:text-white mt-0.5">{customer.city}, {customer.state} - {customer.pincode}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Invoices List widget */}
              <Card title="Recent Generated Invoices" subtitle="Chronological list of wholesale bills.">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Invoice Number</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-right">Settled</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-850">
                          <td className="py-3 px-3 font-extrabold text-slate-950 dark:text-white">{inv.num}</td>
                          <td className="py-3 px-3 font-bold text-slate-600">{new Date(inv.date).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">{formatCurrency(inv.total)}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-500">{formatCurrency(inv.paid)}</td>
                          <td className="py-3 px-3">
                            <Badge variant={inv.status === 'PAID' ? 'success' : 'danger'}>{inv.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Payments List widget */}
              <Card title="Recent Cash Settlements" subtitle="Chronological list of payment receipts.">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Receipt Number</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3 text-right">Amount Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPayments.map((pay) => (
                        <tr key={pay.id} className="border-b border-slate-100 dark:border-slate-850">
                          <td className="py-3 px-3 font-extrabold text-slate-950 dark:text-white">{pay.num}</td>
                          <td className="py-3 px-3 font-bold text-slate-600">{new Date(pay.date).toLocaleDateString()}</td>
                          <td className="py-3 px-3"><Badge variant="info">{pay.mode}</Badge></td>
                          <td className="py-3 px-3 text-right font-black text-emerald-600">{formatCurrency(pay.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Document upload form */}
              <Card title="Upload Business Documents" subtitle="GST certificates, business agreements, visiting cards, and shop photos.">
                <form onSubmit={handleUploadDocument} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <Select
                      label="Document Category"
                      value={docType}
                      onChange={(e: any) => setDocType(e.target.value as any)}
                      options={[
                        { value: 'GST Certificate', label: 'GST Certificate' },
                        { value: 'Business License', label: 'Business License' },
                        { value: 'Visiting Card', label: 'Visiting Card' },
                        { value: 'Shop Photo', label: 'Shop Photo' },
                        { value: 'Customer Agreement', label: 'Customer Agreement' },
                        { value: 'Other Documents', label: 'Other Documents' },
                      ]}
                    />

                    {/* Custom File Picker Wrapper */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Select Image/PDF File</span>
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-bold text-sm transition-all shadow-sm">
                        <FileUp className="w-4 h-4 text-slate-500" />
                        <span className="truncate max-w-[200px]">{docName || 'Choose File (5MB max)'}</span>
                        <input type="file" accept="image/png, image/jpeg, application/pdf, image/svg+xml" onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {docPreview && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[300px]">Selected: {docName}</span>
                      <button type="button" onClick={() => { setDocPreview(null); setDocName(''); }} className="p-1 hover:bg-slate-200 rounded text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end border-t border-slate-100 dark:border-slate-850 pt-3">
                    <Button type="submit" variant="primary" disabled={!docPreview}>
                      <Save className="w-4 h-4 mr-2" /> Upload Document
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Uploaded Documents List */}
              <Card title="Stored Customer Documents" subtitle="Documents securely saved in customer isolated profile folder.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customer.documents?.length === 0 ? (
                    <div className="sm:col-span-2 py-6 text-center text-sm font-semibold text-slate-450">
                      No documents stored yet.
                    </div>
                  ) : (
                    customer.documents?.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <span className="block text-xs font-black text-slate-400 uppercase tracking-wide">{doc.type}</span>
                          <span className="block text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 truncate max-w-[200px]" title={doc.name}>
                            {doc.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        
                        <a href={doc.filePath} download={doc.name} className="shrink-0">
                          <Button variant="secondary" size="sm" className="px-3.5 py-2 font-bold text-xs text-market-700">
                            Download File
                          </Button>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Note Card */}
              <Card title="Add Internal Private Note" subtitle="Only shop operators can view these internal notes.">
                <form onSubmit={handleAddNote} className="space-y-4">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    placeholder="e.g. Clears payments every Saturday. Delivers orders to back entrance of the resort."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-market-700 focus:ring-4 focus:ring-market-100 transition-all duration-200"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" disabled={!noteText.trim()}>
                      <PlusCircle className="w-4 h-4 mr-2" /> Add Note Comment
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Notes thread feed */}
              <Card title="Internal Comments Thread">
                <div className="space-y-4">
                  {customer.notesList?.length === 0 ? (
                    <div className="py-6 text-center text-sm font-semibold text-slate-450">
                      No internal notes recorded.
                    </div>
                  ) : (
                    customer.notesList?.map((note: any) => {
                      const isOwner = currentUser?.email === note.createdByEmail;
                      const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
                      
                      return (
                        <div
                          key={note.id}
                          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-305">{note.text}</p>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                              <span className="text-market-700 dark:text-market-400">{note.createdByName}</span>
                              <span>•</span>
                              <span>{new Date(note.createdAt).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Delete Note Button (Admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete Note (Admin only)"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Contact History Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              {/* Log contact log form */}
              <Card title="Log Customer Discussion Contact" subtitle="Log phone calls, APMC yard meetings, or payment cycles discussions.">
                <form onSubmit={handleAddContactLog} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <Select
                      label="Contact Mode"
                      value={contactType}
                      onChange={(e: any) => setContactType(e.target.value as any)}
                      options={[
                        { value: 'Call', label: 'Phone Call' },
                        { value: 'Meeting', label: 'In-Person Yard Meeting' },
                        { value: 'Discussion', label: 'Important Negotiation Discussion' },
                      ]}
                    />
                    <Input
                      label="Logged Discussion Date"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <textarea
                    value={contactRemarks}
                    onChange={(e) => setContactRemarks(e.target.value)}
                    rows={3}
                    placeholder="Provide a summary of the conversation, calls, or meeting agreements..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:border-market-700 focus:ring-4 focus:ring-market-100 transition-all"
                  />
                  <div className="flex justify-end border-t border-slate-100 dark:border-slate-850 pt-3">
                    <Button type="submit" variant="primary" disabled={!contactRemarks.trim()}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Log Discussion
                    </Button>
                  </div>
                </form>
              </Card>

              {/* History list card */}
              <Card title="Discussion History Timeline">
                <div className="relative border-l-2 border-slate-200 dark:border-slate-850 pl-5 ml-2.5 space-y-6 py-2">
                  {customer.contactHistory?.length === 0 ? (
                    <div className="py-6 text-center text-sm font-semibold text-slate-450 -ml-5">
                      No discussions logged yet.
                    </div>
                  ) : (
                    customer.contactHistory?.map((log: any) => (
                      <div key={log.id} className="relative">
                        {/* Timeline point accent */}
                        <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-market-600 ring-4 ring-white dark:ring-slate-950"></span>
                        
                        <div className="space-y-1 bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-xl shadow-sm">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <Badge variant={log.type === 'Meeting' ? 'warning' : log.type === 'Call' ? 'info' : 'neutral'}>
                              {log.type}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(log.date).toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{log.remarks}</p>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Logged by: <span className="text-market-700 dark:text-market-400">{log.userName}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <Card title="Audit Activity Trails" subtitle="System records of profile changes, logs, and document additions.">
              <div className="relative border-l-2 border-slate-200 dark:border-slate-850 pl-5 ml-2.5 space-y-5 py-2">
                {customer.activities?.length === 0 ? (
                  <div className="py-6 text-center text-sm font-semibold text-slate-450 -ml-5">
                    No activities logged.
                  </div>
                ) : (
                  customer.activities?.map((act: any) => (
                    <div key={act.id} className="relative">
                      {/* Timeline point accent */}
                      <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-slate-400 ring-4 ring-white dark:ring-slate-950"></span>
                      
                      <div className="text-sm">
                        <span className="font-extrabold text-slate-900 dark:text-white block sm:inline">{act.action}</span>
                        <span className="text-slate-400 text-xs font-semibold sm:ml-2">({new Date(act.timestamp).toLocaleString()})</span>
                        <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mt-1 leading-snug">{act.details}</p>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Operator: {act.userName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
