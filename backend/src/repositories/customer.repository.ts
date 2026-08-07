import { ShopId, Customer, CreateCustomerDTO, UpdateCustomerDTO, CustomerFilterQuery, CustomerNote, CustomerDocument, ContactHistory, CustomerActivity } from '@raju-billing/shared';
import crypto from 'crypto';
import { db } from '../database/index.js';

// Initial Seed Data for local testing and immediate evaluation
const SEED_CUSTOMERS: Customer[] = [
  {
    id: '11111111-c111-1111-1111-111111111111',
    shopId: ShopId.RAJ_FRUITS_AND_VEGETABLES,
    customerCode: 'RAJC00001',
    name: 'Suresh Bangalore Veg Inn',
    ownerName: 'Suresh Kumar',
    contactPerson: 'Suresh Kumar',
    mobileNumber: '9845011111',
    alternateMobile: '08022221111',
    whatsappNumber: '9845011111',
    email: 'suresh@veginnhotel.com',
    address: 'Shop 4, Residency Road',
    area: 'Shanti Nagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560025',
    businessType: 'Hotel',
    openingBalance: 15000,
    currentOutstanding: 45000,
    creditLimit: 100000,
    paymentTerms: 'Weekly Payment',
    status: 'active',
    notes: 'Pays every Saturday afternoon without fail.',
    tags: ['VIP', 'Weekly Payment', 'High Credit'],
    customerSince: '2026-01-10T12:00:00.000Z',
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-01-10T12:00:00.000Z',
    notesList: [
      {
        id: 'note_raj_1_1',
        customerId: '11111111-c111-1111-1111-111111111111',
        text: 'Preferred delivery time is before 7 AM.',
        createdByEmail: 'admin@rajuvegetables.com',
        createdByName: 'Raju Super Admin',
        createdAt: '2026-01-12T14:30:00.000Z',
      }
    ],
    documents: [
      {
        id: 'doc_raj_1_1',
        customerId: '11111111-c111-1111-1111-111111111111',
        type: 'Visiting Card',
        name: 'Suresh_Visiting_Card.jpg',
        filePath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        uploadedAt: '2026-01-10T12:30:00.000Z',
      }
    ],
    contactHistory: [
      {
        id: 'log_raj_1_1',
        customerId: '11111111-c111-1111-1111-111111111111',
        type: 'Call',
        remarks: 'Discussed weekly balance payment. Confirmed they will pay on Saturday.',
        date: '2026-07-28T10:00:00.000Z',
        userName: 'Raj Wholesale Manager',
      }
    ],
    activities: [
      {
        id: 'act_raj_1_1',
        customerId: '11111111-c111-1111-1111-111111111111',
        action: 'Customer Created',
        details: 'Initial customer profile created by super admin.',
        timestamp: '2026-01-10T12:00:00.000Z',
        userName: 'Raju Super Admin',
      }
    ]
  },
  {
    id: '22222222-c222-2222-2222-222222222222',
    shopId: ShopId.RAJ_FRUITS_AND_VEGETABLES,
    customerCode: 'RAJC00002',
    name: 'Venkatesh Caterers',
    ownerName: 'Venkatesh Prasad',
    contactPerson: 'Venkatesh Prasad',
    mobileNumber: '9845011112',
    alternateMobile: null,
    whatsappNumber: null,
    email: 'info@venkateshcaterers.com',
    address: 'APMC Market Yard Area',
    area: 'Yeshwanthpur',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560022',
    businessType: 'Catering',
    openingBalance: 0,
    currentOutstanding: 12000,
    creditLimit: 50000,
    paymentTerms: 'Cash Customer',
    status: 'active',
    notes: 'Preferred billing style is spot cash.',
    tags: ['Cash Customer', 'New Customer'],
    customerSince: '2026-03-15T09:00:00.000Z',
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-15T09:00:00.000Z',
    notesList: [],
    documents: [],
    contactHistory: [],
    activities: [
      {
        id: 'act_raj_2_1',
        customerId: '22222222-c222-2222-2222-222222222222',
        action: 'Customer Created',
        details: 'Initial customer profile created.',
        timestamp: '2026-03-15T09:00:00.000Z',
        userName: 'Raj Wholesale Manager',
      }
    ]
  },
  {
    id: '33333333-c333-3333-3333-333333333333',
    shopId: ShopId.G_R_FRUITS_AND_VEGETABLES,
    customerCode: 'GRC00001',
    name: 'Girish Family Restaurant',
    ownerName: 'Girish Reddy',
    contactPerson: 'Girish Reddy',
    mobileNumber: '9845011113',
    alternateMobile: '08033334444',
    whatsappNumber: '9845011113',
    email: 'girish@restaurant.com',
    address: 'G R Lane, Indiranagar',
    area: 'Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    businessType: 'Restaurant',
    openingBalance: 5000,
    currentOutstanding: 28000,
    creditLimit: 75000,
    paymentTerms: 'Monthly Payment',
    status: 'active',
    notes: 'Clear bills by monthly check payments.',
    tags: ['Monthly Payment', 'High Credit'],
    customerSince: '2026-02-20T10:00:00.000Z',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    notesList: [],
    documents: [],
    contactHistory: [],
    activities: [
      {
        id: 'act_gr_1_1',
        customerId: '33333333-c333-3333-3333-333333333333',
        action: 'Customer Created',
        details: 'Customer profile set up for G R Fruits store.',
        timestamp: '2026-02-20T10:00:00.000Z',
        userName: 'G R Market Manager',
      }
    ]
  }
];

