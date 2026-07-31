import { Page, expect } from '@playwright/test';

export class CustomerPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.click('nav >> text=Customers');
    await expect(this.page.locator('h1')).toContainText('CUSTOMER');
  }

  async createCustomer(name: string, code: string, creditLimit: number, mobile: string) {
    await this.page.click('button:has-text("Add Customer")');
    await this.page.fill('input[label="Customer Name *"]', name);
    await this.page.fill('input[label="Customer Code *"]', code);
    await this.page.fill('input[label="Credit Limit (₹) *"]', String(creditLimit));
    await this.page.fill('input[label="Mobile Number *"]', mobile);
    await this.page.click('button[type="submit"]');
    
    // Validate success alert popup
    await expect(this.page.locator('text=Customer created successfully')).toBeVisible();
  }
}
