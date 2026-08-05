import { Page, expect } from '@playwright/test';

export class BillingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.click('nav >> text=Billing');
    await expect(this.page.locator('main h1')).toContainText('Invoicing Terminal');
  }

  async createInvoice(customerName: string, items: { name: string; qty: number; rate: number }[]) {
    // Select customer
    const option = this.page.locator(`select[label="Customer *"] option:has-text("${customerName}")`);
    await option.waitFor({ state: 'attached', timeout: 15000 });
    const val = await option.getAttribute('value');
    if (!val) throw new Error(`Customer option for ${customerName} not found`);
    await this.page.selectOption('select[label="Customer *"]', val);

    for (const item of items) {
      const productOption = this.page.locator(`select[label="Select Item *"] option:has-text("${item.name}")`);
      await productOption.waitFor({ state: 'attached', timeout: 15000 });
      const productVal = await productOption.getAttribute('value');
      if (!productVal) throw new Error(`Product option for ${item.name} not found`);
      await this.page.selectOption('select[label="Select Item *"]', productVal);
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
