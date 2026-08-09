import { ShopId, UploadedOrder, OcrItem, OrderStatus, OrderFilterQuery, OcrConfidence } from '@raju-billing/shared';
import { db } from '../database/index.js';
import fs from 'fs';
import path from 'path';
import { parsePdfContent } from '../utils/pdfParser.js';
import { parseImageOcr, parseTextOrderLines } from '../utils/ocrParser.js';

// Helper to map Postgres SQL fields to Typescript camelCase fields
export const mapDbToOrder = (dbRow: any, createdByName = 'System'): UploadedOrder => {
  return {
    id: dbRow.id,
    shopId: dbRow.shop_id,
    customerId: dbRow.customer_id,
    orderNumber: dbRow.order_number,
    filePath: dbRow.file_path,
    fileType: dbRow.file_type,
    fileSizeBytes: Number(dbRow.file_size_bytes),
    ocrStatus: dbRow.ocr_status as OrderStatus,
    ocrRawText: dbRow.ocr_raw_text,
    processedInvoiceId: dbRow.processed_invoice_id || null,
    notes: dbRow.notes || '',
    status: dbRow.status,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
    createdByName,
  };
};

class OrderRepository {

  async findOrderById(id: string): Promise<UploadedOrder | null> {
    const rows = await db.query(`customer_uploaded_orders?id=eq.${id}`);
    return rows.length > 0 ? mapDbToOrder(rows[0]) : null;
  }

  async findAllOrders(shopId: ShopId, query: OrderFilterQuery = {}): Promise<{ orders: UploadedOrder[]; total: number }> {
    const rows = await db.query(`customer_uploaded_orders?shop_id=eq.${shopId}&is_deleted=eq.false`);
    let list = rows.map((r) => mapDbToOrder(r, 'Wholesale Operator'));

    if (query.customerId) {
      list = list.filter((o) => o.customerId === query.customerId);
    }
    if (query.status) {
      list = list.filter((o) => o.ocrStatus === query.status);
    }

    if (query.search) {
      const s = query.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.filePath.toLowerCase().includes(s) ||
          (o.orderNumber && o.orderNumber.toLowerCase().includes(s))
      );
    }

    // Sort: newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10000;
    const startIndex = (page - 1) * limit;

