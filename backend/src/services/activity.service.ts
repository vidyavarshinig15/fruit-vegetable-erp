import { activityRepository } from '../repositories/activity.repository.js';

export class ActivityService {
  async getActivityLogs(query: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    shopId?: string;
  }) {
    return activityRepository.findAll(query);
  }
}

export const activityService = new ActivityService();
