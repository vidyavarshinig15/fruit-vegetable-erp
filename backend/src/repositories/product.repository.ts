import { ShopId, Product, Category, PriceHistory, CreateProductDTO, UpdateProductDTO, CreateCategoryDTO, ProductFilterQuery, ProductUnit, mapUnitToEnum } from '@raju-billing/shared';
import { db } from '../database/index.js';

// Helpers to map snake_case Postgres fields to camelCase Typescript fields
export const mapDbToProduct = (dbRow: any): Product => {
  const isFav = dbRow.description?.includes('[FAVOURITE]') || false;
  const kannadaMatch = dbRow.description?.match(/\[KANNADA:(.*?)\]/);
  const kName = kannadaMatch ? kannadaMatch[1] : '';
  const desc = dbRow.description
    ?.replace('[FAVOURITE]', '')
    ?.replace(/\[KANNADA:.*?\]/, '')
    ?.trim() || null;
  
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    categoryId: dbRow.category_id,
    name: dbRow.name,
    code: dbRow.code,
    unitType: dbRow.unit_type as ProductUnit,
    defaultRate: Number(dbRow.default_rate),
    minRate: Number(dbRow.min_rate),
    maxRate: Number(dbRow.max_rate),
    imageUrl: dbRow.image_url,
    description: desc,
    status: dbRow.status,
    isFavourite: isFav,
    notes: dbRow.notes || '',
    kannadaName: kName,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
};

export const mapDbToCategory = (dbRow: any): Category => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    name: dbRow.name,
    code: dbRow.code,
    description: dbRow.description,
    displayOrder: dbRow.display_order ?? 0,
    status: dbRow.status,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
};

export const mapDbToPriceHistory = (dbRow: any, createdByName = 'System'): PriceHistory => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    productId: dbRow.product_id,
    effectiveDate: dbRow.effective_date,
    ratePerUnit: Number(dbRow.rate_per_unit),
    unitType: dbRow.unit_type as ProductUnit,
    remarks: dbRow.remarks,
    createdByName,
    createdAt: dbRow.created_at,
  };
};

class ProductRepository {
  
  // --- Category Methods ---

  async findCategoryById(id: string): Promise<Category | null> {
    const rows = await db.query(`categories?id=eq.${id}`);
    return rows.length > 0 ? mapDbToCategory(rows[0]) : null;
  }

  async findCategoryByName(shopId: ShopId, name: string): Promise<Category | null> {
    const rows = await db.query(`categories?shop_id=eq.${shopId}&name=eq.${encodeURIComponent(name)}&is_deleted=eq.false`);
    return rows.length > 0 ? mapDbToCategory(rows[0]) : null;
  }

  async findAllCategories(shopId: ShopId): Promise<Category[]> {
    const rows = await db.query(`categories?shop_id=eq.${shopId}&is_deleted=eq.false&order=display_order.asc`);
    return rows.map(mapDbToCategory);
  }

  async createCategory(shopId: ShopId, dto: CreateCategoryDTO, userId?: string): Promise<Category> {
    const existing = await this.findCategoryByName(shopId, dto.name);
    if (existing) throw new Error('DUPLICATE_CATEGORY_NAME');

    const categoriesCount = (await this.findAllCategories(shopId)).length;
    const body = {
      shop_id: shopId,
      name: dto.name,
      code: dto.code || null,
      description: dto.description || null,
      display_order: categoriesCount + 1,
      status: 'active',
      is_deleted: false,
      created_by: userId || null,
      updated_by: userId || null,
    };

    const rows = await db.query('categories', { method: 'POST', body });
    return mapDbToCategory(rows[0]);
  }

  // --- Product Methods ---

  async findProductById(id: string): Promise<Product | null> {
    const rows = await db.query(`products?id=eq.${id}&is_deleted=eq.false`);
    return rows.length > 0 ? mapDbToProduct(rows[0]) : null;
  }

  async findProductByName(shopId: ShopId, name: string): Promise<Product | null> {
    const rows = await db.query(`products?shop_id=eq.${shopId}&name=eq.${encodeURIComponent(name)}&is_deleted=eq.false`);
    return rows.length > 0 ? mapDbToProduct(rows[0]) : null;
  }

