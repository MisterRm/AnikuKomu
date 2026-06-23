import { useState } from 'react';

export function useLike(postId: string, initialLiked: boolean, initialCount: number) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleLike = async (token: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const prevLiked = liked;
    const prevCount = count;

    // Optimistic UI Update
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setLiked(nextLiked);
    setCount(nextCount);

    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ post_id: postId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to toggle like');
      }

      const data = await res.json();
      // Sync strictly with server numbers
      setLiked(data.liked);
      setCount(data.count);
    } catch (err) {
      console.error('Optimistic like toggle failed, rolling back:', err);
      // Rollback to previous clean state
      setLiked(prevLiked);
      setCount(prevCount);
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
