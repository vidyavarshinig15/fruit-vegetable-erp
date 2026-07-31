export interface GrowthComparison {
  currentValue: number;
  previousValue: number;
  percentageChange: number;
  isGrowth: boolean;
}

export interface DashboardKpis {
  todaySales: number;
  todayCollection: number;
  todayOutstanding: number;
  invoicesGeneratedToday: number;
  ordersUploadedToday: number;
  customersServedToday: number;
  averageInvoiceValue: number;
  pendingBills: number;
  partiallyPaidBills: number;
  paidBills: number;
  cancelledInvoices: number;
  outstandingAmount: number;
  advanceBalance: number;
  overdueAmount: number;
}

export interface SalesAnalytics {
  todaySales: number;
  yesterdaySales: number;
  weeklySales: number;
  monthlySales: number;
  yearlySales: number;
  comparisons: {
    todayVsYesterday: GrowthComparison;
    thisWeekVsLastWeek: GrowthComparison;
    thisMonthVsLastMonth: GrowthComparison;
  };
}

export interface CustomerAnalytics {
  topCustomers: any[];
  highestOutstanding: any[];
  mostFrequent: any[];
  highestRevenue: any[];
  newCustomers: any[];
  inactiveCustomers: any[];
  creditHoldCustomers: any[];
}

export interface ProductAnalytics {
  mostSold: any[];
  leastSold: any[];
  highestRevenue: any[];
  frequentlyOrdered: any[];
  recentlyAdded: any[];
  priceUpdatesCount: number;
}

export interface PaymentAnalytics {
  cashCollection: number;
  upiCollection: number;
  bankCollection: number;
  chequeCollection: number;
  advancePayments: number;
  partialPayments: number;
  pendingPayments: number;
  cancelledPayments: number;
}

export interface MarketRateAnalytics {
  todayUpdatedProducts: number;
  pendingPriceUpdateProducts: number;
  avgPriceIncrease: number;
  avgPriceDecrease: number;
  frequentlyUpdated: any[];
}

export interface BusinessInsights {
  topSellingProduct: string;
  highestRevenueCustomer: string;
  largestOutstanding: string;
  fastestPayingCustomer: string;
  slowestPayingCustomer: string;
  mostFrequentlyOrderedProduct: string;
  highestSalesDay: string;
  highestCollectionDay: string;
  productsWithoutPriceUpdateToday: number;
  customersWithNoOrdersRecently: string[];
}
