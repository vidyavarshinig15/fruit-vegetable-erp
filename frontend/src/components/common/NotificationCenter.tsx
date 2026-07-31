import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useShop } from '@/contexts/ShopContext';
import { Bell, CheckSquare, Clock, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const { activeShop } = useShop();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/communication/notifications');
      if (res.data?.success) {
        const list = res.data.data || [];
        setNotifications(list);
        setUnreadCount(list.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to load notifications in header dropdown', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds for live alert updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [activeShop]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await api.post('/communication/notifications/read-all');
      if (res.data?.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark all notifications read', err);
    }
  };

  const handleNotifClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await api.patch(`/communication/notifications/${notif.id}/read`);
      }
      setIsOpen(false);
      fetchNotifications();
      if (notif.actionUrl) {
        navigate(notif.actionUrl);
      }
    } catch (err) {
      console.error('Failed to mark single notification read', err);
    }
  };

  const getNotifIcon = (type: string) => {
    const maps: Record<string, any> = {
      SUCCESS: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      WARNING: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      ALERT: <AlertCircle className="w-4 h-4 text-red-600" />,
      INFO: <Info className="w-4 h-4 text-sky-650" />,
    };
    return maps[type] || <Info className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-650 text-white rounded-full flex items-center justify-center text-[9px] font-black border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[320px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 z-50 text-xs font-semibold space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-2">
            <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Alert Center</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-black text-indigo-750 hover:underline uppercase flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Read All
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-slate-450 py-6 text-center">No notifications found.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 ${
                    !notif.isRead
                      ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-slate-100'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getNotifIcon(notif.type)}</div>
                  <div className="space-y-1">
                    <span className="block text-[11px] uppercase tracking-wide leading-tight">{notif.title}</span>
                    <p className="text-[10px] font-semibold text-slate-450 leading-relaxed">{notif.message}</p>
                    <span className="block text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationCenter;
