import React, { useEffect, useState, startTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Post, Profile, Story } from '../../types/database';
import StoryBar from '../feed/StoryBar';
import PostCard from '../feed/PostCard';
import { PostSkeleton } from '../ui/Skeleton';
import { Flame, Star, MessageSquareCode, Compass } from 'lucide-react';

interface FeedPageProps {
  currentUser: any;
  currentProfile: Profile | null;
  token: string | null;
  refreshSignal?: number;
  onOpenStoryViewer: (stories: Story[], startIndex: number) => void;
  onOpenComments: (postId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToUser: (username: string) => void;
  onSelectTag: (tag: string) => void;
}

export default function FeedPage({
  currentUser,
  currentProfile,
  token,
  refreshSignal,
  onOpenStoryViewer,
  onOpenComments,
  onToast,
  onNavigateToUser,
  onSelectTag
}: FeedPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState<'following' | 'explore'>('explore');

  const fetchFeed = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      // Let's first look up who the user follows
      const { data: followedUsers, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);

      const followedIds = followedUsers ? followedUsers.map(f => f.following_id) : [];

      let queryBuilder = supabase
        .from('posts')
        .select('*, profiles:profiles!user_id(*)')
        .order('created_at', { ascending: false });

      // If user wants 'following' mode and has followings, limit query to those
      if (feedMode === 'following' && followedIds.length > 0) {
        queryBuilder = queryBuilder.in('user_id', followedIds);
      }

      const { data: postsData, error: postsError } = await queryBuilder.limit(25);

      if (postsError) throw postsError;

      if (postsData) {
        // Hydrate posts with tag details by querying post_anime_tags and joining table animes
        const hydratedPosts = await Promise.all(
          (postsData as Post[]).map(async (post) => {
            const { data: tagRecords } = await supabase
              .from('post_anime_tags')
              .select('anime_id, animes(*)')
              .eq('post_id', post.id);

            const fetchedAnimes = tagRecords ? tagRecords.map((r: any) => r.animes) : [];
            // Format check
            return {
              ...post,
              animes: fetchedAnimes
            };
          })
        );
        setPosts(hydratedPosts);

        // Find out which of these posts the current user has already liked
        if (hydratedPosts.length > 0) {
          const postIds = hydratedPosts.map((p) => p.id);
          const { data: likedRows } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', postIds);

          setLikedPostIds(new Set((likedRows || []).map((r) => r.post_id)));
        } else {
          setLikedPostIds(new Set());
        }
      }
    } catch (err: any) {
      console.error('Failed to load feed:', err);
      onToast(err?.message || 'Gagal memuat feed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [currentUser, feedMode, refreshSignal]);

  const handlePostDeleted = (postId: string) => {
    startTransition(() => {
      setPosts(prev => prev.filter(p => p.id !== postId));
    });
  };

  return (
    <div className="w-full flex flex-col min-h-screen pb-24">
      {/* Home Feed Top header toggler bar */}
      <header className="sticky top-0 bg-[#09090b]/85 backdrop-blur-md border-b border-[#27272a] h-[58px] flex items-center justify-between px-4 z-10 select-none">
        <h2 className="font-extrabold text-base font-sans tracking-tight text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-[#c084fc] fill-[#c084fc] animate-spin-pulse" />
          <span>Beranda</span>
        </h2>

        {/* Following vs Explore Feed Toggles selector */}
        <div className="flex bg-[#111113] rounded-full p-0.5 border border-[#27272a]">
          <button
            onClick={() => setFeedMode('explore')}
            className={`px-3.5 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer flex items-center gap-1 border-0 ${
              feedMode === 'explore'
                ? 'bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-white shadow'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Terbaru</span>
          </button>
          <button
            onClick={() => setFeedMode('following')}
            className={`px-3.5 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer flex items-center gap-1 border-0 ${
              feedMode === 'following'
                ? 'bg-gradient-to-r from-[#c084fc] to-[#f472b6] text-white shadow'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Diikuti</span>
          </button>
        </div>
      </header>

      {/* Story component bar */}
      <StoryBar
        currentUser={currentUser}
        currentProfile={currentProfile}
        token={token}
        onOpenStoryViewer={onOpenStoryViewer}
        onToast={onToast}
      />

      {/* Loading Skeletal screens */}
      {loading ? (
        <div className="divide-y divide-zinc-900">
          {[1, 2].map(i => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center flex-1 min-h-[350px] select-none">
          <MessageSquareCode className="w-12 h-12 text-zinc-800 mb-3 stroke-[1.2]" />
          <h3 className="text-zinc-400 font-bold text-sm">Sunyi Sekali di Sini...</h3>
          <p className="text-xs text-zinc-600 max-w-xs mt-1">
            {feedMode === 'following'
              ? 'Pengguna yang Anda ikuti belum membuat postingan, atau Anda belum mengikuti siapapun. Jelajahi tab Terbaru!'
              : 'Belum ada postingan anime yang dibagikan. Jadilah wibu pertama yang memposting keseruan!'}
          </p>
          <button
            onClick={() => setFeedMode('explore')}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:scale-105 border border-purple-400/20 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Jelajahi Konten Global
          </button>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900/60">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              token={token}
              initialLiked={likedPostIds.has(post.id)}
              onOpenComments={onOpenComments}
              onPostDeleted={handlePostDeleted}
              onToast={onToast}
              onNavigateToUser={onNavigateToUser}
              onSelectTag={onSelectTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