  async findAllProducts(shopId: ShopId, query: ProductFilterQuery = {}): Promise<{ products: Product[]; total: number }> {
    // Read all products for the shop and filter client-side to ensure maximum robustness
    const rows = await db.query(`products?shop_id=eq.${shopId}&is_deleted=eq.false`);
    let list = rows.map(mapDbToProduct);

    if (query.categoryId) {
      list = list.filter((p) => p.categoryId === query.categoryId);
    }
    if (query.status) {
      list = list.filter((p) => p.status === query.status);
    }
    if (query.isFavourite !== undefined) {
      list = list.filter((p) => p.isFavourite === query.isFavourite);
    }
    if (query.unitType) {
      const targetUnit = mapUnitToEnum(query.unitType);
      list = list.filter((p) => p.unitType === targetUnit);
    }

    if (query.search) {
      const s = query.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.kannadaName && p.kannadaName.toLowerCase().includes(s)) ||
          (p.code && p.code.toLowerCase().includes(s)) ||
          p.unitType.toLowerCase().includes(s)
      );
    }

    // Sort: Favourites first, then by name
    list.sort((a, b) => {
      if (a.isFavourite && !b.isFavourite) return -1;
      if (!a.isFavourite && b.isFavourite) return 1;
      return a.name.localeCompare(b.name);
    });

    const total = list.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 100;
    const startIndex = (page - 1) * limit;

    const paginated = list.slice(startIndex, startIndex + limit);
    return { products: paginated, total };
  }

  async createProduct(shopId: ShopId, dto: CreateProductDTO, userId: string, userName: string): Promise<Product> {
    const existing = await this.findProductByName(shopId, dto.name);
    if (existing) throw new Error('DUPLICATE_PRODUCT_NAME');

    const mappedUnit = mapUnitToEnum(dto.unitType);
    
    let finalDescription: string | null = dto.description || '';
    if (dto.isFavourite) {
      finalDescription = `${finalDescription.trim()}\n[FAVOURITE]`;
    }
    if (dto.kannadaName) {
      finalDescription = `${finalDescription.trim()}\n[KANNADA:${dto.kannadaName.trim()}]`;
    }
    finalDescription = finalDescription.trim() || null;

    // Helper to perform single product insert
    const insertForShop = async (targetShopId: ShopId, categoryName: string | null): Promise<any> => {
      let categoryIdToUse: string | null = null;
      if (categoryName) {
        const catRows = await db.query(`categories?shop_id=eq.${targetShopId}&name=eq.${encodeURIComponent(categoryName)}&is_deleted=eq.false`);
        if (catRows.length > 0) {
          categoryIdToUse = catRows[0].id;
        }
      }

      const body = {
        shop_id: targetShopId,
        category_id: categoryIdToUse,
        name: dto.name,
        code: dto.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000), // Auto-code
        unit_type: mappedUnit,
        default_rate: dto.defaultRate,
        min_rate: dto.minRate,
        image_url: dto.imageUrl || null,
        description: finalDescription,
        status: 'active',
        is_deleted: false,
        created_by: userId || null,
        updated_by: userId || null,
      };

      const rows = await db.query('products', { method: 'POST', body });
      const createdProd = mapDbToProduct(rows[0]);

      // Initial Price History Record
      await db.query('price_history', {
        method: 'POST',
        body: {
          shop_id: targetShopId,
          product_id: createdProd.id,
          effective_date: new Date().toISOString().split('T')[0],
          rate_per_unit: createdProd.defaultRate,
          unit_type: createdProd.unitType,
          remarks: 'Initial registered base price',
          created_by: userId || null,
          updated_by: userId || null,
        }
      });
      return createdProd;
    };

    // Find category name to match in other shops
    let sourceCategoryName: string | null = null;
    if (dto.categoryId) {
      const sourceCat = await this.findCategoryById(dto.categoryId);
      if (sourceCat) {
        sourceCategoryName = sourceCat.name;
      }
    }

    const primaryProduct = await insertForShop(shopId, sourceCategoryName);

    // Replicate to all other shops
    const otherShops: ShopId[] = [
      '11111111-1111-1111-1111-111111111111' as ShopId,
      '22222222-2222-2222-2222-222222222222' as ShopId,
      '33333333-3333-3333-3333-333333333333' as ShopId
    ].filter(sId => sId !== shopId);

    for (const otherShopId of otherShops) {
      try {
        const dupCheck = await this.findProductByName(otherShopId, dto.name);
        if (!dupCheck) {
          await insertForShop(otherShopId, sourceCategoryName);
        }
      } catch (err) {
        console.error(`Failed to replicate product to shop ${otherShopId}`, err);
      }
    }

    return primaryProduct;
  }

  async updateProduct(id: string, dto: UpdateProductDTO, userId: string, userName: string): Promise<Product | null> {
    const original = await this.findProductById(id);
    if (!original) return null;

    if (dto.name && dto.name.toLowerCase().trim() !== original.name.toLowerCase().trim()) {
      const duplicate = await this.findProductByName(original.shopId, dto.name);
      if (duplicate && duplicate.id !== id) throw new Error('DUPLICATE_PRODUCT_NAME');
    }

    const mappedUnit = dto.unitType ? mapUnitToEnum(dto.unitType) : original.unitType;
    const isFavourite = dto.isFavourite !== undefined ? dto.isFavourite : original.isFavourite;
    const inputDesc = dto.description !== undefined ? dto.description : original.description;
    const kName = dto.kannadaName !== undefined ? dto.kannadaName : original.kannadaName;

    let finalDescription: string | null = inputDesc || '';
    if (isFavourite) {
      finalDescription = `${finalDescription.trim()}\n[FAVOURITE]`;
    }
    if (kName) {
      finalDescription = `${finalDescription.trim()}\n[KANNADA:${kName.trim()}]`;
    }
    finalDescription = finalDescription.trim() || null;

    // Helper to update a product record
    const updateForProduct = async (prodId: string, shopId: ShopId, origDefaultRate: number): Promise<Product> => {
      let targetCategoryId = dto.categoryId;
      // If categoryId is changing, try to map it by name to this shop's category
      if (dto.categoryId && dto.categoryId !== original.categoryId) {
        const newCat = await this.findCategoryById(dto.categoryId);
        if (newCat) {
          const mappedCatRows = await db.query(`categories?shop_id=eq.${shopId}&name=eq.${encodeURIComponent(newCat.name)}&is_deleted=eq.false`);
          if (mappedCatRows.length > 0) {
            targetCategoryId = mappedCatRows[0].id;
          }
        }
      }

      const body: any = {
        category_id: targetCategoryId !== undefined ? targetCategoryId : undefined,
        name: dto.name || undefined,
        unit_type: mappedUnit,
        default_rate: dto.defaultRate !== undefined ? dto.defaultRate : undefined,
        min_rate: dto.minRate !== undefined ? dto.minRate : undefined,
        image_url: dto.imageUrl !== undefined ? dto.imageUrl : undefined,
        description: finalDescription,
        status: dto.status || undefined,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      };

      // Filter out undefined fields
      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const rows = await db.query(`products?id=eq.${prodId}`, { method: 'PATCH', body });
      const updated = mapDbToProduct(rows[0]);

      // Check if price has changed! If yes, record price history log
      if (dto.defaultRate !== undefined && dto.defaultRate !== origDefaultRate) {
        await db.query('price_history', {
          method: 'POST',
          body: {
            shop_id: shopId,
            product_id: prodId,
            effective_date: new Date().toISOString().split('T')[0],
            rate_per_unit: dto.defaultRate,
            unit_type: updated.unitType,
            remarks: dto.notes || 'Product selling price update',
            created_by: userId || null,
            updated_by: userId || null,
          }
        });
      }
      return updated;
    };

    const updatedPrimary = await updateForProduct(id, original.shopId, original.defaultRate);

    // Find and update matching products in other shops by original name
    const allProducts = await db.query(`products?name=eq.${encodeURIComponent(original.name)}&is_deleted=eq.false`);
    for (const pRow of allProducts) {
      if (pRow.id !== id) {
        try {
          await updateForProduct(pRow.id, pRow.shop_id, Number(pRow.default_rate));
        } catch (err) {
          console.error(`Failed to replicate product update for product id ${pRow.id}`, err);
        }
      }
    }

    return updatedPrimary;
  }

  async archiveProduct(id: string, userId: string): Promise<boolean> {
    const original = await this.findProductById(id);
    if (!original) return false;

    const body = {
      is_deleted: true,
      status: 'archived',
      deleted_at: new Date().toISOString(),
      deleted_by: userId || null,
    };

    // Find all products by original name across shops
    const matchingProducts = await db.query(`products?name=eq.${encodeURIComponent(original.name)}&is_deleted=eq.false`);
    for (const pRow of matchingProducts) {
      await db.query(`products?id=eq.${pRow.id}`, { method: 'PATCH', body });
    }

    return true;
  }

  async activateProduct(id: string, userId: string): Promise<boolean> {
    const original = await db.query(`products?id=eq.${id}`);
    if (original.length === 0) return false;
    const name = original[0].name;

    const body = {
      status: 'active',
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    };

    // Find all matching name products across shops (even soft-deleted ones)
    const matchingProducts = await db.query(`products?name=eq.${encodeURIComponent(name)}`);
    for (const pRow of matchingProducts) {
      await db.query(`products?id=eq.${pRow.id}`, { method: 'PATCH', body });
    }

    return true;
  }

  async getPriceHistory(productId: string): Promise<PriceHistory[]> {
    // Select price logs and order descending
    const rows = await db.query(`price_history?product_id=eq.${productId}&is_deleted=eq.false&order=created_at.desc`);
    
    // In our simplified database, we will return system user name since user relation details can be loaded or fallback
    return rows.map((r) => mapDbToPriceHistory(r, 'Wholesale Admin'));
  }
}

export const productRepository = new ProductRepository();
