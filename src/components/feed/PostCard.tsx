import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Post, Anime } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import LikeButton from '../post/LikeButton';
import { formatDate } from '../../lib/utils';
import { MessageCircle, Share2, Clipboard, Trash2, Tag, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PostCardProps {
  key?: any;
  post: Post;
  currentUser: any;
  token: string | null;
  onOpenComments: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToUser: (username: string) => void;
  onSelectTag?: (tag: string) => void;
}

export default function PostCard({
  post,
  currentUser,
  token,
  onOpenComments,
  onPostDeleted,
  onToast,
  onNavigateToUser,
  onSelectTag
}: PostCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandCaption, setExpandCaption] = useState(false);

  const author = post.profiles || {
    username: 'wibu_member',
    display_name: 'Aniku Member',
    avatar_url: null
  };

  const isOwner = currentUser && post.user_id === currentUser.id;

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    if (!window.confirm('Apakah Anda yakin ingin menghapus postingan anime ini?')) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete directly via Supabase (RLS policy "posts_delete" only allows the
      // owner to do this). Related likes/comments/post_anime_tags rows are
      // removed automatically by the ON DELETE CASCADE foreign keys in the DB.
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', currentUser.id);

      if (deleteError) throw deleteError;

      // Best-effort Cloudinary cleanup in the background — uses POST instead
      // of DELETE since some mobile networks/proxies mishandle DELETE requests.
      // Failure here doesn't matter to the user; the post is already gone.
      if (post.image_public_id && token) {
        fetch('/api/post/cleanup-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ public_id: post.image_public_id })
        }).catch(() => {});
      }

      onToast('Postingan Anda berhasil dihapus!', 'success');
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Error menghapus postingan.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/#post/${post.id}`;
      navigator.clipboard.writeText(shareUrl);
      onToast('Link postingan berhasil disalin ke clipboard!', 'success');
    } catch (err) {
      onToast('Gagal menyalin link.', 'error');
    }
  };

  // Safe checks for tags
  const tags = (post.animes as unknown as Anime[]) || [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
      className="p-4 md:p-5 border-b border-zinc-900/60 bg-zinc-950 flex flex-col gap-3.5 relative"
    >
      {/* Header block info banner */}
      <div className="flex items-center justify-between">
        <div 
          onClick={() => onNavigateToUser(author.username)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <Avatar src={author.avatar_url} name={author.username} size="sm" />
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-zinc-100 font-sans group-hover:underline truncate leading-snug">
              {author.display_name || author.username}
            </h4>
            <p className="text-[10px] text-zinc-500 font-mono truncate">
              @{author.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 select-none">
          <span className="text-[10px] text-zinc-500 font-mono">
            {formatDate(post.created_at)}
          </span>

          {isOwner && (
            <button
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
              title="Hapus Postingan"
            >
              {isDeleting ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main post photo media display card (only when an image exists) */}
      {post.image_url && (
        <div
          onClick={() => onOpenComments(post.id)}
          className="w-full aspect-[4/5] rounded-2xl bg-[#111113] border border-[#27272a] overflow-hidden relative cursor-pointer group shadow-xl"
        >
          <img
            src={post.image_url}
            alt={post.caption || 'AnikuKomu Post'}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />

          {/* Sleek bottom dark gradient overlay with tag badges */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 flex flex-col justify-end gap-1.5 transition-opacity z-10">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 select-none items-center">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTag && onSelectTag(tag.title);
                    }}
                    className="bg-purple-900/40 border border-purple-500/50 text-purple-200 text-[9px] tracking-wider uppercase font-extrabold px-2.5 py-1 rounded-full cursor-pointer hover:bg-purple-800/60 active:scale-95 transition-all text-shadow"
                  >
                    #{tag.title}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Hover overlay hint */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
            <span className="bg-zinc-950/90 backdrop-blur-md text-[10px] uppercase tracking-widest font-extrabold text-zinc-100 px-4 py-2 rounded-full border border-[#27272a] shadow-lg">
              Klik Untuk Diskusi
            </span>
          </div>
        </div>
      )}

      {/* expandible Caption & user-tags segment */}
      <div className="space-y-2">
        {post.caption && (
          <p className="text-xs text-zinc-300 leading-relaxed font-normal">
            <span 
              onClick={() => onNavigateToUser(author.username)}
              className="font-bold text-zinc-100 mr-2 hover:underline cursor-pointer font-sans"
            >
              @{author.username}
            </span>
            {expandCaption ? post.caption : `${post.caption.slice(0, 110)}`}
            {post.caption.length > 110 && !expandCaption && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandCaption(true);
                }}
                className="text-purple-400 text-[11px] font-bold ml-1.5 underline cursor-pointer inline-block"
              >
                selengkapnya
              </button>
            )}
            {expandCaption && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandCaption(false);
                }}
                className="text-purple-400 text-[11px] font-bold ml-1.5 underline cursor-pointer inline-block"
              >
                sembunyikan
              </button>
            )}
          </p>
        )}

        {/* Anime tag lists overlay */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 items-center select-none">
            <Tag className="w-3 h-3 text-purple-400 stroke-[2.5]" />
            {tags.map((tag) => (
              <span
                key={tag.id}
                onClick={() => onSelectTag && onSelectTag(tag.title)}
                className="bg-zinc-900 hover:bg-zinc-800 border border-purple-800/20 text-purple-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                {tag.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Responsive action hub buttons bar */}
      <div className="flex items-center gap-5 pt-0.5 select-none">
        <LikeButton
          postId={post.id}
          initialLiked={false} // Like counts updated on mount or synced from Parent if needed
          initialCount={post.likes_count || 0}
          token={token}
          onToast={onToast}
          onLikedStateChange={(nextMatchedLiked) => {
            // Callback to raise notification if useful
          }}
        />

        <button
          onClick={() => onOpenComments(post.id)}
          className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-purple-400 transition-colors cursor-pointer font-mono text-xs font-semibold"
        >
          <MessageCircle className="w-5 h-5 text-zinc-400 group-hover:text-purple-400 transition-colors" />
          <span>{post.comments_count || 0}</span>
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-pink-400 transition-colors cursor-pointer font-mono text-xs font-semibold ml-auto"
          title="Salin Tautan"
        >
          <Share2 className="w-4.5 h-4.5" />
        </button>
      </div>
    </motion.article>
  );
}
