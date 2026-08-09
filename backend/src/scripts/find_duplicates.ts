import { db } from '../database/index.js';

async function run() {
  console.log('Fetching all products...');
  const products = await db.query('products');
  console.log(`Found ${products.length} products total.`);

  // Group products by shop_id and case-insensitive name
  const groups: Record<string, any[]> = {};
  for (const p of products) {
    const key = `${p.shop_id}:${p.name.toLowerCase().trim()}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  }

  const duplicates = Object.entries(groups).filter(([_, items]) => items.length > 1);

  if (duplicates.length === 0) {
    console.log('No case-insensitive duplicate products found in the database!');
    return;
  }

  console.log(`\nFound ${duplicates.length} duplicate groups:`);
  for (const [key, items] of duplicates) {
    console.log(`\nGroup: ${key}`);
    for (const p of items) {
      // Find count of invoice items and price history
      const itemsCount = await db.query(`invoice_items?product_id=eq.${p.id}`);
      const priceHistoryCount = await db.query(`price_history?product_id=eq.${p.id}`);
      console.log(`  - ID: ${p.id} | Name: "${p.name}" | is_deleted: ${p.is_deleted} | status: "${p.status}" | Invoices: ${itemsCount.length} | Price History: ${priceHistoryCount.length}`);
    }
  }
}

run().catch(console.error);
