import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async selectShop(shopName: string) {
    // Select shop context cards
    await this.page.click(`text=${shopName}`);
    // Wait for dashboard loading
    await expect(this.page.locator('h1')).toContainText(shopName.toUpperCase());
  }
}
