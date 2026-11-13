import React from 'react';
import { sounds } from '../utils/audio';
import { OdibotMascot } from './OdibotMascot';
import {
  Play,
  Bug,
  Sparkles,
  Compass,
  Volume2,
  VolumeX,
  ShieldCheck,
  BookOpen,
  Palette,
  CheckCircle2,
} from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenLevelSelect: () => void;
  onOpenDebugMode: () => void;
  onOpenSandbox: () => void;
  onOpenConceptGuide: () => void;
  onOpenGoogleLogin?: () => void;
  onOpenSkinSelector?: () => void;
  userProfile?: {
    email: string;
    displayName: string;
    avatarUrl?: string;
    lastSynced?: string;
  };
  currentSkin?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  completedCount: number;
  totalLevels: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenLevelSelect,
  onOpenDebugMode,
  onOpenSandbox,
  onOpenConceptGuide,
  onOpenGoogleLogin,
  onOpenSkinSelector,
  userProfile,
  isMuted,
  onToggleMute,
  completedCount,
  totalLevels,
}) => {
  return (
    <div className="relative w-full h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* Background ambient cosmic glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.22),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_90%,rgba(139,92,246,0.18),transparent)] pointer-events-none" />

      {/* Decorative stars */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      {/* Top Bar Status & Audio Toggle */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <OdibotMascot size="sm" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-white font-display flex items-center gap-1.5">
              <span>Odibot Adventure</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                SD KELAS 6
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Informatika SD · Fase C Kurikulum Merdeka (60 Level Misi)</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Google Sign-In & Cloud Sync Button */}
          {onOpenGoogleLogin && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenGoogleLogin();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                userProfile
                  ? 'bg-slate-900/90 border-emerald-500/50 text-emerald-300 hover:border-emerald-400'
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-200 shadow-sm hover:shadow'
              }`}
              title="Akun Google & Sinkronisasi Cloud"
            >
              {userProfile ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                    {userProfile.displayName ? userProfile.displayName.charAt(0) : 'G'}
                  </div>
                  <span className="max-w-[120px] truncate hidden sm:inline">{userProfile.displayName}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </>
              ) : (
                <>
                  {/* Google G logo */}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  <span className="hidden sm:inline">Masuk Google</span>
                </>
              )}
            </button>
          )}

          {/* Skin / Kostum Selector Button */}
          {onOpenSkinSelector && (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenSkinSelector();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-900/60 to-pink-900/60 hover:from-purple-800/70 hover:to-pink-800/70 border border-purple-500/40 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-all shadow-sm"
              title="Bengkel Kostum Robot Odibot"
            >
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Kostum Odibot</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
            <span className="text-slate-500">Misi:</span>
            <span className="font-bold text-cyan-400">{completedCount}</span>
            <span className="text-slate-600">/</span>
            <span>{totalLevels}</span>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onToggleMute();
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Hero Centerpiece with Mascot & Title Lockup */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-6 text-center">
        {/* Mascot Avatar Card with subtle hover float */}
        <div className="relative mb-3 cursor-pointer group" onClick={onOpenSkinSelector}>
          <OdibotMascot size="lg" showBadge className="group-hover:scale-105 transition-transform duration-300" />
        </div>

        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-4">
          <svg className="w-full max-w-xl h-16 sm:h-20 mx-auto" viewBox="0 0 540 70">
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
              style={{ filter: 'drop-shadow(0px 4px 14px rgba(6,182,212,0.45))' }}
            >
              ODIBOT ADVENTURE
            </text>
          </svg>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mt-1 leading-relaxed">
            Taklukkan 60 misi bertingkat dari <span className="text-emerald-400 font-semibold">Mudah</span> hingga <span className="text-purple-400 font-semibold">Master</span> dengan kekuatan koding! Dilengkapi mode Jalan Otomatis dan sinkronisasi Google Cloud.
          </p>
        </div>

        {/* Primary Start CTA Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center mt-2">
          <button
            onClick={() => {
              sounds.playClick();
              onStartGame();
            }}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-display text-base rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Mulai Misi Koding</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenLevelSelect();
            }}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Pilih Dari 60 Misi</span>
          </button>
        </div>

        {/* Secondary Educational Modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-5">
          <button
            onClick={() => {
              sounds.playClick();
              onOpenConceptGuide();
            }}
            className="flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-cyan-900/40 hover:border-cyan-500/50 rounded-xl text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                Materi Konsep SD
              </div>
              <div className="text-[11px] text-slate-400">
                Variabel, Loop, List, & Prosedur
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenDebugMode();
            }}
            className="flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-rose-900/40 hover:border-rose-500/50 rounded-xl text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                Detektif Bug (10 Level)
              </div>
              <div className="text-[11px] text-slate-400">
                Perbaiki baris kode yang rusak
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenSandbox();
            }}
            className="flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-amber-900/40 hover:border-amber-500/50 rounded-xl text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Studio Sandbox
              </div>
              <div className="text-[11px] text-slate-400">
                Rancang labirin peta sendiri
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Flat Control Hints Bar at bottom */}
      <footer className="relative z-10 px-6 py-3 border-t border-slate-900 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sesuai Capaian Pembelajaran Informatika SD Kelas 6 (Kurikulum Merdeka)</span>
        </div>

        <div className="font-mono text-[11px] text-slate-400">
          Enter / Space Mulai · Drag Geser Kamera · Balok & Python Interaktif
        </div>
      </footer>
    </div>
  );
};
