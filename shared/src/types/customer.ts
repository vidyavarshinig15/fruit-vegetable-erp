import { ShopId } from './shop.js';

export type BusinessType =
  | 'Hotel'
  | 'Restaurant'
  | 'Resort'
  | 'Cafe'
  | 'Bakery'
  | 'Retail Shop'
  | 'Hostel'
  | 'Catering'
  | 'Juice Shop'
  | 'Other';

export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'archived';

export interface CustomerNote {
  id: string;
  customerId: string;
  text: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: string;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  type: 'GST Certificate' | 'Business License' | 'Visiting Card' | 'Shop Photo' | 'Customer Agreement' | 'Other Documents';
  name: string;
  filePath: string; // Stored as Base64 or local path
  uploadedAt: string;
}

export interface ContactHistory {
  id: string;
  customerId: string;
  type: 'Call' | 'Meeting' | 'Discussion';
  remarks: string;
  date: string;
  userName: string;
}

export interface CustomerActivity {
  id: string;
  customerId: string;
  action: 'Customer Created' | 'Customer Updated' | 'Profile Viewed' | 'Documents Uploaded' | 'Notes Added' | 'Contact Logged';
  details: string;
  timestamp: string;
  userName: string;
}

export interface Customer {
  id: string;
  shopId: ShopId;
  customerCode: string;
  name: string;
  ownerName: string;
  contactPerson: string;
  mobileNumber: string;
  alternateMobile?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  businessType: BusinessType;
  openingBalance: number;
  currentOutstanding: number;
  creditLimit: number;
  paymentTerms: string;
  status: CustomerStatus;
  notes?: string | null;
  tags: string[];
  customerSince: string;
  createdAt: string;
  updatedAt: string;
  notesList?: CustomerNote[];
  documents?: CustomerDocument[];
  contactHistory?: ContactHistory[];
  activities?: CustomerActivity[];
}

export interface CreateCustomerDTO {
  name: string;
  ownerName?: string;
  contactPerson?: string;
  mobileNumber?: string | null;
  alternateMobile?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string | null;
  businessType?: BusinessType;
  openingBalance?: number;
  creditLimit?: number;
  paymentTerms?: string;
  tags?: string[];
  notes?: string | null;
}

export interface UpdateCustomerDTO {
  name?: string;
  ownerName?: string;
  contactPerson?: string;
  mobileNumber?: string;
  alternateMobile?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  businessType?: BusinessType;
  creditLimit?: number;
  paymentTerms?: string;
  status?: CustomerStatus;
  tags?: string[];
  notes?: string | null;
}

export interface CustomerFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  businessType?: BusinessType;
  status?: CustomerStatus;
  city?: string;
  area?: string;
  outstandingOnly?: boolean;
  pendingBillsOnly?: boolean;
}
