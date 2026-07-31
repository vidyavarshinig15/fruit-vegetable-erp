-- ==============================================================================
-- MIGRATION 00007: AUTOMATED AUDIT SYSTEM & UPDATED_AT TRIGGERS
-- PROJECT: RAJU VEGETABLES AND FRUITS (Wholesale Billing & Customer Management)
-- ==============================================================================

-- 1. APPLY UPDATED_AT TIMESTAMP TRIGGER TO ALL 26 PRODUCTION TABLES
CREATE TRIGGER trg_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_customer_contacts_updated_at BEFORE UPDATE ON customer_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_price_history_updated_at BEFORE UPDATE ON price_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_customer_uploaded_orders_updated_at BEFORE UPDATE ON customer_uploaded_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payment_receipts_updated_at BEFORE UPDATE ON payment_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_customer_ledger_updated_at BEFORE UPDATE ON customer_ledger FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_daily_collections_updated_at BEFORE UPDATE ON daily_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_language_settings_updated_at BEFORE UPDATE ON language_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_reports_cache_updated_at BEFORE UPDATE ON reports_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_audit_logs_updated_at BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_activity_logs_updated_at BEFORE UPDATE ON activity_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_file_uploads_updated_at BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_backup_logs_updated_at BEFORE UPDATE ON backup_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 2. AUDIT LOGGING TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION audit_action_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action_enum;
    v_shop_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := current_app_user_id();

    IF (TG_OP = 'INSERT') THEN
        v_shop_id := NEW.shop_id;
        IF (TG_TABLE_NAME = 'invoices') THEN
            v_action := 'INVOICE_CREATED';
        ELSIF (TG_TABLE_NAME = 'payments') THEN
            v_action := 'PAYMENT_ADDED';
        ELSIF (TG_TABLE_NAME = 'payment_receipts') THEN
            v_action := 'RECEIPT_GENERATED';
        ELSIF (TG_TABLE_NAME = 'customers') THEN
            v_action := 'CUSTOMER_ADDED';
        ELSE
            v_action := 'SYSTEM_UPDATE';
        END IF;

        INSERT INTO audit_logs (shop_id, user_id, action, entity_type, entity_id, new_values)
        VALUES (v_shop_id, v_user_id, v_action, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));

    ELSIF (TG_OP = 'UPDATE') THEN
        v_shop_id := NEW.shop_id;
        IF (TG_TABLE_NAME = 'customers') THEN
            v_action := 'CUSTOMER_UPDATED';
        ELSIF (TG_TABLE_NAME = 'products') THEN
            v_action := 'PRODUCT_UPDATED';
        ELSE
            v_action := 'SYSTEM_UPDATE';
        END IF;

        INSERT INTO audit_logs (shop_id, user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (v_shop_id, v_user_id, v_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATTACH AUDIT TRIGGERS TO SENSITIVE FINANCIAL & MASTER DATA TABLES
CREATE TRIGGER trg_audit_invoices AFTER INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION audit_action_trigger_fn();
CREATE TRIGGER trg_audit_payments AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION audit_action_trigger_fn();
CREATE TRIGGER trg_audit_receipts AFTER INSERT ON payment_receipts FOR EACH ROW EXECUTE FUNCTION audit_action_trigger_fn();
CREATE TRIGGER trg_audit_customers AFTER INSERT OR UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION audit_action_trigger_fn();
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION audit_action_trigger_fn();
