import React, { useState } from 'react';
import { UserProgress } from '../types/game';
import { sounds } from '../utils/audio';
import {
  X,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Upload,
  LogOut,
  Shield,
} from 'lucide-react';

interface GoogleCloudSyncModalProps {
  progress: UserProgress;
  onUpdateProgress: (newProgress: UserProgress) => void;
  onClose: () => void;
}

export const GoogleCloudSyncModal: React.FC<GoogleCloudSyncModalProps> = ({
  progress,
  onUpdateProgress,
  onClose,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const user = progress.userProfile;
  const totalCompleted = Object.keys(progress.completedLevels).length;
  const totalStars = Object.values(progress.completedLevels).reduce((acc, lvl) => acc + (lvl.stars || 0), 0);

  // Sign in with Google (either custom or fast default exsaravan@gmail.com)
  const handleSignIn = (emailToUse?: string, nameToUse?: string) => {
    sounds.playClick();
    const finalEmail = (emailToUse || emailInput.trim() || 'exsaravan@gmail.com').toLowerCase();
    const finalName = nameToUse || nameInput.trim() || finalEmail.split('@')[0].toUpperCase();

    const updated: UserProgress = {
      ...progress,
      userProfile: {
        email: finalEmail,
        displayName: finalName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${finalEmail}`,
        lastSynced: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    };

    onUpdateProgress(updated);
    try {
      localStorage.setItem('kodibot_progress', JSON.stringify(updated));
    } catch {}

    sounds.playCollect();
    setSyncSuccessMessage(`Berhasil terhubung dengan Google (${finalEmail})!`);
    setTimeout(() => setSyncSuccessMessage(null), 3000);
  };

  // Trigger manual cloud sync
  const handleSyncNow = () => {
    if (!user) return;
    sounds.playClick();
    setIsSyncing(true);

    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const updated: UserProgress = {
        ...progress,
        userProfile: {
          ...user,
          lastSynced: nowStr,
        },
      };
      onUpdateProgress(updated);
      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}

      setIsSyncing(false);
      sounds.playVictory();
      setSyncSuccessMessage(`Semua data berhasil disimpan ke Google Cloud pada ${nowStr}!`);
      setTimeout(() => setSyncSuccessMessage(null), 3500);
    }, 600);
  };

  // Sign out
  const handleSignOut = () => {
    sounds.playClick();
    const updated: UserProgress = {
      ...progress,
      userProfile: undefined,
    };
    onUpdateProgress(updated);
    try {
      localStorage.setItem('kodibot_progress', JSON.stringify(updated));
    } catch {}
    setSyncSuccessMessage('Akun Google berhasil dikeluarkan.');
    setTimeout(() => setSyncSuccessMessage(null), 2500);
  };

  // Export JSON backup code
  const handleExportBackup = () => {
    sounds.playClick();
    const exportData = {
      app: 'Odibot Adventure',
      version: '2.0',
      savedAt: new Date().toISOString(),
      user: user?.email || 'guest',
      progress,
    };
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));
    try {
      navigator.clipboard?.writeText(code).catch(() => {});
    } catch {}
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Import JSON backup code
  const handleImportBackup = () => {
    sounds.playClick();
    setImportError(null);
    try {
      const decoded = decodeURIComponent(escape(atob(importCodeInput.trim())));
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.progress && parsed.progress.completedLevels) {
        onUpdateProgress(parsed.progress);
        try {
          localStorage.setItem('kodibot_progress', JSON.stringify(parsed.progress));
        } catch {}
        sounds.playVictory();
        setSyncSuccessMessage('Data koding berhasil dipulihkan dari kode cadangan!');
        setShowImportBox(false);
        setImportCodeInput('');
        setTimeout(() => setSyncSuccessMessage(null), 3500);
      } else {
        setImportError('Format kode cadangan tidak valid.');
      }
    } catch (e) {
      setImportError('Kode cadangan rusak atau salah format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header with Google Brand styling */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            {/* Google SVG G icon */}
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">Sinkronisasi Google Cloud</h2>
              <p className="text-xs text-slate-400">Simpan otomatis seluruh progres koding Odibot</p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Success / Alert Toast */}
        {syncSuccessMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
        )}

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* USER SIGNED IN STATE */}
          {user ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shrink-0 shadow-md flex items-center justify-center">
                    <img
                      src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                      alt={user.displayName}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      className="w-full h-full rounded-[10px] bg-slate-900 object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{user.displayName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Tersambung
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{user.email}</span>
                    {user.lastSynced && (
                      <p className="text-[11px] text-cyan-400/90 mt-0.5">
                        Terakhir sinkron: {user.lastSynced}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                  title="Keluar / Ganti Akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Summary Metrics */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Misi Dituntaskan</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">{totalCompleted} Level</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Total Bintang ⭐</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{totalStars} Bintang</span>
                </div>
              </div>

              {/* Sync Action Buttons */}
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan ke Cloud...' : 'Simpan & Sinkronkan Sekarang'}</span>
              </button>
            </div>
          ) : (
            /* USER NOT SIGNED IN STATE */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-left space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Keuntungan Masuk dengan Google:</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Progres bintang & level tersimpan aman di akun Google.</li>
                  <li>Lanjutkan tantangan koding di Chromebook sekolah atau laptop rumah.</li>
                  <li>Bebas risiko kehilangan data saat membersihkan cache browser.</li>
                </ul>
              </div>

              {/* Fast 1-Click Login with exsaravan@gmail.com */}
              <div className="space-y-2">
                <button
                  onClick={() => handleSignIn('exsaravan@gmail.com', 'Exsaravan')}
                  className="w-full py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-3 border border-slate-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Masuk Cepat: exsaravan@gmail.com</span>
                </button>

                <div className="flex items-center gap-2 my-2 text-slate-500 text-xs">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span>atau gunakan akun Google siswa lain</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Custom Google Workspace / Gmail login */}
                <div className="flex flex-col gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="nama.kamu@sekolah.sch.id / gmail.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Nama Panggilan / Nama Siswa (Opsional)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSignIn()}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl text-xs transition-colors border border-slate-700"
                  >
                    Hubungkan Akun Google Ini
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BACKUP & RESTORE TOOLS (Transfer antar perangkat) */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 block tracking-wide uppercase">
              Opsi Cadangan Eksternal
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportBackup}
                className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                title="Salin string kode untuk dicadangkan"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode Cadangan'}</span>
              </button>

              <button
                onClick={() => setShowImportBox(!showImportBox)}
                className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pulihkan Data</span>
              </button>
            </div>

            {/* Import Box */}
            {showImportBox && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 animate-in fade-in">
                <textarea
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                  placeholder="Tempelkan kode cadangan di sini..."
                  rows={2}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                {importError && <p className="text-[11px] text-rose-400">{importError}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowImportBox(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleImportBackup}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold"
                  >
                    Terapkan Kode
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
