import React, { useState, useRef, useTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Anime } from '../../types/database';
import AnimeTagInput from '../post/AnimeTagInput';
import { ImagePlus, Sparkles, Send, Loader, Trash2, Tag, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreatePostPageProps {
  currentUser: any;
  token: string | null;
  onSuccess: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function CreatePostPage({ currentUser, token, onSuccess, onToast }: CreatePostPageProps) {
  const [caption, setCaption] = useState('');
  const [selectedAnimes, setSelectedAnimes] = useState<Anime[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onToast('Tipe berkas harus format gambar (PNG/JPG/JPEG/GIF).', 'error');
      return;
    }
    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      onToast('Ukuran gambar maksimal adalah 10MB.', 'error');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClearImage = () => {
    startTransition(() => {
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !caption.trim() || publishing || !currentUser) return;

    setPublishing(true);

    try {
      let imageUrl: string | null = null;
      let imagePublicId: string | null = null;

      // 1. Upload to Cloudinary via Express server API (only if an image was attached)
      if (imageFile) {
        onToast('Mengunggah gambar ke Cloudinary...', 'info');

        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await fetch('/api/upload?folder=posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || 'Penyimpanan server gagal.');
        }

        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.public_id;
      }

      onToast('Sinkronisasi database Supabase...', 'info');

      // 2. Insert into POSTS table
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          caption: caption.trim(),
          image_url: imageUrl,
          image_public_id: imagePublicId,
          likes_count: 0,
          comments_count: 0
        })
        .select('*')
        .single();

      if (postError) throw postError;

      // 3. Insert tags into POST_ANIME_TAGS if any are selected
      if (selectedAnimes.length > 0) {
        const tagInserts = selectedAnimes.map((anime) => ({
          post_id: newPost.id,
          anime_id: anime.id
        }));

        const { error: tagError } = await supabase
          .from('post_anime_tags')
          .insert(tagInserts);

        if (tagError) {
          console.error('Failed to insert post anime tags:', tagError.message);
        }
      }

      // 4. Update profiles posts counter
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);

      await supabase
        .from('profiles')
        .update({ posts_count: postsCount || 0 })
        .eq('id', currentUser.id);

      onToast('Postingan anime Anda berhasil terbit! 🌸🚀', 'success');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Gagal menerbitkan postingan.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const isFormValid = caption.trim() && !publishing;

  return (
    <div className="w-full flex flex-col min-h-screen pb-24 select-none">
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 h-[56px] flex items-center justify-between px-4 z-10-none">
        <h2 className="font-bold text-base font-sans tracking-tight text-white flex items-center gap-1.5">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <span>Buat Post Baru</span>
        </h2>
        <span className="text-[10px] uppercase font-bold text-pink-400 font-mono tracking-wider">
          AnikuKomu Creator
        </span>
      </header>

      <div className="p-4 md:p-6 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visual Media Drag and Drop Uploader Area */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">
              Foto Postingan Anime <span className="text-zinc-600">(Opsional)</span>
            </label>

            {imagePreview ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative aspect-[4/5] rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg group"
              >
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/70 hover:bg-rose-500 hover:text-white text-zinc-300 transition-colors shadow-xl cursor-pointer"
                  title="Hapus Gambar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={handleTriggerInput}
                className={`aspect-[4/5] rounded-2xl border-[2px] border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none transition-all duration-200 ${
                  dragActive
                    ? 'border-purple-500 bg-purple-500/5 scale-[0.99]'
                    : 'border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-705'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-[56px] h-[56px] rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-850 text-zinc-400 mb-4 shadow group-hover:scale-105 transition-transform">
                  <ImagePlus className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xs font-bold text-zinc-200">
                  Tarik & lepas gambar di sini, atau klik untuk memilih
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-xs font-mono">
                  Mendukung PNG, JPG, JPEG, GIF (Maks. 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Expanded Caption Textarea input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">
              Caption Postingan
            </label>
            <textarea
              required
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Berikan deskripsi menarik tentang anime ini (cth: Scene episode 12 bener-bener bikin nangis kejer! 😭💔)..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl px-4 py-3 outline-none resize-none transition-all focus:ring-2 focus:ring-purple-500/20 leading-relaxed"
            />
          </div>

          {/* Autocomplete Anime tag input */}
          <AnimeTagInput selectedAnimes={selectedAnimes} onChange={setSelectedAnimes} />

          {/* Submit Action Block */}
          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full py-3.5 rounded-xl font-bold text-center text-xs transition-all duration-300 bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/15 active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {publishing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Menerbitkan Postingan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Terbitkan Post Sekarang</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
