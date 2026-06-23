import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Flame, Mail, Lock, Eye, EyeOff, Loader, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onSuccess: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function LoginPage({ onNavigateToRegister, onSuccess, onToast }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        throw error;
      }

      onToast('Selamat datang kembali di AnikuKomu! 🌸', 'success');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Email atau password salah.', 'error');
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
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4 animate-pulse">
          <Flame className="w-7 h-7 text-white stroke-[2.5]" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-pink-500 bg-clip-text text-transparent">
          AnikuKomu
        </h2>
        <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider font-mono mt-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Komunitas Anime Indonesia
        </span>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email input field */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
            Email Pos
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
              className="w-full bg-zinc-850 border border-zinc-800 focus:border-purple-500 rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/10"
            />
          </div>
        </div>

        {/* Password input field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              Kata Sandi
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-zinc-850 border border-zinc-800 focus:border-purple-500 rounded-xl pl-10 pr-11 py-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/10"
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

        {/* Action buttons */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-center text-xs transition-all duration-300 bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/10 active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Menghubungkan Sesi...</span>
            </>
          ) : (
            <span>Masuk Sekarang</span>
          )}
        </button>
      </form>

      {/* Alternative footer helper link */}
      <div className="text-center mt-6">
        <p className="text-xs text-zinc-500">
          Belum punya akun?{' '}
          <button
            onClick={onNavigateToRegister}
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer underline"
          >
            Daftar Gratis
          </button>
        </p>
      </div>
    </motion.div>
  );
}
