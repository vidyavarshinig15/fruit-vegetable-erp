-- ==============================================================================
-- MIGRATION 00003: OPTIMIZED INDEXES & HIGH-PERFORMANCE SEARCH CONSTRAINTS
-- PROJECT: RAJU VEGETABLES AND FRUITS (Wholesale Billing & Customer Management)
-- ==============================================================================

-- 1. INVOICES INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_shop_id ON invoices(shop_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_bill_status ON invoices(bill_status) WHERE is_deleted = FALSE;

-- Composite Indexes for Invoice Queries & Reports
CREATE INDEX IF NOT EXISTS idx_invoices_shop_date ON invoices(shop_id, invoice_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_shop_customer_date ON invoices(shop_id, customer_id, invoice_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_shop_paystatus ON invoices(shop_id, payment_status, invoice_date DESC) WHERE is_deleted = FALSE;

-- 2. CUSTOMERS INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status) WHERE is_deleted = FALSE;

-- Fast Search GIN Trigram Index on Customer Name & Mobile Number
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_mobile_trgm ON customers USING gin(mobile_number gin_trgm_ops) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON customers(shop_id, name) WHERE is_deleted = FALSE;

-- 3. PRODUCTS INDEXES
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_products_shop_name ON products(shop_id, name) WHERE is_deleted = FALSE;

-- 4. INVOICE ITEMS INDEXES
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoice_items_shop_id ON invoice_items(shop_id) WHERE is_deleted = FALSE;

-- 5. PAYMENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_shop_id ON payments(shop_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payments_shop_customer_date ON payments(shop_id, customer_id, payment_date DESC) WHERE is_deleted = FALSE;

-- 6. PAYMENT RECEIPTS INDEXES
CREATE INDEX IF NOT EXISTS idx_payment_receipts_shop_id ON payment_receipts(shop_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_id ON payment_receipts(payment_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_receipts_customer_id ON payment_receipts(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_receipts_number ON payment_receipts(receipt_number) WHERE is_deleted = FALSE;

-- 7. CUSTOMER LEDGER INDEXES (MILLIONS OF ROWS OPTIMIZATION)
CREATE INDEX IF NOT EXISTS idx_customer_ledger_shop_id ON customer_ledger(shop_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customer_ledger_trans_date ON customer_ledger(transaction_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customer_ledger_shop_cust_date ON customer_ledger(shop_id, customer_id, transaction_date DESC, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_customer_ledger_ref ON customer_ledger(reference_id) WHERE is_deleted = FALSE;

-- 8. PRICE HISTORY INDEXES
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, effective_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_price_history_shop ON price_history(shop_id, effective_date DESC) WHERE is_deleted = FALSE;

-- 9. AUDIT LOGS & ACTIVITY LOGS INDEXES
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_date ON audit_logs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_activity_logs_shop_date ON activity_logs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, created_at DESC);

-- 10. NOTIFICATIONS & FILE UPLOADS INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_file_uploads_shop_entity ON file_uploads(shop_id, entity_type, entity_id);

-- 11. CHECK CONSTRAINTS FOR NON-NEGATIVE FINANCIAL VALUES
ALTER TABLE customers ADD CONSTRAINT chk_customers_credit_limit CHECK (credit_limit >= 0);
ALTER TABLE products ADD CONSTRAINT chk_products_default_rate CHECK (default_rate >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoices_subtotal CHECK (subtotal_amount >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoices_total CHECK (total_amount >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoices_paid CHECK (paid_amount >= 0);
ALTER TABLE payments ADD CONSTRAINT chk_payments_amount CHECK (amount > 0);
ALTER TABLE invoice_items ADD CONSTRAINT chk_invoice_items_qty CHECK (quantity > 0);
ALTER TABLE invoice_items ADD CONSTRAINT chk_invoice_items_price CHECK (unit_price >= 0);
ALTER TABLE invoice_items ADD CONSTRAINT chk_invoice_items_total CHECK (total_price >= 0);
