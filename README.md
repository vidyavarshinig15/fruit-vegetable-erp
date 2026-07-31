# Raju Wholesale fruits & vegetables Billing System ERP

Production-ready Wholesale Enterprise Resource Planning (ERP) suite with multi-shop isolation supporting:
- **RAJ FRUITS AND VEGETABLES**
- **G R FRUITS AND VEGETABLES**
- **PRIYAKRISHNA FRUITS AND VEGETABLES**

This system handles OCR-assisted PDF invoices ingest, live credit utilization blocks, chronological ledger timelines, business growth spline analytics, and SMTP/Meta Cloud communication channels.

---

## 1. System Architecture & Folder Layouts

The application operates as an ESM monorepo using NPM workspaces:

```
├── shared/                  # Common TypeScript interfaces and models
│   ├── src/types/           # Enums for role permissions, ledger rows, analytics KPIs
│   └── src/index.ts         # Central type exports rebuilds
├── backend/                 # Node.js + Express + PostgREST backend server
│   ├── src/controllers/     # Request flow routers (Ledgers, Analytics, system configs)
│   ├── src/repositories/    # SQL queries builders (Invoice, Payment, Backup serializers)
│   ├── src/services/        # SMTP/Resend mailers, Meta WhatsApp API wrappers
│   └── src/index.ts         # Express server pipelines
├── frontend/                # React.js + Vite + TailwindCSS client dashboard
│   ├── src/pages/           # Billing checkout, OCR verifications, Reports, Settings
│   ├── src/components/      # Floating Notification center alert cards
│   └── src/app/             # Router endpoints configurations
└── supabase/                # PostgreSQL tables, indices, stored procedures triggers
    └── migrations/          # Chronological DB schemas
```

---

## 2. Supabase Database Schema & Migrations

Deploy database tables using migrations in chronological order:
1. `00001_initial_schema.sql` -> Base configurations.
2. `00002_create_tables.sql` -> Main tables (Shops, Customers, Invoices, Ledgers).
3. `00003_indexes_and_constraints.sql` -> Primary foreign key indices.
4. `00004_seed_data.sql` -> Prepopulated shop categories.
5. `00005_rls_security_policies.sql` -> RLS security policies.
6. `00006_storage_buckets.sql` -> PDF invoices storage buckets configurations.
7. `00007_audit_triggers.sql` -> Automated modification log triggers.
8. `00008_communication_tables.sql` -> Templates, history logs, SMTP configuration schemas.

---

## 3. Production Deployment Guide

### A. Database Deployment
1. Initialize a Supabase PostgreSQL instance.
2. Copy and execute migrations `00001` through `00008` in order using the Supabase SQL editor.
3. Configure Storage Bucket for `invoices` with public access if sharing file URLs is needed.

### B. Backend Deployment
1. Set up a Node.js container (v20+ recommended).
2. Configure environmental keys in `.env`:
   ```env
   PORT=5001
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=secret-service-role-key
   JWT_SECRET=production-signing-secret
   CORS_ORIGIN=https://billing.rajuwholesale.com
   ```
3. Run install and build:
   ```bash
   npm run build:shared
   npm --prefix backend install
   npm --prefix backend run build
   npm --prefix backend start
   ```

### C. Frontend Web Client Deployment
1. Host the React single-page application on Vercel, Netlify, or AWS Amplify.
2. Set build command: `npm run build` and output directory: `frontend/dist`.

---

## 4. Administration Manual (Backups & Restores)

- **Manual DB Backup**:
  1. Open **Settings & Security Center** -> **Backup & Restore** tab.
  2. Click **Download Manual Backup**.
  3. The system compiles a `.json` file containing all shop tables (Invoices, Ledgers, Customers balances, Preferences) and downloads it to the client machine.
- **Disaster Recovery Restore**:
  1. Open **Restore Data Backup** card.
  2. Click **Upload JSON Backup** and choose the downloaded file.
  3. Upon admin authorization check and confirmation, the system runs sequential deletes and batch-inserts to restore the DB specifically for the active shop.

---

## 5. User Guides (Invoices, OCR & Payments)

### Inbound OCR PDF Order Flow
1. Staff navigates to **Inbound Orders** -> click **Upload PDF**.
2. OCR parses product names, item quantities, and units.
3. If spelling is misspelled (e.g. `"Tamato"`), the **Smart Order Assist** checks past orders and suggests `"Tomato"` with a confidence percentage.
4. User clicks **Accept Suggestion** and confirms items listing -> redirects to invoice checkout.

### Credit Hold Enforcements
1. During billing checkout, the system verifies `Invoice Total + Current Customer Balance > Credit Limit`.
2. If exceeded, the checkout blocks transactions and flags a **Credit Hold Warning**. Managers must update the credit limit in Customer Settings to override.

---

## 6. Troubleshooting Procedures

### CORS Policy Errors
- Ensure the backend `.env` file `CORS_ORIGIN` matches the exact client URL (no trailing slash). E.g., `https://billing.rajuwholesale.com`.

### Supabase Connection Timeouts
- Verify that `SUPABASE_SERVICE_ROLE_KEY` is the secret service key, not the public anon key. The public anon key lacks database bypass permissions and will fail with 401 Unauthorized.

### WhatsApp Sharing Failure
- Ensure customer mobile numbers include country code prefix without special characters. E.g. `919876543210` for India.

---

## 7. Playwright E2E Test Suite

We have written a comprehensive Playwright e2e test suite inside `frontend/e2e/`.

### Directory Structure
- `frontend/e2e/page-objects/`:LoginPage, CustomerPage, ProductPage, BillingPage.
- `frontend/e2e/specs/erp.spec.ts`: Test specifications covering Standard Checkout (OCR & payments), Partial Collections (invoice fully paid & statement update), and Advance payments settlements.

### How to Run Tests
1. Install Playwright browsers dependencies:
   ```bash
   npx playwright install
   ```
2. Start the local server:
   ```bash
   npm run dev:backend & npm run dev:frontend
   ```
3. Run the Playwright test suite:
   ```bash
   npx playwright test
   ```
