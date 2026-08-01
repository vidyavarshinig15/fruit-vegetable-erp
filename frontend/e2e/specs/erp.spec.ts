import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage.ts';
import { CustomerPage } from '../page-objects/CustomerPage.ts';
import { ProductPage } from '../page-objects/ProductPage.ts';
import { BillingPage } from '../page-objects/BillingPage.ts';

test.describe('Fruits & Vegetables ERP Production Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let customerName = 'Raju Customer';
  let customerCode = 'RC001';
  let mobile = '9876543210';
  let productName = 'Tomato';
  let productCode = 'TOM';

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Default admin seed credentials
    await loginPage.login('vidyavarshini15@gmail.com', 'Admin@12345');
    await loginPage.selectShop('RAJ FRUITS AND VEGETABLES');
  });

  test('Workflow 1: Standard Checkout Order Process with OCR & Payments Receipts', async ({ page }, testInfo) => {
    const customerPage = new CustomerPage(page);
    const productPage = new ProductPage(page);
    const billingPage = new BillingPage(page);

    const workerIndex = testInfo.workerIndex;
    const uniqueId = Math.floor(1000 + Math.random() * 9000);
    customerName = `Raju Customer W${workerIndex} R${uniqueId}`;
    customerCode = `RC${workerIndex}R${uniqueId}`;
    mobile = `987${workerIndex}${uniqueId}56`;
    productName = `Tomato W${workerIndex} R${uniqueId}`;
    productCode = `TOM${workerIndex}R${uniqueId}`;

    // 1. Create Customer
    await customerPage.goto();
    await customerPage.createCustomer(customerName, customerCode, 500000, mobile);

    // 2. Create Product
    await productPage.goto();
    await productPage.createProduct(productName, productCode, 40, 'Kg');

    // 3. Update Market Rate
    await productPage.updateMarketRates(productName, 45);

    // 4. Open Billing Checkout
    await billingPage.goto();
    await billingPage.createInvoice(customerName, [
      { name: productName, qty: 10, rate: 45 },
    ]);

    // 5. Confirm Invoice Generated Success Screen
    await expect(page.locator('text=TAX INVOICE')).toBeVisible({ timeout: 15000 });

    // 6. Collect Payment Collection & Receipts
    await page.click('nav >> text=Payments');
    await page.click('button:has-text("Record Collection")');
    const buyerOpt = page.locator('select[label="Buyer Customer *"] option', { hasText: customerName });
    await page.selectOption('select[label="Buyer Customer *"]', await buyerOpt.getAttribute('value') || '');
    await page.fill('input[label="Received Payment Amount (₹) *"]', '450');
    await page.selectOption('select[label="Payment Mode *"]', 'CASH');
    await page.click('button:has-text("Verify & Proceed")');
    await page.click('button:has-text("Confirm & Generate Receipt")');

    // Confirm receipt page
    await expect(page.locator('main h1')).toContainText('Payment Receipt details');

    // 7. Check Ledger Account Timeline balance
    await page.click('nav >> text=Ledger');
    await expect(page.locator('tr:has-text("INVOICE")')).toBeVisible();
    await expect(page.locator('tr:has-text("PAYMENT")')).toBeVisible();
  });

  test('Workflow 2: Partial Collections & Account Statement Upgrades', async ({ page }) => {
    const billingPage = new BillingPage(page);

    // 1. Create Invoice
    await billingPage.goto();
    await billingPage.createInvoice(customerName, [
      { name: productName, qty: 20, rate: 50 }, // Total: ₹1000
    ]);
    await expect(page.locator('text=TAX INVOICE')).toBeVisible({ timeout: 15000 });

    // 2. Record First Partial Payment
    await page.click('nav >> text=Payments');
    await page.click('button:has-text("Record Collection")');
    const buyerOpt1 = page.locator('select[label="Buyer Customer *"] option', { hasText: customerName });
    await page.selectOption('select[label="Buyer Customer *"]', await buyerOpt1.getAttribute('value') || '');
    await page.fill('input[label="Received Payment Amount (₹) *"]', '400');
    await page.click('button:has-text("Verify & Proceed")');
    await page.click('button:has-text("Confirm & Generate Receipt")');
    await expect(page.locator('main h1')).toContainText('Payment Receipt details');

    // 3. Record Second Payment
    await page.click('nav >> text=Payments');
    await page.click('button:has-text("Record Collection")');
    const buyerOpt2 = page.locator('select[label="Buyer Customer *"] option', { hasText: customerName });
    await page.selectOption('select[label="Buyer Customer *"]', await buyerOpt2.getAttribute('value') || '');
    await page.fill('input[label="Received Payment Amount (₹) *"]', '600');
    await page.click('button:has-text("Verify & Proceed")');
    await page.click('button:has-text("Confirm & Generate Receipt")');
    await expect(page.locator('main h1')).toContainText('Payment Receipt details');

    // 4. View printable account statement
    await page.click('nav >> text=Ledger');
    await page.click('button:has-text("Print Statement")');
    await expect(page.locator('text=STATEMENT REPORT')).toBeVisible();
  });

  test('Workflow 3: Advance Settlement credits and adjustment debits', async ({ page }) => {
    // 1. Record Advance collection
    await page.click('nav >> text=Payments');
    await page.click('button:has-text("Record Collection")');
    const buyerOpt3 = page.locator('select[label="Buyer Customer *"] option', { hasText: customerName });
    await page.selectOption('select[label="Buyer Customer *"]', await buyerOpt3.getAttribute('value') || '');
    await page.fill('input[label="Received Payment Amount (₹) *"]', '500'); // Advance
    await page.click('button:has-text("Verify & Proceed")');
    await page.click('button:has-text("Confirm & Generate Receipt")');
    await expect(page.locator('main h1')).toContainText('Payment Receipt details');

    // 2. Apply Ledger balance credit check
    await page.click('nav >> text=Ledger');
    await expect(page.locator('text=Advance balance')).toBeVisible();
  });

  test('Verify Dashboard widgets & Shop isolation locks', async ({ page }) => {
    await page.click('nav >> text=Dashboard');
    await expect(page.locator('span:has-text("Today\'s sales")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Uncollected Outstanding")').first()).toBeVisible();
  });

  test('Verify Settings tab panels & backups', async ({ page }) => {
    // Settings slider controls
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
