import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Post, Anime } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import LikeButton from '../post/LikeButton';
import { formatDate } from '../../lib/utils';
import { MessageCircle, Share2, Trash2, Tag, Loader, Info } from 'lucide-react';
import { motion } from 'motion/react';
import AnimeDetailPopup from './AnimeDetailPopup';

interface PostCardProps {
  key?: any;
  post: Post;
  currentUser: any;
  token: string | null;
  initialLiked?: boolean;
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
  initialLiked = false,
  onOpenComments,
  onPostDeleted,
  onToast,
  onNavigateToUser,
  onSelectTag
}: PostCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandCaption, setExpandCaption] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  const author = post.profiles || {
    username: 'wibu_member',
    display_name: 'Aniku Member',
    avatar_url: null
  };

  const isOwner = currentUser && post.user_id === currentUser.id;
  const tags = (post.animes as unknown as Anime[]) || [];

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus postingan anime ini?')) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('posts').delete()
        .eq('id', post.id).eq('user_id', currentUser.id);
      if (deleteError) throw deleteError;

      if (post.image_public_id && token) {
        fetch('/api/post/cleanup-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ public_id: post.image_public_id })
        }).catch(() => {});
      }

      onToast('Postingan berhasil dihapus!', 'success');
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      onToast(err.message || 'Error menghapus postingan.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(`${window.location.origin}/#post/${post.id}`);
      onToast('Link berhasil disalin!', 'success');
    } catch {
      onToast('Gagal menyalin link.', 'error');
    }
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
        className="p-4 md:p-5 border-b border-zinc-900/60 bg-zinc-950 flex flex-col gap-3.5 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => onNavigateToUser(author.username)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <Avatar src={author.avatar_url} name={author.username} size="sm" />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-zinc-100 group-hover:underline truncate leading-snug">
                {author.display_name || author.username}
              </h4>
              <p className="text-[10px] text-zinc-500 font-mono truncate">@{author.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 select-none">
            <span className="text-[10px] text-zinc-500 font-mono">{formatDate(post.created_at)}</span>
            {isOwner && (
              <button
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
              >
                {isDeleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Image */}
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

            {/* Anime tags overlay di atas gambar */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 flex flex-col justify-end gap-1.5 z-10">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 select-none items-center">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnime(tag);
                      }}
                      className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-purple-500/50 text-purple-200 text-[9px] tracking-wider uppercase font-extrabold px-2.5 py-1 rounded-full cursor-pointer hover:bg-purple-800/60 active:scale-95 transition-all"
                    >
                      {tag.cover_url && (
                        <img src={tag.cover_url} alt="" className="w-3.5 h-4.5 rounded object-cover" referrerPolicy="no-referrer" />
                      )}
                      #{tag.title}
                      <Info className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
              <span className="bg-zinc-950/90 backdrop-blur-md text-[10px] uppercase tracking-widest font-extrabold text-zinc-100 px-4 py-2 rounded-full border border-[#27272a] shadow-lg">
                Klik Untuk Diskusi
              </span>
            </div>
          </div>
        )}

        {/* Caption */}
        <div className="space-y-2">
          {post.caption && (
            <p className="text-xs text-zinc-300 leading-relaxed">
              <span
                onClick={() => onNavigateToUser(author.username)}
                className="font-bold text-zinc-100 mr-2 hover:underline cursor-pointer"
              >
                @{author.username}
              </span>
              {expandCaption ? post.caption : `${post.caption.slice(0, 110)}`}
              {post.caption.length > 110 && !expandCaption && (
                <button onClick={(e) => { e.stopPropagation(); setExpandCaption(true); }}
                  className="text-purple-400 text-[11px] font-bold ml-1.5 underline cursor-pointer">
                  selengkapnya
                </button>
              )}
              {expandCaption && (
                <button onClick={(e) => { e.stopPropagation(); setExpandCaption(false); }}
                  className="text-purple-400 text-[11px] font-bold ml-1.5 underline cursor-pointer">
                  sembunyikan
                </button>
              )}
            </p>
          )}

          {/* Anime tag chips bawah caption — klik buka detail */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 items-center select-none">
              <Tag className="w-3 h-3 text-purple-400 stroke-[2.5]" />
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedAnime(tag)}
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-purple-800/20 text-purple-300 text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 hover:border-purple-500/50"
                >
                  {tag.cover_url && (
                    <img src={tag.cover_url} alt="" className="w-3 h-4 rounded object-cover" referrerPolicy="no-referrer" />
                  )}
                  {tag.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-5 pt-0.5 select-none">
          <LikeButton
            postId={post.id}
            initialLiked={initialLiked}
            initialCount={post.likes_count || 0}
            token={token}
            onToast={onToast}
            onLikedStateChange={() => {}}
          />
          <button
            onClick={() => onOpenComments(post.id)}
            className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-purple-400 transition-colors cursor-pointer font-mono text-xs font-semibold"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{post.comments_count || 0}</span>
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-pink-400 transition-colors cursor-pointer font-mono text-xs font-semibold ml-auto"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </motion.article>

      {/* Anime Detail Popup */}
      {selectedAnime && (
        <AnimeDetailPopup
          anime={selectedAnime}
          onClose={() => setSelectedAnime(null)}
        />
      )}
    </>
  );
}
