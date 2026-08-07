import { Request, Response, NextFunction } from 'express';

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

