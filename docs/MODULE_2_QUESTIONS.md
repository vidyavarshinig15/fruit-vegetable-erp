# Questions Required Before Module 2 (Database & Data Architecture)

Before beginning **Module 2 (Database Schema & Supabase Setup)**, please provide answers to these operational business questions:

---

## 1. Shop Profile & Details
- What are the exact shop addresses, shop numbers, market yard locations, and primary phone numbers for:
  1. **RAJ FRUITS AND VEGETABLES**
  2. **G R FRUITS AND VEGETABLES**
  3. **PRIYAKRISHNA FRUITS AND VEGETABLES**

## 2. Customer & Credit Rules
- Are wholesale customers shared across shops, or completely isolated per shop?
- What are the default payment term limits for wholesale credit (e.g., 7 days, 15 days, 30 days)?
- Should there be credit balance limit warnings (e.g., warn when customer unpaid balance exceeds ₹50,000)?

## 3. Product Catalog & Units
- What unit types are standard for your wholesale items? (e.g., `kg`, `crate`, `bag`, `quintal`, `box`, `piece`, `dozen`)
- Are daily market rates fixed per product per day, or customizable per bill line item?

## 4. Invoice & Billing Numbering Scheme
- Should invoice bill numbers be sequential per shop (e.g., `RAJ-2026-0001`, `GR-2026-0001`, `PK-2026-0001`) or simple numbers?
- Should bill numbers reset at the start of every financial year (April 1st)?

## 5. Print & Receipt Preferences
- What thermal print sizes do you use? (e.g., 2-inch / 3-inch Thermal Printer, or standard A4 / A5 paper)?
- Do you want Kannada & English bilingual print options on bills?
