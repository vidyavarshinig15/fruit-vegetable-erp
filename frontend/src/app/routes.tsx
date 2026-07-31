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
import { CreditManagementPage } from '@/pages/ledger/CreditManagementPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { CommunicationDashboard } from '@/pages/communication/CommunicationDashboard';
import { BackupPage } from '@/pages/backup/BackupPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { NotFoundPage } from '@/pages/common/NotFoundPage';

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
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/roles" element={<RolePermissionPage />} />
        <Route path="/activity" element={<ActivityLogPage />} />
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
        <Route path="/ledger/credit" element={<CreditManagementPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/communication" element={<CommunicationDashboard />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
