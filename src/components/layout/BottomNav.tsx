import { Home, Compass, PlusSquare, Bell, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BottomNavProps {
  currentRoute: string;
  onChangeRoute: (route: string) => void;
  username: string;
}

export default function BottomNav({ currentRoute, onChangeRoute, username }: BottomNavProps) {
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const mockNotifications = [
    { id: 1, user: 'raffi_otaku', action: 'menyukai postingan Anda', time: '5m yang lalu' },
    { id: 2, user: 'wibu_sejati', action: 'mulai mengikuti Anda', time: '20m yang lalu' },
    { id: 3, user: 'megumi_chann', action: 'mengomentari postingan Anda: \"Keren bgt kak!\"', time: '1j yang lalu' },
  ];

  const handleNavClick = (route: string) => {
    if (route === 'notifications') {
      setShowNotificationDrawer(!showNotificationDrawer);
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
              <Icon className={cn(
                'w-5 h-5 transition-transform duration-200',
                isActive ? 'text-purple-400 scale-110' : 'text-zinc-400'
              )} />
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
                {mockNotifications.map((notif) => (
                  <div key={notif.id} className="flex gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                      W
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200">
                        <span className="font-bold">@{notif.user}</span> {notif.action}
                      </p>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
