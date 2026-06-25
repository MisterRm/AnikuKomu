import { Home, Compass, PlusSquare, Bell, User, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase/client';

interface NotificationRow {
  id: string;
  type: 'like' | 'follow' | 'comment';
  is_read: boolean;
  created_at: string;
  post_id: string | null;
  actor: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface BottomNavProps {
  currentRoute: string;
  onChangeRoute: (route: string) => void;
  username: string;
  currentUserId?: string;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m yang lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h yang lalu`;
}

function actionText(type: NotificationRow['type']): string {
  if (type === 'like') return 'menyukai postingan Anda';
  if (type === 'follow') return 'mulai mengikuti Anda';
  return 'mengomentari postingan Anda';
}

export default function BottomNav({ currentRoute, onChangeRoute, username, currentUserId }: BottomNavProps) {
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingNotifs(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, is_read, created_at, post_id, actor:profiles!actor_id(username, display_name, avatar_url)')
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data as any) || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [currentUserId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentUserId) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', currentUserId)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  }, [currentUserId]);

  useEffect(() => {
    fetchUnreadCount();
    // Light polling so the badge updates without needing a realtime subscription.
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const markAllAsRead = async () => {
    if (!currentUserId || unreadCount === 0) return;
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', currentUserId)
      .eq('is_read', false);
  };

  const handleNavClick = (route: string) => {
    if (route === 'notifications') {
      const next = !showNotificationDrawer;
      setShowNotificationDrawer(next);
      if (next) {
        fetchNotifications();
        markAllAsRead();
      }
    } else {
      setShowNotificationDrawer(false);
      onChangeRoute(route);
    }
  };

  const menuItems = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'post/create', icon: PlusSquare, label: 'Post' },
    { id: 'notifications', icon: Bell, label: 'Notifikasi' },
    { id: `profile/${username}`, icon: User, label: 'Profile', matchPrefix: 'profile/' },
  ];

  const getIsActive = (item: typeof menuItems[0]) => {
    if (item.id === 'notifications') return showNotificationDrawer;
    if (item.matchPrefix) {
      return currentRoute.startsWith(item.matchPrefix);
    }
    return currentRoute === item.id;
  };

  return (
    <>
      {/* Bottom Nav bar container */}
      <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900 md:hidden flex items-center justify-around px-2 z-40 pb-safe">
        {menuItems.map((item) => {
          const isActive = getIsActive(item);
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-1 text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer relative'
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute -top-[1px] w-6 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              )}
              <div className="relative">
                <Icon className={cn(
                  'w-5 h-5 transition-transform duration-200',
                  isActive ? 'text-purple-400 scale-110' : 'text-zinc-400'
                )} />
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[9px] font-medium scale-90',
                isActive ? 'text-zinc-100 font-bold' : 'text-zinc-500'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Notifications dropup overlay */}
      <AnimatePresence>
        {showNotificationDrawer && (
          <div className="fixed inset-0 z-30 select-none pb-[64px] flex flex-col justify-end">
            {/* Backdrop click dismisser */}
            <div 
              onClick={() => setShowNotificationDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />
            {/* Drawer sheet content container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[400px] w-full p-6 space-y-4 relative z-40"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto" onClick={() => setShowNotificationDrawer(false)} />
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <span className="font-bold text-base text-zinc-100 font-sans">Aktivitas Terbaru</span>
                <span className="text-xs text-purple-400 font-mono">AnikuKomu</span>
              </div>
              <div className="space-y-3 py-1 overflow-y-auto max-h-[250px]">
                {loadingNotifs && (
                  <p className="text-center text-xs text-zinc-500 py-6">Memuat...</p>
                )}
                {!loadingNotifs && notifications.length === 0 && (
                  <p className="text-center text-xs text-zinc-500 py-6">Belum ada aktivitas.</p>
                )}
                {!loadingNotifs && notifications.map((notif) => {
                  const initial = (notif.actor?.display_name || notif.actor?.username || '?')[0].toUpperCase();
                  const TypeIcon = notif.type === 'like' ? Heart : notif.type === 'follow' ? UserPlus : MessageCircle;
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'flex gap-3 p-3 rounded-xl border transition-colors',
                        notif.is_read
                          ? 'bg-zinc-950/40 border-zinc-800/50'
                          : 'bg-purple-500/5 border-purple-500/20'
                      )}
                    >
                      <div className="relative shrink-0">
                        {notif.actor?.avatar_url ? (
                          <img
                            src={notif.actor.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-[10px] text-white">
                            {initial}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          <TypeIcon className="w-2.5 h-2.5 text-pink-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-200">
                          <span className="font-bold">@{notif.actor?.username || 'pengguna'}</span>{' '}
                          {actionText(notif.type)}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