class CustomerRepository {
  private customers: Map<string, Customer> = new Map();

  constructor() {
    SEED_CUSTOMERS.forEach((c) => {
      this.customers.set(c.id, { ...c });
    });
  }

  private generateNextCustomerCode(shopId: ShopId): string {
    let prefix = 'RAJC';
    if (shopId === ShopId.G_R_FRUITS_AND_VEGETABLES) {
      prefix = 'GRC';
    } else if (shopId === ShopId.PRIYAKRISHNA_FRUITS_AND_VEGETABLES) {
      prefix = 'PKC';
    }

    const list = Array.from(this.customers.values()).filter((c) => c.shopId === shopId);
    const count = list.length + 1;
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${String(count).padStart(5, '0')}-${rand}`;
  }

  private async syncFromDb(): Promise<void> {
    try {
      const rows = await db.query('customers');
      for (const row of rows) {
        const id = row.id;
        const existing = this.customers.get(id);
        const mapped: Customer = {
          id: row.id,
          shopId: row.shop_id,
          customerCode: row.customer_code,
          name: row.name,
          ownerName: existing?.ownerName || row.name,
          contactPerson: existing?.contactPerson || row.name,
          mobileNumber: row.mobile_number,
          alternateMobile: row.alternate_mobile || undefined,
          whatsappNumber: existing?.whatsappNumber || row.mobile_number,
          email: row.email || undefined,
          address: row.address || '',
          area: existing?.area || 'APMC Yard',
          city: row.city || 'Bengaluru',
          state: existing?.state || 'Karnataka',
          pincode: row.pincode || '',
          businessType: existing?.businessType || 'Other',
          openingBalance: Number(row.opening_balance || 0),
          currentOutstanding: Number(row.current_balance || 0),
          creditLimit: Number(row.credit_limit || 0),
          paymentTerms: existing?.paymentTerms || 'Cash Customer',
          status: row.status,
          notes: row.notes || '',
          tags: existing?.tags || ['New Customer'],
          customerSince: row.created_at || new Date().toISOString(),
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
          notesList: existing?.notesList || [],
          documents: existing?.documents || [],
          contactHistory: existing?.contactHistory || [],
          activities: existing?.activities || [],
        };
        this.customers.set(id, mapped);
      }
    } catch (err) {
      console.error('Failed to sync customers from DB:', err);
    }
  }

  async findById(id: string): Promise<Customer | null> {
    await this.syncFromDb();
    const c = this.customers.get(id);
    return c ? { ...c } : null;
  }

  async findByMobile(shopId: ShopId, mobile: string): Promise<Customer | null> {
    await this.syncFromDb();
    for (const c of this.customers.values()) {
      if (c.shopId === shopId && c.mobileNumber === mobile && c.status !== 'archived') {
        return { ...c };
      }
    }
    return null;
  }

  async findByWhatsApp(shopId: ShopId, whatsapp: string): Promise<Customer | null> {
    await this.syncFromDb();
    for (const c of this.customers.values()) {
      if (c.shopId === shopId && c.whatsappNumber === whatsapp && c.status !== 'archived') {
        return { ...c };
      }
    }
    return null;
  }

  async findByName(shopId: ShopId, name: string): Promise<Customer | null> {
    await this.syncFromDb();
    const normalized = name.toLowerCase().trim();
    for (const c of this.customers.values()) {
      if (c.shopId === shopId && c.name.toLowerCase().trim() === normalized && c.status !== 'archived') {
        return { ...c };
      }
    }
    return null;
  }

  async findAll(shopId: ShopId, query: CustomerFilterQuery = {}): Promise<{ customers: Customer[]; total: number }> {
    await this.syncFromDb();
    let list = Array.from(this.customers.values()).filter(
      (c) => c.shopId === shopId && c.status !== 'archived'
    );

    if (query.status) {
      list = list.filter((c) => c.status === query.status);
    }
    if (query.businessType) {
      list = list.filter((c) => c.businessType === query.businessType);
    }
    if (query.city) {
      const cy = query.city.toLowerCase().trim();
      list = list.filter((c) => c.city.toLowerCase().trim() === cy);
    }
    if (query.area) {
      const ar = query.area.toLowerCase().trim();
      list = list.filter((c) => c.area.toLowerCase().trim() === ar);
    }
    if (query.outstandingOnly) {
      list = list.filter((c) => c.currentOutstanding > 0);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.ownerName.toLowerCase().includes(s) ||
          c.customerCode.toLowerCase().includes(s) ||
          c.mobileNumber.includes(s) ||
          (c.whatsappNumber && c.whatsappNumber.includes(s)) ||
          c.area.toLowerCase().includes(s) ||
          c.city.toLowerCase().includes(s)
      );
    }

    const total = list.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const startIndex = (page - 1) * limit;

    const paginated = list.slice(startIndex, startIndex + limit).map((c) => ({ ...c }));
    return { customers: paginated, total };
  }

  async create(shopId: ShopId, dto: CreateCustomerDTO, userName: string): Promise<Customer> {
    // 1. Validation checks for duplicate fields inside the same shop
    const duplicateName = await this.findByName(shopId, dto.name);
    if (duplicateName) throw new Error('DUPLICATE_BUSINESS_NAME');

    if (dto.mobileNumber) {
      const duplicateMobile = await this.findByMobile(shopId, dto.mobileNumber);
      if (duplicateMobile) throw new Error('DUPLICATE_MOBILE_NUMBER');
    }

    if (dto.whatsappNumber) {
      const duplicateWA = await this.findByWhatsApp(shopId, dto.whatsappNumber);
      if (duplicateWA) throw new Error('DUPLICATE_WHATSAPP_NUMBER');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const customerCode = this.generateNextCustomerCode(shopId);

    // Insert customer row into PostgreSQL database to satisfy type and FK checks
    await db.query('customers', {
      method: 'POST',
      body: {
        id,
        shop_id: shopId,
        customer_code: customerCode,
        name: dto.name,
        mobile_number: dto.mobileNumber || '9000000000',
        alternate_mobile: dto.alternateMobile || null,
        email: dto.email || null,
        address: dto.address || 'APMC Yard',
        city: dto.city || 'Bengaluru',
        pincode: dto.pincode || '560022',
        credit_limit: dto.creditLimit ?? 0,
        opening_balance: dto.openingBalance ?? 0,
        current_balance: dto.openingBalance ?? 0,
        notes: dto.notes || '',
        status: 'active',
      }
    });

    const record: Customer = {
      id,
      shopId,
      customerCode,
      name: dto.name,
      ownerName: dto.ownerName || dto.name,
      contactPerson: dto.contactPerson || dto.name,
      mobileNumber: dto.mobileNumber || '9000000000',
      alternateMobile: dto.alternateMobile || null,
      whatsappNumber: dto.whatsappNumber || null,
      email: dto.email || null,
      address: dto.address || 'APMC Yard',
      area: dto.area || 'APMC Yard',
      city: dto.city || 'Bengaluru',
      state: dto.state || 'Karnataka',
      pincode: dto.pincode || '560022',
      businessType: dto.businessType || 'Other',
      openingBalance: dto.openingBalance ?? 0,
      currentOutstanding: dto.openingBalance ?? 0, // initially outstanding is opening balance
      creditLimit: dto.creditLimit ?? 0,
      paymentTerms: dto.paymentTerms || 'Weekly Payment',
      status: 'active',
      tags: dto.tags || ['New Customer'],
      customerSince: now,
      createdAt: now,
      updatedAt: now,
      notesList: [],
      documents: [],
      contactHistory: [],
      activities: [
        {
          id: `act_${Date.now()}`,
          customerId: id,
          action: 'Customer Created',
          details: `Initial profile registered under code ${customerCode}.`,
          timestamp: now,
          userName,
        }
      ]
    };

    this.customers.set(id, record);
    return { ...record };
  }

  async update(id: string, dto: UpdateCustomerDTO, userName: string): Promise<Customer | null> {
    await this.syncFromDb();
    const record = this.customers.get(id);
    if (!record) return null;

    const shopId = record.shopId;

    // Duplicates Checks
    if (dto.name && dto.name.toLowerCase().trim() !== record.name.toLowerCase().trim()) {
      const duplicate = await this.findByName(shopId, dto.name);
      if (duplicate && duplicate.id !== id) throw new Error('DUPLICATE_BUSINESS_NAME');
    }

    if (dto.mobileNumber && dto.mobileNumber !== record.mobileNumber) {
      const duplicate = await this.findByMobile(shopId, dto.mobileNumber);
      if (duplicate && duplicate.id !== id) throw new Error('DUPLICATE_MOBILE_NUMBER');
    }

    if (dto.whatsappNumber && dto.whatsappNumber !== record.whatsappNumber) {
      const duplicate = await this.findByWhatsApp(shopId, dto.whatsappNumber);
      if (duplicate && duplicate.id !== id) throw new Error('DUPLICATE_WHATSAPP_NUMBER');
    }

    const now = new Date().toISOString();
    
    // Log updates
    const details = [];
    if (dto.name && dto.name !== record.name) details.push(`name to "${dto.name}"`);
    if (dto.mobileNumber && dto.mobileNumber !== record.mobileNumber) details.push(`phone to "${dto.mobileNumber}"`);
    if (dto.creditLimit !== undefined && dto.creditLimit !== record.creditLimit) details.push(`credit limit to "${dto.creditLimit}"`);
    if (dto.status && dto.status !== record.status) details.push(`status to "${dto.status}"`);

    const updateDetails = details.length > 0 ? `Updated: ${details.join(', ')}` : 'Profile details updated.';
    const activities = record.activities || [];
    activities.unshift({
      id: `act_${Date.now()}`,
      customerId: id,
      action: 'Customer Updated',
      details: updateDetails,
      timestamp: now,
      userName,
    });

    const updatedRecord: Customer = {
      ...record,
      ...dto,
      activities,
      tags: dto.tags || record.tags,
      updatedAt: now,
    };

    // Update DB
    const body: any = {};
    if (dto.name !== undefined) body.name = dto.name;
    if (dto.mobileNumber !== undefined) body.mobile_number = dto.mobileNumber;
    if (dto.alternateMobile !== undefined) body.alternate_mobile = dto.alternateMobile || null;
    if (dto.email !== undefined) body.email = dto.email || null;
    if (dto.address !== undefined) body.address = dto.address;
    if (dto.city !== undefined) body.city = dto.city;
    if (dto.pincode !== undefined) body.pincode = dto.pincode;
    if (dto.creditLimit !== undefined) body.credit_limit = dto.creditLimit;
    if (dto.status !== undefined) body.status = dto.status;
    body.updated_at = now;

    await db.query(`customers?id=eq.${id}`, { method: 'PATCH', body });

    this.customers.set(id, updatedRecord);
    return { ...updatedRecord };
  }

  async archive(id: string, userName: string): Promise<boolean> {
    await this.syncFromDb();
    const record = this.customers.get(id);
    if (!record) return false;

    const now = new Date().toISOString();
    const activities = record.activities || [];
    activities.unshift({
      id: `act_${Date.now()}`,
      customerId: id,
      action: 'Customer Updated',
      details: 'Account profile set to Archived.',
      timestamp: now,
      userName,
    });

    record.status = 'archived';
    record.activities = activities;
    record.updatedAt = now;

    await db.query(`customers?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        status: 'archived',
        is_deleted: true,
        deleted_at: now,
      }
    });
    
    this.customers.set(id, record);
    return true;
  }

  async activate(id: string, userName: string): Promise<boolean> {
    await this.syncFromDb();
    const record = this.customers.get(id);
    if (!record) return false;

    const now = new Date().toISOString();
    const activities = record.activities || [];
    activities.unshift({
      id: `act_${Date.now()}`,
      customerId: id,
      action: 'Customer Updated',
      details: 'Account profile set to Active.',
      timestamp: now,
      userName,
    });

    record.status = 'active';
    record.activities = activities;
    record.updatedAt = now;

    await db.query(`customers?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        status: 'active',
        updated_at: now,
      }
    });
    
    this.customers.set(id, record);
    return true;
  }

  async addNote(id: string, text: string, user: { email: string; fullName: string }): Promise<CustomerNote | null> {
    const record = this.customers.get(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const note: CustomerNote = {
      id: `note_${Date.now()}`,
      customerId: id,
      text,
      createdByEmail: user.email,
      createdByName: user.fullName,
      createdAt: now,
    };

    const notesList = record.notesList || [];
    notesList.unshift(note);
    record.notesList = notesList;

    const activities = record.activities || [];
    activities.unshift({
      id: `act_${Date.now()}`,
      customerId: id,
      action: 'Notes Added',
      details: 'Added internal note comment.',
      timestamp: now,
      userName: user.fullName,
    });
    record.activities = activities;
    record.updatedAt = now;

    this.customers.set(id, record);
    return note;
  }

  async deleteNote(id: string, noteId: string, userName: string): Promise<boolean> {
    const record = this.customers.get(id);
    if (!record) return false;

    const originalLength = record.notesList?.length || 0;
    record.notesList = (record.notesList || []).filter((n) => n.id !== noteId);
    
    if ((record.notesList?.length || 0) < originalLength) {
      const now = new Date().toISOString();
      const activities = record.activities || [];
      activities.unshift({
        id: `act_${Date.now()}`,
        customerId: id,
        action: 'Customer Updated',
        details: 'Deleted internal note comment.',
        timestamp: now,
        userName,
      });
      record.activities = activities;
      record.updatedAt = now;
      this.customers.set(id, record);
      return true;
    }
    return false;
  }

  async uploadDocument(
    id: string,
    type: 'GST Certificate' | 'Business License' | 'Visiting Card' | 'Shop Photo' | 'Customer Agreement' | 'Other Documents',
    name: string,
    filePath: string,
    userName: string
  ): Promise<CustomerDocument | null> {
    const record = this.customers.get(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const doc: CustomerDocument = {
      id: `doc_${Date.now()}`,
      customerId: id,
      type,
      name,
      filePath,
      uploadedAt: now,
    };

    const documents = record.documents || [];
    documents.unshift(doc);
    record.documents = documents;

    const activities = record.activities || [];
    activities.unshift({
      id: `act_${Date.now()}`,
      customerId: id,
      action: 'Documents Uploaded',
      details: `Uploaded document: ${type} (${name}).`,
      timestamp: now,
      userName,
    });
    record.activities = activities;
    record.updatedAt = now;

    this.customers.set(id, record);
    return doc;
  }

  async addContactHistory(
    id: string,
    type: 'Call' | 'Meeting' | 'Discussion',
    remarks: string,
    date: string,
    userName: string
  ): Promise<ContactHistory | null> {
    const record = this.customers.get(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const log: ContactHistory = {
      id: `log_${Date.now()}`,
      customerId: id,
      type,
      remarks,
      date: date || now,
      userName,
    };

    const contactHistory = record.contactHistory || [];
    contactHistory.unshift(log);
    record.contactHistory = contactHistory;

    const activities = record.activities || [];
    activities.unshift({
      id: `act_${Date.now()}`,
      customerId: id,
      action: 'Contact Logged',
      details: `Logged ${type} discussion details.`,
      timestamp: now,
      userName,
    });
    record.activities = activities;
    record.updatedAt = now;

    this.customers.set(id, record);
    return log;
  }

  updateCurrentOutstanding(id: string, newBalance: number): void {
    const record = this.customers.get(id);
    if (record) {
      record.currentOutstanding = newBalance;
      this.customers.set(id, record);
    }
  }
}

export const customerRepository = new CustomerRepository();
