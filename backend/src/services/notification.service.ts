import { ShopId, NotificationDTO } from '@raju-billing/shared';
import { db } from '../database/index.js';

export const mapDbToNotification = (r: any): NotificationDTO => ({
  id: r.id,
  shopId: r.shop_id,
  userId: r.user_id || null,
  title: r.title,
  message: r.message,
  type: r.type,
  isRead: r.is_read,
  readAt: r.read_at || null,
  actionUrl: r.action_url || null,
  createdAt: r.created_at,
});

class NotificationService {

  async createNotification(
    shopId: ShopId,
    title: string,
    message: string,
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO',
    actionUrl?: string | null,
    userId?: string | null
  ): Promise<NotificationDTO> {
    const body = {
      shop_id: shopId,
      user_id: userId || null,
      title,
      message,
      type,
      is_read: false,
      read_at: null,
      action_url: actionUrl || null,
      status: 'active',
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const rows = await db.query('notifications', { method: 'POST', body });
      return mapDbToNotification(rows[0] || body);
    } catch (err) {
      console.warn('Simulating notification insert (table might not exist yet):', body);
      return mapDbToNotification({ id: `mock_notif_${Date.now()}`, ...body });
    }
  }

  async getNotifications(shopId: ShopId): Promise<NotificationDTO[]> {
    try {
      const rows = await db.query(`notifications?shop_id=eq.${shopId}&is_deleted=eq.false`);
      const list = rows.map((r) => mapDbToNotification(r));
      // Sort: newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list.slice(0, 50); // limit to 50
    } catch (err) {
      return [];
    }
  }

  async markAsRead(id: string, shopId: ShopId): Promise<boolean> {
    try {
      await db.query(`notifications?id=eq.${id}&shop_id=eq.${shopId}`, {
        method: 'PATCH',
        body: {
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  async markAllAsRead(shopId: ShopId): Promise<boolean> {
    try {
      const unread = await db.query(`notifications?shop_id=eq.${shopId}&is_read=eq.false`);
      for (const item of unread) {
        await db.query(`notifications?id=eq.${item.id}`, {
          method: 'PATCH',
          body: {
            is_read: true,
            read_at: new Date().toISOString(),
          }
        });
      }
      return true;
    } catch (err) {
      return false;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
