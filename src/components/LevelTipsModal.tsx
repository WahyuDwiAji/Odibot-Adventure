import React, { useState, useEffect, useCallback } from 'react';
import { LevelDefinition } from '../types/game';
import { getLevelTipGuide, LevelTipGuide } from '../data/levelTips';
import { OdibotMascot } from './OdibotMascot';
import { sounds } from '../utils/audio';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Bug,
  CheckCircle2,
  Compass,
  GitBranch,
  HelpCircle,
  Lightbulb,
  ListOrdered,
  Repeat,
  X,
} from 'lucide-react';

interface LevelTipsModalProps {
  level: LevelDefinition;
  failureCount: number;
  lastFailureReason?: string | null;
  onLoadStarterCode?: () => void;
  onClose: () => void;
}

const ACCENT_STYLES: Record<
  LevelTipGuide['accentColor'],
  {
    headerIconBg: string;
    stepActive: string;
    stepNum: string;
    primaryBtn: string;
    codeBorder: string;
  }
> = {
  cyan: {
    headerIconBg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
    stepActive: 'bg-cyan-500 text-slate-950 border-cyan-400',
    stepNum: 'text-cyan-300',
    primaryBtn: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    codeBorder: 'border-cyan-500/30 text-cyan-200',
  },
  purple: {
    headerIconBg: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
    stepActive: 'bg-purple-500 text-white border-purple-400',
    stepNum: 'text-purple-300',
    primaryBtn: 'bg-purple-600 hover:bg-purple-500 text-white',
    codeBorder: 'border-purple-500/30 text-purple-200',
  },
  blue: {
    headerIconBg: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
    stepActive: 'bg-blue-500 text-white border-blue-400',
    stepNum: 'text-blue-300',
    primaryBtn: 'bg-blue-600 hover:bg-blue-500 text-white',
    codeBorder: 'border-blue-500/30 text-blue-200',
  },
  emerald: {
    headerIconBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    stepActive: 'bg-emerald-500 text-slate-950 border-emerald-400',
    stepNum: 'text-emerald-300',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    codeBorder: 'border-emerald-500/30 text-emerald-200',
  },
  amber: {
    headerIconBg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    stepActive: 'bg-amber-400 text-slate-950 border-amber-300',
    stepNum: 'text-amber-300',
    primaryBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    codeBorder: 'border-amber-500/30 text-amber-200',
  },
  rose: {
    headerIconBg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    stepActive: 'bg-rose-500 text-white border-rose-400',
    stepNum: 'text-rose-300',
    primaryBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
    codeBorder: 'border-rose-500/30 text-rose-200',
  },
};

function getConceptIcon(conceptId: LevelTipGuide['conceptId']) {
  switch (conceptId) {
    case 'FOR_LOOP':
    case 'WHILE_LOOP':
      return Repeat;
    case 'LISTS':
      return ListOrdered;
    case 'FUNCTIONS':
      return Boxes;
    case 'CONDITIONALS':
    case 'IF_ELSE':
      return GitBranch;
    case 'DEBUGGING':
      return Bug;
    case 'SEQUENTIAL_STATE':
    default:
      return Compass;
  }
}

