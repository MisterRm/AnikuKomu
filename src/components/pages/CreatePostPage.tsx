import React, { useState, useRef, useTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import AnimeTagInput from '../post/AnimeTagInput';
import { ImagePlus, Send, Loader, Trash2, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface JikanAnime {
  id?: string;
  mal_id: number;
  title: string;
  cover_url: string | null;
  genre: string[];
  score?: number;
  episodes?: number;
  synopsis?: string;
  status?: string;
  year?: number;
}

interface CreatePostPageProps {
  currentUser: any;
  token: string | null;
  onSuccess: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function CreatePostPage({ currentUser, token, onSuccess, onToast }: CreatePostPageProps) {
  const [caption, setCaption] = useState('');
  const [selectedAnimes, setSelectedAnimes] = useState<JikanAnime[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onToast('Tipe berkas harus format gambar (PNG/JPG/JPEG/GIF).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onToast('Ukuran gambar maksimal adalah 10MB.', 'error');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    startTransition(() => {
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  // Upsert anime ke Supabase, return id-nya
  const upsertAnimeAndGetId = async (anime: JikanAnime): Promise<string | null> => {
    try {
      // Upsert by mal_id
      const { data, error } = await supabase
        .from('animes')
        .upsert({
          mal_id: anime.mal_id,
          title: anime.title,
          cover_url: anime.cover_url,
          genre: anime.genre || [],
        }, { onConflict: 'mal_id' })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (err) {
      console.error('Failed to upsert anime:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !caption.trim() || publishing || !currentUser) return;

    setPublishing(true);

    try {
      let imageUrl: string | null = null;
      let imagePublicId: string | null = null;

      // 1. Upload gambar ke Cloudinary
      if (imageFile) {
        onToast('Mengunggah gambar...', 'info');
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await fetch('/api/upload?folder=posts', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Upload gagal.');
        }

        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.url;
        imagePublicId = uploadResult.public_id;
      }

      onToast('Menyimpan postingan...', 'info');

      // 2. Insert post
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

      // 3. Upsert setiap anime ke Supabase dulu → dapatkan id → insert ke post_anime_tags
      if (selectedAnimes.length > 0) {
        const animeIds = await Promise.all(
          selectedAnimes.map((anime) => upsertAnimeAndGetId(anime))
        );

        const validIds = animeIds.filter((id): id is string => id !== null);

        if (validIds.length > 0) {
          const tagInserts = validIds.map((anime_id) => ({
            post_id: newPost.id,
            anime_id,
          }));

          const { error: tagError } = await supabase
            .from('post_anime_tags')
            .insert(tagInserts);

          if (tagError) console.error('Tag insert error:', tagError.message);
        }
      }

      onToast('Postingan berhasil terbit! 🎌🚀', 'success');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Gagal menerbitkan postingan.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen pb-24 select-none">
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 h-[56px] flex items-center justify-between px-4 z-10">
        <h2 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <span>Buat Post Baru</span>
        </h2>
        <span className="text-[10px] uppercase font-bold text-pink-400 font-mono tracking-wider">
          AnikuKomu Creator
        </span>
      </header>

      <div className="p-4 md:p-6 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload area */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">
              Foto Postingan <span className="text-zinc-600">(Opsional)</span>
            </label>

            {imagePreview ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative aspect-[4/5] rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg"
              >
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/70 hover:bg-rose-500 text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-[4/5] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
                  dragActive
                    ? 'border-purple-500 bg-purple-500/5 scale-[0.99]'
                    : 'border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-600'
                }`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-4">
                  <ImagePlus className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xs font-bold text-zinc-200">Tarik & lepas gambar di sini, atau klik untuk memilih</h3>
                <p className="text-[10px] text-zinc-500 mt-1 font-mono">Mendukung PNG, JPG, JPEG, GIF (Maks. 10MB)</p>
              </div>
            )}
          </div>

          {/* Caption */}
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

          {/* Anime tag */}
          <AnimeTagInput selectedAnimes={selectedAnimes as any} onChange={setSelectedAnimes as any} token={token} />

          {/* Submit */}
          <button
            type="submit"
            disabled={!caption.trim() || publishing}
            className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/15 active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-4 transition-all duration-300"
          >
            {publishing ? (
              <><Loader className="w-4 h-4 animate-spin" /><span>Menerbitkan...</span></>
            ) : (
              <><Send className="w-4 h-4" /><span>Terbitkan Post Sekarang</span></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
