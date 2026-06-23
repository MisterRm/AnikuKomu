import React from 'react';
import { Home, Compass, PlusSquare, User, LogOut, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Profile } from '../../types/database';

interface SidebarProps {
  currentRoute: string;
  onChangeRoute: (route: string) => void;
  username: string;
  onLogout: () => void;
  currentProfile?: Profile | null;
}

export default function Sidebar({ currentRoute, onChangeRoute, username, onLogout, currentProfile }: SidebarProps) {
  const menuItems = [
    { id: 'feed', name: 'Beranda', icon: Home },
    { id: 'explore', name: 'Jelajah', icon: Compass },
    { id: 'post/create', name: 'Buat Post', icon: PlusSquare },
    { id: `profile/${username}`, name: 'Profil', icon: User, matchPrefix: 'profile/' },
  ];

  const getIsActive = (item: typeof menuItems[0]) => {
    if (item.matchPrefix) {
      return currentRoute.startsWith(item.matchPrefix);
    }
    return currentRoute === item.id;
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#09090b] border-r border-[#27272a] hidden md:flex flex-col justify-between py-6 px-4 z-20">
      <div>
        {/* Brand Logo */}
        <div 
          onClick={() => onChangeRoute('feed')}
          className="flex items-center gap-3 px-3 mb-8 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c084fc] to-[#f472b6] flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-all">
            <Flame className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tighter bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent font-sans">
              AnikuKomu
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-400/80 font-mono">
              Otaku Indo
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = getIsActive(item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onChangeRoute(item.id)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-[15px] transition-all group duration-300 relative',
                  isActive
                    ? 'text-purple-400 bg-purple-500/5'
                    : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-zinc-900/50'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-gradient-to-b from-purple-400 to-pink-500 animate-pulse" />
                )}
                <Icon className={cn(
                  'w-5 h-5 transition-transform duration-300 group-hover:scale-110',
                  isActive ? 'text-[#c084fc]' : 'text-[#a1a1aa] group-hover:text-[#fafafa]'
                )} />
                <span className="font-semibold tracking-tight">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Actions & Sign out & User Profile Card Block */}
      <div className="space-y-4">
        {/* Quick create float trigger info */}
        <button
          onClick={() => onChangeRoute('post/create')}
          className="w-full py-3 px-4 rounded-xl font-bold text-center text-sm transition-all duration-300 bg-gradient-to-r from-[#c084fc] to-[#f472b6] hover:brightness-110 text-white shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          <PlusSquare className="w-4 h-4" />
          <span>Buat Post</span>
        </button>

        {/* User Card footer matching the professional theme design precisely */}
        {currentProfile && (
          <div 
            onClick={() => onChangeRoute(`profile/${username}`)}
            className="flex items-center gap-3 p-2 hover:bg-[#111113] border border-transparent hover:border-[#27272a]/50 rounded-xl cursor-pointer transition-all duration-300 group"
          >
            <Avatar src={currentProfile.avatar_url} name={currentProfile.username} size="sm" className="border border-[#27272a] shadow-md group-hover:scale-105 transition-transform" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-[#fafafa] truncate leading-tight group-hover:text-[#c084fc] transition-colors">
                {currentProfile.display_name || currentProfile.username}
              </p>
              <p className="text-xs text-[#a1a1aa] truncate leading-none mt-1">
                @{currentProfile.username}
              </p>
            </div>
          </div>
        )}

        <div className="h-px bg-[#27272a] mx-2" />

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-2.5 rounded-xl font-medium text-[14px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all group duration-300"
        >
          <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 group-hover:-translate-x-1 transition-all" />
          <span className="font-semibold">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
