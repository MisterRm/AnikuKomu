import React, { useEffect, useState, useTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Profile, Post } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { useFollow } from '../../hooks/useFollow';
import { formatCount } from '../../lib/utils';
import { Settings, Image, Heart, Users, MessageSquare, ShieldAlert, X, Globe, Twitter, Instagram, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfilePageProps {
  key?: any;
  usernameParam: string;
  currentUser: any;
  currentProfile: Profile | null;
  token: string | null;
  refreshSignal?: number;
  onNavigateToEdit: () => void;
  onOpenComments: (postId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToUser: (username: string) => void;
}

export default function ProfilePage({
  usernameParam,
  currentUser,
  currentProfile,
  token,
  refreshSignal,
  onNavigateToEdit,
  onOpenComments,
  onToast,
  onNavigateToUser
}: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [, startTransition] = useTransition();
  const [bannerChar, setBannerChar] = useState<{ img: string; name: string; anime: string } | null>(null); // dari DB

  // Load profile details dynamically
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        // Find user by username
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', usernameParam.toLowerCase())
          .maybeSingle();

        if (profileErr) throw profileErr;

        if (!profileData) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const activeProf = profileData as Profile;
        setProfile(activeProf);

        // Set banner character dari DB
        if ((activeProf as any).banner_char_img) {
          setBannerChar({
            img: (activeProf as any).banner_char_img,
            name: (activeProf as any).banner_char_name || '',
            anime: (activeProf as any).banner_char_anime || '',
          });
        }

        // Fetch posts or liked posts based on active tab
        let postData: Post[] = [];
        if (activeTab === 'posts') {
          const { data, error: postsErr } = await supabase
            .from('posts')
            .select('*, profiles:profiles!user_id(*)')
            .eq('user_id', activeProf.id)
            .order('created_at', { ascending: false });

          if (postsErr) {
            console.error('Error loading posts:', postsErr.message);
            onToast(postsErr.message, 'error');
          }

          postData = (data as Post[]) || [];
        } else {
          // fetch liked posts
          const { data: likedRecords, error } = await supabase
            .from('likes')
            .select('post_id, posts(*, profiles:profiles!user_id(*))')
            .eq('user_id', activeProf.id);

          if (likedRecords) {
            postData = likedRecords.map((r: any) => r.posts).filter(Boolean);
          }
        }

        // Hydrate with animes
        const hydrated = await Promise.all(
          postData.map(async (p) => {
            const { data: tagRecords } = await supabase
              .from('post_anime_tags')
              .select('anime_id, animes(*)')
              .eq('post_id', p.id);

            const fetchedAnimes = tagRecords ? tagRecords.map((r: any) => r.animes) : [];
            return {
              ...p,
              animes: fetchedAnimes
            };
          })
        );

        setPosts(hydrated);
      } catch (err: any) {
        console.error('Error loading profile:', err);
        onToast(err?.message || 'Gagal memuat profil.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [usernameParam, activeTab, refreshSignal]);

  // Load modal lists
  const handleOpenFollowers = async () => {
    if (!profile) return;
    setShowFollowersModal(true);
    try {
      setLoadingModalData(true);
      const { data } = await supabase
        .from('follows')
        .select('follower_id, profiles:profiles!follower_id(*)') // query profiles of the follower
        .eq('following_id', profile.id);

      if (data) {
        const list = data.map((d: any) => d.profiles).filter(Boolean);
        setFollowersList(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleOpenFollowing = async () => {
    if (!profile) return;
    setShowFollowingModal(true);
    try {
      setLoadingModalData(true);
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles:profiles!following_id(*)') // query profiles being followed
        .eq('follower_id', profile.id);

      if (data) {
        const list = data.map((d: any) => d.profiles).filter(Boolean);
        setFollowingList(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingModalData(false);
    }
  };

  const isMe = currentUser && profile && currentUser.id === profile.id;

  // Let's bind our custom useFollow hook if viewing someone else
  const [amIFollowing, setAmIFollowing] = useState(false);
  useEffect(() => {
    if (!isMe && currentUser && profile) {
      async function checkFollowing() {
        const { data } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
          .maybeSingle();
        setAmIFollowing(!!data);
      }
      checkFollowing();
    }
  }, [isMe, currentUser, profile]);

  const { following, toggleFollow, isProcessing } = useFollow(profile?.id || '', amIFollowing);

  const handleFollowToggle = async () => {
    if (!token || !profile) return;
    try {
      await toggleFollow(token);
      // sync visual stats count directly
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          followers_count: following ? prev.followers_count - 1 : prev.followers_count + 1
        };
      });
    } catch (err: any) {
      onToast(err?.message || 'Gagal mengikuti pengguna.', 'error');
    }
  };

  if (loading && !profile) {
    return (
      <div className="p-12 space-y-4">
        <Skeleton className="w-full h-[200px] rounded-3xl" />
        <Skeleton className="w-20 h-20 rounded-full" />
        <Skeleton className="w-40 h-6" />
        <Skeleton className="w-full h-24" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[500px]">
        <ShieldAlert className="w-14 h-14 text-rose-500 mb-3" />
        <h3 className="text-zinc-200 font-bold text-base">Profil Tidak Ditemukan</h3>
        <p className="text-xs text-zinc-500 mt-1.5 max-w-sm leading-relaxed">
          Akun dengan username <span className="font-bold text-zinc-300">@{usernameParam}</span> tidak terdaftar atau telah dinonaktifkan oleh administrator AnikuKomu.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col min-h-screen pb-24 select-none relative">
      {/* Banner Otaku Card dengan karakter anime random */}
      <div className="w-full h-[200px] relative overflow-hidden select-none border-b border-zinc-900 bg-[#09090b]">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950 via-zinc-950 to-pink-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Karakter anime di kanan */}
        {bannerChar?.img && (
          <div className="absolute right-0 top-0 h-full w-[160px] overflow-hidden">
            <img
              src={bannerChar.img}
              alt={bannerChar.name}
              className="h-full w-full object-cover object-top opacity-70"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-transparent to-transparent" />
          </div>
        )}

        {/* Decorative dots pattern */}
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle, #c084fc 1px, transparent 1px)', backgroundSize: '24px 24px'}} />

        {/* Label otaku card kiri bawah */}
        <div className="absolute bottom-4 left-4 space-y-1">
          <div className="text-[9px] uppercase tracking-widest font-bold text-purple-300/60 font-mono">AnikuKomu</div>
          <div className="text-[11px] font-extrabold text-white/80 tracking-tight">Otaku Card</div>
        </div>

        {/* Karakter name label kanan bawah */}
        {bannerChar?.name && (
          <div className="absolute bottom-4 right-4 text-right">
            <p className="text-[10px] font-bold text-white/70 truncate max-w-[140px]">{bannerChar.name}</p>
            {bannerChar.anime && (
              <p className="text-[9px] text-purple-300/50 truncate max-w-[140px] font-mono">{bannerChar.anime}</p>
            )}
          </div>
        )}


      </div>

      {/* Avatar details section and overlap */}
      <div className="px-4 md:px-6 relative -mt-[42px] space-y-4 pb-6 border-b border-zinc-900/50 select-none">
        <div className="flex items-end justify-between select-none">
          {/* Overlapping Avatar with size 84px */}
          <Avatar
            src={profile.avatar_url}
            name={profile.username}
            className="w-[84px] h-[84px] ring-4 ring-zinc-950 shadow-xl"
          />

          {/* Edit/Follow Button */}
          {isMe ? (
            <button
              onClick={onNavigateToEdit}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-800 bg-zinc-90 w-auto hover:bg-zinc-900 transition-all text-zinc-350 cursor-pointer flex items-center gap-2"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Edit Profil</span>
            </button>
          ) : currentUser ? (
            <button
              onClick={handleFollowToggle}
              disabled={isProcessing}
              className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                following
                  ? 'bg-zinc-800 hover:bg-rose-950/20 hover:text-rose-400 text-zinc-300 border border-zinc-700/50'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-md text-white'
              }`}
            >
              {following ? 'Mengikuti' : 'Ikuti Sasis'}
            </button>
          ) : null}
        </div>

        {/* Bio segment text block */}
        <div className="space-y-1.5 select-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-lg font-bold text-zinc-100 font-sans tracking-tight leading-none">
              {profile.display_name || profile.username}
            </h3>
            <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/5 border border-purple-800/20 px-1.5 py-0.5 rounded">
              @{profile.username}
            </span>
          </div>

          {profile.bio && (
            <p className="text-xs text-zinc-400 leading-relaxed font-sans pr-2 max-w-sm">
              {profile.bio}
            </p>
          )}

          {/* Social connections links */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] text-zinc-500 font-mono">
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-purple-400 truncate max-w-[160px]">
                <Globe className="w-3 h-3 shrink-0" />{profile.website_url.replace(/(https?:\/\/)?(www\.)?/, '')}
              </a>
            )}
            {profile.twitter_url && (
              <a href={`https://twitter.com/${profile.twitter_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-purple-400">
                <Twitter className="w-3 h-3 shrink-0" />{profile.twitter_url}
              </a>
            )}
            {profile.instagram_url && (
              <a href={`https://instagram.com/${profile.instagram_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-purple-400">
                <Instagram className="w-3 h-3 shrink-0" />@{profile.instagram_url}
              </a>
            )}
          </div>
        </div>

        {/* 3-column stats panel section */}
        <div className="grid grid-cols-3 max-w-xs gap-4 select-none">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-zinc-100 font-sans leading-tight">
              {profile.posts_count || 0}
            </span>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider font-mono">
              Postings
            </span>
          </div>

          <div onClick={handleOpenFollowers} className="flex flex-col cursor-pointer group">
            <span className="text-lg font-bold text-zinc-100 group-hover:text-purple-400 transition-colors font-sans leading-tight">
              {formatCount(profile.followers_count || 0)}
            </span>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider font-mono group-hover:text-zinc-410 transition-colors">
              Pengikut
            </span>
          </div>

          <div onClick={handleOpenFollowing} className="flex flex-col cursor-pointer group">
            <span className="text-lg font-bold text-zinc-100 group-hover:text-purple-400 transition-colors font-sans leading-tight">
              {formatCount(profile.following_count || 0)}
            </span>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider font-mono group-hover:text-zinc-410 transition-colors">
              Mengikuti
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Filter (Postingan vs Disukai) */}
      <div className="flex border-b border-zinc-900/60 bg-zinc-950 sticky top-[56px] select-none z-10">
        <button
          onClick={() => startTransition(() => setActiveTab('posts'))}
          className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'posts' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-350'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>Postingan</span>
          {activeTab === 'posts' && (
            <motion.div
              layoutId="profileTabLine"
              className="absolute bottom-0 left-8 right-8 h-[2.5px] bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
            />
          )}
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab('likes'))}
          className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'likes' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-350'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Disukai</span>
          {activeTab === 'likes' && (
            <motion.div
              layoutId="profileTabLine"
              className="absolute bottom-0 left-8 right-8 h-[2.5px] bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
            />
          )}
        </button>
      </div>

      {/* 3-column posts grid publications display */}
      <div className="p-0.5 select-none flex-1">
        {loading ? (
          <div className="grid grid-cols-3 gap-0.5">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="aspect-square w-full rounded" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center p-12 py-20 bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-900 max-w-sm mx-auto mt-8 select-none">
            <ShieldAlert className="w-10 h-10 text-zinc-800 mx-auto mb-2 stroke-[1.2]" />
            <p className="text-xs text-zinc-500 font-semibold">Galeri kosong.</p>
            <p className="text-[10px] text-zinc-600 mt-1">Belum ada karya yang terbit di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => onOpenComments(post.id)}
                className="relative aspect-square overflow-hidden group cursor-pointer bg-zinc-900/50 border border-zinc-900/40 hover:opacity-90 active:scale-95 transition-all"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-purple-500/10 via-zinc-900 to-pink-500/10">
                    <p className="text-[9px] text-zinc-300 text-center line-clamp-4 leading-snug">
                      {post.caption}
                    </p>
                  </div>
                )}
                {/* Stats indicators overlay hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-xs font-bold text-white">
                  <div className="flex items-center gap-1 font-mono text-zinc-200">
                    <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                    <span>{formatCount(post.likes_count || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-zinc-200">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                    <span>{formatCount(post.comments_count || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Followers / Following popup Modal --- */}
      <AnimatePresence>
        {(showFollowersModal || showFollowingModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop click dismisser */}
            <div 
              onClick={() => {
                setShowFollowersModal(false);
                setShowFollowingModal(false);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs cursor-pointer animate-fade-in"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full max-h-[420px] overflow-hidden flex flex-col relative z-20"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
                <span className="font-bold text-zinc-200 font-sans flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>{showFollowersModal ? 'Daftar Pengikut' : 'Daftar Mengikuti'}</span>
                </span>
                <button
                  onClick={() => {
                    setShowFollowersModal(false);
                    setShowFollowingModal(false);
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingModalData ? (
                  <div className="space-y-3">
                    <Skeleton className="w-[150px] h-4" />
                    <Skeleton className="w-[120px] h-3" />
                  </div>
                ) : (showFollowersModal ? followersList : followingList).length === 0 ? (
                  <p className="text-zinc-500 text-xs italic text-center py-6">Koleksi kosong.</p>
                ) : (
                  (showFollowersModal ? followersList : followingList).map((f) => (
                    <div 
                      key={f.id}
                      onClick={() => {
                        setShowFollowersModal(false);
                        setShowFollowingModal(false);
                        onNavigateToUser(f.username);
                      }}
                      className="flex items-center gap-3 hover:bg-zinc-850 p-2 rounded-xl cursor-pointer transition-all border border-transparent hover:border-zinc-800"
                    >
                      <Avatar src={f.avatar_url} name={f.username} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-200 truncate leading-none mb-1">
                          {f.display_name || f.username}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono">@{f.username}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
