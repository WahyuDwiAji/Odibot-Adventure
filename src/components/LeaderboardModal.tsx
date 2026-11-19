import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
  fetchLeaderboardOnce,
  formatDurationMs,
  getLeaderboardMetrics,
  signInWithGoogleAndSync,
  subscribeLeaderboard,
  syncUserProgressAndLeaderboard,
} from '../services/leaderboardService';
import {
  LeaderboardEntry,
  LeaderboardSortMode,
  RobotSkinId,
  UserProgress,
} from '../types/game';
import { sounds } from '../utils/audio';
import {
  Award,
  Bot,
  Crown,
  Medal,
  RefreshCw,
  Star,
  Timer,
  Trophy,
  X,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface LeaderboardModalProps {
  progress: UserProgress;
  onUpdateProgress: (newProgress: UserProgress) => void;
  onClose: () => void;
}

const SKIN_BADGE_CLASS: Record<RobotSkinId, string> = {
  CYAN: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300',
  NEON_VOLT: 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300',
  CYBER_PINK: 'bg-pink-500/20 border-pink-400/50 text-pink-300',
  EMERALD: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
  GOLDEN: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  progress,
  onUpdateProgress,
  onClose,
}) => {
  const [sortMode, setSortMode] = useState<LeaderboardSortMode>('BADGES');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUid = auth.currentUser?.uid || progress.userProfile?.uid;
  const localMetrics = useMemo(() => getLeaderboardMetrics(progress), [progress]);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    const unsubscribe = subscribeLeaderboard(
      sortMode,
      (rows) => {
        setEntries(rows);
        setIsLoading(false);
      },
      () => {
        setErrorMessage(
          'Gagal memuat data papan peringkat dari Firebase. Periksa koneksi internetmu lalu muat ulang.'
        );
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [sortMode]);

  const handleManualRefresh = useCallback(async () => {
    sounds.playClick();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchLeaderboardOnce(sortMode);
      setEntries(rows);
    } catch {
      setErrorMessage('Tidak dapat memperbarui data Firebase saat ini.');
    } finally {
      setIsLoading(false);
    }
  }, [sortMode]);

  const handleGoogleLoginAndPublish = async () => {
    sounds.playClick();
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const updated = await signInWithGoogleAndSync(progress);
      onUpdateProgress(updated);
      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}
      sounds.playCollect();
      setToastMessage('Akun Google terhubung & skor berhasil dikirim ke papan peringkat!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setErrorMessage(
        'Proses masuk Google dibatalkan atau gagal. Silakan coba lagi.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePublishMyScore = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      await handleGoogleLoginAndPublish();
      return;
    }

    sounds.playClick();
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      await syncUserProgressAndLeaderboard(
        firebaseUser.uid,
        firebaseUser.email || progress.userProfile?.email || '',
        progress.userProfile?.displayName ||
          firebaseUser.displayName ||
          'Penjelajah Odibot',
        progress
      );
      sounds.playCollect();
      setToastMessage('Skor & rekor terbaru kamu berhasil diperbarui di Firebase!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setErrorMessage('Gagal mengirim skor terbaru ke Firebase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const myRankIndex = useMemo(
    () => (currentUid ? entries.findIndex((e) => e.uid === currentUid) : -1),
    [entries, currentUid]
  );

  const topThree = entries.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/92 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92dvh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0 text-slate-950">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold font-display text-white truncate">
                Papan Peringkat Odibot
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Peringkat langsung Firebase Firestore · Kolektor Lencana &amp; Misi Tercepat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white transition-colors disabled:opacity-50"
              title="Muat Ulang Peringkat"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sort Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-slate-950/50 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                sounds.playClick();
                setSortMode('BADGES');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
                sortMode === 'BADGES'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Terbanyak Lencana</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setSortMode('SPEED');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
                sortMode === 'SPEED'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Misi Tercepat</span>
            </button>
          </div>

          <button
            onClick={handlePublishMyScore}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
            <span>
              {auth.currentUser
                ? isSyncing
                  ? 'Mengirim...'
                  : 'Perbarui Skorku'
                : isSyncing
                ? 'Menghubungkan...'
                : 'Masuk Google & Kirim Skor'}
            </span>
          </button>
        </div>

        {/* Notifications */}
        {toastMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Personal Standing Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-400">
                Pencapaian Kamu Saat Ini
              </div>
              <div className="text-sm font-bold text-white truncate">
                {progress.userProfile?.displayName || 'Penjelajah Lokal (Belum Masuk Google)'}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Peringkat</span>
                <span className="font-mono font-bold text-cyan-300">
                  {myRankIndex >= 0 ? `#${myRankIndex + 1}` : '—'}
                </span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Lencana</span>
                <span className="font-mono font-bold text-amber-300">
                  🏅 {localMetrics.badgeCount}/10
                </span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">Tercepat</span>
                <span className="font-mono font-bold text-emerald-300">
                  {formatDurationMs(localMetrics.fastestMissionMs)}
                </span>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              <span>Memuat papan peringkat dari Firebase...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <Trophy className="w-8 h-8 text-amber-400/70 mx-auto" />
              <div className="text-sm font-bold text-white">
                {sortMode === 'SPEED'
                  ? 'Belum Ada Catatan Waktu Tercepat'
                  : 'Papan Peringkat Masih Kosong'}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {sortMode === 'SPEED'
                  ? 'Selesaikan misi koding setelah masuk dengan akun Google agar rekor kecepatanmu tampil di urutan pertama!'
                  : 'Jadilah penjelajah pertama yang masuk dengan Google dan mengirimkan koleksi lencanamu ke papan peringkat!'}
              </p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {topThree.map((entry, idx) => {
                  const isMe = Boolean(currentUid && entry.uid === currentUid);
                  const podiumStyles =
                    idx === 0
                      ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-400/70'
                      : idx === 1
                      ? 'bg-gradient-to-b from-slate-400/15 to-slate-900 border-slate-400/50'
                      : 'bg-gradient-to-b from-orange-500/15 to-orange-950/35 border-orange-400/50';
                  const rankBadge =
                    idx === 0 ? (
                      <Crown className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Medal
                        className={`w-4 h-4 ${
                          idx === 1 ? 'text-slate-300' : 'text-orange-400'
                        }`}
                      />
                    );

                  return (
                    <div
                      key={entry.uid}
                      className={`p-3.5 rounded-xl border ${podiumStyles} ${
                        isMe ? 'ring-2 ring-cyan-400/80' : ''
                      } flex flex-col justify-between gap-2`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-white">
                          {rankBadge}
                          <span>Peringkat #{idx + 1}</span>
                        </div>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 text-[10px] font-bold">
                            Kamu
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${SKIN_BADGE_CLASS[entry.skinId]}`}
                        >
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-white truncate">
                            {entry.displayName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {entry.completedMissions} Misi · ⭐ {entry.totalStars}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-xs">
                        {sortMode === 'SPEED' ? (
                          <>
                            <span className="text-cyan-300 font-mono font-bold">
                              ⚡ {formatDurationMs(entry.fastestMissionMs)}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                              {entry.fastestLevelTitle || 'Misi Selesai'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-amber-300 font-mono font-bold">
                              🏅 {entry.badgeCount}/10 Lencana
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ⚡ {formatDurationMs(entry.fastestMissionMs)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Full Ranking Table */}
              <div className="space-y-1.5">
                {entries.map((entry, idx) => {
                  const isMe = Boolean(currentUid && entry.uid === currentUid);
                  return (
                    <div
                      key={entry.uid}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                        isMe
                          ? 'bg-cyan-950/50 border-cyan-500/60'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 text-center font-mono text-xs font-bold shrink-0 ${
                            idx === 0
                              ? 'text-amber-400'
                              : idx === 1
                              ? 'text-slate-300'
                              : idx === 2
                              ? 'text-orange-400'
                              : 'text-slate-500'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${SKIN_BADGE_CLASS[entry.skinId]}`}
                        >
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {entry.displayName}
                            </span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold">
                                Kamu
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {entry.completedMissions}/64 Misi
                            {entry.fastestLevelTitle && sortMode === 'SPEED'
                              ? ` · Rekor: ${entry.fastestLevelTitle}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs font-mono">
                        <span
                          className="hidden sm:inline-flex items-center gap-1 text-amber-300/90"
                          title="Total Bintang"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {entry.totalStars}
                        </span>

                        <span
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                            sortMode === 'BADGES'
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          🏅 {entry.badgeCount}
                        </span>

                        <span
                          className={`px-2 py-1 rounded-lg border text-[11px] font-bold min-w-[66px] text-center ${
                            sortMode === 'SPEED'
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          ⚡ {formatDurationMs(entry.fastestMissionMs)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
