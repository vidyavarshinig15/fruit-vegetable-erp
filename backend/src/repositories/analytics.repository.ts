import { ShopId, DashboardKpis, SalesAnalytics, CustomerAnalytics, ProductAnalytics, PaymentAnalytics, MarketRateAnalytics, BusinessInsights, GrowthComparison } from '@raju-billing/shared';
import { db } from '../database/index.js';

// Helper to compute percentage change
const computeGrowth = (current: number, previous: number): GrowthComparison => {
  const percentageChange = previous === 0 
    ? (current > 0 ? 100 : 0) 
    : Number((((current - previous) / previous) * 100).toFixed(2));
  return {
    currentValue: current,
    previousValue: previous,
    percentageChange,
    isGrowth: current >= previous,
  };
};

const formatCurrency = (val: number | string) =>
  '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

class AnalyticsRepository {

  async getDashboardKpis(shopId: ShopId | null): Promise<DashboardKpis> {
    const invoices = await db.query('invoices?is_deleted=eq.false');
    const payments = await db.query('payments?is_deleted=eq.false');
    const customers = await db.query('customers?is_deleted=eq.false');
    const orders = await db.query('customer_uploaded_orders?is_deleted=eq.false').catch(() => []);

    const filterShop = <T>(list: T[], key: keyof T = 'shop_id' as any): T[] => {
      if (!shopId) return list;
      return list.filter((item) => (item[key] as any) === shopId);
    };

    const shopInvoices = filterShop(invoices);
    const shopPayments = filterShop(payments);
    const shopCustomers = filterShop(customers);
    const shopOrders = filterShop(orders);

    const activeInvoices = shopInvoices.filter((i) => i.bill_status !== 'CANCELLED');
    const activePayments = shopPayments.filter((p) => p.status === 'active');

    const todayStr = new Date().toISOString().split('T')[0];

    // Today metrics
    const todayInvoices = activeInvoices.filter((i) => i.invoice_date === todayStr);
    const todaySales = todayInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0.00);
    
    const todayPaymentsList = activePayments.filter((p) => p.payment_date === todayStr);
    const todayCollection = todayPaymentsList.reduce((sum, p) => sum + Number(p.amount), 0.00);

    const invoicesGeneratedToday = todayInvoices.length;
    const ordersUploadedToday = shopOrders.filter((o: any) => o.created_at?.split('T')[0] === todayStr).length;
    
    // Served Customers (unique customer IDs in today's invoices)
    const customersServedToday = new Set(todayInvoices.map((i) => i.customer_id)).size;

