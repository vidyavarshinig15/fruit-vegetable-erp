import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ShopId, SHOPS, ShopDetails, UpdateShopDTO } from '@raju-billing/shared';
import { storage } from '@/utils/storage';
import { api } from '@/api/client';

const themeColors = {
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
};

interface ShopContextType {
  activeShop: ShopDetails;
  activeShopId: ShopId;
  setActiveShopId: (id: ShopId) => void;
  availableShops: ShopDetails[];
  shopsMap: Record<ShopId, ShopDetails>;
  isLoading: boolean;
  reloadShops: () => Promise<void>;
  updateShop: (id: ShopId, dto: UpdateShopDTO) => Promise<ShopDetails>;
  uploadLogo: (id: ShopId, base64: string) => Promise<ShopDetails>;
  fetchShopUsers: (id: ShopId) => Promise<any[]>;
  fetchShopStatistics: (id: ShopId) => Promise<any>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeShopId, setActiveShopIdState] = useState<ShopId>(() => {
    const saved = storage.getActiveShop();
    if (saved && Object.values(ShopId).includes(saved as ShopId)) {
      return saved as ShopId;
    }
    return ShopId.RAJ_FRUITS_AND_VEGETABLES;
  });

  const [shopsMap, setShopsMap] = useState<Record<ShopId, ShopDetails>>(() => SHOPS);
  const [isLoading, setIsLoading] = useState(false);

  const availableShops = Object.values(shopsMap);
  const activeShop = shopsMap[activeShopId] || SHOPS[activeShopId];

  const reloadShops = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/shops');
      if (response.data?.success && response.data?.data) {
        const list: ShopDetails[] = response.data.data;
        const newMap = { ...shopsMap };
        list.forEach((s) => {
          newMap[s.id] = s;
        });
        setShopsMap(newMap);
      }
    } catch (e) {
      console.error('Failed to load shop settings from backend, falling back to seeds.', e);
    } finally {
      setIsLoading(false);
    }
  }, [shopsMap]);

  const setActiveShopId = (id: ShopId) => {
    setActiveShopIdState(id);
    storage.setActiveShop(id);
  };

  const updateShop = async (id: ShopId, dto: UpdateShopDTO): Promise<ShopDetails> => {
    try {
      const response = await api.put(`/shops/${id}`, dto);
      if (response.data?.success && response.data?.data) {
        const updatedShop: ShopDetails = response.data.data;
        setShopsMap((prev) => ({
          ...prev,
          [id]: updatedShop,
        }));
        return updatedShop;
      }
      throw new Error(response.data?.message || 'Update failed');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Update failed';
      throw new Error(msg);
    }
  };

  const uploadLogo = async (id: ShopId, base64: string): Promise<ShopDetails> => {
    try {
      const response = await api.post(`/shops/${id}/logo`, { logo: base64 });
      if (response.data?.success && response.data?.data) {
        const updatedShop: ShopDetails = response.data.data;
        setShopsMap((prev) => ({
          ...prev,
          [id]: updatedShop,
        }));
        return updatedShop;
      }
      throw new Error('Upload logo failed');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Upload failed';
      throw new Error(msg);
    }
  };

  const fetchShopUsers = async (id: ShopId): Promise<any[]> => {
    try {
      const response = await api.get(`/shops/${id}/users`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch shop users', error);
      return [];
    }
  };

  const fetchShopStatistics = async (id: ShopId): Promise<any> => {
    try {
      const response = await api.get(`/shops/${id}/statistics`);
      return response.data?.data || null;
    } catch (error) {
      console.error('Failed to fetch shop statistics', error);
      return null;
    }
  };

  // Synchronize storage
  useEffect(() => {
    storage.setActiveShop(activeShopId);
  }, [activeShopId]);

  // Load shops on mount (if authenticated)
  useEffect(() => {
    const authSession = localStorage.getItem('raju_billing_auth_session');
    if (authSession) {
      reloadShops();
    }
  }, []);

  // Inject CSS Color Variables dynamically
  useEffect(() => {
    if (activeShop) {
      const themeColor = activeShop.themeColor || 'green';
      const palette = themeColors[themeColor] || themeColors.green;

      Object.entries(palette).forEach(([shade, hex]) => {
        document.documentElement.style.setProperty(`--color-market-${shade}`, hex);
      });
    }
  }, [activeShop]);

  return (
    <ShopContext.Provider
      value={{
        activeShop,
        activeShopId,
        setActiveShopId,
        availableShops,
        shopsMap,
        isLoading,
        reloadShops,
        updateShop,
        uploadLogo,
        fetchShopUsers,
        fetchShopStatistics,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = (): ShopContextType => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};

