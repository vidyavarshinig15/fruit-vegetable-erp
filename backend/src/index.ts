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

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} (${config.env})`);
  });
}

export default app;
