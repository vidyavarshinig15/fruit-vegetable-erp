export enum ShopId {
  RAJ_FRUITS_AND_VEGETABLES = '11111111-1111-1111-1111-111111111111',
  G_R_FRUITS_AND_VEGETABLES = '22222222-2222-2222-2222-222222222222',
  PRIYAKRISHNA_FRUITS_AND_VEGETABLES = '33333333-3333-3333-3333-333333333333',
}

export interface ShopInfo {
  id: ShopId;
  code: string;
  name: string;
  shortName: string;
  tagline: string;
  primaryColor: string;
  badgeBg: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface BackupPreferences {
  daily: boolean;
  retentionDays: number;
}

export interface ShopDetails extends ShopInfo {
  ownerName: string;
  logoUrl?: string | null;
  mobileNumber: string;
  alternateNumber?: string | null;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description?: string | null;
  invoicePrefix: string;
  receiptPrefix: string;
  defaultLanguage: 'en' | 'kn';
  currency: string;
  status: 'active' | 'inactive';
  createdAt: string;
  themeColor: 'green' | 'blue' | 'orange';
  notificationPreferences: NotificationPreferences;
  backupPreferences: BackupPreferences;
}

export interface UpdateShopDTO {
  name?: string;
  ownerName?: string;
  mobileNumber?: string;
  alternateNumber?: string | null;
  email?: string | null;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  description?: string | null;
  invoicePrefix?: string;
  receiptPrefix?: string;
  defaultLanguage?: 'en' | 'kn';
  currency?: string;
  themeColor?: 'green' | 'blue' | 'orange';
  notificationPreferences?: Partial<NotificationPreferences>;
  backupPreferences?: Partial<BackupPreferences>;
}

