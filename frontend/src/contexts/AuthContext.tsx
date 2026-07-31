import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginDTO, ShopId, Permission, UserRole, DEFAULT_ROLE_PERMISSIONS } from '@raju-billing/shared';
import { api } from '@/api/client';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginDTO) => Promise<User>;
  logout: () => Promise<void>;
  updateProfileState: (updated: Partial<User>) => void;
  hasPermission: (permission: Permission) => boolean;
  canAccessShop: (shopId: ShopId) => boolean;
}

const AUTH_STORAGE_KEY = 'raju_billing_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved).user : null;
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved).accessToken : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const saveSession = (u: User, token: string) => {
    setUser(u);
    setAccessToken(token);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: u, accessToken: token }));
  };

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('raju_active_shop');
  }, []);

  const login = async (dto: LoginDTO): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', dto);
      const { user: authenticatedUser, accessToken: token } = response.data.data;
      saveSession(authenticatedUser, token);
      return authenticatedUser;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please verify credentials.';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearSession();
    }
  };

  const updateProfileState = (updated: Partial<User>) => {
    if (!user) return;
    const newRecord = { ...user, ...updated };
    setUser(newRecord);
    if (accessToken) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: newRecord, accessToken }));
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;

    const rolePerms = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    const customPerms = user.customPermissions || [];
    const allPerms = new Set([...rolePerms, ...customPerms]);

    return allPerms.has(permission);
  };

  const canAccessShop = (shopId: ShopId): boolean => {
    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;
    return user.assignedShopIds.includes(shopId);
  };

  // Inactivity Auto-Logout Mechanism (15 Minutes)
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 15 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert('Session expired due to 15 minutes of inactivity. Please sign in again.');
        clearSession();
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateProfileState,
        hasPermission,
        canAccessShop,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
