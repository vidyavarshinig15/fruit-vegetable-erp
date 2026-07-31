-- ==============================================================================
-- MIGRATION 00004: SEED DATA FOR SHOPS, ROLES, PERMISSIONS, & INITIAL SETTINGS
-- PROJECT: RAJU VEGETABLES AND FRUITS (Wholesale Billing & Customer Management)
-- ==============================================================================

-- 1. SEED THE 3 INDEPENDENT SHOPS
INSERT INTO shops (id, code, name, address_line1, address_line2, city, state, pincode, phone_primary, status)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'RAJ_FRUITS_AND_VEGETABLES', 'RAJ FRUITS AND VEGETABLES', 'Shop No. 12, APMC Market Yard', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', '560022', '+91 98450 00001', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'G_R_FRUITS_AND_VEGETABLES', 'G R FRUITS AND VEGETABLES', 'Shop No. 15, APMC Market Yard', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', '560022', '+91 98450 00002', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'PRIYAKRISHNA_FRUITS_AND_VEGETABLES', 'PRIYAKRISHNA FRUITS AND VEGETABLES', 'Shop No. 18, APMC Market Yard', 'Yeshwanthpur', 'Bengaluru', 'Karnataka', '560022', '+91 98450 00003', 'active')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, address_line1 = EXCLUDED.address_line1;

-- 2. SEED SYSTEM ROLES
INSERT INTO roles (id, name, description)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'SUPER_ADMIN', 'Platform Administrator with full cross-shop access'),
    ('a2222222-2222-2222-2222-222222222222', 'SHOP_ADMIN', 'Shop Owner/Manager with full control over single shop'),
    ('a3333333-3333-3333-3333-333333333333', 'BILLING_STAFF', 'Billing Operator permitted to create bills and collect payments'),
    ('a4444444-4444-4444-4444-444444444444', 'REPORT_VIEWER', 'Read-only access to view daily sales, collections, and ledgers')
ON CONFLICT (name) DO NOTHING;

-- 3. SEED CORE PERMISSIONS
INSERT INTO permissions (code, module, description)
VALUES
    ('shop.switch', 'SHOP', 'Switch between different shops'),
    ('shop.manage', 'SHOP', 'Update shop settings and profile'),
    ('customer.create', 'CUSTOMER', 'Create new wholesale customers'),
    ('customer.read', 'CUSTOMER', 'View customer profile and balance'),
    ('customer.update', 'CUSTOMER', 'Edit customer details and credit limits'),
    ('customer.delete', 'CUSTOMER', 'Soft delete customer record'),
    ('product.manage', 'PRODUCT', 'Add, update, and manage product prices'),
    ('invoice.create', 'INVOICE', 'Create wholesale bills'),
    ('invoice.read', 'INVOICE', 'View invoice history and details'),
    ('invoice.print', 'INVOICE', 'Print thermal/paper bill receipts'),
    ('invoice.cancel', 'INVOICE', 'Cancel generated invoice'),
    ('payment.collect', 'PAYMENT', 'Record customer payments and issue receipts'),
    ('ledger.view', 'LEDGER', 'View customer debit/credit statement ledger'),
    ('reports.view', 'REPORTS', 'View daily collections and summary reports'),
    ('audit.view', 'AUDIT', 'View system audit trails and user activity logs')
ON CONFLICT (code) DO NOTHING;

-- 4. SEED DEFAULT BUSINESS SETTINGS FOR EACH SHOP
INSERT INTO business_settings (shop_id, thermal_print_size, enable_kannada_print, invoice_header_note, invoice_footer_note, credit_warning_threshold)
VALUES
    ('11111111-1111-1111-1111-111111111111', '3_INCH', TRUE, 'RAJ FRUITS AND VEGETABLES - WHOLESALE SUPPLIER', 'Thank you for your business! Please pay within agreed credit terms.', 50000.00),
    ('22222222-2222-2222-2222-222222222222', '3_INCH', TRUE, 'G R FRUITS AND VEGETABLES - APMC YARD', 'Thank you for your business! Please pay within agreed credit terms.', 50000.00),
    ('33333333-3333-3333-3333-333333333333', '3_INCH', TRUE, 'PRIYAKRISHNA FRUITS AND VEGETABLES', 'Thank you for your business! Please pay within agreed credit terms.', 50000.00)
ON CONFLICT (shop_id) DO NOTHING;

-- 5. SEED STANDARD PRODUCT CATEGORIES FOR EACH SHOP
INSERT INTO categories (shop_id, name, display_order)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Fresh Vegetables', 1),
    ('11111111-1111-1111-1111-111111111111', 'Leafy Greens', 2),
    ('11111111-1111-1111-1111-111111111111', 'Fruits', 3),
    ('22222222-2222-2222-2222-222222222222', 'Fresh Vegetables', 1),
    ('22222222-2222-2222-2222-222222222222', 'Leafy Greens', 2),
    ('22222222-2222-2222-2222-222222222222', 'Fruits', 3),
    ('33333333-3333-3333-3333-333333333333', 'Fresh Vegetables', 1),
    ('33333333-3333-3333-3333-333333333333', 'Leafy Greens', 2),
    ('33333333-3333-3333-3333-333333333333', 'Fruits', 3)
ON CONFLICT (shop_id, name) DO NOTHING;
