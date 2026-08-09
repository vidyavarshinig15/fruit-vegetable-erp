import { ShopId, ShopDetails, SHOPS, UpdateShopDTO } from '@raju-billing/shared';
import { db } from '../database/index.js';

class ShopRepository {
  private shops: Map<ShopId, ShopDetails> = new Map();
  private loaded = false;

  constructor() {
    Object.values(SHOPS).forEach((shop) => {
      this.shops.set(shop.id, { ...shop });
    });
  }

  private async ensureLoaded() {
    if (this.loaded) return;
    try {
      const rows = await db.query('system_settings?setting_key=eq.shop_overrides');
      if (rows.length > 0) {
        const overrides = JSON.parse(rows[0].setting_value);
        for (const [id, shop] of Object.entries(overrides)) {
          this.shops.set(id as ShopId, shop as ShopDetails);
        }
      }
    } catch (e) {
      console.error('Failed to load shop overrides from system_settings:', e);
    }
    this.loaded = true;
  }

  private async saveOverrides() {
    try {
      const overrides: Record<string, ShopDetails> = {};
      this.shops.forEach((shop, id) => {
        overrides[id] = shop;
      });

      const rows = await db.query('system_settings?setting_key=eq.shop_overrides');
      if (rows.length > 0) {
        await db.query(`system_settings?id=eq.${rows[0].id}`, {
          method: 'PATCH',
          body: {
            setting_value: JSON.stringify(overrides),
            updated_at: new Date().toISOString(),
          }
        });
      } else {
        await db.query('system_settings', {
          method: 'POST',
          body: {
            setting_key: 'shop_overrides',
            setting_value: JSON.stringify(overrides),
            description: 'Persisted overrides for shop settings',
            is_public: true,
          }
        });
      }
    } catch (e) {
      console.error('Failed to save shop overrides to system_settings:', e);
    }
  }

  async findById(id: ShopId): Promise<ShopDetails | null> {
    await this.ensureLoaded();
    const shop = this.shops.get(id);
    return shop ? { ...shop } : null;
  }

  async findByName(name: string): Promise<ShopDetails | null> {
    await this.ensureLoaded();
    const normalized = name.toLowerCase().trim();
    for (const shop of this.shops.values()) {
      if (shop.name.toLowerCase().trim() === normalized) {
        return { ...shop };
      }
    }
    return null;
  }

  async findByInvoicePrefix(prefix: string): Promise<ShopDetails | null> {
    await this.ensureLoaded();
    const normalized = prefix.toUpperCase().trim();
    for (const shop of this.shops.values()) {
      if (shop.invoicePrefix.toUpperCase().trim() === normalized) {
        return { ...shop };
      }
    }
    return null;
  }

  async findByReceiptPrefix(prefix: string): Promise<ShopDetails | null> {
    await this.ensureLoaded();
    const normalized = prefix.toUpperCase().trim();
    for (const shop of this.shops.values()) {
      if (shop.receiptPrefix.toUpperCase().trim() === normalized) {
        return { ...shop };
      }
    }
    return null;
  }

  async findAll(query: { search?: string; status?: string } = {}): Promise<ShopDetails[]> {
    await this.ensureLoaded();
    let list = Array.from(this.shops.values());

    if (query.status) {
      list = list.filter((s) => s.status === query.status);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (shop) =>
          shop.name.toLowerCase().includes(s) ||
          shop.ownerName.toLowerCase().includes(s) ||
          shop.mobileNumber.includes(s) ||
          shop.code.toLowerCase().includes(s)
      );
    }

    return list.map((s) => ({ ...s }));
  }

  async update(id: ShopId, dto: UpdateShopDTO): Promise<ShopDetails | null> {
    await this.ensureLoaded();
    const record = this.shops.get(id);
    if (!record) return null;

    // Check for duplicate name if name changes
    if (dto.name && dto.name.toLowerCase().trim() !== record.name.toLowerCase().trim()) {
      const duplicate = await this.findByName(dto.name);
      if (duplicate && duplicate.id !== id) {
        throw new Error('DUPLICATE_SHOP_NAME');
      }
    }

    // Check for duplicate invoice prefix
    if (dto.invoicePrefix && dto.invoicePrefix.toUpperCase().trim() !== record.invoicePrefix.toUpperCase().trim()) {
      const duplicate = await this.findByInvoicePrefix(dto.invoicePrefix);
      if (duplicate && duplicate.id !== id) {
        throw new Error('DUPLICATE_INVOICE_PREFIX');
      }
    }

    // Check for duplicate receipt prefix
    if (dto.receiptPrefix && dto.receiptPrefix.toUpperCase().trim() !== record.receiptPrefix.toUpperCase().trim()) {
      const duplicate = await this.findByReceiptPrefix(dto.receiptPrefix);
      if (duplicate && duplicate.id !== id) {
        throw new Error('DUPLICATE_RECEIPT_PREFIX');
      }
    }

    // Unpack notification preferences
    const notificationPreferences = record.notificationPreferences;
    if (dto.notificationPreferences) {
      Object.assign(notificationPreferences, dto.notificationPreferences);
    }

    // Unpack backup preferences
    const backupPreferences = record.backupPreferences;
    if (dto.backupPreferences) {
      Object.assign(backupPreferences, dto.backupPreferences);
    }

    const updatedRecord: ShopDetails = {
      ...record,
      ...dto,
      notificationPreferences,
      backupPreferences,
      name: dto.name || record.name, // preserve original if empty
      invoicePrefix: dto.invoicePrefix ? dto.invoicePrefix.toUpperCase().trim() : record.invoicePrefix,
      receiptPrefix: dto.receiptPrefix ? dto.receiptPrefix.toUpperCase().trim() : record.receiptPrefix,
    };

    this.shops.set(id, updatedRecord);
    await this.saveOverrides();
    return { ...updatedRecord };
  }

  async updateLogoUrl(id: ShopId, logoUrl: string): Promise<ShopDetails | null> {
    await this.ensureLoaded();
    const record = this.shops.get(id);
    if (!record) return null;

    record.logoUrl = logoUrl;
    this.shops.set(id, record);
    await this.saveOverrides();
    return { ...record };
  }
}

export const shopRepository = new ShopRepository();
