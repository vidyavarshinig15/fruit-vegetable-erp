import { User } from './user.js';
import { ShopId } from './shop.js';

export interface LoginDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtTokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  shopIds: ShopId[];
  iat?: number;
  exp?: number;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}