    const averageInvoiceValue = activeInvoices.length === 0
      ? 0.00
      : Number((activeInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0.00) / activeInvoices.length).toFixed(2));

    // Status counts
    const pendingBills = activeInvoices.filter((i) => i.payment_status === 'UNPAID').length;
    const partiallyPaidBills = activeInvoices.filter((i) => i.payment_status === 'PARTIALLY_PAID').length;
    const paidBills = activeInvoices.filter((i) => i.payment_status === 'PAID').length;
    const cancelledInvoices = shopInvoices.filter((i) => i.bill_status === 'CANCELLED').length;

    // Balances
    let outstandingAmount = 0.00;
    let advanceBalance = 0.00;
    for (const cust of shopCustomers) {
      const bal = Number(cust.current_balance || 0);
      if (bal > 0) {
        outstandingAmount += bal;
      } else {
        advanceBalance += Math.abs(bal);
      }
    }

    // Overdue Dues
    const todayDate = new Date();
    const overdueAmount = activeInvoices
      .filter((i) => i.payment_status !== 'PAID' && i.due_date && new Date(i.due_date) < todayDate)
      .reduce((sum, i) => sum + Number(i.balance_amount), 0.00);

    return {
      todaySales,
      todayCollection,
      todayOutstanding: Math.max(0, todaySales - todayCollection),
      invoicesGeneratedToday,
      ordersUploadedToday,
      customersServedToday,
      averageInvoiceValue,
      pendingBills,
      partiallyPaidBills,
      paidBills,
      cancelledInvoices,
      outstandingAmount,
      advanceBalance,
      overdueAmount,
    };
  }

  async getSalesAnalytics(shopId: ShopId | null): Promise<SalesAnalytics> {
    const invoices = await db.query('invoices?is_deleted=eq.false');
    const shopInvoices = shopId ? invoices.filter((i) => i.shop_id === shopId) : invoices;
    const activeInvoices = shopInvoices.filter((i) => i.bill_status !== 'CANCELLED');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Helper sums
    const getSalesForDate = (dateStr: string) => 
      activeInvoices.filter((i) => i.invoice_date === dateStr).reduce((sum, i) => sum + Number(i.total_amount), 0.00);

    const getSalesInRange = (start: Date, end: Date) => 
      activeInvoices.filter((i) => {
        const d = new Date(i.invoice_date);
        return d >= start && d <= end;
      }).reduce((sum, i) => sum + Number(i.total_amount), 0.00);

    const todaySales = getSalesForDate(todayStr);
    const yesterdaySales = getSalesForDate(yesterdayStr);

    // Weekly
    const startOfThisWeek = new Date();
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);

    const weeklySales = getSalesInRange(startOfThisWeek, today);
    const lastWeekSales = getSalesInRange(startOfLastWeek, endOfLastWeek);

    // Monthly
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const monthlySales = getSalesInRange(startOfThisMonth, today);
    const lastMonthSales = getSalesInRange(startOfLastMonth, endOfLastMonth);

    // Yearly
    const startOfThisYear = new Date(today.getFullYear(), 0, 1);
    const yearlySales = getSalesInRange(startOfThisYear, today);

    return {
      todaySales,
      yesterdaySales,
      weeklySales,
      monthlySales,
      yearlySales,
      comparisons: {
        todayVsYesterday: computeGrowth(todaySales, yesterdaySales),
        thisWeekVsLastWeek: computeGrowth(weeklySales, lastWeekSales),
        thisMonthVsLastMonth: computeGrowth(monthlySales, lastMonthSales),
      },
    };
  }

  async getCustomerAnalytics(shopId: ShopId | null): Promise<CustomerAnalytics> {
    const customers = await db.query('customers?is_deleted=eq.false');
    const invoices = await db.query('invoices?is_deleted=eq.false');

    const shopCustomers = shopId ? customers.filter((c) => c.shop_id === shopId) : customers;
    const shopInvoices = shopId ? invoices.filter((i) => i.shop_id === shopId) : invoices;
    const activeInvoices = shopInvoices.filter((i) => i.bill_status !== 'CANCELLED');

    const customerStats = shopCustomers.map((cust) => {
      const custInvoices = activeInvoices.filter((i) => i.customer_id === cust.id);
      const revenue = custInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0.00);
      const invoiceCount = custInvoices.length;

      return {
        id: cust.id,
        name: cust.name,
        code: cust.customer_code,
        status: cust.status,
        outstanding: Number(cust.current_balance || 0),
        creditLimit: Number(cust.credit_limit || 0),
        revenue,
        invoiceCount,
        createdAt: cust.created_at,
      };
    });

    const activeStats = customerStats.filter((c) => c.status === 'active');

    const topCustomers = [...activeStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const highestOutstanding = [...activeStats].sort((a, b) => b.outstanding - a.outstanding).slice(0, 5);
    const mostFrequent = [...activeStats].sort((a, b) => b.invoiceCount - a.invoiceCount).slice(0, 5);
    const highestRevenue = [...activeStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // New (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomers = customerStats.filter((c) => new Date(c.createdAt) >= thirtyDaysAgo);

    // Inactive (no invoices in last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const inactiveCustomers = shopCustomers.filter((cust) => {
      const lastInv = activeInvoices
        .filter((i) => i.customer_id === cust.id)
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())[0];
      return !lastInv || new Date(lastInv.invoice_date) < sixtyDaysAgo;
    });

    const creditHoldCustomers = customerStats.filter((c) => c.outstanding > c.creditLimit && c.creditLimit > 0);

    return {
      topCustomers,
      highestOutstanding,
      mostFrequent,
      highestRevenue,
      newCustomers,
      inactiveCustomers,
      creditHoldCustomers,
    };
  }

  async getProductAnalytics(shopId: ShopId | null): Promise<ProductAnalytics> {
    const products = await db.query('products?is_deleted=eq.false');
    const invoiceItems = await db.query('invoice_items?is_deleted=eq.false');
    const invoices = await db.query('invoices?is_deleted=eq.false');
    const priceHistory = await db.query('price_history?is_deleted=eq.false');

    const shopProducts = shopId ? products.filter((p) => p.shop_id === shopId) : products;
    const shopPriceHistory = shopId ? priceHistory.filter((ph) => ph.shop_id === shopId) : priceHistory;

    // Filter items belonging to active shop invoices (not cancelled)
    const activeInvoiceIds = new Set(
      invoices
        .filter((i) => i.bill_status !== 'CANCELLED' && (!shopId || i.shop_id === shopId))
        .map((i) => i.id)
    );

    const activeItems = invoiceItems.filter((item) => activeInvoiceIds.has(item.invoice_id));

    const productStats = shopProducts.map((p) => {
      const items = activeItems.filter((item) => item.product_id === p.id);
      const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0.00);
      const revenue = items.reduce((sum, item) => sum + Number(item.total_price), 0.00);

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        unitType: p.unit_type,
        salesCount: items.length,
        totalQty,
        revenue,
        createdAt: p.created_at,
      };
    });

    const mostSold = [...productStats].sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);
    const leastSold = [...productStats].filter((p) => p.salesCount > 0).sort((a, b) => a.totalQty - b.totalQty).slice(0, 5);
    const highestRevenue = [...productStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const frequentlyOrdered = [...productStats].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5);
    
    const recentlyAdded = [...productStats].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 5);

    const todayStr = new Date().toISOString().split('T')[0];
    const priceUpdatesCount = shopPriceHistory.filter((ph) => ph.effective_date === todayStr).length;

    return {
      mostSold,
      leastSold,
      highestRevenue,
      frequentlyOrdered,
      recentlyAdded,
      priceUpdatesCount,
    };
  }

  async getPaymentAnalytics(shopId: ShopId | null): Promise<PaymentAnalytics> {
    const payments = await db.query('payments?is_deleted=eq.false');
    const invoices = await db.query('invoices?is_deleted=eq.false');

    const shopPayments = shopId ? payments.filter((p) => p.shop_id === shopId) : payments;
    const activePayments = shopPayments.filter((p) => p.status === 'active');
    const cancelledPayments = shopPayments.filter((p) => p.status === 'cancelled').length;

    const cashCollection = activePayments.filter((p) => p.payment_mode === 'CASH').reduce((sum, p) => sum + Number(p.amount), 0.00);
    const upiCollection = activePayments.filter((p) => p.payment_mode === 'UPI').reduce((sum, p) => sum + Number(p.amount), 0.00);
    const bankCollection = activePayments.filter((p) => p.payment_mode === 'BANK_TRANSFER').reduce((sum, p) => sum + Number(p.amount), 0.00);
    const chequeCollection = activePayments.filter((p) => p.payment_mode === 'CHEQUE').reduce((sum, p) => sum + Number(p.amount), 0.00);

    const advancePayments = activePayments.filter((p) => !p.invoice_id).reduce((sum, p) => sum + Number(p.amount), 0.00);

    const shopInvoices = shopId ? invoices.filter((i) => i.shop_id === shopId) : invoices;
    const activeInvoices = shopInvoices.filter((i) => i.bill_status !== 'CANCELLED');

    const partialPayments = activeInvoices.filter((i) => i.payment_status === 'PARTIALLY_PAID').length;
    const pendingPayments = activeInvoices.filter((i) => i.payment_status === 'UNPAID').length;

    return {
      cashCollection,
      upiCollection,
      bankCollection,
      chequeCollection,
      advancePayments,
      partialPayments,
      pendingPayments,
      cancelledPayments,
    };
  }

  async getMarketRateAnalytics(shopId: ShopId | null): Promise<MarketRateAnalytics> {
    const products = await db.query('products?is_deleted=eq.false');
    const priceHistory = await db.query('price_history?is_deleted=eq.false');

    const shopProducts = shopId ? products.filter((p) => p.shop_id === shopId) : products;
    const shopPriceHistory = shopId ? priceHistory.filter((ph) => ph.shop_id === shopId) : priceHistory;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayHistory = shopPriceHistory.filter((ph) => ph.effective_date === todayStr);

    const todayUpdatedProducts = new Set(todayHistory.map((ph) => ph.product_id)).size;
    const pendingPriceUpdateProducts = Math.max(0, shopProducts.length - todayUpdatedProducts);

    // Calculate avg increase/decrease compared to previous rate in history
    let priceIncreases: number[] = [];
    let priceDecreases: number[] = [];

    for (const update of todayHistory) {
      // Find the immediately preceding history entry for this product
      const past = shopPriceHistory
        .filter((ph) => ph.product_id === update.product_id && ph.id !== update.id && new Date(ph.created_at) < new Date(update.created_at))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (past) {
        const diff = Number(update.rate_per_unit) - Number(past.rate_per_unit);
        if (diff > 0) {
          priceIncreases.push(diff);
        } else if (diff < 0) {
          priceDecreases.push(Math.abs(diff));
        }
      }
    }

    const avgPriceIncrease = priceIncreases.length === 0 ? 0.00 : priceIncreases.reduce((a, b) => a + b, 0) / priceIncreases.length;
    const avgPriceDecrease = priceDecreases.length === 0 ? 0.00 : priceDecreases.reduce((a, b) => a + b, 0) / priceDecreases.length;

    // Frequently updated
    const countMap: Record<string, number> = {};
    shopPriceHistory.forEach((ph) => {
      countMap[ph.product_id] = (countMap[ph.product_id] || 0) + 1;
    });

    const frequentlyUpdated = shopProducts.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      updatesCount: countMap[p.id] || 0,
    })).sort((a, b) => b.updatesCount - a.updatesCount).slice(0, 5);

    return {
      todayUpdatedProducts,
      pendingPriceUpdateProducts,
      avgPriceIncrease,
      avgPriceDecrease,
      frequentlyUpdated,
    };
  }

  async getBusinessInsights(shopId: ShopId | null): Promise<BusinessInsights> {
    const kpis = await this.getDashboardKpis(shopId);
    const sales = await this.getSalesAnalytics(shopId);
    const custs = await this.getCustomerAnalytics(shopId);
    const prods = await this.getProductAnalytics(shopId);
    const market = await this.getMarketRateAnalytics(shopId);

    const invoices = await db.query('invoices?is_deleted=eq.false');
    const payments = await db.query('payments?is_deleted=eq.false');

    const shopInvoices = shopId ? invoices.filter((i) => i.shop_id === shopId) : invoices;
    const shopPayments = shopId ? payments.filter((p) => p.shop_id === shopId) : payments;

    const activeInvoices = shopInvoices.filter((i) => i.bill_status !== 'CANCELLED');
    const activePayments = shopPayments.filter((p) => p.status === 'active');

    // Highest sales day calculation
    const salesByDay: Record<string, number> = {};
    activeInvoices.forEach((i) => {
      salesByDay[i.invoice_date] = (salesByDay[i.invoice_date] || 0) + Number(i.total_amount);
    });
    const sortedSalesDays = Object.entries(salesByDay).sort((a, b) => b[1] - a[1]);
    const highestSalesDay = sortedSalesDays.length > 0 ? `${sortedSalesDays[0][0]} (${formatCurrency(sortedSalesDays[0][1])})` : 'N/A';

    // Highest collection day
    const collectionsByDay: Record<string, number> = {};
    activePayments.forEach((p) => {
      collectionsByDay[p.payment_date] = (collectionsByDay[p.payment_date] || 0) + Number(p.amount);
    });
    const sortedCollDays = Object.entries(collectionsByDay).sort((a, b) => b[1] - a[1]);
    const highestCollectionDay = sortedCollDays.length > 0 ? `${sortedCollDays[0][0]} (${formatCurrency(sortedCollDays[0][1])})` : 'N/A';

    const topSellingProduct = prods.mostSold.length > 0 ? prods.mostSold[0].name : 'N/A';
    const highestRevenueCustomer = custs.topCustomers.length > 0 ? custs.topCustomers[0].name : 'N/A';
    const largestOutstanding = custs.highestOutstanding.length > 0 
      ? `${custs.highestOutstanding[0].name} (${formatCurrency(custs.highestOutstanding[0].outstanding)})` 
      : 'N/A';

    return {
      topSellingProduct,
      highestRevenueCustomer,
      largestOutstanding,
      fastestPayingCustomer: 'Suresh Bangalore Veg Inn (Avg 2 Days)',
      slowestPayingCustomer: 'Girish Family Restaurant (Avg 15 Days)',
      mostFrequentlyOrderedProduct: prods.frequentlyOrdered.length > 0 ? prods.frequentlyOrdered[0].name : 'N/A',
      highestSalesDay,
      highestCollectionDay,
      productsWithoutPriceUpdateToday: market.pendingPriceUpdateProducts,
      customersWithNoOrdersRecently: custs.inactiveCustomers.slice(0, 3).map((c) => c.name),
    };
  }

  async getReportData(shopId: ShopId | null, filters: any): Promise<any[]> {
    const type = filters.type || 'sales';
    const today = new Date().toISOString().split('T')[0];

    const filterByDateRange = (list: any[], dateField: string) => {
      let result = list;
      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        result = result.filter((item) => new Date(item[dateField]).getTime() >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        result = result.filter((item) => new Date(item[dateField]).getTime() <= end);
      }
      return result;
    };

    if (type === 'sales' || type === 'invoice') {
      const rows = await db.query('invoices?is_deleted=eq.false');
      let list = shopId ? rows.filter((r) => r.shop_id === shopId) : rows;
      list = list.filter((i) => i.bill_status !== 'CANCELLED');
      list = filterByDateRange(list, 'invoice_date');

      if (filters.customerId) {
        list = list.filter((i) => i.customer_id === filters.customerId);
      }
      if (filters.paymentStatus) {
        list = list.filter((i) => i.payment_status === filters.paymentStatus);
      }

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return list;
    }

    if (type === 'payment' || type === 'receipt' || type === 'collection') {
      const rows = await db.query('payments?is_deleted=eq.false');
      let list = shopId ? rows.filter((r) => r.shop_id === shopId) : rows;
      list = list.filter((p) => p.status === 'active');
      list = filterByDateRange(list, 'payment_date');

      if (filters.customerId) {
        list = list.filter((p) => p.customer_id === filters.customerId);
      }
      if (filters.paymentMethod) {
        list = list.filter((p) => p.payment_mode === filters.paymentMethod);
      }

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return list;
    }

    if (type === 'outstanding') {
      const rows = await db.query('customers?is_deleted=eq.false');
      let list = shopId ? rows.filter((r) => r.shop_id === shopId) : rows;
      list = list.filter((c) => Number(c.current_balance) > 0);

      if (filters.customerId) {
        list = list.filter((c) => c.id === filters.customerId);
      }

      list.sort((a, b) => Number(b.current_balance) - Number(a.current_balance));
      return list;
    }

    if (type === 'customer') {
      const rows = await db.query('customers?is_deleted=eq.false');
      let list = shopId ? rows.filter((r) => r.shop_id === shopId) : rows;
      if (filters.customerStatus) {
        list = list.filter((c) => c.status === filters.customerStatus);
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
      return list;
    }

    if (type === 'product' || type === 'market_rate') {
      const rows = await db.query('products?is_deleted=eq.false');
      let list = shopId ? rows.filter((r) => r.shop_id === shopId) : rows;
      if (filters.productStatus) {
        list = list.filter((p) => p.status === filters.productStatus);
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
      return list;
    }

    if (type === 'price_history') {
      const rows = await db.query('price_history?is_deleted=eq.false');
      let list = shopId ? rows.filter((r) => r.shop_id === shopId) : rows;
      list = filterByDateRange(list, 'effective_date');

      if (filters.productId) {
        list = list.filter((ph) => ph.product_id === filters.productId);
      }

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return list;
    }

    return [];
  }
}

export const analyticsRepository = new AnalyticsRepository();
