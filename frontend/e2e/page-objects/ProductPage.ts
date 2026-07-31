import { Page, expect } from '@playwright/test';

export class ProductPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.click('nav >> text=Products');
    await expect(this.page.locator('main h1')).toContainText('Wholesale Catalog & Price List');
  }

  async createProduct(name: string, code: string, price: number, unit: string) {
    await this.page.click('button:has-text("Add Product")');
    await this.page.fill('input[label="Product Name *"]', name);
    await this.page.fill('input[label="Product Code *"]', code);
    await this.page.fill('input[label="Default Price (₹) *"]', String(price));
    await this.page.selectOption('select[label="Unit Type *"]', unit);
    await this.page.click('button[type="submit"]');

    // Success popup
    await expect(this.page.locator('text=Product created successfully')).toBeVisible();
  }

  async updateMarketRates(productName: string, rate: number) {
    // Open product edit
    await this.page.click(`tr:has-text("${productName}") >> button:has-text("Edit")`);
    await this.page.fill('input[label="Today\'s Rate (₹)"]', String(rate));
    await this.page.click('button:has-text("Update Price")');

    // Confirm updates
    await expect(this.page.locator('text=Price updated successfully')).toBeVisible();
  }
}
