import { useState } from 'react';
import { supabase } from '../lib/supabase/client';

export function useFollow(targetUserId: string, initialFollowing: boolean) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isProcessing, setIsProcessing] = useState(false);

  // token param kept for backwards-compat with existing call sites, but the
  // actual auth comes from the Supabase client's own session (RLS-enforced).
  const toggleFollow = async (_token: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const prevFollowing = following;
    setFollowing(!prevFollowing);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Anda harus login untuk mengikuti pengguna.');
      if (user.id === targetUserId) throw new Error('Tidak bisa mengikuti diri sendiri.');

      if (prevFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: targetUserId });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Follow toggle failed, rolling back:', err);
      setFollowing(prevFollowing);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    following,
    toggleFollow,
    isProcessing,
  };
}
