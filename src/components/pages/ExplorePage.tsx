import React, { useEffect, useState, startTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Post, Profile } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { Search, Compass, Sparkles, SlidersHorizontal, BookOpen, Heart, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ExplorePageProps {
  currentUser: any;
  token: string | null;
  refreshSignal?: number;
  onOpenComments: (postId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToUser: (username: string) => void;
}

export default function ExplorePage({
  currentUser,
  token,
  refreshSignal,
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
    { name: 'Aksi', value: 'Action' },
    { name: 'Fantasi', value: 'Fantasy' },
    { name: 'Petualangan', value: 'Adventure' },
    { name: 'Drama', value: 'Drama' },
    { name: 'Romantis', value: 'Romance' },
    { name: 'Misteri', value: 'Mystery' },
    { name: 'Komedi', value: 'Comedy' },
    { name: 'Horor', value: 'Horror' },
    { name: 'Isekai', value: 'Isekai' },
  ];

  useEffect(() => {
    async function loadExplorePosts() {
      try {
        setLoadingPosts(true);
        const { data: rawPosts, error } = await supabase
          .from('posts')
          .select('*, profiles:profiles!user_id(*)')
          .order('created_at', { ascending: false })
          .limit(40);

        if (error) throw error;

        if (rawPosts) {
          const hydrated = await Promise.all(
            (rawPosts as Post[]).map(async (post) => {
              const { data: tagRecords } = await supabase
                .from('post_anime_tags')
                .select('anime_id, animes(*)')
                .eq('post_id', post.id);
              return { ...post, animes: tagRecords ? tagRecords.map((r: any) => r.animes) : [] };
            })
          );

          startTransition(() => {
            if (selectedGenre) {
              setPosts(hydrated.filter(p => p.animes?.some((a: any) => a?.genre?.includes(selectedGenre))));
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
  }, [selectedGenre, refreshSignal]);

  useEffect(() => {
    if (!searchUserQuery.trim()) { setUserSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const { data } = await supabase.from('profiles').select('*')
          .or(`username.ilike.%${searchUserQuery}%,display_name.ilike.%${searchUserQuery}%`).limit(6);
        setUserSuggestions((data as Profile[]) || []);
      } catch {}
      finally { setLoadingUsers(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchUserQuery]);

  // Pisah post dengan gambar dan tanpa gambar
  const imagePosts = posts.filter(p => p.image_url);
  const textPosts = posts.filter(p => !p.image_url);

  return (
    <div className="w-full flex flex-col min-h-screen pb-24">
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 h-[56px] flex items-center justify-between px-4 z-10">
        <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
          <Compass className="w-5 h-5 text-purple-400" />
          <span>Jelajah</span>
        </h2>
        <span className="text-[10px] uppercase font-bold text-pink-400 font-mono tracking-wider">AnikuKomu Explore</span>
      </header>

      <div className="p-4 space-y-5 max-w-2xl mx-auto w-full">

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchUserQuery}
            onChange={e => setSearchUserQuery(e.target.value)}
            placeholder="Cari sesama wibu berdasarkan username/nama..."
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl pl-10 pr-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
          />

          {searchUserQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#111113] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-zinc-900 z-30">
              {loadingUsers ? (
                <div className="p-4 space-y-2"><Skeleton className="w-2/3 h-4" /><Skeleton className="w-1/2 h-3" /></div>
              ) : userSuggestions.length === 0 ? (
                <p className="p-4 text-xs text-zinc-500 text-center italic">User tidak ditemukan.</p>
              ) : userSuggestions.map(user => (
                <div key={user.id} onClick={() => { onNavigateToUser(user.username); setSearchUserQuery(''); }}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-800 cursor-pointer transition-colors">
                  <Avatar src={user.avatar_url} name={user.username} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-100 truncate">{user.display_name || user.username}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">@{user.username}</p>
                  </div>
                  {user.followers_count > 0 && (
                    <span className="ml-auto text-[10px] text-zinc-500 shrink-0">{user.followers_count} followers</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Genre Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            <SlidersHorizontal className="w-3 h-3 text-purple-400" />
            <span>Filter Genre</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {genres.map(genre => (
              <button key={genre.name} onClick={() => setSelectedGenre(genre.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                  selectedGenre === genre.value
                    ? 'bg-purple-500 border-purple-400 text-white shadow-md shadow-purple-500/20'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                }`}>
                {genre.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Post dengan Gambar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-900 pb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Galeri Postingan</span>
          </div>

          {loadingPosts ? (
            <div className="grid grid-cols-3 gap-1">
              {[1,2,3,4,5,6,7,8,9].map(i => (
                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
              ))}
            </div>
          ) : imagePosts.length === 0 && textPosts.length === 0 ? (
            <div className="text-center p-12 bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-900">
              <BookOpen className="w-8 h-8 text-zinc-800 mx-auto mb-2 stroke-[1.2]" />
              <p className="text-xs text-zinc-500 font-semibold">Belum ada postingan.</p>
            </div>
          ) : (
            <>
              {/* Grid foto — 3 kolom Instagram style */}
              {imagePosts.length > 0 && (
                <div className="grid grid-cols-3 gap-0.5">
                  {imagePosts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      onClick={() => onOpenComments(post.id)}
                      className="group relative cursor-pointer aspect-square overflow-hidden bg-zinc-900"
                    >
                      <img
                        src={post.image_url!}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1 text-white text-xs font-bold">
                          <Heart className="w-4 h-4 fill-white" />{post.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-white text-xs font-bold">
                          <MessageCircle className="w-4 h-4 fill-white" />{post.comments_count || 0}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Text posts — tampil sebagai list card */}
              {textPosts.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Diskusi</p>
                  {textPosts.map(post => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      onClick={() => onOpenComments(post.id)}
                      className="cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar src={post.profiles?.avatar_url} name={post.profiles?.username || ''} size="xs" />
                        <span className="text-xs font-bold text-zinc-300">@{post.profiles?.username}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{post.caption}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                          <Heart className="w-3 h-3" />{post.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                          <MessageCircle className="w-3 h-3" />{post.comments_count || 0}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
