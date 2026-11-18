import React, { useEffect, useState, useCallback } from 'react';
import { OdibotMascot } from './OdibotMascot';
import { sounds } from '../utils/audio';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Code2,
  Play,
  Sparkles,
  X,
} from 'lucide-react';

export interface WalkthroughTargetRefs {
  arenaRef: React.RefObject<HTMLDivElement | null>;
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  desktopPlaybackRef: React.RefObject<HTMLDivElement | null>;
  mobileDockRef: React.RefObject<HTMLDivElement | null>;
}

interface MissionWalkthroughProps {
  targets: WalkthroughTargetRefs;
  onEnsureMobileTab: (tab: 'ARENA' | 'CODE') => void;
  onComplete: () => void;
}

interface WalkthroughStepConfig {
  id: string;
  badge: string;
  title: string;
  description: string;
  tip: string;
  mobileTab: 'ARENA' | 'CODE';
  accentClass: string;
  icon: React.ComponentType<{ className?: string }>;
  getTargetEl: (targets: WalkthroughTargetRefs, isMobile: boolean) => HTMLElement | null;
}

const WALKTHROUGH_STEPS: WalkthroughStepConfig[] = [
  {
    id: 'arena',
    badge: 'Langkah 1 dari 3 · Layar Kiri',
    title: 'Area Arena Robot 3D',
    description:
      'Di sinilah robot Odibot beraksi! Amati posisi awal Odibot, kristal energi 💎 yang harus diambil, dan ubin Terminal Emas ★ tujuan akhir.',
    tip: 'Kamu bisa menyeret layar untuk menggeser peta, mengubah sudut pandang 2D/3D, atau mencoba tombol Kemudi langsung.',
    mobileTab: 'ARENA',
    accentClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
    icon: Bot,
    getTargetEl: (t) => t.arenaRef.current,
  },
  {
    id: 'workspace',
    badge: 'Langkah 2 dari 3 · Layar Kanan',
    title: 'Area Workspace Kode',
    description:
      'Klik perintah di panel "Pilih Balok Perintah" untuk memasukkannya ke "Susunan Kode Odibot". Di atasnya tersedia tombol Jalankan Program dan tab Python 3!',
    tip: 'Perhatikan batas Maks. Balok★ agar susunan kodemu ringkas dan meraih nilai 3 Bintang.',
    mobileTab: 'CODE',
    accentClass: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40',
    icon: Code2,
    getTargetEl: (t) => t.workspaceRef.current,
  },
  {
    id: 'run',
    badge: 'Langkah 3 dari 3 · Uji Program',
    title: 'Jalankan & Lacak Langkah',
    description:
      'Sudah selesai menyusun balok? Tekan tombol "Jalankan Program" (atau tombol Spasi) untuk menguji kodemu, atau "Langkah Demi Langkah" untuk memeriksa tiap gerakan.',
    tip: 'Jika terjadi kesalahan, tekan Reset Posisi (R) lalu perbaiki susunan balokmu!',
    mobileTab: 'ARENA',
    accentClass: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
    icon: Play,
    getTargetEl: (t, isMobile) =>
      isMobile ? t.mobileDockRef.current : t.desktopPlaybackRef.current,
  },
];

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const MissionWalkthrough: React.FC<MissionWalkthroughProps> = ({
  targets,
  onEnsureMobileTab,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const currentStep = WALKTHROUGH_STEPS[stepIndex];
  const isLastStep = stepIndex === WALKTHROUGH_STEPS.length - 1;

  const measureTarget = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewport({ w: vw, h: vh });

    const isMobile = vw < 768;
    const el = currentStep.getTargetEl(targets, isMobile);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      setTargetRect(null);
      return;
    }

    const pad = 6;
    const top = Math.max(4, r.top - pad);
    const left = Math.max(4, r.left - pad);
    const right = Math.min(vw - 4, r.right + pad);
    const bottom = Math.min(vh - 4, r.bottom + pad);
    setTargetRect({
      top,
      left,
      width: Math.max(24, right - left),
      height: Math.max(24, bottom - top),
    });
  }, [currentStep, targets]);

  // Switch mobile tab when step changes and re-measure after layout settles
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onEnsureMobileTab(currentStep.mobileTab);
    }
    const rafId = requestAnimationFrame(() => {
      measureTarget();
    });
    const timerId = setTimeout(measureTarget, 70);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [stepIndex, currentStep.mobileTab, onEnsureMobileTab, measureTarget]);

  // Re-measure on viewport resize
  useEffect(() => {
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [measureTarget]);

  const handleFinish = useCallback(() => {
    sounds.playClick();
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onEnsureMobileTab('ARENA');
    }
    onComplete();
  }, [onComplete, onEnsureMobileTab]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleFinish();
      return;
    }
    sounds.playClick();
    setStepIndex((prev) => Math.min(WALKTHROUGH_STEPS.length - 1, prev + 1));
  }, [isLastStep, handleFinish]);

  const handlePrev = useCallback(() => {
    if (stepIndex <= 0) return;
    sounds.playClick();
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, [stepIndex]);

  // Keyboard shortcuts for walkthrough
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleFinish, handleNext, handlePrev]);

  // Compute non-overlapping tooltip card position
  const cardWidth = Math.min(370, viewport.w - 24);
  const approxCardHeight = 250;
  let cardTop = Math.max(16, (viewport.h - approxCardHeight) / 2);
  let cardLeft = Math.max(12, (viewport.w - cardWidth) / 2);

  if (targetRect) {
    const spaceRight = viewport.w - (targetRect.left + targetRect.width);
    const spaceLeft = targetRect.left;
    const spaceAbove = targetRect.top;
    const spaceBelow = viewport.h - (targetRect.top + targetRect.height);

    if (viewport.w >= 768 && spaceRight >= cardWidth + 24) {
      // Place cleanly to the right of highlighted Arena
      cardLeft = targetRect.left + targetRect.width + 16;
      cardTop = Math.min(
        Math.max(16, targetRect.top + targetRect.height / 2 - approxCardHeight / 2),
        viewport.h - approxCardHeight - 16
      );
    } else if (viewport.w >= 768 && spaceLeft >= cardWidth + 24) {
      // Place cleanly to the left of highlighted Workspace
      cardLeft = targetRect.left - cardWidth - 16;
      cardTop = Math.min(
        Math.max(16, targetRect.top + targetRect.height / 2 - approxCardHeight / 2),
        viewport.h - approxCardHeight - 16
      );
    } else if (spaceAbove >= approxCardHeight + 20) {
      // Place above highlighted bottom bar
      cardTop = targetRect.top - approxCardHeight - 14;
      cardLeft = Math.min(
        Math.max(12, targetRect.left + targetRect.width / 2 - cardWidth / 2),
        viewport.w - cardWidth - 12
      );
    } else if (spaceBelow >= approxCardHeight + 20) {
      // Place below target
      cardTop = targetRect.top + targetRect.height + 14;
      cardLeft = Math.min(
        Math.max(12, targetRect.left + targetRect.width / 2 - cardWidth / 2),
        viewport.w - cardWidth - 12
      );
    } else {
      // On mobile where full-height Arena/Workspace is spotlighted, float neatly at bottom-center or top-center
      cardTop =
        currentStep.id === 'arena'
          ? Math.max(16, viewport.h - approxCardHeight - 76)
          : Math.max(64, Math.min(120, viewport.h - approxCardHeight - 20));
      cardLeft = Math.max(12, (viewport.w - cardWidth) / 2);
    }
  }

  const StepIcon = currentStep.icon;

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Antarmuka Misi Odibot"
    >
      {/* Clickable dim shield when no spotlight rect */}
      {!targetRect && <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-[2px]" />}

      {/* Spotlight Cutout Frame */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-2xl border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.78)] transition-all duration-300 ease-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        >
          {/* Soft glowing perimeter pulse */}
          <div className="absolute -inset-1 rounded-2xl border-2 border-cyan-300/60 animate-pulse pointer-events-none" />
          {/* Corner label tag */}
          <div className="absolute -top-3 left-3 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>{currentStep.id === 'arena' ? 'Arena Robot' : currentStep.id === 'workspace' ? 'Workspace Kode' : 'Kontrol Eksekusi'}</span>
          </div>
        </div>
      )}

      {/* Interactive Floating Walkthrough Card */}
      <div
        className="fixed z-[75] bg-slate-900/95 border border-cyan-500/60 rounded-2xl shadow-2xl shadow-cyan-950/70 p-4 text-slate-100 backdrop-blur-md transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
        style={{
          top: cardTop,
          left: cardLeft,
          width: cardWidth,
        }}
      >
        {/* Top Row: Mascot + Step Indicator + Close */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <OdibotMascot size="sm" className="shrink-0" />
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentStep.accentClass}`}
              >
                <StepIcon className="w-3 h-3" />
                <span>{currentStep.badge}</span>
              </span>
              <h3 className="text-sm sm:text-base font-bold font-display text-white mt-1 leading-tight">
                {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Tutup Panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Explanation */}
        <p className="text-xs text-slate-200 leading-relaxed mb-2.5">
          {currentStep.description}
        </p>

        {/* Helpful Tip */}
        <div className="px-2.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-cyan-200/90 leading-snug mb-3.5">
          💡 <span className="font-semibold text-cyan-300">Tips:</span> {currentStep.tip}
        </div>

        {/* Progress Dots + Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            {WALKTHROUGH_STEPS.map((st, idx) => (
              <button
                key={st.id}
                onClick={() => {
                  sounds.playClick();
                  setStepIndex(idx);
                }}
                aria-label={`Ke langkah ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === stepIndex
                    ? 'w-5 bg-cyan-400'
                    : idx < stepIndex
                    ? 'w-2 bg-emerald-400/80'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleFinish}
              className="px-2.5 py-1.5 min-h-[34px] text-[11px] font-semibold text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              Lewati
            </button>

            {stepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-2.5 py-1.5 min-h-[34px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 min-h-[34px] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold font-display rounded-xl shadow-md flex items-center gap-1 transition-all active:scale-95"
            >
              <span>{isLastStep ? 'Mulai Misi!' : 'Lanjut'}</span>
              {!isLastStep && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