    const paginated = list.slice(startIndex, startIndex + limit);
    return { orders: paginated, total };
  }

  private getLevenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }

  public async matchOcrItemsToShopCatalog(
    shopId: ShopId,
    customerId: string | undefined,
    rawItems: { productName: string; quantity: number; unitType: string }[]
  ): Promise<OcrItem[]> {
    // Load active products of this shop context
    const productsRes = await db.query(`products?shop_id=eq.${shopId}&status=eq.active&is_deleted=eq.false`);
    const catalog = productsRes.map((p) => ({
      id: p.id,
      name: p.name.toLowerCase().trim(),
      originalName: p.name,
      unitType: p.unit_type,
    }));

    // Fetch previous confirmed product IDs from customer verified uploads
    const confirmedProductIds = new Set<string>();
    const frequencyMap = new Map<string, number>();
    if (customerId) {
      try {
        const pastOrders = await db.query(`customer_uploaded_orders?customer_id=eq.${customerId}&is_deleted=eq.false`);
        for (const order of pastOrders) {
          if (order.ocr_status === 'VERIFIED' || order.ocr_status === 'INVOICE_GENERATED') {
            if (order.ocr_raw_text) {
              const parsed = JSON.parse(order.ocr_raw_text);
              const itemsList = parsed.items || [];
              for (const item of itemsList) {
                if (item.matchedProductId) {
                  confirmedProductIds.add(item.matchedProductId);
                  frequencyMap.set(item.matchedProductId, (frequencyMap.get(item.matchedProductId) || 0) + 1);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load customer previous match frequencies', err);
      }
    }

    return rawItems.map((raw) => {
      const rawNameClean = raw.productName.toLowerCase().trim();
      const ignoredWords = ['pdf', 'order', 'invoice', 'bill', 'fruits', 'vegetables', 'list', 'doc', 'client', 'customer', 'upload', 'file', 'local', 'hybrid', 'fresh', 'kg', 'g', 'grams', 'piece', 'pcs', 'dozen', 'box', 'crate', 'bag', 'bundle', 'packet', 'tray', 'leafy', 'leaf'];
      
      // Clean suffix/prefix and formatting characters
      const cleanedQuery = rawNameClean
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\b(kg|g|grams|piece|pcs|dozen|box|crate|bag|bundle|packet|tray|local|hybrid|fresh)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      // 1. Exact Match Check
      const exactMatch = catalog.find((p) => p.name === cleanedQuery || p.name === rawNameClean);
      if (exactMatch) {
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || exactMatch.unitType,
          matchedProductId: exactMatch.id,
          confidence: 'High' as OcrConfidence,
          status: 'Matched' as const,
          suggestion: null,
        };
      }

      // 2. Exact word tokens comparison (e.g. "Chilli Green" matching "Green Chilli")
      const queryTokens = cleanedQuery.split(' ').filter((t: string) => t.length >= 2 && !ignoredWords.includes(t));
      
      let bestTokenMatch: any = null;
      let maxSharedTokens = 0;

      for (const prod of catalog) {
        const prodTokens = prod.name.replace(/[^a-zA-Z0-9\s]/g, ' ').split(' ').filter((t: string) => t.length >= 2 && !ignoredWords.includes(t));
        const shared = queryTokens.filter((t: string) => prodTokens.includes(t)).length;
        if (shared > maxSharedTokens) {
          maxSharedTokens = shared;
          bestTokenMatch = prod;
        }
      }

      if (bestTokenMatch && maxSharedTokens > 0 && maxSharedTokens === queryTokens.length) {
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || bestTokenMatch.unitType,
          matchedProductId: bestTokenMatch.id,
          confidence: 'High' as OcrConfidence,
          status: 'Matched' as const,
          suggestion: null,
        };
      }

      // 3. Substring match (e.g., "Tomato Hybrid" containing "Tomato")
      const substringMatches = catalog.filter((p) => p.name.includes(cleanedQuery) || cleanedQuery.includes(p.name));
      if (substringMatches.length === 1) {
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || substringMatches[0].unitType,
          matchedProductId: substringMatches[0].id,
          confidence: 'High' as OcrConfidence,
          status: 'Matched' as const,
          suggestion: null,
        };
      } else if (substringMatches.length > 1) {
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || substringMatches[0].unitType,
          matchedProductId: substringMatches[0].id,
          confidence: 'Medium' as OcrConfidence,
          status: 'Conflict' as const,
          suggestion: {
            matchedProductId: substringMatches[0].id,
            productName: substringMatches[0].originalName,
            confidence: 'Medium' as OcrConfidence,
            reason: 'Multiple partial name matches found',
          }
        };
      }

      // 4. Fuzzy Levenshtein Match
      let bestDistance = Infinity;
      let bestCandidate: any = null;

      for (const prod of catalog) {
        const dist = this.getLevenshteinDistance(cleanedQuery, prod.name);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestCandidate = prod;
        }
      }

      const allowedDistance = cleanedQuery.length > 6 ? 4 : 2;
      if (bestDistance <= allowedDistance && bestCandidate) {
        const isPreviouslyOrdered = confirmedProductIds.has(bestCandidate.id);
        const suggestionItem = {
          matchedProductId: bestCandidate.id,
          productName: bestCandidate.originalName,
          confidence: (isPreviouslyOrdered ? 'High' : 'Medium') as OcrConfidence,
          reason: isPreviouslyOrdered 
            ? 'Previously ordered & Similar name' 
            : 'Fuzzy match spelling check',
        };
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || bestCandidate.unitType,
          matchedProductId: bestCandidate.id,
          confidence: 'Medium' as OcrConfidence,
          status: 'Conflict' as const,
          suggestion: suggestionItem,
        };
      }

      // 5. Shared Token fallback (any shared token is better than nothing)
      if (bestTokenMatch && maxSharedTokens > 0) {
        const isPrev = confirmedProductIds.has(bestTokenMatch.id);
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || bestTokenMatch.unitType,
          matchedProductId: bestTokenMatch.id,
          confidence: 'Medium' as OcrConfidence,
          status: 'Conflict' as const,
          suggestion: {
            matchedProductId: bestTokenMatch.id,
            productName: bestTokenMatch.originalName,
            confidence: (isPrev ? 'High' : 'Medium') as OcrConfidence,
            reason: 'Partially matching keywords',
          }
        };
      }

      // 6. Previously ordered fallback
      if (confirmedProductIds.size > 0) {
        const topOrdered = [...frequencyMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id]) => catalog.find((p) => p.id === id))
          .filter((p): p is any => !!p);

        if (topOrdered.length > 0) {
          return {
            productName: raw.productName,
            quantity: raw.quantity,
            unitType: raw.unitType || 'Kg',
            matchedProductId: null,
            confidence: 'Low' as OcrConfidence,
            status: 'Unmatched' as const,
            suggestion: {
              matchedProductId: topOrdered[0].id,
              productName: topOrdered[0].originalName,
              confidence: 'Low' as OcrConfidence,
              reason: 'Customer past order frequency fallback',
            }
          };
        }
      }

      // 7. Totally Unmatched
      return {
        productName: raw.productName,
        quantity: raw.quantity,
        unitType: raw.unitType || 'Kg',
        matchedProductId: null,
        confidence: 'Low' as OcrConfidence,
        status: 'Unmatched' as const,
        suggestion: null,
      };
    });
  }

  // Parse filename keywords or generate mocks
  public simulateOcrExtraction(fileName: string, products: any[]): { productName: string; quantity: number; unitType: string }[] {
    const rawItems: { productName: string; quantity: number; unitType: string }[] = [];
    const lowerName = fileName.toLowerCase();

    // Regex parsing keywords e.g. "order_tomato_30_potato_50.pdf"
    const regex = /([a-z]+)[_-](\d+)/g;
    let match;
    const ignoredWords = ['pdf', 'order', 'invoice', 'bill', 'fruits', 'vegetables', 'list', 'doc', 'client', 'customer', 'upload', 'file'];
    while ((match = regex.exec(lowerName)) !== null) {
      const name = match[1];
      const qty = parseInt(match[2], 10);
      if (!ignoredWords.includes(name)) {
        rawItems.push({
          productName: name.charAt(0).toUpperCase() + name.slice(1),
          quantity: qty,
          unitType: 'Kg',
        });
      }
    }

    return rawItems;
  }

  async saveUploadedOrder(shopId: ShopId, customerId: string, fileName: string, fileType: string, fileSizeBytes: number, fileData: string, userId: string): Promise<UploadedOrder> {
    // 1. Double upload validation check (same customer + same day + same file name)
    const todayStr = new Date().toISOString().split('T')[0];
    const existingRows = await db.query(
      `customer_uploaded_orders?shop_id=eq.${shopId}&customer_id=eq.${customerId}&file_type=eq.${fileType}&is_deleted=eq.false`
    );
    const duplicates = existingRows.filter(
      (r) => r.created_at.startsWith(todayStr) && r.file_path.includes(fileName)
    );
    if (duplicates.length > 0) {
      throw new Error('DUPLICATE_ORDER_UPLOAD');
    }

    // 2. Write file to local isolated directories (resilient to read-only serverless filesystems like Vercel)
    const relativePath = path.join('uploads', shopId, customerId, `${Date.now()}-${fileName}`);
    const buffer = Buffer.from(fileData, 'base64');

    try {
      const uploadsDir = path.resolve(process.cwd(), 'uploads', shopId, customerId);
      fs.mkdirSync(uploadsDir, { recursive: true });
      const absolutePath = path.resolve(process.cwd(), relativePath);
      fs.writeFileSync(absolutePath, buffer);
    } catch (fsError) {
      console.warn('Filesystem write skipped/failed (likely running in a read-only environment like Vercel):', fsError);
    }

    // 3. OCR extraction & catalog similarity matching
    const productsRes = await db.query(`products?shop_id=eq.${shopId}&status=eq.active&is_deleted=eq.false`);
    
    let rawExtracted: any[] = [];
    let parsedSuccess = false;

    if (fileType === 'application/pdf') {
      try {
        const extracted = await parsePdfContent(buffer);
        if (extracted.length > 0) {
          rawExtracted = extracted;
          parsedSuccess = true;
        }
      } catch (e) {
        console.error('Failed to parse PDF using pdf-parse:', e);
      }
    } else if (fileType === 'text/plain') {
      try {
        const textContent = buffer.toString('utf-8');
        const extracted = parseTextOrderLines(textContent);
        if (extracted.length > 0) {
          rawExtracted = extracted;
          parsedSuccess = true;
        }
      } catch (e) {
        console.error('Failed to parse plain text order:', e);
      }
    } else if (fileType.startsWith('image/')) {
      try {
        const extracted = await parseImageOcr(buffer);
        if (extracted.length > 0) {
          rawExtracted = extracted;
          parsedSuccess = true;
        }
      } catch (e) {
        console.error('Failed to parse image using Tesseract OCR:', e);
      }
    }

    if (!parsedSuccess) {
      rawExtracted = this.simulateOcrExtraction(fileName, productsRes);
    }

    const matchedItems = await this.matchOcrItemsToShopCatalog(shopId, customerId, rawExtracted);

    const serializedOcr = JSON.stringify({
      items: matchedItems,
      rawText: rawExtracted.map((r) => `${r.productName} - ${r.quantity} ${r.unitType}`).join('\n'),
    });

    // 4. Save metadata in DB
    const body = {
      shop_id: shopId,
      customer_id: customerId,
      order_number: `ORD-${Date.now().toString().substring(7)}`,
      file_path: relativePath,
      file_type: fileType,
      file_size_bytes: fileSizeBytes,
      ocr_status: 'VERIFICATION_PENDING', // Ready for manual review
      ocr_raw_text: serializedOcr,
      status: 'active',
      is_deleted: false,
      created_by: userId || null,
      updated_by: userId || null,
    };

    const rows = await db.query('customer_uploaded_orders', { method: 'POST', body });
    const order = mapDbToOrder(rows[0]);

    // 5. Audit Log
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: shopId,
        user_id: userId,
        action_type: 'ORDER_UPLOADED',
        description: `Uploaded order document ${fileName} (${(fileSizeBytes / 1024).toFixed(1)} KB). OCR matching completed.`,
        created_at: new Date().toISOString(),
      }
    });

    return order;
  }

  async verifyAndSaveOrderItems(id: string, items: OcrItem[], notes: string | null, userId: string): Promise<UploadedOrder | null> {
    const original = await this.findOrderById(id);
    if (!original) return null;

    const serializedOcr = JSON.stringify({
      items,
      rawText: items.map((i) => `${i.productName} - ${i.quantity} ${i.unitType}`).join('\n'),
    });

    const body = {
      ocr_status: 'VERIFIED',
      ocr_raw_text: serializedOcr,
      notes: notes || original.notes,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    };

    const rows = await db.query(`customer_uploaded_orders?id=eq.${id}`, { method: 'PATCH', body });
    const updated = mapDbToOrder(rows[0]);

    // Log activity
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: original.shopId,
        user_id: userId,
        action_type: 'ORDER_VERIFIED',
        description: `Verified OCR items for order ${original.orderNumber}. Ready for invoice generation.`,
        created_at: new Date().toISOString(),
      }
    });

    return updated;
  }

  async markOrderInvoiceGenerated(id: string, invoiceId: string, userId: string): Promise<boolean> {
    await db.query(`customer_uploaded_orders?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        ocr_status: 'INVOICE_GENERATED',
        processed_invoice_id: invoiceId,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      }
    });
    return true;
  }

  async deleteUploadedOrder(id: string, userId: string): Promise<boolean> {
    const original = await this.findOrderById(id);
    if (!original) return false;

    // Soft delete order
    await db.query(`customer_uploaded_orders?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId || null,
      }
    });

    // Delete local file if it exists
    const absolutePath = path.resolve(process.cwd(), original.filePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err) {
        console.error('Failed to unlink local upload file', err);
      }
    }

    // Log Activity
    await db.query('activity_logs', {
      method: 'POST',
      body: {
        shop_id: original.shopId,
        user_id: userId,
        action_type: 'ORDER_DELETED',
        description: `Deleted order document ${original.orderNumber}.`,
        created_at: new Date().toISOString(),
      }
    });

    return true;
  }
}

export const orderRepository = new OrderRepository();