export const LevelTipsModal: React.FC<LevelTipsModalProps> = ({
  level,
  failureCount,
  lastFailureReason,
  onLoadStarterCode,
  onClose,
}) => {
  const tipGuide = getLevelTipGuide(level, lastFailureReason);
  const accent = ACCENT_STYLES[tipGuide.accentColor];
  const ConceptIcon = getConceptIcon(tipGuide.conceptId);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'STEP' | 'ALL'>('STEP');

  useEffect(() => {
    setActiveStepIndex(0);
    setViewMode('STEP');
  }, [level.id]);

  const totalSteps = tipGuide.steps.length;
  const currentStep = tipGuide.steps[activeStepIndex] || tipGuide.steps[0];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex >= totalSteps - 1;

  const handlePrevStep = useCallback(() => {
    if (isFirstStep) return;
    sounds.playClick();
    setActiveStepIndex((i) => Math.max(0, i - 1));
  }, [isFirstStep]);

  const handleNextStep = useCallback(() => {
    sounds.playClick();
    if (!isLastStep) {
      setActiveStepIndex((i) => Math.min(totalSteps - 1, i + 1));
    } else {
      onClose();
    }
  }, [isLastStep, totalSteps, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        sounds.playClick();
        onClose();
      } else if (viewMode === 'STEP' && (e.key === 'ArrowRight' || e.key === 'Enter')) {
        e.preventDefault();
        handleNextStep();
      } else if (viewMode === 'STEP' && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, viewMode, handleNextStep, handlePrevStep]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/90 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-tips-title"
    >
      <div className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col gap-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${accent.headerIconBg}`}>
              <ConceptIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 tabular-nums">
                <span className="font-semibold text-amber-300">Tips Level</span>
                <span aria-hidden="true">·</span>
                <span>Misi Lv {level.levelNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{tipGuide.conceptLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="text-rose-300 font-medium">{failureCount}x percobaan belum berhasil</span>
              </div>
              <h2
                id="level-tips-title"
                className="text-base sm:text-lg font-bold font-display text-white mt-1 leading-snug"
              >
                {tipGuide.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Tutup Tips Level (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mascot Intro & Failure Diagnosis */}
        <div className="flex items-start gap-3.5 bg-slate-950/70 rounded-xl p-3.5 sm:p-4 border border-slate-800">
          <OdibotMascot size="sm" className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2 text-xs sm:text-[13px] leading-relaxed text-slate-300">
            <p>{tipGuide.intro}</p>
            {tipGuide.failureDiagnosis && (
              <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80 text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold text-amber-300">Analisis kegagalan terakhir: </strong>
                  {tipGuide.failureDiagnosis}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mode Switcher & Step Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {tipGuide.steps.map((st, idx) => {
              const isSelected = viewMode === 'STEP' && activeStepIndex === idx;
              return (
                <button
                  key={st.stepTitle}
                  onClick={() => {
                    sounds.playClick();
                    setViewMode('STEP');
                    setActiveStepIndex(idx);
                  }}
                  className={`min-h-[36px] min-w-[36px] px-2.5 rounded-lg border text-xs font-bold font-mono tabular-nums transition-colors ${
                    isSelected
                      ? accent.stepActive
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                  title={`Langkah ${idx + 1}: ${st.stepTitle}`}
                >
                  {idx + 1}
                </button>
              );
            })}
            <span className="text-xs text-slate-400 ml-1 tabular-nums hidden sm:inline">
              {viewMode === 'STEP'
                ? `Langkah ${activeStepIndex + 1} dari ${totalSteps}`
                : `${totalSteps} langkah ringkas`}
            </span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('STEP');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                viewMode === 'STEP'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Per Langkah
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('ALL');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                viewMode === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lihat Semua
            </button>
          </div>
        </div>

        {/* Step-by-step Content */}
        {viewMode === 'STEP' ? (
          <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-mono font-bold text-xs tabular-nums ${accent.stepNum}`}>
                  LANGKAH 0{activeStepIndex + 1}
                </span>
                <span className="text-slate-600" aria-hidden="true">/</span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {currentStep.stepTitle}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {currentStep.instruction}
            </p>

            {currentStep.codePreview && (
              <div className={`px-3 py-2.5 rounded-lg bg-slate-900 border font-mono text-[11px] sm:text-xs leading-relaxed ${accent.codeBorder}`}>
                {currentStep.codePreview}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800 bg-slate-950/75 border border-slate-800 rounded-xl px-4 sm:px-5">
            {tipGuide.steps.map((step, idx) => (
              <div key={step.stepTitle} className="py-3.5 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono font-bold text-xs tabular-nums shrink-0 ${accent.stepNum}`}>
                    0{idx + 1}.
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">{step.stepTitle}</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-6">{step.instruction}</p>
                {step.codePreview && (
                  <div className={`ml-6 px-2.5 py-1.5 rounded-md bg-slate-900 border font-mono text-[11px] ${accent.codeBorder}`}>
                    {step.codePreview}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Common Mistakes & Level Application */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Cek Hal yang Sering Terlewat</span>
            </div>
            <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              {tipGuide.commonMistakes.map((mistake) => (
                <li key={mistake} className="flex items-start gap-2">
                  <span className="text-slate-500 select-none">•</span>
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Lightbulb className="w-3.5 h-3.5 shrink-0" />
              <span>Petunjuk Khusus Misi Ini</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              {tipGuide.levelHint}
            </p>
            {tipGuide.debugNote && (
              <p className="text-[11px] text-rose-200 pt-1.5 border-t border-slate-800/80 leading-relaxed">
                <strong className="font-semibold">Catatan Bug: </strong>
                {tipGuide.debugNote}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
          {viewMode === 'STEP' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStep}
                disabled={isFirstStep}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <button
                onClick={handleNextStep}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${accent.primaryBtn}`}
              >
                <span>{isLastStep ? 'Coba Lagi Sekarang' : 'Langkah Berikutnya'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className={`min-h-[42px] px-5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${accent.primaryBtn}`}
            >
              Tutup & Coba Lagi
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onLoadStarterCode && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onLoadStarterCode();
                  onClose();
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-teal-950/90 hover:bg-teal-900 border border-teal-700/70 text-teal-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Muat Contoh Kode</span>
              </button>
            )}
            {viewMode === 'STEP' && !isLastStep && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onClose();
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
