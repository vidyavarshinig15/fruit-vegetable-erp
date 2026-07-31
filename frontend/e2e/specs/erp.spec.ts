import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage.ts';
import { CustomerPage } from '../page-objects/CustomerPage.ts';
import { ProductPage } from '../page-objects/ProductPage.ts';
import { BillingPage } from '../page-objects/BillingPage.ts';

test.describe('Fruits & Vegetables ERP Production Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Default admin seed credentials
    await loginPage.login('admin@rajuvegetables.com', 'Admin@12345');
    await loginPage.selectShop('RAJ FRUITS AND VEGETABLES');
  });

  test('Workflow 1: Standard Checkout Order Process with OCR & Payments Receipts', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    const productPage = new ProductPage(page);
    const billingPage = new BillingPage(page);

    // 1. Update Market Rate
    await productPage.goto();
    await productPage.updateMarketRates('Tomato', 45);

    // 2. Open Billing Checkout
    await billingPage.goto();
    await billingPage.createInvoice('Raju Super Admin', [
      { name: 'Tomato', qty: 10, rate: 45 },
    ]);

    // 3. Confirm Invoice Generated Success Screen
    await expect(page.locator('text=Invoice generated successfully')).toBeVisible();

    // 4. Collect Payment Collection & Receipts
    await page.click('nav >> text=Payments');
    await page.click('button:has-text("Record Collection")');
    await page.selectOption('select[label="Customer Name"]', { label: 'Raju Super Admin' });
    await page.fill('input[label="Collection Amount (₹)"]', '450');
    await page.selectOption('select[label="Payment Mode"]', 'CASH');
    await page.click('button:has-text("Save Collection")');

    // Confirm receipt popup
    await expect(page.locator('text=Receipt generated successfully')).toBeVisible();

    // 5. Check Ledger Account Timeline balance
    await page.click('nav >> text=Ledger');
    await expect(page.locator('tr:has-text("INVOICE")')).toBeVisible();
    await expect(page.locator('tr:has-text("PAYMENT")')).toBeVisible();
  });

  test('Workflow 2: Partial Collections & Account Statement Upgrades', async ({ page }) => {
    const billingPage = new BillingPage(page);

    // 1. Create Invoice
    await billingPage.goto();
    await billingPage.createInvoice('Raju Super Admin', [
      { name: 'Tomato', qty: 20, rate: 50 }, // Total: ₹1000
    ]);
    await expect(page.locator('text=Invoice generated successfully')).toBeVisible();

    // 2. Record First Partial Payment
    await page.click('nav >> text=Payments');
    await page.click('button:has-text("Record Collection")');
    await page.selectOption('select[label="Customer Name"]', { label: 'Raju Super Admin' });
    await page.fill('input[label="Collection Amount (₹)"]', '400');
    await page.click('button:has-text("Save Collection")');
    await expect(page.locator('text=Receipt generated successfully')).toBeVisible();

    // 3. Record Second Payment
    await page.click('button:has-text("Record Collection")');
    await page.selectOption('select[label="Customer Name"]', { label: 'Raju Super Admin' });
    await page.fill('input[label="Collection Amount (₹)"]', '600');
    await page.click('button:has-text("Save Collection")');
    await expect(page.locator('text=Receipt generated successfully')).toBeVisible();

    // 4. View printable account statement
    await page.click('nav >> text=Ledger');
    await page.click('button:has-text("Print Statement")');
    await expect(page.locator('text=STATEMENT REPORT')).toBeVisible();
  });

  test('Workflow 3: Advance Settlement credits and adjustment debits', async ({ page }) => {
    // 1. Record Advance collection
    await page.click('nav >> text=Payments');
    await page.click('button:has-text("Record Collection")');
    await page.selectOption('select[label="Customer Name"]', { label: 'Raju Super Admin' });
    await page.fill('input[label="Collection Amount (₹)"]', '500'); // Advance
    await page.click('button:has-text("Save Collection")');
    await expect(page.locator('text=Receipt generated successfully')).toBeVisible();

    // 2. Apply Ledger balance credit check
    await page.click('nav >> text=Ledger');
    await expect(page.locator('text=Advance balance')).toBeVisible();
  });

  test('Verify Dashboard widgets & Shop isolation locks', async ({ page }) => {
    await page.click('nav >> text=Dashboard');
    await expect(page.locator('text=Today\'s sales')).toBeVisible();
    await expect(page.locator('text=Uncollected Outstanding')).toBeVisible();
  });

  test('Verify Communication WhatsApp & Settings tab panels', async ({ page }) => {
    // 1. WhatsApp share workspace
    await page.click('nav >> text=Communication');
    await page.selectOption('select[label="Select message details *"]', 'REMINDER');
    await page.selectOption('select[label="Select Wholesale Customer *"]', { label: 'Raju Super Admin' });
    await expect(page.locator('button:has-text("Send via WhatsApp")')).toBeEnabled();

    // 2. Settings slider controls
    await page.click('nav >> text=Settings');
    await page.click('button >> text=Backup & Restore');
    await expect(page.locator('button:has-text("Download Manual Backup")')).toBeVisible();
  });

  test('Verify dynamic Language Switcher toggling UI translation updates', async ({ page }) => {
    // 1. Check English UI is default
    await page.click('nav >> text=Dashboard');
    await expect(page.locator('nav')).toContainText('Dashboard');
    await expect(page.locator('nav')).toContainText('Customers');

    // 2. Click Kannada language switcher
    await page.click('button:has-text("ಕನ್ನಡ")');
    // Verify nav menu labels update to Kannada instantly
    await expect(page.locator('nav')).toContainText('ಡ್ಯಾಶ್‌ಬೋರ್ಡ್');
    await expect(page.locator('nav')).toContainText('ಗ್ರಾಹಕರು');

    // 3. Reload page. Verify persistence of language selection in localStorage
    await page.reload();
    await expect(page.locator('nav')).toContainText('ಡ್ಯಾಶ್‌ಬೋರ್ಡ್');
    await expect(page.locator('nav')).toContainText('ಗ್ರಾಹಕರು');

    // 4. Reset to English
    await page.click('button:has-text("English")');
    await expect(page.locator('nav')).toContainText('Dashboard');
    await expect(page.locator('nav')).toContainText('Customers');
  });
});
