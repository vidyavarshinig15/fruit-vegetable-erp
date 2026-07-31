import { ShopId } from './shop.js';

export type OrderStatus = 'UPLOADED' | 'PROCESSING' | 'OCR_COMPLETED' | 'VERIFICATION_PENDING' | 'VERIFIED' | 'INVOICE_GENERATED' | 'CANCELLED';

export type OcrConfidence = 'High' | 'Medium' | 'Low';

export interface OcrSuggestion {
  matchedProductId: string;
  productName: string;
  confidence: OcrConfidence;
  reason: string;
}

export interface OcrItem {
  productName: string;
  quantity: number;
  unitType: string;
  matchedProductId?: string | null;
  confidence: OcrConfidence;
  status: 'Matched' | 'Unmatched' | 'Conflict';
  suggestion?: OcrSuggestion | null;
}

export interface UploadedOrder {
  id: string;
  shopId: ShopId;
  customerId: string;
  orderNumber?: string | null;
  filePath: string;
  fileType: string;
  fileSizeBytes: number;
  ocrStatus: OrderStatus;
  ocrRawText?: string | null; // Stores JSON: { items: OcrItem[], rawText?: string }
  processedInvoiceId?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export interface OrderFilterQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: OrderStatus;
  search?: string;
}
