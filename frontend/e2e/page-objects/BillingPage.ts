import { Page, expect } from '@playwright/test';

export class BillingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.click('nav >> text=Billing');
    await expect(this.page.locator('main h1')).toContainText('Invoicing Terminal');
  }

  async createInvoice(customerName: string, items: { name: string; qty: number; rate: number }[]) {
    // Select customer
    const option = this.page.locator('select[label="Customer *"] option', { hasText: customerName });
    const value = await option.getAttribute('value');
    await this.page.selectOption('select[label="Customer *"]', value || '');

    for (const item of items) {
      const itemOption = this.page.locator('select[label="Select Item *"] option', { hasText: item.name });
      const itemValue = await itemOption.getAttribute('value');
      await this.page.selectOption('select[label="Select Item *"]', itemValue || '');
      await this.page.fill('input[label="Quantity *"]', String(item.qty));
      await this.page.fill('label:has-text("Rate") + input', String(item.rate));
      await this.page.click('button:has-text("Append Item")');
    }

    // Checkout Preview
    await this.page.click('button:has-text("Review & Preview Invoice")');
    // Lock and Generate Invoice
    await this.page.click('button:has-text("Generate & Lock Invoice")');
  }

  async verifyCreditLimitWarning(customerName: string) {
    // Check checkout hold warning is visible on screen
    await expect(this.page.locator('text=exceeds credit limit')).toBeVisible();
  }
}
