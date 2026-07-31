export enum ShopId {
  RAJ_FRUITS_AND_VEGETABLES = 'RAJ_FRUITS_AND_VEGETABLES',
  G_R_FRUITS_AND_VEGETABLES = 'G_R_FRUITS_AND_VEGETABLES',
  PRIYAKRISHNA_FRUITS_AND_VEGETABLES = 'PRIYAKRISHNA_FRUITS_AND_VEGETABLES',
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

