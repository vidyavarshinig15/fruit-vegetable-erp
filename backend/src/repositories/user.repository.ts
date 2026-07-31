import bcrypt from 'bcryptjs';
import { User, UserRole, ShopId, CreateUserDTO, UpdateUserDTO, UserFilterQuery } from '@raju-billing/shared';

// Initial pre-hashed password for Admin@12345 (12 rounds bcrypt)
const DEFAULT_PASSWORD_HASH = '$2a$12$2ib584CozChcy7Ey0ag5EOKSLfaOqXls88hm81i1j/d8cpGB3TVDS';

export interface UserRecord extends User {
  passwordHash: string;
}

// In-Memory Production Seed Store (Fallback & Local Dev execution)
const SEED_USERS: UserRecord[] = [
  {
    id: 'usr_super_admin',
    email: 'admin@rajuvegetables.com',
    fullName: 'Raju Super Admin',
    mobileNumber: '9876543210',
    role: UserRole.SUPER_ADMIN,
    assignedShopIds: [
      ShopId.RAJ_FRUITS_AND_VEGETABLES,
      ShopId.G_R_FRUITS_AND_VEGETABLES,
      ShopId.PRIYAKRISHNA_FRUITS_AND_VEGETABLES,
    ],
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: DEFAULT_PASSWORD_HASH,
  },
  {
    id: 'usr_raj_admin',
    email: 'raj.admin@rajuvegetables.com',
    fullName: 'Raj Wholesale Manager',
    mobileNumber: '9876543211',
    role: UserRole.ADMIN,
    assignedShopIds: [ShopId.RAJ_FRUITS_AND_VEGETABLES],
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: DEFAULT_PASSWORD_HASH,
  },
  {
    id: 'usr_gr_admin',
    email: 'gr.admin@rajuvegetables.com',
    fullName: 'G R Market Manager',
    mobileNumber: '9876543212',
    role: UserRole.ADMIN,
    assignedShopIds: [ShopId.G_R_FRUITS_AND_VEGETABLES],
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: DEFAULT_PASSWORD_HASH,
  },
  {
    id: 'usr_staff_raj',
    email: 'staff.raj@rajuvegetables.com',
    fullName: 'Ramesh Staff',
    mobileNumber: '9876543213',
    role: UserRole.STAFF,
    assignedShopIds: [ShopId.RAJ_FRUITS_AND_VEGETABLES],
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: DEFAULT_PASSWORD_HASH,
  },
  {
    id: 'usr_viewer',
    email: 'viewer@rajuvegetables.com',
    fullName: 'Auditor Viewer',
    mobileNumber: '9876543214',
    role: UserRole.VIEWER,
    assignedShopIds: [
      ShopId.RAJ_FRUITS_AND_VEGETABLES,
      ShopId.G_R_FRUITS_AND_VEGETABLES,
      ShopId.PRIYAKRISHNA_FRUITS_AND_VEGETABLES,
    ],
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: DEFAULT_PASSWORD_HASH,
  },
];

class UserRepository {
  private users: Map<string, UserRecord> = new Map();

  constructor() {
    SEED_USERS.forEach((usr) => this.users.set(usr.id, { ...usr }));
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const usr of this.users.values()) {
      if (usr.email.toLowerCase() === normalized) {
        return { ...usr };
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const usr = this.users.get(id);
    return usr ? { ...usr } : null;
  }

  async findByMobile(mobileNumber: string): Promise<UserRecord | null> {
    for (const usr of this.users.values()) {
      if (usr.mobileNumber === mobileNumber) {
        return { ...usr };
      }
    }
    return null;
  }

  async findAll(query: UserFilterQuery = {}): Promise<{ users: User[]; total: number }> {
    let list = Array.from(this.users.values());

    if (query.role) {
      list = list.filter((u) => u.role === query.role);
    }
    if (query.status) {
      list = list.filter((u) => u.status === query.status);
    }
    if (query.shopId) {
      list = list.filter((u) => u.assignedShopIds.includes(query.shopId as ShopId));
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.mobileNumber.includes(s)
      );
    }

    const total = list.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const startIndex = (page - 1) * limit;

    const paginated = list.slice(startIndex, startIndex + limit).map((u) => this.sanitize(u));
    return { users: paginated, total };
  }

  async create(dto: CreateUserDTO, passwordHash: string): Promise<User> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const record: UserRecord = {
      id,
      email: dto.email.toLowerCase().trim(),
      fullName: dto.fullName,
      mobileNumber: dto.mobileNumber,
      role: dto.role,
      assignedShopIds: dto.assignedShopIds,
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      customPermissions: dto.customPermissions || [],
      passwordHash,
    };

    this.users.set(id, record);
    return this.sanitize(record);
  }

  async update(id: string, dto: UpdateUserDTO): Promise<User | null> {
    const record = this.users.get(id);
    if (!record) return null;

    const updatedRecord: UserRecord = {
      ...record,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, updatedRecord);
    return this.sanitize(updatedRecord);
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const record = this.users.get(id);
    if (!record) return false;
    record.passwordHash = passwordHash;
    record.failedLoginAttempts = 0;
    record.lockedUntil = null;
    record.updatedAt = new Date().toISOString();
    this.users.set(id, record);
    return true;
  }

  async incrementFailedAttempts(id: string): Promise<{ attempts: number; locked: boolean }> {
    const record = this.users.get(id);
    if (!record) return { attempts: 0, locked: false };

    record.failedLoginAttempts += 1;
    let locked = false;

    if (record.failedLoginAttempts >= 5) {
      // Lock for 15 minutes
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      record.status = 'locked';
      record.lockedUntil = lockUntil;
      locked = true;
    }

    this.users.set(id, record);
    return { attempts: record.failedLoginAttempts, locked };
  }

  async resetFailedAttempts(id: string): Promise<void> {
    const record = this.users.get(id);
    if (!record) return;
    record.failedLoginAttempts = 0;
    if (record.status === 'locked') {
      record.status = 'active';
      record.lockedUntil = null;
    }
    record.lastLoginAt = new Date().toISOString();
    this.users.set(id, record);
  }

  private sanitize(record: UserRecord): User {
    const { passwordHash, ...user } = record;
    return user;
  }
}

export const userRepository = new UserRepository();
