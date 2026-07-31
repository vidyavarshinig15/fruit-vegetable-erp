-- ==============================================================================
-- MIGRATION 00001: INITIAL SCHEMA SETUP, EXTENSIONS, ENUMS, & UTILITY FUNCTIONS
-- PROJECT: RAJU VEGETABLES AND FRUITS (Wholesale Billing & Customer Management)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUM TYPES

-- Multi-Tenant Shop Codes
DO $$ BEGIN
    CREATE TYPE shop_code_enum AS ENUM (
        'RAJ_FRUITS_AND_VEGETABLES',
        'G_R_FRUITS_AND_VEGETABLES',
        'PRIYAKRISHNA_FRUITS_AND_VEGETABLES'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- System Roles
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'SUPER_ADMIN',
        'SHOP_ADMIN',
        'BILLING_STAFF',
        'REPORT_VIEWER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Standard Wholesale Unit Types
DO $$ BEGIN
    CREATE TYPE unit_type_enum AS ENUM (
        'KG',
        'CRATE',
        'BAG',
        'QUINTAL',
        'BOX',
        'PIECE',
        'DOZEN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment Modes
DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM (
        'CASH',
        'UPI',
        'BANK_TRANSFER',
        'CHEQUE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invoice Payment Statuses
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM (
        'UNPAID',
        'PARTIALLY_PAID',
        'PAID',
        'OVERDUE',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invoice Bill Statuses
DO $$ BEGIN
    CREATE TYPE bill_status_enum AS ENUM (
        'DRAFT',
        'GENERATED',
        'PRINTED',
        'CANCELLED',
        'PAID'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Customer Ledger Transaction Types
DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM (
        'INVOICE',
        'PAYMENT',
        'OPENING_BALANCE',
        'ADJUSTMENT_DEBIT',
        'ADJUSTMENT_CREDIT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Audit Action Types
DO $$ BEGIN
    CREATE TYPE audit_action_enum AS ENUM (
        'INVOICE_CREATED',
        'INVOICE_PRINTED',
        'INVOICE_SHARED',
        'INVOICE_DOWNLOADED',
        'PAYMENT_ADDED',
        'RECEIPT_GENERATED',
        'CUSTOMER_ADDED',
        'CUSTOMER_UPDATED',
        'PRODUCT_UPDATED',
        'LOGIN',
        'LOGOUT',
        'BACKUP_CREATED',
        'SYSTEM_UPDATE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. UTILITY TRIGGER FUNCTION FOR UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. UTILITY HELPER FUNCTION FOR CURRENT AUTHENTICATED USER ID
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
