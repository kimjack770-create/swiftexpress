// ========================================================
// SWIFT EXPRESS LOGISTICS - NOTIFICATION SERVICE
// ========================================================

import { dbEngine } from './supabaseClient.js';

class NotificationService {
  async getNotifications() {
    if (dbEngine.isRealSupabase) {
      const { data } = await dbEngine.client.from('notifications').select('*').order('created_at', { ascending: false });
      return data || [];
    } else {
      const notifications = JSON.parse(localStorage.getItem('sel_notifications') || '[]');
      if (notifications.length === 0) {
        const sampleNotifications = [
          { id: "nt-1", title: "New Shipment Created", message: "Tracking SEL-20260723-884920 registered.", type: "info", is_read: false, created_at: new Date().toISOString() },
          { id: "nt-2", title: "New Quote Request", message: "Sarah Connor requested an Air Freight quote.", type: "warning", is_read: false, created_at: new Date().toISOString() }
        ];
        localStorage.setItem('sel_notifications', JSON.stringify(sampleNotifications));
        return sampleNotifications;
      }
      return notifications;
    }
  }

  async markAsRead(id) {
    if (!dbEngine.isRealSupabase) {
      const notifications = JSON.parse(localStorage.getItem('sel_notifications') || '[]');
      const idx = notifications.findIndex(n => n.id === id);
      if (idx !== -1) {
        notifications[idx].is_read = true;
        localStorage.setItem('sel_notifications', JSON.stringify(notifications));
      }
    }
  }
}

export const notificationService = new NotificationService();
