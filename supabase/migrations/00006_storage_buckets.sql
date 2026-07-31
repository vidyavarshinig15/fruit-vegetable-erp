-- ==============================================================================
-- MIGRATION 00006: SUPABASE STORAGE BUCKETS SETUP & RLS STORAGE SECURITY
-- PROJECT: RAJU VEGETABLES AND FRUITS (Wholesale Billing & Customer Management)
-- ==============================================================================

-- 1. CREATE THE 7 PRODUCTION STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('customer-order-pdfs', 'customer-order-pdfs', false, 15728640, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
    ('generated-invoices', 'generated-invoices', false, 10485760, ARRAY['application/pdf']),
    ('payment-receipts', 'payment-receipts', false, 10485760, ARRAY['application/pdf']),
    ('business-logos', 'business-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
    ('backup-files', 'backup-files', false, 104857600, ARRAY['application/zip', 'application/x-tar', 'application/json', 'text/csv']),
    ('profile-pictures', 'profile-pictures', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('documents', 'documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. STORAGE RLS SECURITY POLICIES FOR STORAGE.OBJECTS

-- Business Logos & Public Assets: Read Access for All Authenticated Users
CREATE POLICY "Public Read Access for Business Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

CREATE POLICY "Public Read Access for Profile Pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Generated Invoices: Authenticated Staff Read Access
CREATE POLICY "Authenticated Staff Read Generated Invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated-invoices');

CREATE POLICY "Authenticated Staff Upload Generated Invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-invoices');

-- Customer Order PDFs: Authenticated Staff Read/Upload Access
CREATE POLICY "Authenticated Staff Read Customer Order PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'customer-order-pdfs');

CREATE POLICY "Authenticated Staff Upload Customer Order PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-order-pdfs');

-- Payment Receipts: Authenticated Staff Access
CREATE POLICY "Authenticated Staff Read Payment Receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-receipts');

CREATE POLICY "Authenticated Staff Upload Payment Receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- Backup Files: Super Admin Only Access
CREATE POLICY "Super Admin Access Backup Files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'backup-files' AND is_super_admin());
