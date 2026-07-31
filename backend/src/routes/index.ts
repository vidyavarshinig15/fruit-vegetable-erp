import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import roleRoutes from './role.routes.js';
import activityRoutes from './activity.routes.js';
import shopRoutes from './shop.routes.js';
import customerRoutes from './customer.routes.js';
import productRoutes from './product.routes.js';
import invoiceRoutes from './invoice.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import ledgerRoutes from './ledger.routes.js';
import analyticsRoutes from './analytics.routes.js';
import communicationRoutes from './communication.routes.js';
import systemRoutes from './system.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/activity', activityRoutes);
router.use('/shops', shopRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/ledgers', ledgerRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/communication', communicationRoutes);
router.use('/system', systemRoutes);

export default router;
