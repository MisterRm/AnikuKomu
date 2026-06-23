import React from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLike } from '../../hooks/useLike';
import { formatCount } from '../../lib/utils';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  token: string | null;
  className?: string;
  onLikedStateChange?: (liked: boolean) => void;
}

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
  token,
  className,
  onLikedStateChange
}: LikeButtonProps) {
  const { liked, count, toggleLike, isProcessing } = useLike(postId, initialLiked, initialCount);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const prevLiked = liked;
    await toggleLike(token);
    if (onLikedStateChange && prevLiked !== !liked) {
      onLikedStateChange(!prevLiked);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isProcessing || !token}
      className={`flex items-center gap-2 py-2 px-3 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer text-zinc-400 group ${className}`}
    >
      <motion.div
        whileTap={{ scale: 1.4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        className="relative flex items-center justify-center w-5 h-5"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {liked ? (
            <motion.div
              key="filled"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 15 }}
            >
              <Heart className="w-5 h-5 text-pink-500 fill-pink-500 stroke-pink-500" />
            </motion.div>
          ) : (
            <motion.div
              key="outline"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="group-hover:text-pink-400 transition-colors"
            >
              <Heart className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Counter number animation using motion spans */}
      <motion.span
        key={count}
        initial={{ y: -3, opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        className={`text-xs font-mono font-semibold select-none leading-none ${
          liked ? 'text-pink-500' : 'text-zinc-400'
        }`}
      >
        {formatCount(count)}
      </motion.span>
    </button>
  );
}
