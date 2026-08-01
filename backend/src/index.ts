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
app.use(cors({ origin: config.corsOrigin, credentials: true }));
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

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} (${config.env})`);
    ensureSystemUser();
  });
}

export default app;
