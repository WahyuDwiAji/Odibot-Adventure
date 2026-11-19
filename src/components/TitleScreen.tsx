import React, { useEffect } from 'react';
import { sounds } from '../utils/audio';
import { OdibotMascot } from './OdibotMascot';
import { RobotSkinId } from '../types/game';
import {
  loadConceptModal,
  loadGameSession,
  loadGoogleCloudSyncModal,
  loadGuideModal,
  loadLeaderboardModal,
  loadLevelSelectModal,
  loadSandboxEditor,
  loadSkinSelectorModal,
  prefetchIdleChunks,
} from '../utils/preload';
import {
  Play,
  Bug,
  Sparkles,
  Compass,
  Volume2,
  VolumeX,
  ShieldCheck,
  BookOpen,
  BookMarked,
  Palette,
  CheckCircle2,
  Award,
  Trophy,
} from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenLevelSelect: () => void;
  onOpenDebugMode: () => void;
  onOpenSandbox: () => void;
  onOpenConceptGuide: () => void;
  onOpenGuide?: () => void;
  onOpenGoogleLogin?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenSkinSelector?: () => void;
  userProfile?: {
    email: string;
    displayName: string;
    avatarUrl?: string;
    lastSynced?: string;
  };
  currentSkin?: RobotSkinId;
  isMuted: boolean;
  onToggleMute: () => void;
  completedCount: number;
  totalLevels: number;
  unlockedBadgesCount?: number;
  totalBadgesCount?: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = React.memo(({
  onStartGame,
  onOpenLevelSelect,
  onOpenDebugMode,
  onOpenSandbox,
  onOpenConceptGuide,
  onOpenGuide,
  onOpenGoogleLogin,
  onOpenLeaderboard,
  onOpenSkinSelector,
  userProfile,
  currentSkin = 'CYAN',
  isMuted,
  onToggleMute,
  completedCount,
  totalLevels,
  unlockedBadgesCount = 0,
  totalBadgesCount = 10,
}) => {
  useEffect(() => {
    prefetchIdleChunks();
  }, []);

  return (
    <div className="relative w-full min-h-[100dvh] md:h-[100dvh] bg-[#070B14] text-slate-100 flex flex-col justify-between overflow-y-auto md:overflow-hidden select-none">
      {/* Background ambient cosmic glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.22),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_90%,rgba(139,92,246,0.18),transparent)] pointer-events-none" />

      {/* Decorative stars */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      {/* Top Bar Status & Audio Toggle */}
      <header className="relative z-10 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => sounds.playRobotGreet()}
            title="Klik untuk mendengar suara robot Odibot!"
            className="shrink-0 rounded-2xl active:scale-95 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
          >
            <OdibotMascot size="sm" skinId={currentSkin} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white font-display truncate">
              Odibot Adventure
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              Dasar Koding dan Kecerdasan Artifisial (KA) <span aria-hidden="true">·</span> <span className="font-mono text-cyan-400">{completedCount}/{totalLevels}</span> Misi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Profil, Lencana Prestasi & Google Cloud Button */}
          {onOpenGoogleLogin && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenGoogleLogin();
              }}
              onMouseEnter={() => void loadGoogleCloudSyncModal()}
              onTouchStart={() => void loadGoogleCloudSyncModal()}
              className={`flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                userProfile
                  ? 'bg-slate-900/90 border-emerald-500/50 text-emerald-300 hover:border-emerald-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-200 border-amber-500/45 shadow-sm'
              }`}
              title="Profil Pengguna, Lencana Prestasi & Sinkronisasi Google"
            >
              {userProfile ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                    {userProfile.displayName ? userProfile.displayName.charAt(0) : 'G'}
                  </div>
                  <span className="max-w-[96px] truncate hidden sm:inline">{userProfile.displayName}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    <Award className="w-3 h-3" />
                    {unlockedBadgesCount}/{totalBadgesCount}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Profil</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    {unlockedBadgesCount}/{totalBadgesCount}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Papan Peringkat (Leaderboard) Button */}
          {onOpenLeaderboard && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard();
              }}
              onMouseEnter={() => void loadLeaderboardModal()}
              onTouchStart={() => void loadLeaderboardModal()}
              className="flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-500/45 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors"
              title="Papan Peringkat Odibot (Firebase)"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Peringkat</span>
            </button>
          )}

          {/* Panduan Bermain Button */}
          {onOpenGuide && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenGuide();
              }}
              onMouseEnter={() => void loadGuideModal()}
              onTouchStart={() => void loadGuideModal()}
              className="flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 rounded-xl text-xs font-semibold text-cyan-200 hover:text-white transition-colors"
              title="Panduan Menggunakan Odibot"
            >
              <BookMarked className="w-4 h-4 text-cyan-400" />
              <span>Panduan</span>
            </button>
          )}

          {/* Skin / Kostum Selector Button */}
          {onOpenSkinSelector && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenSkinSelector();
              }}
              onMouseEnter={() => void loadSkinSelectorModal()}
              onTouchStart={() => void loadSkinSelectorModal()}
              className="flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-purple-500/40 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors"
              title="Bengkel Kostum Robot Odibot"
            >
              <Palette className="w-4 h-4 text-pink-400" />
              <span className="hidden sm:inline">Kostum</span>
            </button>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onToggleMute();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Hero Centerpiece with Mascot & Title Lockup */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6 text-center">
        {/* Mascot Avatar Card (single responsive mount) */}
        <div
          className="relative mb-3 cursor-pointer group"
          onClick={onOpenSkinSelector}
          onMouseEnter={() => void loadSkinSelectorModal()}
          title="Klik untuk ganti kostum Odibot"
        >
          <OdibotMascot
            size="hero"
            skinId={currentSkin}
            mood="happy"
            className="group-hover:scale-105 transition-transform duration-300"
            showBadge
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sounds.playRobotGreet();
            }}
            title="Dengar suara robot Odibot!"
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-cyan-400/80 text-cyan-300 hover:text-amber-300 hover:border-amber-400 flex items-center justify-center shadow-lg active:scale-90 transition-all z-10"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-3 sm:mb-4 w-full">
          <svg className="w-full max-w-sm sm:max-w-xl h-12 sm:h-20 mx-auto" viewBox="0 0 540 70">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <text
              x="270"
              y="48"
              textAnchor="middle"
              className="font-display font-black tracking-wider text-4xl sm:text-5xl"
              fill="url(#titleGrad)"
            >
              ODIBOT ADVENTURE
            </text>
          </svg>
          <p className="text-xs sm:text-base text-slate-300 max-w-xl mx-auto mt-1 leading-relaxed px-2">
            Taklukkan {totalLevels} misi koding bertingkat dari <span className="text-emerald-400 font-semibold">Mudah</span> hingga <span className="text-purple-400 font-semibold">Master</span> langsung dari HP maupun komputer.
          </p>
        </div>

        {/* Primary Start CTA Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full max-w-md justify-center mt-2">
          <button
            onClick={() => {
              sounds.playClick();
              onStartGame();
            }}
            onMouseEnter={() => void loadGameSession()}
            onTouchStart={() => void loadGameSession()}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-display text-base rounded-xl shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Mulai Misi Koding</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenLevelSelect();
            }}
            onMouseEnter={() => {
              void loadGameSession();
              void loadLevelSelectModal();
            }}
            onTouchStart={() => {
              void loadGameSession();
              void loadLevelSelectModal();
            }}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl font-medium text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Pilih Dari {totalLevels} Misi</span>
          </button>
        </div>

        {/* Secondary Educational Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-2xl mt-4 sm:mt-5">
          <button
            onClick={() => {
              sounds.playClick();
              onOpenConceptGuide();
            }}
            onMouseEnter={() => void loadConceptModal()}
            onTouchStart={() => void loadConceptModal()}
            className="flex items-center gap-3 p-3 min-h-[58px] bg-slate-900/75 hover:bg-slate-800/90 border border-cyan-900/40 hover:border-cyan-500/50 rounded-xl text-left active:scale-[0.99] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                Materi Konsep Koding
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Variabel, Loop, List, &amp; Prosedur
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenDebugMode();
            }}
            onMouseEnter={() => void loadGameSession()}
            onTouchStart={() => void loadGameSession()}
            className="flex items-center gap-3 p-3 min-h-[58px] bg-slate-900/75 hover:bg-slate-800/90 border border-rose-900/40 hover:border-rose-500/50 rounded-xl text-left active:scale-[0.99] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                Detektif Bug (10 Level)
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Perbaiki baris kode yang rusak
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenSandbox();
            }}
            onMouseEnter={() => {
              void loadGameSession();
              void loadSandboxEditor();
            }}
            onTouchStart={() => {
              void loadGameSession();
              void loadSandboxEditor();
            }}
            className="flex items-center gap-3 p-3 min-h-[58px] bg-slate-900/75 hover:bg-slate-800/90 border border-amber-900/40 hover:border-amber-500/50 rounded-xl text-left active:scale-[0.99] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Studio Sandbox
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Rancang labirin peta sendiri
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Flat Control Hints & Developer Credit Bar at bottom */}
      <footer className="relative z-10 px-4 sm:px-6 py-3 border-t border-slate-900 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-1.5 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 hidden sm:inline" />
          <span className="text-[11px] sm:text-xs">Dasar Pelajaran Koding dan Kecerdasan Artifisial (KA)</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-300 font-medium">
            Pengembang: <span className="text-cyan-400 font-semibold">Wahyu Dwi Aji, S.Pd., M.Pd.</span>
          </span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span className="hidden md:inline font-mono text-slate-400">
            Enter / Space Mulai · Drag Geser Kamera
          </span>
        </div>
      </footer>
    </div>
  );
});
