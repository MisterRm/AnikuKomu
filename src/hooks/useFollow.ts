import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

export function useFollow(targetUserId: string, _initialFollowing: boolean) {
  const [following, setFollowing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checked, setChecked] = useState(false);

  // Selalu cek dari DB setiap targetUserId berubah
  useEffect(() => {
    if (!targetUserId) return;
    setChecked(false);

    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id === targetUserId) return;

        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        setFollowing(!!data);
      } catch {}
      finally { setChecked(true); }
    };

    checkStatus();
  }, [targetUserId]);

  const toggleFollow = async (_token: string) => {
    if (isProcessing || !checked) return;
    setIsProcessing(true);

    const prevFollowing = following;
    setFollowing(!prevFollowing);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Harus login dulu.');
      if (user.id === targetUserId) throw new Error('Tidak bisa follow diri sendiri.');

      if (prevFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        if (error) throw error;
      } else {
        // Cek dulu biar ga duplicate
        const { data: existing } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('follows')
            .insert({ follower_id: user.id, following_id: targetUserId });
          if (error) throw error;
        }
      }
    } catch (err) {
      setFollowing(prevFollowing); // rollback
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return { following, toggleFollow, isProcessing, checked };
}
