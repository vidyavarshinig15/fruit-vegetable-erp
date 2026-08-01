import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { userRepository } from '../repositories/user.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { LoginDTO, AuthResponseData, JwtTokenPayload, ChangePasswordDTO, ResetPasswordDTO } from '@raju-billing/shared';

// Blacklisted tokens for force logout
const tokenBlacklist = new Set<string>();

export class AuthService {
  async login(dto: LoginDTO, ipAddress: string, userAgent: string): Promise<AuthResponseData> {
    if (dto.email.toLowerCase().trim() !== 'vidyavarshini15@gmail.com') {
      await activityRepository.create({
        userEmail: dto.email,
        action: 'FAILED_LOGIN',
        details: { reason: 'Unauthorized email access restriction' },
        ipAddress,
        userAgent,
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    const userRecord = await userRepository.findByEmail(dto.email);

    if (!userRecord) {
      await activityRepository.create({
        userEmail: dto.email,
        action: 'FAILED_LOGIN',
        details: { reason: 'User not found' },
        ipAddress,
        userAgent,
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    if (userRecord.status === 'inactive') {
      await activityRepository.create({
        userId: userRecord.id,
        userEmail: dto.email,
        action: 'FAILED_LOGIN',
        details: { reason: 'Account inactive' },
        ipAddress,
        userAgent,
      });
      throw new Error('ACCOUNT_INACTIVE');
    }

    if (userRecord.status === 'locked') {
      if (userRecord.lockedUntil && new Date(userRecord.lockedUntil) > new Date()) {
        await activityRepository.create({
          userId: userRecord.id,
          userEmail: dto.email,
          action: 'FAILED_LOGIN',
          details: { reason: 'Account locked' },
          ipAddress,
          userAgent,
        });
        throw new Error('ACCOUNT_LOCKED');
      }
    }

    const isPasswordValid = await bcrypt.compare(dto.password, userRecord.passwordHash);

    if (!isPasswordValid) {
      const { attempts, locked } = await userRepository.incrementFailedAttempts(userRecord.id);
      await activityRepository.create({
        userId: userRecord.id,
        userEmail: dto.email,
        action: 'FAILED_LOGIN',
        details: { failedAttempts: attempts, locked },
        ipAddress,
        userAgent,
      });

      if (locked) {
        throw new Error('ACCOUNT_LOCKED');
      }
      throw new Error('INVALID_CREDENTIALS');
    }

    await userRepository.resetFailedAttempts(userRecord.id);

    const tokenPayload: JwtTokenPayload = {
      sub: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      shopIds: userRecord.assignedShopIds,
    };

    const accessSecret: Secret = config.jwtSecret;
    const accessOptions: SignOptions = { expiresIn: dto.rememberMe ? '30d' : (config.jwtExpiresIn as any) };
    const accessToken = jwt.sign(tokenPayload, accessSecret, accessOptions);

    const refreshSecret: Secret = config.jwtRefreshSecret;
    const refreshOptions: SignOptions = { expiresIn: config.jwtRefreshExpiresIn as any };
    const refreshToken = jwt.sign(tokenPayload, refreshSecret, refreshOptions);

    const { passwordHash, ...user } = userRecord;

    await activityRepository.create({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN',
      details: { rememberMe: !!dto.rememberMe },
      ipAddress,
      userAgent,
    });

    return {
      user,
      accessToken,
      refreshToken,
      expiresIn: dto.rememberMe ? 30 * 24 * 3600 : 15 * 60,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (tokenBlacklist.has(token)) {
      throw new Error('TOKEN_REVOKED');
    }

    try {
      const decoded = jwt.verify(token, config.jwtRefreshSecret as Secret) as JwtTokenPayload;
      const userRecord = await userRepository.findById(decoded.sub);

      if (!userRecord || userRecord.status !== 'active') {
        throw new Error('USER_NOT_FOUND_OR_INACTIVE');
      }

      const newPayload: JwtTokenPayload = {
        sub: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        shopIds: userRecord.assignedShopIds,
      };

      const accessToken = jwt.sign(newPayload, config.jwtSecret as Secret, { expiresIn: config.jwtExpiresIn as any });
      const newRefreshToken = jwt.sign(newPayload, config.jwtRefreshSecret as Secret, { expiresIn: config.jwtRefreshExpiresIn as any });

      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  async logout(userId: string, token: string, ipAddress: string, userAgent: string): Promise<void> {
    if (token) {
      tokenBlacklist.add(token);
    }
    await activityRepository.create({
      userId,
      action: 'LOGOUT',
      ipAddress,
      userAgent,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDTO, ipAddress: string, userAgent: string): Promise<void> {
    const userRecord = await userRepository.findById(userId);
    if (!userRecord) throw new Error('USER_NOT_FOUND');

    const isValid = await bcrypt.compare(dto.currentPassword, userRecord.passwordHash);
    if (!isValid) throw new Error('INVALID_CURRENT_PASSWORD');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await userRepository.updatePassword(userId, newHash);

    await activityRepository.create({
      userId,
      userEmail: userRecord.email,
      action: 'PASSWORD_CHANGE',
      ipAddress,
      userAgent,
    });
  }

  async requestForgotPassword(email: string, ipAddress: string, userAgent: string): Promise<string> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return 'reset_token_issued';
    }

    const resetToken = jwt.sign({ sub: user.id, email: user.email, purpose: 'password_reset' }, config.jwtSecret as Secret, {
      expiresIn: '1h',
    });

    await activityRepository.create({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET',
      details: { requested: true },
      ipAddress,
      userAgent,
    });

    return resetToken;
  }

  async resetPassword(dto: ResetPasswordDTO, ipAddress: string, userAgent: string): Promise<void> {
    try {
      const decoded = jwt.verify(dto.token, config.jwtSecret as Secret) as { sub: string; purpose: string };
      if (decoded.purpose !== 'password_reset') throw new Error('INVALID_RESET_TOKEN');

      const newHash = await bcrypt.hash(dto.newPassword, 12);
      await userRepository.updatePassword(decoded.sub, newHash);

      await activityRepository.create({
        userId: decoded.sub,
        action: 'PASSWORD_RESET',
        details: { completed: true },
        ipAddress,
        userAgent,
      });
    } catch {
      throw new Error('INVALID_OR_EXPIRED_RESET_TOKEN');
    }
  }

  isTokenBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  blacklistToken(token: string): void {
    tokenBlacklist.add(token);
  }
}

export const authService = new AuthService();
