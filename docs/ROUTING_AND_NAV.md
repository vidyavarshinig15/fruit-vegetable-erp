# Routing & Navigation Map

The application features 18 dedicated routes designed for desktop, tablet, and mobile wholesale operations.

## Route Definitions

| Route | Page Title | Access Level | Description |
|---|---|---|---|
| `/` | Landing / Redirect | Authenticated | Redirects to `/dashboard` if logged in, else `/login` |
| `/login` | Shop Login | Public | User authentication and shop assignment selection |
| `/dashboard` | Dashboard Overview | Protected | Real-time metrics (Today's Sales, Pending Dues, Total Bills) |
| `/customers` | Customer Directory | Protected | Wholesale customer records, balance tracking & contacts |
| `/products` | Product Catalog | Protected | Fruit & vegetable items, daily market rates & units |
| `/billing` | Wholesale Billing (POS) | Protected | Quick bill generation layout with keyboard shortcuts |
| `/payments` | Record Payment | Protected | Payment collection entry against open customer bills |
| `/receipts` | Payment Receipts | Protected | Historical receipt tracking and print view |
| `/ledger` | Customer Ledger | Protected | Itemized customer balance statement & transaction history |
| `/reports` | Financial & Sales Reports | Protected | Sales summary, customer aging, daily ledger reports |
| `/history` | Bill History | Protected | Complete searchable log of generated bills |
| `/pending` | Pending Bills | Protected | Bills with unpaid balances |
| `/partial` | Partially Paid Bills | Protected | Bills with partial payments recorded |
| `/cleared` | Cleared Bills | Protected | Fully paid bills archive |
| `/backup` | Data Export & Backup | Admin | Export shop data (JSON/CSV) and database backup status |
| `/settings` | Shop Settings | Admin | Address, phone numbers, header titles, receipt footer |
| `/profile` | User Profile | Protected | Admin user details, password update & preferences |
| `/unauthorized` | 401 Unauthorized | Public | Access denied due to invalid session |
| `/forbidden` | 403 Forbidden | Public | Access denied due to insufficient permissions |
| `*` | 404 Not Found | Public | Page not found handler |
