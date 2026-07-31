import { ShopId } from './shop.js';

export type ProductUnit = 'KG' | 'CRATE' | 'BAG' | 'QUINTAL' | 'BOX' | 'PIECE' | 'DOZEN';

export type ProductStatus = 'active' | 'inactive' | 'archived';

export interface Category {
  id: string;
  shopId: ShopId;
  name: string;
  code?: string | null;
  description?: string | null;
  displayOrder: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  shopId: ShopId;
  categoryId?: string | null;
  name: string;
  code?: string | null;
  unitType: ProductUnit;
  defaultRate: number; // Current Selling Price
  minRate: number; // Minimum Price
  maxRate: number; // Maximum Price (Optional/Future)
  imageUrl?: string | null;
  description?: string | null;
  status: ProductStatus;
  isFavourite: boolean;
  notes?: string | null;
  kannadaName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  shopId: ShopId;
  productId: string;
  effectiveDate: string;
  ratePerUnit: number;
  unitType: ProductUnit;
  remarks?: string | null;
  createdByName: string;
  createdAt: string;
}

export interface CreateProductDTO {
  name: string;
  kannadaName?: string | null;
  categoryId?: string | null;
  unitType: string; // From UI selection list (e.g. Kg, Gram, Piece, etc.)
  defaultRate: number;
  minRate: number;
  imageUrl?: string | null;
  description?: string | null;
  notes?: string | null;
  isFavourite?: boolean;
}

export interface UpdateProductDTO {
  name?: string;
  kannadaName?: string | null;
  categoryId?: string | null;
  unitType?: string;
  defaultRate?: number;
  minRate?: number;
  imageUrl?: string | null;
  description?: string | null;
  notes?: string | null;
  isFavourite?: boolean;
  status?: ProductStatus;
}

export interface CreateCategoryDTO {
  name: string;
  code?: string | null;
  description?: string | null;
}

export interface ProductFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  unitType?: string;
  isFavourite?: boolean;
  recentlyUpdated?: boolean;
}

// Unit mapper helper to map UI units safely to PostgreSQL Enum limits
export const mapUnitToEnum = (unit: string): ProductUnit => {
  const u = unit.toLowerCase().trim();
  if (u === 'kg' || u === 'gram' || u === 'litre' || u === 'millilitre') return 'KG';
  if (u === 'crate' || u === 'tray') return 'CRATE';
  if (u === 'bag' || u === 'bundle') return 'BAG';
  if (u === 'box' || u === 'packet') return 'BOX';
  if (u === 'piece' || u === 'no.') return 'PIECE';
  if (u === 'dozen') return 'DOZEN';
  if (u === 'quintal') return 'QUINTAL';
  
  // Enforce standard uppercase enum types
  const upper = unit.toUpperCase();
  if (['KG', 'CRATE', 'BAG', 'QUINTAL', 'BOX', 'PIECE', 'DOZEN'].includes(upper)) {
    return upper as ProductUnit;
  }
  return 'KG';
};
