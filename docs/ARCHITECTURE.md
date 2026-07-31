# Architectural Specification

## Project Overview
**RAJU VEGETABLES AND FRUITS** is a production-grade Wholesale Billing & Customer Management System designed specifically for vegetable and fruit market operations.

### Key Architectural Constraint: NO TAX, NO GST, NO DISCOUNT
The business operates under a net wholesale model. There are **zero** GST, tax, or discount fields anywhere in data models, calculations, UI displays, or invoice outputs.

---

## Multi-Tenant Shop Isolation Architecture

The system supports **3 completely independent wholesale shops**:

1. `RAJ_FRUITS_AND_VEGETABLES`: RAJ FRUITS AND VEGETABLES
2. `G_R_FRUITS_AND_VEGETABLES`: G R FRUITS AND VEGETABLES
3. `PRIYAKRISHNA_FRUITS_AND_VEGETABLES`: PRIYAKRISHNA FRUITS AND VEGETABLES

### Data Isolation Guarantees
- **Shop Context Header**: Every HTTP request sends `X-Shop-Id` in headers.
- **Database Tenant Column**: Every table (`customers`, `bills`, `products`, `payments`, `ledger`, `receipts`, `settings`) is scoped by `shop_id`.
- **Repository Pattern Enforcement**: Backend repositories inject `WHERE shop_id = :active_shop_id` into all queries. Cross-tenant leakage is strictly impossible.
- **Frontend Isolation**: Switching shops resets active QueryClient cache and active workspace state context.

---

## Clean Architecture & Layering

```
[ Presentation Layer ]  React UI Components, React Hook Form, Tailwind CSS, i18n
        │
[ Client Service Layer ] Axios HTTP Client, React Query Hooks, API Handlers
        │
        ▼ (HTTP REST API with X-Shop-Id)
        │
[ Express Controller ]  Route Routing & HTTP Parameter Deserialization
        │
[ Middleware Layer ]    JWT Auth, Rate Limiter, Helmet Security, ShopContext Extraction
        │
[ Validator Layer ]     Zod Request DTO Validation
        │
[ Service Layer ]       Domain Business Logic, Shop Context Enforcement
        │
[ Repository Layer ]    Database Abstraction (Supabase Client Queries)
        │
[ Database / Storage ]  Supabase PostgreSQL & Supabase File Storage
```

---

## Security Architecture

1. **JWT & Refresh Tokens**: Dual-token architecture stored in secure httpOnly cookies.
2. **Shop Authorization**: Users are validated against authorized shop access roles (`SUPER_ADMIN`, `SHOP_ADMIN`, `BILLING_OPERATOR`).
3. **Helmet Secure Headers**: Content-Security-Policy, HSTS, X-Frame-Options, X-Content-Type-Options.
4. **Rate Limiting**: IP and Route based rate limiters via `express-rate-limit`.
5. **Activity Audit Logging**: All sensitive mutations (bill generation, payment collection, settings updates) write immutable audit logs with `user_id`, `shop_id`, `action`, `ip_address`, `timestamp`.
