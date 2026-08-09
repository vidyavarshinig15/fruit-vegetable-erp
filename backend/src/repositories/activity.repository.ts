import { ActivityLog, CreateActivityLogDTO } from '@raju-billing/shared';

class ActivityRepository {
  private logs: ActivityLog[] = [];

  async create(dto: CreateActivityLogDTO): Promise<ActivityLog> {
    const log: ActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: dto.userId || null,
      userEmail: dto.userEmail || null,
      shopId: dto.shopId || null,
      action: dto.action,
      details: dto.details || null,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(log); // newest first
    // Limit memory array to last 10,000 logs
    if (this.logs.length > 10000) {
      this.logs.pop();
    }
    return log;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    shopId?: string;
  } = {}): Promise<{ logs: ActivityLog[]; total: number }> {
    let filtered = [...this.logs];

    if (query.userId) {
      filtered = filtered.filter((l) => l.userId === query.userId);
    }
    if (query.shopId) {
      filtered = filtered.filter((l) => l.shopId === query.shopId);
    }
    if (query.action) {
      filtered = filtered.filter((l) => l.action === query.action);
    }

    const total = filtered.length;
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10000;
    const startIndex = (page - 1) * limit;

    const logs = filtered.slice(startIndex, startIndex + limit);
    return { logs, total };
  }
}

export const activityRepository = new ActivityRepository();
