const ACTIVE_SHOP_KEY = 'raju_billing_active_shop';
const AUTH_TOKEN_KEY = 'raju_billing_token';

export const storage = {
  getActiveShop(): string | null {
    return localStorage.getItem(ACTIVE_SHOP_KEY);
  },

  setActiveShop(shopId: string): void {
    localStorage.setItem(ACTIVE_SHOP_KEY, shopId);
  },

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  setAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  clearAuthToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },
};
