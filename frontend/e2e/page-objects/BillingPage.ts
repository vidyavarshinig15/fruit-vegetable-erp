import { Page, expect } from '@playwright/test';

export class BillingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.click('nav >> text=Billing');
    await expect(this.page.locator('main h1')).toContainText('Wholesale Invoicing Terminal');
  }

  async createInvoice(customerName: string, items: { name: string; qty: number; rate: number }[]) {
    // Select customer
    await this.page.selectOption('select[label="Customer *"]', { label: customerName });

    for (const item of items) {
      await this.page.selectOption('select[label="Product"]', { label: item.name });
      await this.page.fill('input[label="Quantity"]', String(item.qty));
      await this.page.fill('input[label="Unit Price (₹)"]', String(item.rate));
      await this.page.click('button:has-text("Add Item")');
    }

    // Checkout
    await this.page.click('button:has-text("Confirm & Generate Invoice")');
  }

  async verifyCreditLimitWarning(customerName: string) {
    // Check checkout hold warning is visible on screen
    await expect(this.page.locator('text=exceeds credit limit')).toBeVisible();
  }
}
