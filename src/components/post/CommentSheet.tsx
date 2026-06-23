import React, { useEffect, useState, startTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Comment, Profile } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { formatDate, formatCount } from '../../lib/utils';
import { Send, CornerDownRight, Heart, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommentSheetProps {
  postId: string;
  token: string | null;
  currentUser: any;
  onCommentsCountChange?: (newCount: number) => void;
  onToast?: (text: string, type: 'success' | 'error' | 'info') => void;
  onClose: () => void;
}

export default function CommentSheet({
  postId,
  token,
  currentUser,
  onCommentsCountChange,
  onToast,
  onClose
}: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments
  useEffect(() => {
    async function fetchComments() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('comments')
          .select('*, profiles:profiles!user_id(*)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setComments(data as Comment[]);

        // Check comment likes
        if (data && data.length > 0 && currentUser) {
          const commentIds = data.map((c) => c.id);
          const { data: likedRecords } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', currentUser.id)
            .in('comment_id', commentIds);

          const likesMap: Record<string, { liked: boolean; count: number }> = {};
          data.forEach((c: any) => {
            likesMap[c.id] = { liked: false, count: c.likes_count || 0 };
          });

          if (likedRecords) {
            likedRecords.forEach((record) => {
              if (likesMap[record.comment_id]) {
                likesMap[record.comment_id].liked = true;
              }
            });
          }
          setCommentLikes(likesMap);
        }
      } catch (err) {
        console.error('Failed to resolve comments:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [postId, currentUser]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: freshComment, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: newCommentText.trim(),
          parent_id: replyTarget ? replyTarget.id : null,
          likes_count: 0
        })
        .select('*, profiles:profiles!user_id(*)')
        .single();

      if (error) throw error;

      startTransition(() => {
        setComments(prev => [...prev, freshComment as Comment]);
        setNewCommentText('');
        setReplyTarget(null);

        // Update counts
        const nextTotal = comments.length + 1;
        if (onCommentsCountChange) {
          onCommentsCountChange(nextTotal);
        }
      });
    } catch (err: any) {
      console.error('Error posting comment:', err);
      onToast?.(err?.message || 'Gagal memposting komentar.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser || !token) return;
    const currentStatus = commentLikes[commentId] || { liked: false, count: 0 };
    const nextLiked = !currentStatus.liked;
    const nextCount = nextLiked ? currentStatus.count + 1 : Math.max(0, currentStatus.count - 1);

    // Dynamic UI Update
    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: { liked: nextLiked, count: nextCount }
    }));

    try {
      if (nextLiked) {
        await supabase.from('comment_likes').insert({ user_id: currentUser.id, comment_id: commentId });
      } else {
        await supabase.from('comment_likes').delete().eq('user_id', currentUser.id).eq('comment_id', commentId);
      }
      // Sync in DB counts
      const { error } = await supabase
        .from('comments')
        .update({ likes_count: nextCount })
        .eq('id', commentId);
      if (error) throw error;
    } catch (err: any) {
      // rollback on error
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: currentStatus
      }));
      onToast?.(err?.message || 'Gagal menyukai komentar.', 'error');
    }
  };

  // Group comments: Root comments (parent_id is null) & Nested children (parent_id references parent comment)
  const rootComments = comments.filter((c) => !c.parent_id);
  const getRepliesFor = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-end"
    >
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer" />

      {/* Sheet panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative bg-zinc-950 w-full max-w-md h-full flex flex-col border-l border-zinc-900 shadow-2xl z-20"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900">
          <div>
            <h3 className="font-bold text-zinc-100 font-sans flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span>Diskusi</span>
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">
              {comments.length} komentar terkumpul
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable comments stream list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="w-[30px] h-[30px] rounded-full" />
                    <Skeleton className="w-24 h-4 rounded" />
                  </div>
                  <Skeleton className="w-full h-8 rounded" />
                </div>
              ))}
            </div>
          ) : rootComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
              <MessageSquare className="w-8 h-8 text-zinc-700 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-zinc-400">Belum Ada Komentar</p>
              <p className="text-xs text-zinc-600 mt-1">Jadilah yang pertama menuliskan tanggapan Anda di obrolan!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {rootComments.map((comment) => {
                const commentId = comment.id;
                const author = comment.profiles || { username: 'wibu_member', display_name: 'Otaku Member', avatar_url: null };
                const replies = getRepliesFor(commentId);
                const likeState = commentLikes[commentId] || { liked: false, count: 0 };

                return (
                  <div key={commentId} className="space-y-3">
                    {/* Root comment structure */}
                    <div className="flex gap-3 group">
                      <Avatar src={author.avatar_url} name={author.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-900">
                          <div className="flex items-center justify-between pb-1">
                            <span className="font-bold text-xs text-zinc-200">
                              {author.display_name || author.username}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed break-words font-normal">
                            {comment.content}
                          </p>
                        </div>

                        {/* Action deck */}
                        <div className="flex items-center gap-4 mt-1.5 pl-2 text-[10px] text-zinc-500 font-bold select-none">
                          <button
                            onClick={() => handleLikeComment(commentId)}
                            className={`flex items-center gap-1 hover:text-pink-400 transition-colors cursor-pointer ${
                              likeState.liked ? 'text-pink-400 font-bold' : ''
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${likeState.liked ? 'fill-pink-500 text-pink-500' : ''}`} />
                            <span>{formatCount(likeState.count)}</span>
                          </button>
                          <button
                            onClick={() => setReplyTarget(comment)}
                            className="hover:text-purple-400 transition-colors cursor-pointer"
                          >
                            Balas
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies mapping (nested 1-level) */}
                    {replies.map((reply) => {
                      const rAuthor = reply.profiles || { username: 'anonymous', display_name: 'Anonymous', avatar_url: null };
                      const rLikeState = commentLikes[reply.id] || { liked: false, count: 0 };

                      return (
                        <div key={reply.id} className="flex gap-3 pl-8">
                          <CornerDownRight className="w-4 h-4 text-zinc-700 shrink-0 mt-2" />
                          <Avatar src={rAuthor.avatar_url} name={rAuthor.username} size="xs" />
                          <div className="flex-1 min-w-0">
                            <div className="bg-purple-500/5 border border-purple-950/20 p-2.5 rounded-2xl">
                              <div className="flex items-center justify-between pb-1">
                                <span className="font-bold text-[11px] text-zinc-300">
                                  {rAuthor.display_name || rAuthor.username}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {formatDate(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 leading-relaxed break-words font-normal">
                                {reply.content}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 mt-1 pl-2 text-[9px] text-zinc-500 font-bold select-none">
                              <button
                                onClick={() => handleLikeComment(reply.id)}
                                className={`flex items-center gap-1 hover:text-pink-400 transition-colors cursor-pointer ${
                                  rLikeState.liked ? 'text-pink-400' : ''
                                }`}
                              >
                                <Heart className={`w-2.5 h-2.5 ${rLikeState.liked ? 'fill-pink-500 text-pink-500' : ''}`} />
                                <span>{formatCount(rLikeState.count)}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reply target label info banner */}
        <AnimatePresence>
          {replyTarget && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900 px-4 py-2 text-xs flex items-center justify-between border-t border-zinc-800"
            >
              <div className="truncate text-zinc-400">
                Membalas <span className="font-bold text-zinc-200">@{replyTarget.profiles?.username}</span>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="text-zinc-500 hover:text-purple-400 font-bold ml-2 shrink-0 cursor-pointer"
              >
                Batal
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input box form */}
        <form onSubmit={handleSubmitComment} className="p-4 border-t border-zinc-900 bg-zinc-950 flex gap-2">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={replyTarget ? 'Tulis balasan Anda...' : 'Bagikan pemikiran wibu Anda...'}
            disabled={!currentUser}
            className="flex-1 bg-zinc-900/80 hover:bg-zinc-900 focus:bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || !currentUser || isSubmitting}
            className="aspect-square bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 font-bold text-white rounded-xl flex items-center justify-center w-[40px] shadow-lg shadow-purple-500/10 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 text-white stroke-[2.5]" />
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
