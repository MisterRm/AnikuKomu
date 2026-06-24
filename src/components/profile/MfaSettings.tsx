import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { ShieldCheck, ShieldOff, Loader, KeyRound } from 'lucide-react';

interface MfaSettingsProps {
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function MfaSettings({ onToast }: MfaSettingsProps) {
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [busy, setBusy] = useState(false);

  const loadFactors = async () => {
    setLoadingFactors(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verifiedTotp = data?.totp?.find((f) => f.status === 'verified');
      setActiveFactorId(verifiedTotp?.id || null);
    } catch (err: any) {
      console.error('Error loading MFA factors:', err);
    } finally {
      setLoadingFactors(false);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setPendingFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrolling(true);
    } catch (err: any) {
      onToast(err.message || 'Gagal memulai pengaturan 2FA.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFactorId || verifyCode.trim().length !== 6) return;

    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pendingFactorId,
        code: verifyCode.trim()
      });
      if (error) throw error;

      onToast('Verifikasi 2 langkah berhasil diaktifkan! 🔒', 'success');
      setEnrolling(false);
      setQrSvg(null);
      setSecret(null);
      setVerifyCode('');
      setPendingFactorId(null);
      await loadFactors();
    } catch (err: any) {
      onToast(err.message || 'Kode salah, coba lagi.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (pendingFactorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
      } catch {
        // ignore — best effort cleanup of the abandoned unverified factor
      }
    }
    setEnrolling(false);
    setQrSvg(null);
    setSecret(null);
    setVerifyCode('');
    setPendingFactorId(null);
  };

  const disableMfa = async () => {
    if (!activeFactorId) return;
    if (!window.confirm('Nonaktifkan verifikasi 2 langkah untuk akun ini?')) return;

    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactorId });
      if (error) throw error;
      onToast('Verifikasi 2 langkah dinonaktifkan.', 'info');
      setActiveFactorId(null);
    } catch (err: any) {
      onToast(err.message || 'Gagal menonaktifkan 2FA.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loadingFactors) {
    return (
      <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-900/60 flex items-center justify-center">
        <Loader className="w-4 h-4 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-900/60 space-y-3">
      <div className="flex items-center gap-2">
        {activeFactorId ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <ShieldOff className="w-4 h-4 text-zinc-500 shrink-0" />
        )}
        <div>
          <p className="text-xs font-bold text-zinc-200">Verifikasi 2 Langkah (2FA)</p>
          <p className="text-[10px] text-zinc-500">
            {activeFactorId
              ? 'Aktif — login butuh kode dari aplikasi autentikator.'
              : 'Opsional. Lindungi akun dengan kode tambahan saat login.'}
          </p>
        </div>
      </div>

      {!enrolling && (
        <button
          type="button"
          onClick={activeFactorId ? disableMfa : startEnroll}
          disabled={busy}
          className={`w-full py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
            activeFactorId
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
              : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20'
          }`}
        >
          {busy ? 'Memproses...' : activeFactorId ? 'Nonaktifkan 2FA' : 'Aktifkan 2FA'}
        </button>
      )}

      {enrolling && qrSvg && (
        <div className="space-y-3 pt-2 border-t border-zinc-900/60">
          <p className="text-[10px] text-zinc-400">
            Scan kode QR ini dengan Google Authenticator, Authy, atau aplikasi autentikator lainnya:
          </p>
          <div
            className="bg-white rounded-xl p-3 w-fit mx-auto [&_svg]:w-40 [&_svg]:h-40"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          {secret && (
            <p className="text-[10px] text-zinc-500 text-center break-all">
              Atau masukkan kode manual: <span className="font-mono text-zinc-300">{secret}</span>
            </p>
          )}

          <form onSubmit={confirmEnroll} className="space-y-2 pt-1">
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan kode 6 digit"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEnroll}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy || verifyCode.length !== 6}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-40 transition-all cursor-pointer"
              >
                {busy ? 'Memverifikasi...' : 'Konfirmasi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
