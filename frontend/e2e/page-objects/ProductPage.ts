import { Page, expect } from '@playwright/test';

export class ProductPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.click('nav >> text=Products');
    await expect(this.page.locator('main h1')).toContainText('Catalog & Price List');
  }

  async createProduct(name: string, code: string, price: number, unit: string) {
    await this.page.click('button:has-text("Add New Product")');
    await this.page.fill('input[label="Product English Name *"]', name);
    await this.page.selectOption('select[label="Wholesale Billing Unit *"]', unit);
    await this.page.fill('input[label="Today\'s Selling Rate (₹) *"]', String(price));
    await this.page.fill('input[label="Minimum Floor Limit Price (₹) *"]', String(price - 5));
    await this.page.click('button:has-text("Save Product Catalog")');

    // Confirm redirected to Catalog listing with the new product visible
    await expect(this.page.locator('main h1')).toContainText('Catalog & Price List', { timeout: 15000 });
    await expect(this.page.locator(`text=${name}`)).toBeVisible({ timeout: 15000 });
  }

  async updateMarketRates(productName: string, rate: number) {
    // Open product edit
    await this.page.click(`tr:has-text("${productName}") >> a[title="Edit Details"]`);
    await this.page.fill('input[label="Today\'s Selling Rate (₹) *"]', String(rate));
    await this.page.click('button:has-text("Save Product Catalog")');

    // Confirm redirected to Catalog listing with the new rate reflected
    await expect(this.page.locator('main h1')).toContainText('Catalog & Price List', { timeout: 15000 });
    await expect(this.page.locator(`tr:has-text("${productName}")`)).toContainText(String(rate), { timeout: 15000 });
  }
}
