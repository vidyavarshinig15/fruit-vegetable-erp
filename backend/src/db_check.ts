import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), './.env') });

import { orderRepository } from '../../../Desktop/billing/backend/src/repositories/order.repository.js';
import { db } from '../../../Desktop/billing/backend/src/database/index.js';

async function main() {
  console.log('Fetching active customer...');
  const customers = await db.query('customers?shop_id=eq.11111111-1111-1111-1111-111111111111&status=eq.active&limit=1');
  if (customers.length === 0) {
    console.error('No active customers found for Shop 1');
    return;
  }
  const customerId = customers[0].id;
  console.log('Using customer ID:', customerId);

  const text = `Pineapple=4 pcs
Water melon=4 pcs
Maskmelon=3 pcs
Papaya=2 pcs`;

  const base64Data = Buffer.from(text).toString('base64');
  console.log('Running saveUploadedOrder...');
  const order = await orderRepository.saveUploadedOrder(
    '11111111-1111-1111-1111-111111111111',
    customerId,
    'pasted_order_message.txt',
    'text/plain',
    text.length,
    base64Data,
    '11111111-1111-1111-1111-111111111111'
  );
  console.log('Order processed successfully:', order);
}

main().catch(console.error);
