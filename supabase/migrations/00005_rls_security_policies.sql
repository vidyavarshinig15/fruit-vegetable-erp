-- ==============================================================================
-- MIGRATION 00005: ROW LEVEL SECURITY (RLS) & SHOP ISOLATION POLICIES
-- PROJECT: RAJU VEGETABLES AND FRUITS (Wholesale Billing & Customer Management)
-- ==============================================================================

-- 1. HELPER SECURITY FUNCTIONS

-- Check if current authenticated user is Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
          AND is_super_admin = TRUE 
          AND is_deleted = FALSE 
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current authenticated user has access to a specific shop
CREATE OR REPLACE FUNCTION user_has_shop_access(check_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super Admin has access to all shops
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Otherwise check explicit shop role mapping
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
          AND shop_id = check_shop_id 
          AND is_deleted = FALSE 
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_uploaded_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR SHOPS
CREATE POLICY p_shops_select ON shops FOR SELECT
    USING (user_has_shop_access(id));

CREATE POLICY p_shops_update ON shops FOR UPDATE
    USING (is_super_admin());

-- 4. RLS POLICIES FOR USERS & USER ROLES
CREATE POLICY p_users_select ON users FOR SELECT
    USING (id = auth.uid() OR is_super_admin());

CREATE POLICY p_user_roles_select ON user_roles FOR SELECT
    USING (user_id = auth.uid() OR is_super_admin());

-- 5. RLS POLICIES FOR CATEGORIES
CREATE POLICY p_categories_select ON categories FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_categories_insert ON categories FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

CREATE POLICY p_categories_update ON categories FOR UPDATE
    USING (user_has_shop_access(shop_id));

-- 6. RLS POLICIES FOR PRODUCTS
CREATE POLICY p_products_select ON products FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_products_insert ON products FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

CREATE POLICY p_products_update ON products FOR UPDATE
    USING (user_has_shop_access(shop_id));

-- 7. RLS POLICIES FOR CUSTOMERS & CONTACTS
CREATE POLICY p_customers_select ON customers FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_customers_insert ON customers FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

CREATE POLICY p_customers_update ON customers FOR UPDATE
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_contacts_select ON customer_contacts FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_contacts_insert ON customer_contacts FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

CREATE POLICY p_contacts_update ON customer_contacts FOR UPDATE
    USING (user_has_shop_access(shop_id));

-- 8. RLS POLICIES FOR INVOICES & INVOICE ITEMS
CREATE POLICY p_invoices_select ON invoices FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_invoices_insert ON invoices FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

CREATE POLICY p_invoices_update ON invoices FOR UPDATE
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_invoice_items_select ON invoice_items FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_invoice_items_insert ON invoice_items FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

-- 9. RLS POLICIES FOR PAYMENTS & RECEIPTS
CREATE POLICY p_payments_select ON payments FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_payments_insert ON payments FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

CREATE POLICY p_receipts_select ON payment_receipts FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_receipts_insert ON payment_receipts FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

-- 10. RLS POLICIES FOR CUSTOMER LEDGER & DAILY COLLECTIONS
CREATE POLICY p_ledger_select ON customer_ledger FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_ledger_insert ON customer_ledger FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

CREATE POLICY p_collections_select ON daily_collections FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_collections_insert ON daily_collections FOR INSERT
    WITH CHECK (user_has_shop_access(shop_id));

-- 11. RLS POLICIES FOR SETTINGS & AUDIT LOGS
CREATE POLICY p_business_settings_select ON business_settings FOR SELECT
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_business_settings_update ON business_settings FOR UPDATE
    USING (user_has_shop_access(shop_id));

CREATE POLICY p_audit_logs_select ON audit_logs FOR SELECT
    USING (user_has_shop_access(shop_id) OR is_super_admin());

CREATE POLICY p_activity_logs_select ON activity_logs FOR SELECT
    USING (user_has_shop_access(shop_id) OR is_super_admin());

-- 12. HARDENED DELETE RESTRICTION POLICY: ONLY SUPER ADMIN CAN PHYSICAL DELETE
CREATE POLICY p_hard_delete_restriction ON customers FOR DELETE
    USING (is_super_admin());
CREATE POLICY p_invoices_delete_restriction ON invoices FOR DELETE
    USING (is_super_admin());
CREATE POLICY p_payments_delete_restriction ON payments FOR DELETE
    USING (is_super_admin());
