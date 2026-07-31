import { Request, Response, NextFunction } from 'express';
import { ShopId } from '@raju-billing/shared';

export interface ShopRequest extends Request {
  activeShopId?: ShopId;
}

export const extractShopContext = (req: ShopRequest, res: Response, next: NextFunction) => {
  const shopIdHeader = req.headers['x-shop-id'] as ShopId;
  if (shopIdHeader && Object.values(ShopId).includes(shopIdHeader)) {
    req.activeShopId = shopIdHeader;
  }
  next();
};
