import { useState } from 'react';
import { supabase } from '../lib/supabase/client';

export function useLike(postId: string, initialLiked: boolean, initialCount: number) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isProcessing, setIsProcessing] = useState(false);

  // token param kept for backwards-compat with existing call sites, but the
  // actual auth comes from the Supabase client's own session (RLS-enforced).
  const toggleLike = async (_token: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const prevLiked = liked;
    const prevCount = count;

    // Optimistic UI update
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
    setLiked(nextLiked);
    setCount(nextCount);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Anda harus login untuk menyukai postingan.');

      if (prevLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: postId });
        if (error) throw error;
      }

      // Sync with real count from the server (likes_count is kept in sync by a DB trigger)
      const { count: realCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      setCount(realCount ?? nextCount);
    } catch (err) {
      console.error('Like toggle failed, rolling back:', err);
      setLiked(prevLiked);
      setCount(prevCount);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    liked,
    count,
    toggleLike,
    isProcessing,
  };
}
