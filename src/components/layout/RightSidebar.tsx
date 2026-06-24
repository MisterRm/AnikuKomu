import React, { useEffect, useState, startTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Profile } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { Sparkles, TrendingUp, UserPlus, Check, Search } from 'lucide-react';

interface RightSidebarProps {
  currentUserId: string | undefined;
  token: string | null;
  onSelectTag: (tag: string) => void;
  onNavigateToUser: (username: string) => void;
}

export default function RightSidebar({ currentUserId, token, onSelectTag, onNavigateToUser }: RightSidebarProps) {
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');

  const trendingTags = [
    { name: 'OshiNoKoS2', posts: '12.5K postingan', genre: 'Trending di Indonesia' },
    { name: 'Demon Slayer: Infinity Castle', posts: '8.1K postingan', genre: 'Entertainment · Populer' },
    { name: 'Blue Lock Season 2', posts: '5.2K postingan', genre: 'Anime Season Ini' }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    onSelectTag(searchVal.trim());
  };

  useEffect(() => {
    async function loadSuggestions() {
      if (!currentUserId) return;
      try {
        setLoading(true);
        // Query some active profiles from database to show as suggestions
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUserId)
          .limit(4);

        if (error) throw error;

        if (data) {
          setSuggestedUsers(data as Profile[]);

          // Check if already followed
          const targetIds = data.map(u => u.id);
          if (targetIds.length > 0) {
            const { data: followRecords } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', currentUserId)
              .in('following_id', targetIds);

            if (followRecords) {
              const map: Record<string, boolean> = {};
              followRecords.forEach((r) => {
                map[r.following_id] = true;
              });
              setFollowingMap(map);
            }
          }
        }
      } catch (err) {
        console.error('Error loading recommendations:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSuggestions();
  }, [currentUserId]);

  const handleFollowClick = async (targetUserId: string) => {
    if (!currentUserId) return;
    // Optimistic Update
    const currentlyFollowing = !!followingMap[targetUserId];
    setFollowingMap(prev => ({
      ...prev,
      [targetUserId]: !currentlyFollowing
    }));

    try {
      if (currentlyFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: targetUserId });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Follow toggle failed, rolling back:', err);
      // rollback
      setFollowingMap(prev => ({
        ...prev,
        [targetUserId]: currentlyFollowing
      }));
    }
  };

  return (
    <aside className="w-[325px] shrink-0 sticky top-0 h-screen overflow-y-auto pt-6 pb-20 px-4 hidden xl:block space-y-5 select-none bg-[#09090b] border-l border-[#27272a]">
      
      {/* Search Bar Widget of Professional Polish Theme */}
      <form onSubmit={handleSearchSubmit} className="relative z-10">
        <input 
          type="text" 
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Cari di AnikuKomu" 
          className="w-full bg-[#111113] border border-[#27272a] rounded-full py-3 pl-12 pr-4 text-xs font-sans text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#c084fc] focus:ring-1 focus:ring-[#c084fc]/50 transition-all duration-300"
        />
        <div className="absolute left-4 top-3.5 flex items-center justify-center">
          <Search className="w-4 h-4 text-[#52525b]" />
        </div>
      </form>

      {/* Suggestions block */}
      <div className="bg-[#111113] border border-[#27272a] rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-zinc-900/60">
          <Sparkles className="w-4 h-4 text-[#c084fc]" />
          <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-300">Saran Ikuti</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-[34px] h-[34px] rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="w-20 h-3" />
                    <Skeleton className="w-14 h-2" />
                  </div>
                </div>
                <Skeleton className="w-14 h-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : suggestedUsers.length === 0 ? (
          <p className="text-xs text-zinc-500 italic text-center py-2">Belum ada sasis lain.</p>
        ) : (
          <div className="space-y-3">
            {suggestedUsers.map((su) => {
              const isFollowing = !!followingMap[su.id];
              return (
                <div key={su.id} className="flex items-center justify-between gap-1">
                  <div 
                    onClick={() => onNavigateToUser(su.username)}
                    className="flex items-center gap-2.5 cursor-pointer max-w-[155px]"
                  >
                    <Avatar src={su.avatar_url} name={su.username} size="sm" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-zinc-100 font-sans hover:underline truncate leading-snug">
                        {su.display_name || su.username}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono truncate">
                        @{su.username}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFollowClick(su.id)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer border-0 ${
                      isFollowing
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-rose-500/10 hover:text-rose-400'
                        : 'bg-[#fafafa] hover:bg-white text-[#09090b] shadow-sm'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                        <span>Selesai</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-2.5 h-2.5 stroke-[3.5]" />
                        <span>Ikuti</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trending Tags list block */}
      <div className="bg-[#111113] border border-[#27272a] rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-zinc-900/60">
          <TrendingUp className="w-4 h-4 text-[#f472b6]" />
          <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-300">Lagi Trending</h2>
        </div>

        <div className="space-y-3">
          {trendingTags.map((tag) => (
            <div 
              key={tag.name}
              onClick={() => startTransition(() => onSelectTag(tag.name))}
              className="group cursor-pointer p-2 rounded-xl hover:bg-[#1a1a1f] transition-all border border-transparent hover:border-[#27272a]"
            >
              <span className="text-[10px] text-[#a1a1aa] block font-medium">
                {tag.genre}
              </span>
              <p className="text-xs font-extrabold text-zinc-200 mt-0.5 group-hover:text-[#c084fc] transition-colors font-sans">
                #{tag.name}
              </p>
              <p className="text-[10px] text-[#a1a1aa] font-mono mt-0.5">
                {tag.posts}
              </p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
