import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { extractShopContext } from './middlewares/shopContext.middleware.js';
import { maintenanceModeMiddleware } from './middlewares/maintenance.middleware.js';

import path from 'path';

const app = express();

app.use(helmet());
const allowedOrigins = new Set<string>([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
]);
if (config.corsOrigin) {
  // allow a single origin value from config (e.g. the Vercel frontend URL)
  allowedOrigins.add(config.corsOrigin);
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin) || config.env === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(apiRateLimiter);
app.use(extractShopContext);
app.use(maintenanceModeMiddleware);
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'RAJU VEGETABLES AND FRUITS Billing System API',
    timestamp: new Date().toISOString(),
  });
});

app.use(config.apiPrefix, routes);

import { db } from './database/index.js';

async function ensureSystemUser() {
  try {
    const systemUserId = '00000000-0000-0000-0000-000000000000';
    const rows = await db.query(`users?id=eq.${systemUserId}`);
    if (rows.length === 0) {
      logger.info('System user not found in database. Seeding system auditor user...');
      await db.query('users', {
        method: 'POST',
        body: {
          id: systemUserId,
          email: 'system.auditor@rajuvegetables.com',
          full_name: 'System Auditor',
          is_super_admin: true,
          status: 'active'
        }
      });
      logger.info('System auditor user seeded successfully!');
    }
  } catch (error) {
    logger.error('Failed to ensure/seed system auditor user:', error);
  }
}

async function ensureSeedCustomers() {
  try {
    const customers = [
      {
        id: '11111111-c111-1111-1111-111111111111',
        shop_id: '11111111-1111-1111-1111-111111111111',
        customer_code: 'RAJC00001',
        name: 'Suresh Bangalore Veg Inn',
        mobile_number: '9845011111',
        address: 'Shop 4, Residency Road',
        city: 'Bengaluru',
        pincode: '560025',
        credit_limit: 100000,
        opening_balance: 15000,
        current_balance: 45000,
        notes: 'Pays every Saturday afternoon without fail.',
        status: 'active'
      },
      {
        id: '22222222-c222-2222-2222-222222222222',
        shop_id: '11111111-1111-1111-1111-111111111111',
        customer_code: 'RAJC00002',
        name: 'Venkatesh Caterers',
        mobile_number: '9845011112',
        address: 'APMC Market Yard Area',
        city: 'Bengaluru',
        pincode: '560022',
        credit_limit: 50000,
        opening_balance: 0,
        current_balance: 12000,
        notes: 'Preferred billing style is spot cash.',
        status: 'active'
      },
      {
        id: '33333333-c333-3333-3333-333333333333',
        shop_id: '22222222-2222-2222-2222-222222222222',
        customer_code: 'GRC00001',
        name: 'Girish Family Restaurant',
        mobile_number: '9845011113',
        address: 'G R Lane, Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
        credit_limit: 75000,
        opening_balance: 5000,
        current_balance: 28000,
        notes: 'Clear bills by monthly check payments.',
        status: 'active'
      }
    ];

    for (const c of customers) {
      try {
        const rows = await db.query(`customers?id=eq.${c.id}`);
        if (rows.length === 0) {
          logger.info(`Seeding customer ${c.name} into database...`);
          await db.query('customers', {
            method: 'POST',
            body: c
          });
          logger.info(`Seeded customer ${c.name}`);
        } else {
          logger.debug(`Customer ${c.name} already exists, skipping seed.`);
        }
      } catch (e) {
        logger.error(`Failed to seed customer ${c.name}:`, (e as any).message || e);
      }
    }
  } catch (error) {
    logger.error('Failed to ensure seed customers in database:', error);
  }
}

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} (${config.env})`);
    ensureSystemUser();
    ensureSeedCustomers();
  });
}

export default app;
