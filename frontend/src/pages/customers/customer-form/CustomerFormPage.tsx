import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useShop } from '@/contexts/ShopContext';
import { api } from '@/api/client';
import { Save, X, Undo, UserCheck, AlertCircle } from 'lucide-react';

const tagOptions = [
  'VIP',
  'Cash Customer',
  'Weekly Payment',
  'Monthly Payment',
  'Fast Payment',
  'High Credit',
  'New Customer',
];

const businessTypeOptions = [
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Resort', label: 'Resort' },
  { value: 'Cafe', label: 'Cafe' },
  { value: 'Bakery', label: 'Bakery' },
  { value: 'Retail Shop', label: 'Retail Shop' },
  { value: 'Hostel', label: 'Hostel' },
  { value: 'Catering', label: 'Catering' },
  { value: 'Juice Shop', label: 'Juice Shop' },
  { value: 'Other', label: 'Other' },
];

export const CustomerFormPage: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  // Form Field States
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('');
  const [businessType, setBusinessType] = useState('Hotel');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('Weekly Payment');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['New Customer']);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Load existing customer data if in Edit Mode
  useEffect(() => {
    if (isEdit) {
      setIsLoading(true);
      api
        .get(`/customers/${id}`)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            const cust = res.data.data;
            setName(cust.name);
            setOwnerName(cust.ownerName);
            setContactPerson(cust.contactPerson);
            setMobileNumber(cust.mobileNumber);
            setAlternateMobile(cust.alternateMobile || '');
            setWhatsappNumber(cust.whatsappNumber || '');
            setEmail(cust.email || '');
            setAddress(cust.address);
            setArea(cust.area);
            setCity(cust.city);
            setState(cust.state);
            setPincode(cust.pincode);
            setBusinessType(cust.businessType);
            setOpeningBalance(cust.openingBalance);
            setCreditLimit(cust.creditLimit);
            setPaymentTerms(cust.paymentTerms);
            setNotes(cust.notes || '');
            setSelectedTags(cust.tags || []);
          }
        })
        .catch((err) => {
          setGlobalError(err.response?.data?.message || 'Failed to load customer profile data');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEdit]);

  // Set window unsavedChanges flag
  const markDirty = () => {
    (window as any).unsavedChanges = true;
  };

  const clearDirty = () => {
    (window as any).unsavedChanges = false;
  };

  useEffect(() => {
    return () => {
      clearDirty();
    };
  }, []);

  // Tag Toggling Handler
  const handleTagToggle = (tag: string) => {
    markDirty();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Local Validation before API Submit
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const phoneRegex = /^[6-9]\d{9}$/;
    const pinRegex = /^\d{6}$/;

    if (!name.trim()) errors.name = 'Business name is required';
    if (!ownerName.trim()) errors.ownerName = 'Owner name is required';
    if (!contactPerson.trim()) errors.contactPerson = 'Contact person name is required';
    if (!address.trim()) errors.address = 'Business address is required';
    if (!area.trim()) errors.area = 'Area location is required';
    if (!city.trim()) errors.city = 'City name is required';
    if (!state.trim()) errors.state = 'State name is required';

    if (!mobileNumber) {
      errors.mobileNumber = 'Primary mobile number is required';
    } else if (!phoneRegex.test(mobileNumber)) {
      errors.mobileNumber = 'Invalid Indian mobile number (10 digits starting with 6-9)';
    }

    if (alternateMobile && !phoneRegex.test(alternateMobile)) {
      errors.alternateMobile = 'Invalid alternate number format';
    }

    if (whatsappNumber && !phoneRegex.test(whatsappNumber)) {
      errors.whatsappNumber = 'Invalid WhatsApp number format';
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email address format';
    }

    if (!pincode) {
      errors.pincode = 'Pincode is required';
    } else if (!pinRegex.test(pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      setGlobalError('Validation failed: Please check inputs for formatting errors.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        ownerName,
        contactPerson,
        mobileNumber,
        alternateMobile: alternateMobile || null,
        whatsappNumber: whatsappNumber || null,
        email: email || null,
        address,
        area,
        city,
        state,
        pincode,
        businessType,
        openingBalance: Number(openingBalance),
        creditLimit: Number(creditLimit),
        paymentTerms,
        tags: selectedTags,
        notes: notes || null,
      };

      if (isEdit) {
        // Update
        await api.put(`/customers/${id}`, payload);
      } else {
        // Create
        await api.post('/customers', payload);
      }

      clearDirty();
      navigate(isEdit ? `/customers/${id}` : '/customers');
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Database error: Duplicate mobile or business name detected.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-bold text-slate-400">
        Loading customer data schema...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-market-700 dark:text-market-400" />
            {isEdit ? 'Edit Customer Account' : 'Register Wholesale Customer'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            Workspace: <span className="text-market-700 dark:text-market-400 font-black">{activeShop.name}</span>
          </p>
        </div>
        <Link to={isEdit ? `/customers/${id}` : '/customers'}>
          <Button variant="ghost" size="sm" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2">
            <X className="w-4 h-4" /> Cancel
          </Button>
        </Link>
      </div>

      {globalError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-400 font-bold text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Main Form Box */}
      <form onSubmit={handleSubmit} onChange={markDirty} className="space-y-6">
        {/* Business Info Section */}
        <Card title="Business profile details" subtitle="Corporate entity names and tags.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business Trade Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={formErrors.name}
            />
            <Input
              label="Business Owner Name *"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              error={formErrors.ownerName}
            />
            <Input
              label="Primary Contact Person *"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              error={formErrors.contactPerson}
            />
            <Select
              label="Primary Business Type *"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              options={businessTypeOptions}
            />
          </div>
        </Card>

        {/* Contact info Section */}
        <Card title="Contact Information" subtitle="Mobile, WhatsApp numbers, and email accounts.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Primary Mobile Number *"
              required
              placeholder="10 digit Indian number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              error={formErrors.mobileNumber}
            />
            <Input
              label="Alternate Number"
              placeholder="e.g. 9845022222"
              value={alternateMobile}
              onChange={(e) => setAlternateMobile(e.target.value)}
              error={formErrors.alternateMobile}
            />
            <Input
              label="WhatsApp Number"
              placeholder="e.g. 9845011111"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              error={formErrors.whatsappNumber}
            />
            <div className="md:col-span-3">
              <Input
                label="Corporate Email Address"
                type="email"
                placeholder="contact@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={formErrors.email}
              />
            </div>
          </div>
        </Card>

        {/* Location Section */}
        <Card title="Billing Address & Pincode" subtitle="Yard delivery location details.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Delivery Address *"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                error={formErrors.address}
              />
            </div>
            <Input
              label="Market Area / Locality *"
              required
              placeholder="e.g. Yeshwanthpur"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              error={formErrors.area}
            />
            <Input
              label="City *"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={formErrors.city}
            />
            <Input
              label="State *"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              error={formErrors.state}
            />
            <Input
              label="Pincode *"
              required
              placeholder="6 digits Indian code"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              error={formErrors.pincode}
            />
          </div>
        </Card>

        {/* Ledger & Credit Terms Section */}
        <Card title="Ledger Balances & Credit Terms" subtitle="Opening balances and credit thresholds.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Opening Outstanding (₹) *"
              type="number"
              required
              disabled={isEdit}
              helperText="Cannot change after customer creation"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
            />
            <Input
              label="Approved Credit Limit (₹) *"
              type="number"
              required
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
            />
            <Select
              label="Payment Terms *"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              options={[
                { value: 'Spot Cash', label: 'Spot Cash Trades' },
                { value: 'Weekly Payment', label: 'Weekly Settlement' },
                { value: 'Monthly Payment', label: 'Monthly Settlement' },
                { value: '15 Days Credit', label: '15 Days Credit Cycle' },
              ]}
            />
          </div>
        </Card>

        {/* Custom Tags Section */}
        <Card title="Customer Tags" subtitle="Attach category labels.">
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-market-800 text-white border-market-800 shadow-md shadow-market-800/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Notes Section */}
        <Card title="Internal Delivery Directions" subtitle="Private remarks for market delivery logs.">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Delivers before 7 AM only. Collects cash on Saturdays."
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-market-700 focus:ring-4 focus:ring-market-100 transition-all"
          />
        </Card>

        {/* Action Controls */}
        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-850 pt-4">
          <Link to={isEdit ? `/customers/${id}` : '/customers'}>
            <Button type="button" variant="secondary">
              <Undo className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Register Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
};
