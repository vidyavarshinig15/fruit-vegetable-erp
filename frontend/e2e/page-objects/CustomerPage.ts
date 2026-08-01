import { Page, expect } from '@playwright/test';

export class CustomerPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.click('nav >> text=Customers');
    await expect(this.page.locator('main h1')).toContainText('Customer Directory');
  }

  async createCustomer(name: string, code: string, creditLimit: number, mobile: string) {
    await this.page.click('button:has-text("Add New Customer")');
    await this.page.fill('input[label="Business Trade Name *"]', name);
    await this.page.fill('input[label="Business Owner Name *"]', 'Raju Owner');
    await this.page.fill('input[label="Primary Contact Person *"]', 'Raju Contact');
    await this.page.fill('input[label="Primary Mobile Number *"]', mobile);
    await this.page.fill('input[label="Delivery Address *"]', '123 Wholesale Lane');
    await this.page.fill('input[label="Market Area / Locality *"]', 'Yeshwanthpur');
    await this.page.fill('input[label="Pincode *"]', '560022');
    await this.page.fill('input[label="Approved Credit Limit (₹) *"]', String(creditLimit));
    await this.page.click('button:has-text("Register Customer")');
    
    // Validate we redirect back to Customer Directory listing with the new customer visible
    await expect(this.page.locator('main h1')).toContainText('Customer Directory', { timeout: 15000 });
    await expect(this.page.locator(`text=${name}`)).toBeVisible({ timeout: 15000 });
  }
}
