import { db } from '../database/index.js';

function isTitleOrSentenceCase(name: string): boolean {
  // Check if first char is uppercase, and not all chars are uppercase
  if (!name) return false;
  const first = name[0];
  const isFirstUpper = first === first.toUpperCase() && first !== first.toLowerCase();
  const isAllUpper = name === name.toUpperCase();
  return isFirstUpper && !isAllUpper;
}

async function run() {
  console.log('Fetching all products for deduplication check...');
  const products = await db.query('products');
  console.log(`Found ${products.length} products total.`);

  // Group by shop_id and lowercase trimmed name
  const groups: Record<string, any[]> = {};
  for (const p of products) {
    const key = `${p.shop_id}:${p.name.toLowerCase().trim()}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  }

  const duplicateGroups = Object.entries(groups).filter(([_, items]) => items.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('No case-insensitive duplicate products found in the database.');
    return;
  }

  console.log(`Found ${duplicateGroups.length} duplicate groups to merge.`);

  for (const [key, items] of duplicateGroups) {
    console.log(`\nMerging group: ${key}`);

    // Fetch invoice item counts and price histories for sorting
    const itemsWithStats = [];
    for (const p of items) {
      const invoices = await db.query(`invoice_items?product_id=eq.${p.id}`);
      const priceHistory = await db.query(`price_history?product_id=eq.${p.id}`);
      itemsWithStats.push({
        product: p,
        invoiceCount: invoices.length,
        priceHistoryCount: priceHistory.length,
      });
    }

    // Sort to pick primary:
    // 1. Active / not deleted
    // 2. Sentence/Title Case preferred over ALL CAPS or all lower
    // 3. Most invoice references
    // 4. Earliest created
    itemsWithStats.sort((a, b) => {
      // 1. is_deleted
      const aDeleted = a.product.is_deleted ? 1 : 0;
      const bDeleted = b.product.is_deleted ? 1 : 0;
      if (aDeleted !== bDeleted) return aDeleted - bDeleted;

      // status
      const aActive = a.product.status === 'active' ? 1 : 0;
      const bActive = b.product.status === 'active' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      // Case format
      const aGoodCase = isTitleOrSentenceCase(a.product.name) ? 1 : 0;
      const bGoodCase = isTitleOrSentenceCase(b.product.name) ? 1 : 0;
      if (aGoodCase !== bGoodCase) return bGoodCase - aGoodCase;

      // Invoice count
      if (a.invoiceCount !== b.invoiceCount) return b.invoiceCount - a.invoiceCount;

      // Earliest created
      return new Date(a.product.created_at).getTime() - new Date(b.product.created_at).getTime();
    });

    const primary = itemsWithStats[0].product;
    const secondaries = itemsWithStats.slice(1).map(x => x.product);

    console.log(`Selected Primary Product: ID ${primary.id} ("${primary.name}")`);

    for (const secondary of secondaries) {
      console.log(`  - Merging Secondary Product: ID ${secondary.id} ("${secondary.name}")`);

      // 1. Move invoice items
      const invoiceItems = await db.query(`invoice_items?product_id=eq.${secondary.id}`);
      if (invoiceItems.length > 0) {
        console.log(`    Moving ${invoiceItems.length} invoice items...`);
        for (const item of invoiceItems) {
          await db.query(`invoice_items?id=eq.${item.id}`, {
            method: 'PATCH',
            body: { product_id: primary.id }
          });
        }
      }

      // 2. Move price histories
      const priceHistory = await db.query(`price_history?product_id=eq.${secondary.id}`);
      if (priceHistory.length > 0) {
        console.log(`    Moving ${priceHistory.length} price history logs...`);
        for (const log of priceHistory) {
          await db.query(`price_history?id=eq.${log.id}`, {
            method: 'PATCH',
            body: { product_id: primary.id }
          });
        }
      }

      // 3. Delete secondary product
      console.log(`    Deleting secondary product record...`);
      await db.query(`products?id=eq.${secondary.id}`, {
        method: 'DELETE'
      });
    }
  }

  console.log('\nDeduplication and merge completed successfully!');
}

run().catch(console.error);
