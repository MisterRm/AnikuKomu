import React, { useEffect, useState, startTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Post, Profile } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { Search, Compass, Sparkles, UserPlus, SlidersHorizontal, BookOpen } from 'lucide-react';

interface ExplorePageProps {
  currentUser: any;
  token: string | null;
  onOpenComments: (postId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToUser: (username: string) => void;
}

export default function ExplorePage({
  currentUser,
  token,
  onOpenComments,
  onToast,
  onNavigateToUser
}: ExplorePageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const genres = [
    { name: 'Semua', value: null },
    { name: 'Aksi', value: 'Aksi' },
    { name: 'Fantasi', value: 'Fantasi' },
    { name: 'Petualangan', value: 'Petualangan' },
    { name: 'Drama', value: 'Drama' },
    { name: 'Romantis', value: 'Romantis' },
    { name: 'Misteri', value: 'Misteri' }
  ];

  // Load Explore posts
  useEffect(() => {
    async function loadExplorePosts() {
      try {
        setLoadingPosts(true);

        // Fetch posts
        let queryBuilder = supabase
          .from('posts')
          .select('*, profiles:profiles(*)')
          .order('created_at', { ascending: false });

        const { data: rawPosts, error } = await queryBuilder.limit(30);
        if (error) throw error;

        if (rawPosts) {
          // Hydrate with anime tags to check for genre matches
          const hydrated = await Promise.all(
            (rawPosts as Post[]).map(async (post) => {
              const { data: tagRecords } = await supabase
                .from('post_anime_tags')
                .select('anime_id, animes(*)')
                .eq('post_id', post.id);

              const tags = tagRecords ? tagRecords.map((r: any) => r.animes) : [];
              return {
                ...post,
                animes: tags
              };
            })
          );

          startTransition(() => {
            // Apply client-side genre filter if selected
            if (selectedGenre) {
              const filtered = hydrated.filter((p) =>
                p.animes?.some((a) => a.genre?.includes(selectedGenre))
              );
              setPosts(filtered);
            } else {
              setPosts(hydrated);
            }
          });
        }
      } catch (err) {
        console.error('Error loading explore posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    }

    loadExplorePosts();
  }, [selectedGenre]);

  // Handle Search users
  useEffect(() => {
    if (searchUserQuery.trim().length === 0) {
      setUserSuggestions([]);
      setLoadingUsers(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingUsers(true);
        // Search users
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchUserQuery}%,display_name.ilike.%${searchUserQuery}%`)
          .limit(6);

        if (error) throw error;
        setUserSuggestions((profiles as Profile[]) || []);
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        setLoadingUsers(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchUserQuery]);

  return (
    <div className="w-full flex flex-col min-h-screen pb-24 select-none">
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 h-[56px] flex items-center justify-between px-4 z-10">
        <h2 className="font-bold text-base font-sans tracking-tight text-white flex items-center gap-1.5">
          <Compass className="w-5 h-5 text-purple-400" />
          <span>Jelajah</span>
        </h2>
        <span className="text-[10px] uppercase font-bold text-pink-400 font-mono tracking-wider">
          AnikuKomu Explore
        </span>
      </header>

      <div className="p-4 space-y-5 max-w-2xl mx-auto w-full">
        {/* Search Users Input */}
        <div className="space-y-2 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              placeholder="Cari sesama wibu berdasarkan username/nama..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl pl-10 pr-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/20 shadow-inner"
            />
          </div>

          {/* User Search Results Deck */}
          {searchUserQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-zinc-900 z-30">
              {loadingUsers ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="w-2/3 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
              ) : userSuggestions.length === 0 ? (
                <p className="p-4 text-xs text-zinc-500 text-center italic">User tidak ditemukan.</p>
              ) : (
                userSuggestions.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      onNavigateToUser(user.username);
                      setSearchUserQuery('');
                    }}
                    className="flex items-center justify-between gap-3 p-3 hover:bg-zinc-850 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={user.avatar_url} name={user.username} />
                      <div className="truncate">
                        <p className="text-xs font-bold text-zinc-100 hover:underline">{user.display_name || user.username}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">@{user.username}</p>
                      </div>
                    </div>
                    {user.bio && (
                      <span className="text-[10px] text-zinc-500 truncate max-w-[150px] font-mono leading-none">{user.bio}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Genre filtering chips */}
        <div className="space-y-2 select-none">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono">
            <SlidersHorizontal className="w-3 h-3 text-purple-400" />
            <span>Kategori Genre</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
            {genres.map((genre) => (
              <button
                key={genre.name}
                onClick={() => setSelectedGenre(genre.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                  selectedGenre === genre.value
                    ? 'bg-purple-500 border-purple-400 text-white shadow-md shadow-purple-500/10'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-805 hover:text-zinc-200'
                }`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>

        {/* Explore post masonry grid bento */}
        <div className="space-y-3 select-none">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono border-b border-zinc-900 pb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Galeri Wibu Populer</span>
          </div>

          {loadingPosts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center p-12 bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-900">
              <BookOpen className="w-8 h-8 text-zinc-800 mx-auto mb-2 stroke-[1.2]" />
              <p className="text-xs text-zinc-500 font-semibold">Galeri kosong.</p>
              <p className="text-[10px] text-zinc-600 mt-1">Belum ada postingan sasis dengan genre "{selectedGenre}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 [&>div]:break-inside-avoid">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onOpenComments(post.id)}
                  className="group relative cursor-pointer aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-900/60 shadow hover:-translate-y-0.5 transition-all duration-300"
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-purple-500/10 via-zinc-900 to-pink-500/10">
                      <p className="text-[10px] text-zinc-300 text-center line-clamp-5 leading-snug">
                        {post.caption}
                      </p>
                    </div>
                  )}
                  {/* Subtle caption overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <p className="text-[10px] font-bold text-zinc-200 line-clamp-2 leading-snug">
                      {post.caption}
                    </p>
                    <span className="text-[9px] text-purple-400 font-mono mt-1 select-none">
                      @{post.profiles?.username || 'member'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
