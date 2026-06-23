import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Flame, Mail, Lock, Eye, EyeOff, Loader, Sparkles, User } from 'lucide-react';
import { motion } from 'motion/react';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
  onSuccess: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function RegisterPage({ onNavigateToLogin, onSuccess, onToast }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !email.trim() || !password.trim() || loading) return;

    if (cleanUsername.length < 3) {
      onToast('Username minimal 3 karakter.', 'error');
      return;
    }

    if (password.length < 6) {
      onToast('Kata sandi minimal 6 karakter.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking username existence:', checkError.message);
      }

      if (existingUser) {
        onToast('Username ini sudah terdaftar. Silakan pilih username lain!', 'error');
        setLoading(false);
        return;
      }

      // 2. Register via Supabase Auth
      // Username/display name go into user_metadata so they survive even if
      // the profile row can't be created yet (e.g. RLS blocks it pre-confirmation).
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            username: cleanUsername,
            display_name: username.trim(),
          },
        },
      });

      if (authError) throw authError;

      const registeredUser = authData.user;
      if (!registeredUser) {
        throw new Error('Gagal mendaftarkan akun. Silakan periksa kembali email Anda.');
      }

      // 3. Try creating the profile row right away. If email confirmation is
      // required, there's no active session yet and this will be blocked by
      // RLS — that's expected. useAuth will create the profile automatically
      // from user_metadata the first time the user actually logs in.
      if (authData.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: registeredUser.id,
            username: cleanUsername,
            display_name: username.trim(),
            avatar_url: null,
            bio: 'Penggemar Anime Nusantara 🇮🇩',
            followers_count: 0,
            following_count: 0,
            posts_count: 0
          });

        if (profileError) {
          console.error('Failed writing user profile, retrying lookup:', profileError.message);
        }
      }

      if (!authData.session) {
        onToast('Pendaftaran berhasil! Cek email kamu untuk konfirmasi sebelum login. 📧', 'success');
      } else {
        onToast('Pendaftaran akun berhasil! Selamat datang di AnikuKomu! 🎉', 'success');
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Gagal mendaftarkan akun baru.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="max-w-sm w-full bg-zinc-900/60 border border-zinc-900 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative select-none"
    >
      {/* Brand logo header */}
      <div className="flex flex-col items-center justify-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3 animate-pulse">
          <Flame className="w-7 h-7 text-white stroke-[2.5]" />
        </div>
        <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-pink-500 bg-clip-text text-transparent">
          Gabung AnikuKomu
        </h2>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono mt-0.5">
          Daftar akun baru Anda sekarang
        </span>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Username input */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
            Username Wibu
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))} // No space allowed
              placeholder="pilih_nama_wibu"
              className="w-full bg-zinc-850 border border-zinc-800 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/10"
            />
          </div>
        </div>

        {/* Email input field */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
            Email Terdaftar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-zinc-850 border border-zinc-800 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/10"
            />
          </div>
        </div>

        {/* Password input */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
            Password Unik
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min. 6 karakter"
              className="w-full bg-zinc-850 border border-zinc-800 focus:border-purple-500 rounded-xl pl-10 pr-11 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-center text-xs transition-all duration-300 bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/10 active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Membuat Akun Wibu...</span>
            </>
          ) : (
            <span>Mulai Petualangan</span>
          )}
        </button>
      </form>

      {/* Alternative links */}
      <div className="text-center mt-5">
        <p className="text-xs text-zinc-500">
          Sudah terdaftar?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer underline"
          >
            Masuk Saja
          </button>
        </p>
      </div>
    </motion.div>
  );
}
