import { useState } from 'react';

export function useFollow(targetUserId: string, initialFollowing: boolean) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleFollow = async (token: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const prevFollowing = following;

    // Optimistic state switch
    setFollowing(!prevFollowing);

    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to toggle follow');
      }

      const data = await res.json();
      setFollowing(data.following);
    } catch (err) {
      console.error('Optimistic follow toggle failed, rolling back:', err);
      // Rollback to previous state
      setFollowing(prevFollowing);
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
