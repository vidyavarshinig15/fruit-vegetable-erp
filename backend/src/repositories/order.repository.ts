import { ShopId, UploadedOrder, OcrItem, OrderStatus, OrderFilterQuery, OcrConfidence } from '@raju-billing/shared';
import { db } from '../database/index.js';
import fs from 'fs';
import path from 'path';

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
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
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
      const queryName = raw.productName.toLowerCase().trim();

      // Normalize common suffix strings
      const cleanedQuery = queryName
        .replace(/\b(kg|g|grams|piece|pcs|dozen|box|crate|bag|bundle|packet|tray|local|hybrid|fresh)\b/g, '')
        .trim();

      // Look for candidates
      const exactMatches = catalog.filter((p) => p.name === cleanedQuery || p.name === queryName);
      const partialMatches = catalog.filter(
        (p) => p.name.includes(cleanedQuery) || cleanedQuery.includes(p.name)
      );

      const ignoredWords = ['pdf', 'order', 'invoice', 'bill', 'fruits', 'vegetables', 'list', 'doc', 'client', 'customer', 'upload', 'file', 'local', 'hybrid', 'fresh', 'kg', 'g', 'grams', 'piece', 'pcs', 'dozen', 'box', 'crate', 'bag', 'bundle', 'packet', 'tray'];
      const queryTokens = cleanedQuery.split(/[\s_\-]+/).filter((w: string) => w.length >= 3 && !ignoredWords.includes(w));
      const tokenMatches = catalog.filter((p) => {
        const prodTokens = p.name.split(/[\s_\-]+/).filter((w: string) => w.length >= 3);
        return queryTokens.some((qt: string) => prodTokens.some((pt: string) => pt.includes(qt) || qt.includes(pt)));
      });

      const candidates = exactMatches.length > 0 
        ? exactMatches 
        : (partialMatches.length > 0 ? partialMatches : tokenMatches);

      let suggestion: any = null;

      if (candidates.length !== 1) {
        // Run Levenshtein distance against active products of the shop
        let bestDistance = Infinity;
        let bestCandidate: any = null;

        for (const prod of catalog) {
          const dist = this.getLevenshteinDistance(cleanedQuery, prod.name);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestCandidate = prod;
          }
        }

        // Suggest if distance is small (<= 2 edits)
        if (bestDistance <= 2 && bestCandidate) {
          const isPreviouslyOrdered = confirmedProductIds.has(bestCandidate.id);
          suggestion = {
            matchedProductId: bestCandidate.id,
            productName: bestCandidate.originalName,
            confidence: (isPreviouslyOrdered ? 'High' : 'Medium') as OcrConfidence,
            reason: isPreviouslyOrdered 
              ? 'Previously ordered & Similar name' 
              : 'Similar product name',
          };
        } else if (confirmedProductIds.size > 0) {
          // Fallback to customer's top ordered product from previous history
          const topOrdered = [...frequencyMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => catalog.find((p) => p.id === id))
            .filter((p): p is any => !!p);

          if (topOrdered.length > 0) {
            suggestion = {
              matchedProductId: topOrdered[0].id,
              productName: topOrdered[0].originalName,
              confidence: 'Low' as OcrConfidence,
              reason: 'Previously ordered by this customer',
            };
          }
        }
      }

      if (candidates.length === 1) {
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || candidates[0].unitType,
          matchedProductId: candidates[0].id,
          confidence: 'High' as OcrConfidence,
          status: 'Matched' as const,
          suggestion: null,
        };
      } else if (candidates.length > 1) {
        // Conflict matches
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || candidates[0].unitType,
          matchedProductId: candidates[0].id, // Default to first candidate
          confidence: 'Medium' as OcrConfidence,
          status: 'Conflict' as const,
          suggestion,
        };
      } else {
        // Unmatched matches
        return {
          productName: raw.productName,
          quantity: raw.quantity,
          unitType: raw.unitType || 'Kg',
          matchedProductId: null,
          confidence: 'Low' as OcrConfidence,
          status: 'Unmatched' as const,
          suggestion,
        };
      }
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

    // 2. Write file to local isolated directories
    const uploadsDir = path.resolve(process.cwd(), 'uploads', shopId, customerId);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const relativePath = path.join('uploads', shopId, customerId, `${Date.now()}-${fileName}`);
    const absolutePath = path.resolve(process.cwd(), relativePath);
    
    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(absolutePath, buffer);

    // 3. OCR extraction & catalog similarity matching
    const productsRes = await db.query(`products?shop_id=eq.${shopId}&status=eq.active&is_deleted=eq.false`);
    
    let rawExtracted: any[] = [];
    let parsedSuccess = false;

    if (fileType === 'application/pdf') {
      try {
        const pythonPath = '/Users/vidyavarshini/miniconda3/bin/python';
        const scriptPath = '/Users/vidyavarshini/.gemini/antigravity-ide/brain/fb836f0b-5a9b-4089-abc6-33fb305de04b/scratch/parse_pdf.py';
        const { execSync } = await import('child_process');
        const output = execSync(`"${pythonPath}" "${scriptPath}" "${absolutePath}"`, { encoding: 'utf-8' });
        const res = JSON.parse(output);
        if (res.success && res.items && res.items.length > 0) {
          rawExtracted = res.items;
          parsedSuccess = true;
        }
      } catch (e) {
        console.error('Failed to parse PDF using python script:', e);
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
