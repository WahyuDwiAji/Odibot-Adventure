import React, { useMemo, useState } from 'react';
import { UserProgress } from '../types/game';
import { getBadgeStatuses, syncUnlockedBadges } from '../data/badges';
import { BADGE_THEME_STYLES, BadgeIcon } from './BadgeIcon';
import { auth } from '../firebase';
import {
  formatDurationMs,
  signInWithGoogleAndSync,
  signOutFromGoogle,
  syncUserProgressAndLeaderboard,
} from '../services/leaderboardService';
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
  Award,
  Lock,
  Cloud,
  User,
  Trophy,
} from 'lucide-react';

interface GoogleCloudSyncModalProps {
  progress: UserProgress;
  onUpdateProgress: (newProgress: UserProgress) => void;
  onOpenLeaderboard?: () => void;
  onClose: () => void;
}

type ModalTab = 'PROFILE' | 'CLOUD';
type BadgeFilter = 'ALL' | 'UNLOCKED' | 'LOCKED';

export const GoogleCloudSyncModal: React.FC<GoogleCloudSyncModalProps> = ({
  progress,
  onUpdateProgress,
  onOpenLeaderboard,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('PROFILE');
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('ALL');
  const [nameInput, setNameInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const user = progress.userProfile;
  const totalCompleted = Object.keys(progress.completedLevels).length;
  const totalStars = Object.values(progress.completedLevels).reduce(
    (acc, lvl) => acc + (lvl.stars || 0),
    0
  );

  const badgeStatuses = useMemo(() => getBadgeStatuses(progress), [progress]);
  const unlockedBadgesCount = useMemo(
    () => badgeStatuses.filter((b) => b.unlocked).length,
    [badgeStatuses]
  );

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'UNLOCKED') return badgeStatuses.filter((b) => b.unlocked);
    if (badgeFilter === 'LOCKED') return badgeStatuses.filter((b) => !b.unlocked);
    return badgeStatuses;
  }, [badgeStatuses, badgeFilter]);

  // Real Firebase Google Sign-In
  const handleGooglePopupSignIn = async () => {
    sounds.playClick();
    setIsSyncing(true);
    setSyncErrorMessage(null);
    try {
      const customName = nameInput.trim();
      const baseProgress = customName
        ? {
            ...progress,
            userProfile: progress.userProfile
              ? { ...progress.userProfile, displayName: customName }
              : undefined,
          }
        : progress;

      const updated = await signInWithGoogleAndSync(baseProgress);
      if (customName && updated.userProfile) {
        updated.userProfile.displayName = customName.slice(0, 40);
        if (auth.currentUser) {
          await syncUserProgressAndLeaderboard(
            auth.currentUser.uid,
            auth.currentUser.email || updated.userProfile.email,
            updated.userProfile.displayName,
            updated
          );
        }
      }

      onUpdateProgress(updated);
      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}

      sounds.playCollect();
      setSyncSuccessMessage(
        `Terhubung ke Firebase & Google (${updated.userProfile?.email || 'Akun Google'})!`
      );
      setTimeout(() => setSyncSuccessMessage(null), 3500);
    } catch {
      setSyncErrorMessage('Proses masuk Google dibatalkan atau gagal. Silakan coba lagi.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger manual Firestore cloud & leaderboard sync
  const handleSyncNow = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      await handleGooglePopupSignIn();
      return;
    }

    sounds.playClick();
    setIsSyncing(true);
    setSyncErrorMessage(null);

    try {
      const nowStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const displayName =
        nameInput.trim() ||
        user?.displayName ||
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'Penjelajah Odibot';

      const nextUserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || user?.email || '',
        displayName: displayName.slice(0, 40),
        avatarUrl: firebaseUser.photoURL || user?.avatarUrl,
        lastSynced: nowStr,
      };

      const updated: UserProgress = {
        ...progress,
        userProfile: nextUserProfile,
      };

      await syncUserProgressAndLeaderboard(
        firebaseUser.uid,
        nextUserProfile.email,
        nextUserProfile.displayName,
        updated
      );

      onUpdateProgress(updated);
      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}

      sounds.playVictory();
      setSyncSuccessMessage(
        `Progres, lencana, & rekor papan peringkat tersinkron ke Firebase pada ${nowStr}!`
      );
      setTimeout(() => setSyncSuccessMessage(null), 3500);
    } catch {
      setSyncErrorMessage('Gagal menyinkronkan data ke Firebase. Periksa koneksi internetmu.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    sounds.playClick();
    setSyncErrorMessage(null);
    try {
      const updated = await signOutFromGoogle(progress);
      onUpdateProgress(updated);
      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}
      setSyncSuccessMessage('Akun Google berhasil dikeluarkan.');
      setTimeout(() => setSyncSuccessMessage(null), 2500);
    } catch {
      setSyncErrorMessage('Gagal keluar dari akun Google.');
    }
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
        const { unlockedBadges } = syncUnlockedBadges(parsed.progress);
        const hydratedProgress: UserProgress = {
          ...parsed.progress,
          unlockedBadges,
        };
        onUpdateProgress(hydratedProgress);
        try {
          localStorage.setItem('kodibot_progress', JSON.stringify(hydratedProgress));
        } catch {}
        sounds.playVictory();
        setSyncSuccessMessage('Data koding & lencana berhasil dipulihkan dari kode cadangan!');
        setShowImportBox(false);
        setImportCodeInput('');
        setTimeout(() => setSyncSuccessMessage(null), 3500);
      } else {
        setImportError('Format kode cadangan tidak valid.');
      }
    } catch {
      setImportError('Kode cadangan rusak atau salah format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/92 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92dvh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0 text-slate-950">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold font-display text-white truncate">
                Profil Pengguna &amp; Lencana Prestasi
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Pencapaian milestone koding &amp; sinkronisasi Google Cloud
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 bg-slate-950/50 border-b border-slate-800 shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('PROFILE');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PROFILE'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Profil &amp; Lencana ({unlockedBadgesCount}/{badgeStatuses.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('CLOUD');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CLOUD'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{user ? 'Google Cloud ✓' : 'Masuk Google & Cadangan'}</span>
          </button>
        </div>

        {/* Sync Success Toast */}
        {syncSuccessMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-1 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMessage}</span>
          </div>
        )}

        {syncErrorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2 animate-in slide-in-from-top-1 shrink-0">
            <X className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{syncErrorMessage}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB 1: PROFILE & ACHIEVEMENT BADGES */}
          {activeTab === 'PROFILE' && (
            <>
              {/* Profile Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shrink-0 shadow-md flex items-center justify-center">
                    {user ? (
                      <img
                        src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                        alt={user.displayName}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="w-full h-full rounded-[10px] bg-slate-900 object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center text-cyan-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">
                        {user ? user.displayName : 'Penjelajah Odibot'}
                      </span>
                      {user ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Tersambung
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                          Penyimpanan Lokal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono block truncate">
                      {user ? user.email : 'Progres tersimpan di perangkat ini'}
                    </span>
                  </div>
                </div>

                {onOpenLeaderboard && (
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onClose();
                      onOpenLeaderboard();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Papan Peringkat</span>
                  </button>
                )}

                {!user && (
                  <button
                    onClick={() => {
                      sounds.playClick();
                      setActiveTab('CLOUD');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hubungkan Google</span>
                  </button>
                )}
              </div>

              {/* 4-Column Progress Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block mb-0.5">Misi Selesai</span>
                  <span className="text-base sm:text-lg font-bold text-cyan-400 font-mono tabular-nums">
                    {totalCompleted}/64
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block mb-0.5">Total Bintang</span>
                  <span className="text-base sm:text-lg font-bold text-amber-400 font-mono tabular-nums">
                    ⭐ {totalStars}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block mb-0.5">Lencana Terbuka</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono tabular-nums">
                    🏅 {unlockedBadgesCount}/{badgeStatuses.length}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block mb-0.5">Rekor Tercepat</span>
                  <span className="text-base sm:text-lg font-bold text-sky-300 font-mono tabular-nums">
                    ⚡ {formatDurationMs(progress.stats?.fastestMissionMs)}
                  </span>
                </div>
              </div>

              {/* Badges Filter Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Koleksi Lencana Prestasi</span>
                </h3>

                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                  {(
                    [
                      { id: 'ALL', label: `Semua (${badgeStatuses.length})` },
                      { id: 'UNLOCKED', label: `Terbuka (${unlockedBadgesCount})` },
                      {
                        id: 'LOCKED',
                        label: `Terkunci (${badgeStatuses.length - unlockedBadgesCount})`,
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        sounds.playClick();
                        setBadgeFilter(f.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        badgeFilter === f.id
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {filteredBadges.map((badge) => {
                  const theme = BADGE_THEME_STYLES[badge.theme];
                  return (
                    <div
                      key={badge.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        badge.unlocked
                          ? `${theme.unlockedCard} shadow-md`
                          : 'bg-slate-950/60 border-slate-800/90 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow ${
                            badge.unlocked
                              ? theme.iconBg
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {badge.unlocked ? (
                            <BadgeIcon name={badge.icon} className="w-5 h-5" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate ${
                                badge.unlocked ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {badge.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                badge.unlocked
                                  ? theme.pillClass
                                  : 'bg-slate-800/90 text-slate-400 border-slate-700'
                              }`}
                            >
                              {badge.unlocked ? 'Terbuka ✓' : `${badge.current}/${badge.target}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-1">
                            {badge.description}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              badge.unlocked ? theme.barColor : 'bg-slate-600'
                            }`}
                            style={{ width: `${badge.percent}%` }}
                          />
                        </div>
                        {badge.unlocked && badge.unlockedAt && (
                          <div className="text-[10px] text-slate-400 font-mono text-right">
                            Diraih:{' '}
                            {new Date(badge.unlockedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredBadges.length === 0 && (
                  <div className="sm:col-span-2 py-8 text-center text-xs text-slate-400 bg-slate-950/40 border border-slate-800 rounded-xl">
                    Belum ada lencana pada kategori ini. Terus selesaikan misi untuk membukanya!
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: GOOGLE CLOUD ACCOUNT & BACKUP */}
          {activeTab === 'CLOUD' && (
            <>
              {user ? (
                <div className="space-y-4">
                  {/* Profile Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-700/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{user.displayName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Tersambung
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono block truncate">{user.email}</span>
                        {user.lastSynced && (
                          <p className="text-[11px] text-cyan-400/90 mt-0.5">
                            Terakhir sinkron: {user.lastSynced}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSignOut}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
                      title="Keluar / Ganti Akun"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sync Action Button */}
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
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-left space-y-2">
                    <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span>Keuntungan Masuk dengan Google:</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>Progres bintang, level, &amp; lencana prestasi tersimpan aman di Firebase Firestore.</li>
                      <li>Rekor waktu tercepat dan koleksi lencanamu otomatis masuk ke Papan Peringkat.</li>
                      <li>Lanjutkan tantangan koding di perangkat mana saja tanpa kehilangan data.</li>
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={40}
                      placeholder="Nama Tampilan di Papan Peringkat (Opsional)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />

                    <button
                      onClick={handleGooglePopupSignIn}
                      disabled={isSyncing}
                      className="w-full py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-3 border border-slate-200 disabled:opacity-50"
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
                      <span>{isSyncing ? 'Menghubungkan ke Google...' : 'Masuk dengan Akun Google'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BACKUP & RESTORE TOOLS */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
