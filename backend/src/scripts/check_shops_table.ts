import { db } from '../database/index.js';

async function run() {
  console.log('Querying business_settings...');
  const bs = await db.query('business_settings');
  console.log('business_settings rows:', JSON.stringify(bs, null, 2));

  console.log('Querying system_settings...');
  const ss = await db.query('system_settings');
  console.log('system_settings rows:', JSON.stringify(ss, null, 2));
}

run().catch(console.error);
