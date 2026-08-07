import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SelectShopPage } from '@/pages/auth/SelectShopPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage';
import { ForbiddenPage } from '@/pages/auth/ForbiddenPage';
import { ProfilePage } from '@/pages/auth/ProfilePage';
import { UserManagementPage } from '@/pages/users/UserManagementPage';
import { RolePermissionPage } from '@/pages/roles/RolePermissionPage';
import { ActivityLogPage } from '@/pages/activity/ActivityLogPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CustomerListPage } from '@/pages/customers/customer-list/CustomerListPage';
import { CustomerFormPage } from '@/pages/customers/customer-form/CustomerFormPage';
import { CustomerProfilePage } from '@/pages/customers/customer-profile/CustomerProfilePage';
import { ProductListPage } from '@/pages/products/product-list/ProductListPage';
import { ProductFormPage } from '@/pages/products/product-form/ProductFormPage';
import { ProductDetailsPage } from '@/pages/products/product-details/ProductDetailsPage';
import { DailyPricesPage } from '@/pages/products/daily-prices/DailyPricesPage';
import { BillingPage } from '@/pages/billing/BillingPage';
import { InvoiceListPage } from '@/pages/billing/invoice-list/InvoiceListPage';
import { InvoiceDetailsPage } from '@/pages/billing/invoice-details/InvoiceDetailsPage';
import { OrderListPage } from '@/pages/orders/order-list/OrderListPage';
import { OrderUploadPage } from '@/pages/orders/order-upload/OrderUploadPage';
import { OrderVerifyPage } from '@/pages/orders/order-verify/OrderVerifyPage';
import { PaymentsPage } from '@/pages/payments/PaymentsPage';
import { PaymentFormPage } from '@/pages/payments/PaymentFormPage';
import { PaymentDetailsPage } from '@/pages/payments/PaymentDetailsPage';
import { ReceiptsPage } from '@/pages/receipts/ReceiptsPage';
import { LedgerPage } from '@/pages/ledger/LedgerPage';
import { CustomerStatementPage } from '@/pages/ledger/CustomerStatementPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { BackupPage } from '@/pages/backup/BackupPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { NotFoundPage } from '@/pages/common/NotFoundPage';
import { HistoryPage } from '@/pages/billing/HistoryPage';
import { PendingPage } from '@/pages/billing/PendingPage';
import { PartialPage } from '@/pages/billing/PartialPage';
import { ClearedPage } from '@/pages/billing/ClearedPage';
import { useAuth } from '@/contexts/AuthContext';

const OwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (!user || user.email !== 'vidyavarshini15@gmail.com') {
    return <Navigate to="/profile" replace />;
  }
  
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-bold text-slate-400">
        Authenticating secure terminal session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/select-shop" element={<SelectShopPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Main Application Layout Protected Routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<OwnerRoute><UserManagementPage /></OwnerRoute>} />
        <Route path="/roles" element={<OwnerRoute><RolePermissionPage /></OwnerRoute>} />
        <Route path="/activity" element={<OwnerRoute><ActivityLogPage /></OwnerRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Customer Management Routes */}
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="/customers/:id" element={<CustomerProfilePage />} />

        {/* Product & Price Management Routes */}
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id/edit" element={<ProductFormPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/products/daily-update" element={<DailyPricesPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/invoices" element={<InvoiceListPage />} />
        <Route path="/billing/invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/pending" element={<PendingPage />} />
        <Route path="/partial" element={<PartialPage />} />
        <Route path="/cleared" element={<ClearedPage />} />
        
        {/* Uploaded Orders OCR Routes */}
        <Route path="/orders" element={<OrderListPage />} />
        <Route path="/orders/upload" element={<OrderUploadPage />} />
        <Route path="/orders/:id/verify" element={<OrderVerifyPage />} />

        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payments/new" element={<PaymentFormPage />} />
        <Route path="/payments/:id" element={<PaymentDetailsPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/ledger/statement" element={<CustomerStatementPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/backup" element={<OwnerRoute><BackupPage /></OwnerRoute>} />
        <Route path="/settings" element={<OwnerRoute><SettingsPage /></OwnerRoute>} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
