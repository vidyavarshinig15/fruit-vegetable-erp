import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 200 : 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 10 : 100000, // Strict limit for auth attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or password reset attempts. Please try again after 15 minutes.',
    error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' },
  },
});
