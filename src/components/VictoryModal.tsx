import React, { useState, useEffect } from 'react';
import { LevelDefinition } from '../types/game';
import { sounds } from '../utils/audio';
import { getLevelThresholds } from '../utils/codeConverter';
import { Star, ArrowRight, RotateCcw, ListFilter, Code2, Award, CheckCircle, Sparkles } from 'lucide-react';

interface VictoryModalProps {
  level: LevelDefinition;
  starsEarned: number;
  totalBlocksUsed: number;
  crystalsCollected: number;
  totalCrystals: number;
  pythonCode: string;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  hasNextLevel?: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  starsEarned,
  totalBlocksUsed,
  crystalsCollected,
  totalCrystals,
  pythonCode,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  hasNextLevel = true,
}) => {
  const [showPython, setShowPython] = useState(false);
  const [revealedStars, setRevealedStars] = useState(0);
  const [starSequenceDone, setStarSequenceDone] = useState(false);
  const [displayCrystals, setDisplayCrystals] = useState(0);
  const [displayBlocks, setDisplayBlocks] = useState(0);
  const [threeStarLimit, twoStarLimit] = getLevelThresholds(level);

  // Sequential star-filling progress & audio chimes
  useEffect(() => {
    setRevealedStars(0);
    setStarSequenceDone(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const targetStars = Math.max(0, Math.min(3, starsEarned));
    const baseDelay = 260;
    const stepGap = 440;

    for (let i = 1; i <= targetStars; i++) {
      const starIdx = i as 1 | 2 | 3;
      timers.push(
        setTimeout(() => {
          setRevealedStars(starIdx);
          sounds.playStarEarned(starIdx);
        }, baseDelay + (i - 1) * stepGap)
      );
    }

    const completeDelay = baseDelay + Math.max(1, targetStars) * stepGap + 180;
    timers.push(
      setTimeout(() => {
        setStarSequenceDone(true);
        if (targetStars === 3) {
          sounds.playAllStarsComplete();
        }
      }, completeDelay)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [starsEarned, level.id]);

  // Smooth number count-up for stats
  useEffect(() => {
    let frameId: number;
    const duration = 450;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCrystals(Math.round(crystalsCollected * eased));
      setDisplayBlocks(Math.round(totalBlocksUsed * eased));
      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [crystalsCollected, totalBlocksUsed]);

  const progressPercent = Math.round((revealedStars / 3) * 100);

  const motivationMessage =
    starsEarned === 3
      ? 'Sempurna! Algoritma paling optimal!'
      : starsEarned === 2
      ? `Bagus sekali! Kurangi hingga ${threeStarLimit} balok untuk 3★.`
      : `Misi tuntas! Coba sederhanakan kodemu untuk meraih lebih banyak bintang.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Glow backdrop behind stars */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 blur-3xl pointer-events-none transition-all duration-500 ${
            revealedStars === 3
              ? 'bg-amber-400/25'
              : revealedStars >= 1
              ? 'bg-amber-500/15'
              : 'bg-cyan-500/10'
          }`}
        />

        {/* Celebration Title */}
        <div className="text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold mb-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Misi Berhasil Dituntaskan!</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">{level.title}</h2>
          <p className="text-xs text-slate-400">{level.subtitle}</p>
        </div>

        {/* Sequential Star Progress Bar */}
        <div className="mb-2.5 px-1">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Progres Bintang Misi</span>
            </span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {revealedStars} / 3 ★
            </span>
          </div>
          <div className="relative h-2.5 w-full bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
            <div
              className="relative h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500 ease-out overflow-hidden"
              style={{ width: `${progressPercent}%` }}
            >
              {revealedStars > 0 && (
                <div className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer-slide" />
              )}
            </div>
          </div>
        </div>

        {/* 3-Star Badges (fill one by one) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 my-1.5 sm:my-2">
          {[1, 2, 3].map((starIdx) => {
            const isRevealed = starIdx <= revealedStars;
            return (
              <div
                key={starIdx}
                className={`relative flex flex-col items-center p-2.5 rounded-xl border transition-all duration-300 ${
                  isRevealed
                    ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/50 border-amber-400/70 scale-[1.03] shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950/60 border-slate-800/90 opacity-50'
                }`}
              >
                <div className="relative flex items-center justify-center w-9 h-9">
                  {isRevealed && (
                    <span
                      className="absolute inset-0 rounded-full border-2 border-amber-300/80 animate-star-ring pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-200 ${
                      isRevealed
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)] animate-star-pop'
                        : 'text-slate-700'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium mt-1 text-center leading-tight transition-colors ${
                    isRevealed ? 'text-amber-100' : 'text-slate-500'
                  }`}
                >
                  {starIdx === 1
                    ? 'Misi & Kristal'
                    : starIdx === 2
                    ? `Efisien (≤ ${twoStarLimit})`
                    : `Optimal (≤ ${threeStarLimit})`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Motivational Feedback Pill after star sequence */}
        <div
          className={`text-center text-xs font-semibold px-3 py-1.5 rounded-xl border my-1.5 transition-all duration-300 ${
            starSequenceDone
              ? starsEarned === 3
                ? 'opacity-100 bg-amber-500/15 border-amber-400/40 text-amber-200 translate-y-0'
                : 'opacity-100 bg-cyan-500/10 border-cyan-500/30 text-cyan-200 translate-y-0'
              : 'opacity-0 translate-y-1 pointer-events-none bg-slate-950/40 border-transparent text-transparent'
          }`}
        >
          {motivationMessage}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 my-1.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
          <div>
            <span className="text-slate-400">Kristal Terkumpul:</span>
            <div className="font-mono font-bold text-amber-400 text-sm tabular-nums">
              {displayCrystals} / {totalCrystals}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Penggunaan Balok:</span>
            <div className="font-mono font-bold text-cyan-400 text-sm tabular-nums">
              {displayBlocks} balok{' '}
              <span className="text-[11px] font-normal text-slate-500">
                (maks. {threeStarLimit} untuk 3★)
              </span>
            </div>
          </div>
        </div>

        {/* Educational Takeaway (Pedagogical Reflection) */}
        <div className="p-3.5 my-1.5 bg-gradient-to-r from-blue-950/40 to-slate-950/60 border border-blue-800/40 rounded-xl text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300 mb-1">
            <Award className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Konsep Koding: {level.conceptTitle}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {level.conceptExplanation}
          </p>
        </div>

        {/* Python Toggle */}
        <div className="my-1">
          <button
            onClick={() => {
              sounds.playClick();
              setShowPython(!showPython);
            }}
            className="w-full min-h-[40px] flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5 text-amber-300 font-mono">
              <Code2 className="w-4 h-4" />
              Lihat Solusi Python
            </span>
            <span className="text-xs text-slate-500">{showPython ? 'Sembunyikan' : 'Buka'}</span>
          </button>

          {showPython && (
            <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 max-h-36 overflow-auto leading-relaxed select-text">
              {pythonCode}
            </pre>
          )}
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              sounds.playClick();
              onReplay();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
            title="Mainkan Lagi"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenLevelSelect();
            }}
            className="flex-1 min-h-[44px] py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <ListFilter className="w-4 h-4 text-cyan-400" />
            <span>Daftar Level</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onNextLevel();
            }}
            className="flex-1 min-h-[44px] py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{hasNextLevel ? 'Misi Berikutnya' : 'Pilih Misi Lain'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
