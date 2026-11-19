import React, { useEffect, useState, useCallback } from 'react';
import { FeatureGuideDefinition } from '../data/featureGuides';
import { OdibotMascot } from './OdibotMascot';
import { sounds } from '../utils/audio';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { WalkthroughTargetRefs } from './MissionWalkthrough';

interface FeatureGuideOverlayProps {
  guides: FeatureGuideDefinition[];
  targets: WalkthroughTargetRefs;
  onEnsureMobileTab: (tab: 'ARENA' | 'CODE') => void;
  onClose: () => void;
}

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const ACCENT_MAP: Record<
  FeatureGuideDefinition['accentColor'],
  { badge: string; border: string; spotlight: string; stepNum: string }
> = {
  cyan: {
    badge: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
    border: 'border-cyan-500/60 shadow-cyan-950/70',
    spotlight: 'border-cyan-400',
    stepNum: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  emerald: {
    badge: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40',
    border: 'border-emerald-500/60 shadow-emerald-950/70',
    spotlight: 'border-emerald-400',
    stepNum: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  purple: {
    badge: 'text-purple-300 bg-purple-500/15 border-purple-400/40',
    border: 'border-purple-500/60 shadow-purple-950/70',
    spotlight: 'border-purple-400',
    stepNum: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  blue: {
    badge: 'text-blue-300 bg-blue-500/15 border-blue-400/40',
    border: 'border-blue-500/60 shadow-blue-950/70',
    spotlight: 'border-blue-400',
    stepNum: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  amber: {
    badge: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
    border: 'border-amber-500/60 shadow-amber-950/70',
    spotlight: 'border-amber-400',
    stepNum: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  rose: {
    badge: 'text-rose-300 bg-rose-500/15 border-rose-400/40',
    border: 'border-rose-500/60 shadow-rose-950/70',
    spotlight: 'border-rose-400',
    stepNum: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
};

export const FeatureGuideOverlay: React.FC<FeatureGuideOverlayProps> = ({
  guides,
  targets,
  onEnsureMobileTab,
  onClose,
}) => {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    setIndex(0);
  }, [guides]);

  const currentGuide = guides[index] || guides[0];
  const isLast = index >= guides.length - 1;

  const measureTarget = useCallback(() => {
    if (typeof window === 'undefined' || !currentGuide) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewport({ w: vw, h: vh });

    const isMobile = vw < 768;
    let el: HTMLElement | null = null;

    if (currentGuide.spotlightTarget === 'f1-tab') {
      el = document.querySelector('[data-feature-target="f1-tab"]') as HTMLElement | null;
      if (!el || el.getBoundingClientRect().width === 0) el = targets.workspaceRef.current;
    } else if (currentGuide.spotlightTarget === 'f2-tab') {
      el = document.querySelector('[data-feature-target="f2-tab"]') as HTMLElement | null;
      if (!el || el.getBoundingClientRect().width === 0) el = targets.workspaceRef.current;
    } else if (currentGuide.spotlightTarget === 'workspace') {
      el = targets.workspaceRef.current;
    } else if (currentGuide.spotlightTarget === 'arena') {
      el = targets.arenaRef.current;
    } else if (currentGuide.spotlightTarget === 'playback') {
      el = isMobile ? targets.mobileDockRef.current : targets.desktopPlaybackRef.current;
    }

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
  }, [currentGuide, targets]);

  useEffect(() => {
    if (!currentGuide) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onEnsureMobileTab(currentGuide.mobileTab);
    }
    const rafId = requestAnimationFrame(measureTarget);
    const timerId = setTimeout(measureTarget, 80);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [currentGuide, onEnsureMobileTab, measureTarget]);

  useEffect(() => {
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [measureTarget]);

  const handleClose = useCallback(() => {
    sounds.playClick();
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleClose();
      return;
    }
    sounds.playClick();
    setIndex((prev) => Math.min(guides.length - 1, prev + 1));
  }, [isLast, handleClose, guides.length]);

  const handlePrev = useCallback(() => {
    if (index <= 0) return;
    sounds.playClick();
    setIndex((prev) => Math.max(0, prev - 1));
  }, [index]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
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
  }, [handleClose, handleNext, handlePrev]);

  if (!currentGuide) return null;

  const accent = ACCENT_MAP[currentGuide.accentColor] || ACCENT_MAP.cyan;

  // Compute smart card position avoiding spotlighted area when possible
  const cardWidth = Math.min(440, viewport.w - 24);
  const approxCardHeight = 360;
  let cardTop = Math.max(16, (viewport.h - approxCardHeight) / 2);
  let cardLeft = Math.max(12, (viewport.w - cardWidth) / 2);

  if (targetRect) {
    const spaceLeft = targetRect.left;
    const spaceRight = viewport.w - (targetRect.left + targetRect.width);
    const spaceBelow = viewport.h - (targetRect.top + targetRect.height);
    const spaceAbove = targetRect.top;

    if (viewport.w >= 768 && spaceLeft >= cardWidth + 24) {
      cardLeft = targetRect.left - cardWidth - 16;
      cardTop = Math.min(
        Math.max(16, targetRect.top + targetRect.height / 2 - approxCardHeight / 2),
        viewport.h - approxCardHeight - 16
      );
    } else if (viewport.w >= 768 && spaceRight >= cardWidth + 24) {
      cardLeft = targetRect.left + targetRect.width + 16;
      cardTop = Math.min(
        Math.max(16, targetRect.top + targetRect.height / 2 - approxCardHeight / 2),
        viewport.h - approxCardHeight - 16
      );
    } else if (spaceBelow >= approxCardHeight + 18) {
      cardTop = targetRect.top + targetRect.height + 14;
      cardLeft = Math.min(
        Math.max(12, targetRect.left + targetRect.width / 2 - cardWidth / 2),
        viewport.w - cardWidth - 12
      );
    } else if (spaceAbove >= approxCardHeight + 18) {
      cardTop = targetRect.top - approxCardHeight - 14;
      cardLeft = Math.min(
        Math.max(12, targetRect.left + targetRect.width / 2 - cardWidth / 2),
        viewport.w - cardWidth - 12
      );
    } else {
      cardTop = Math.max(16, Math.min(84, (viewport.h - approxCardHeight) / 2));
      cardLeft = Math.max(12, (viewport.w - cardWidth) / 2);
    }
  }

  const spotlightTagLabel =
    currentGuide.spotlightTarget === 'f1-tab'
      ? 'Klik Tab F1 di Sini'
      : currentGuide.spotlightTarget === 'f2-tab'
      ? 'Klik Tab F2 di Sini'
      : currentGuide.spotlightTarget === 'playback'
      ? 'Kontrol Uji Langkah'
      : 'Area Susun Balok';

  return (
    <div
      className="fixed inset-0 z-[72] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={currentGuide.title}
    >
      {!targetRect && <div className="fixed inset-0 bg-slate-950/82 backdrop-blur-[2px]" />}

      {targetRect && (
        <div
          className={`fixed pointer-events-none rounded-2xl border-2 ${accent.spotlight} shadow-[0_0_0_9999px_rgba(2,6,23,0.78)] transition-all duration-300 ease-out`}
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        >
          <div className={`absolute -inset-1 rounded-2xl border-2 ${accent.spotlight} opacity-60 animate-pulse pointer-events-none`} />
          <div className="absolute -top-3 left-2.5 px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap">
            <Sparkles className="w-3 h-3" />
            <span>{spotlightTagLabel}</span>
          </div>
        </div>
      )}

      <div
        className={`fixed z-[76] bg-slate-900/95 border rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-100 backdrop-blur-md transition-all duration-300 ease-out animate-in fade-in zoom-in-95 max-h-[88dvh] overflow-y-auto ${accent.border}`}
        style={{
          top: cardTop,
          left: cardLeft,
          width: cardWidth,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <OdibotMascot size="sm" className="shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${accent.badge}`}>
                  <Sparkles className="w-3 h-3" />
                  <span>{currentGuide.badge}</span>
                </span>
                {guides.length > 1 && (
                  <span className="text-[10px] font-mono text-slate-400">
                    ({index + 1}/{guides.length})
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold font-display text-white mt-1 leading-tight">
                {currentGuide.title}
              </h3>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Tutup Panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <p className="text-xs text-slate-200 leading-relaxed mb-3">
          {currentGuide.summary}
        </p>

        {/* Numbered Steps */}
        <div className="space-y-2 mb-3">
          {currentGuide.steps.map((stepText, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/75 border border-slate-800/90"
            >
              <span
                className={`w-5 h-5 rounded-full border text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${accent.stepNum}`}
              >
                {idx + 1}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">{stepText}</p>
            </div>
          ))}
        </div>

        {/* Concrete Example */}
        {currentGuide.example && (
          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 font-mono leading-relaxed mb-2.5">
            <span className="text-slate-400 font-sans font-semibold mr-1">Contoh:</span>
            {currentGuide.example}
          </div>
        )}

        {/* Tip */}
        <div className="px-3 py-2 rounded-xl bg-amber-950/35 border border-amber-800/50 text-[11px] text-amber-200/95 leading-snug mb-4">
          💡 <span className="font-semibold text-amber-300">Tips:</span> {currentGuide.tip}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5">
            {guides.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => {
                  sounds.playClick();
                  setIndex(idx);
                }}
                aria-label={`Panduan ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === index
                    ? 'w-5 bg-emerald-400'
                    : idx < index
                    ? 'w-2 bg-cyan-400/80'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {index > 0 && (
              <button
                onClick={handlePrev}
                className="px-2.5 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 min-h-[36px] bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 text-xs font-bold font-display rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mengerti, Mulai!</span>
                </>
              ) : (
                <>
                  <span>Fitur Berikutnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
