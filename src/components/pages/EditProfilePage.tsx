import React, { useState, useRef, useTransition } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Profile } from '../../types/database';
import { Avatar } from '../ui/Avatar';
import { Save, ChevronLeft, Camera, Loader, Share2, Globe, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface EditProfilePageProps {
  currentProfile: Profile | null;
  token: string | null;
  onSuccess: () => void;
  onBack: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onRefreshProfile: () => Promise<void>;
}

export default function EditProfilePage({
  currentProfile,
  token,
  onSuccess,
  onBack,
  onToast,
  onRefreshProfile
}: EditProfilePageProps) {
  const [displayName, setDisplayName] = useState(currentProfile?.display_name || '');
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [websiteUrl, setWebsiteUrl] = useState(currentProfile?.website_url || '');
  const [twitterUrl, setTwitterUrl] = useState(currentProfile?.twitter_url || '');
  const [instagramUrl, setInstagramUrl] = useState(currentProfile?.instagram_url || '');
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentProfile?.avatar_url || null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !currentProfile) return;

    if (file.size > 5 * 1024 * 1024) {
      onToast('Ukuran avatar maksimal adalah 5MB.', 'error');
      return;
    }

    setAvatarUploading(true);
    onToast('Mengunggah foto profil ke Cloudinary...', 'info');

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Upload to Cloudinary via server API
      const res = await fetch('/api/upload?folder=profiles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Gagal mengunggah foto profil.');
      }

      const uploadData = await res.json();
      
      // Update locally immediately
      startTransition(() => {
        setAvatarPreview(uploadData.url);
      });

      // Commit changes immediately to database for profiles table avatar_url
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: uploadData.url })
        .eq('id', currentProfile.id);

      if (dbError) throw dbError;

      onToast('Foto profil berhasil diunggah!', 'success');
      await onRefreshProfile();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Error mengunggah foto profil.', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentProfile || saving) return;

    setSaving(true);
    try {
      const payload = {
        display_name: displayName.trim(),
        bio: bio.trim(),
        website_url: websiteUrl.trim(),
        twitter_url: twitterUrl.trim().replace(/^@/, ''), // clean Twitter prefix handles
        instagram_url: instagramUrl.trim().replace(/^@/, ''), // clean Instagram handle prefix characters
        avatar_url: avatarPreview,
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', currentProfile.id);

      if (error) throw error;

      onToast('Profil AnikuKomu Anda berhasil disimpan! ✨', 'success');
      await onRefreshProfile();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Gagal menyimpan perubahan profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen pb-24 select-none">
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 h-[56px] flex items-center px-4 z-10 gap-3 select-none">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div>
          <h2 className="font-bold text-sm font-sans tracking-tight text-white leading-none">
            Ubah Profil
          </h2>
          <span className="text-[10px] text-zinc-500 font-mono">
            Atur identitas kartu otaku anda
          </span>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-sm mx-auto w-full">
        <form onSubmit={handleSaveChanges} className="space-y-6">
          {/* Avatar editable section widget */}
          <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/40 rounded-3xl border border-zinc-900/60 relative">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar
                src={avatarPreview}
                name={currentProfile?.username}
                className="w-20 h-20 ring-4 ring-purple-500/20 group-hover:opacity-75 transition-all shadow-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-zinc-200" />
              </div>

              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 rounded-full z-10">
                  <Loader className="w-5 h-5 text-purple-400 animate-spin" />
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={handleAvatarClick}
              className="mt-3 text-[10px] font-bold text-purple-400 uppercase tracking-wider hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ubah Foto Profil</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Display name input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">
                Nama Pengenal Display
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="cth: Ryuzaki Megumi"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Bio input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">
                Bio / Moto Wibu Anda
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ceritakan anime favoritmu atau role sasis-mu (cth: Frieren stan & Cosplayer magang)..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl px-4 py-3 outline-none resize-none transition-all focus:ring-2 focus:ring-purple-500/20 leading-relaxed"
              />
            </div>

            {/* Website links input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Alamat Situs Web</span>
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://anidb.net"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Twitter handle input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Username X / Twitter</span>
              </label>
              <input
                type="text"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="@megumi_chann"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Instagram handle input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>Instagram Username</span>
              </label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="megumi.kosplay"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving || avatarUploading}
            className="w-full py-3.5 rounded-xl font-bold text-center text-xs transition-all duration-300 bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/15 active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Amankan & Simpan Profil</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
