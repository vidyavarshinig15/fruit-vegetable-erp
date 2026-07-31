# Manual Steps & Configuration Checklist

Per product specifications, **no values are guessed**. The following manual configuration steps must be performed by the Business Owner / Administrator before launching production Module 2 and beyond.

---

## Required Manual Action Items

### 1. Supabase Project Setup
- [ ] Log in to [Supabase Console](https://supabase.com).
- [ ] Create a new project named `raju-vegetables-fruits-billing`.
- [ ] Obtain database connection string, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Environment Variables (.env)
- [ ] Copy `.env.example` to `.env` in root, `backend/`, and `frontend/`.
- [ ] Populate `JWT_SECRET` and `JWT_REFRESH_SECRET` with strong randomly generated 64-character hex keys.

### 3. Business Logos & Shop Branding
- [ ] Provide high-resolution PNG/SVG logos for:
  1. **RAJ FRUITS AND VEGETABLES**
  2. **G R FRUITS AND VEGETABLES**
  3. **PRIYAKRISHNA FRUITS AND VEGETABLES**
- [ ] Upload logo files into `frontend/src/assets/shops/` directory.

### 4. Shop Contact Details & Addresses
Provide exact print shop header details for invoice receipts:
- [ ] Address lines for Shop 1 (RAJ FRUITS AND VEGETABLES)
- [ ] Address lines for Shop 2 (G R FRUITS AND VEGETABLES)
- [ ] Address lines for Shop 3 (PRIYAKRISHNA FRUITS AND VEGETABLES)
- [ ] Official contact phone numbers for each shop

### 5. Payment Details (UPI / QR Code)
- [ ] Provide UPI IDs (VPA) and QR code image assets for shop payment collection:
  - Shop 1 UPI ID & QR Image
  - Shop 2 UPI ID & QR Image
  - Shop 3 UPI ID & QR Image

### 6. WhatsApp Business API / Messaging (Optional)
- [ ] Decide whether automatic WhatsApp receipt sending is enabled.
- [ ] If enabled, provide WhatsApp Cloud API Token, Phone Number ID, and Business Account ID.

### 7. Domain & Production Deployment
- [ ] Provide domain name (e.g., `billing.rajuvegetables.com` or custom server IP).
- [ ] SSL Certificate setup (Let's Encrypt / Cloudflare).
