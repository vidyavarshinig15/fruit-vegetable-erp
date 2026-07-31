import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { User, CreateUserDTO, UpdateUserDTO, UserFilterQuery } from '@raju-billing/shared';

export class UserService {
  async getAllUsers(query: UserFilterQuery) {
    return userRepository.findAll(query);
  }

  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw new Error('USER_NOT_FOUND');
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async createUser(
    dto: CreateUserDTO,
    creatorId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<User> {
    // Validate uniqueness of email and mobile
    const existingEmail = await userRepository.findByEmail(dto.email);
    if (existingEmail) throw new Error('EMAIL_ALREADY_EXISTS');

    const existingMobile = await userRepository.findByMobile(dto.mobileNumber);
    if (existingMobile) throw new Error('MOBILE_ALREADY_EXISTS');

    const defaultPassword = dto.password || 'Admin@12345';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const user = await userRepository.create(dto, passwordHash);

    await activityRepository.create({
      userId: creatorId,
      action: 'USER_CREATE',
      details: { createdUserId: user.id, email: user.email, role: user.role },
      ipAddress,
      userAgent,
    });

    return user;
  }

  async updateUser(
    id: string,
    dto: UpdateUserDTO,
    editorId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<User> {
    const existing = await userRepository.findById(id);
    if (!existing) throw new Error('USER_NOT_FOUND');

    if (dto.mobileNumber && dto.mobileNumber !== existing.mobileNumber) {
      const mobileExists = await userRepository.findByMobile(dto.mobileNumber);
      if (mobileExists) throw new Error('MOBILE_ALREADY_EXISTS');
    }

    const updatedUser = await userRepository.update(id, dto);
    if (!updatedUser) throw new Error('USER_UPDATE_FAILED');

    if (dto.role && dto.role !== existing.role) {
      await activityRepository.create({
        userId: editorId,
        action: 'ROLE_CHANGE',
        details: { targetUserId: id, oldRole: existing.role, newRole: dto.role },
        ipAddress,
        userAgent,
      });
    }

    if (dto.status && dto.status !== existing.status) {
      const action = dto.status === 'active' ? 'USER_ACTIVATE' : 'USER_DEACTIVATE';
      await activityRepository.create({
        userId: editorId,
        action,
        details: { targetUserId: id },
        ipAddress,
        userAgent,
      });
    }

    return updatedUser;
  }

  async resetUserPassword(
    id: string,
    newPassword: string,
    adminId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw new Error('USER_NOT_FOUND');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(id, passwordHash);

    await activityRepository.create({
      userId: adminId,
      action: 'PASSWORD_RESET',
      details: { targetUserId: id, adminReset: true },
      ipAddress,
      userAgent,
    });
  }
}

export const userService = new UserService();
