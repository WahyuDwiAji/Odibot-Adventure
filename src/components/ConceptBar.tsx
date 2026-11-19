import React, { useEffect, useRef, useState } from 'react';
import { LevelDefinition } from '../types/game';
import { sounds } from '../utils/audio';
import { getLevelThresholds } from '../utils/codeConverter';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  HelpCircle,
  Variable,
  Repeat,
  ListOrdered,
  Boxes,
  GitBranch,
  Bug,
  BookOpen,
  Lightbulb,
} from 'lucide-react';

interface ConceptBarProps {
  level: LevelDefinition;
  crystalsCollected: number;
  totalCrystalsInLevel: number;
  totalBlocksUsed: number;
  onOpenConceptModal: (zoneId?: string) => void;
  onOpenFeatureGuide?: () => void;
  featureGuideLabel?: string;
  onOpenLevelTips?: () => void;
  onLoadStarterCode?: () => void;
  isSimulating: boolean;
}

export const ConceptBar: React.FC<ConceptBarProps> = React.memo(({
  level,
  crystalsCollected,
  totalCrystalsInLevel,
  totalBlocksUsed,
  onOpenConceptModal,
  onOpenFeatureGuide,
  featureGuideLabel,
  onOpenLevelTips,
  onLoadStarterCode,
  isSimulating,
}) => {
  // Determine concept topic icon & badge
  let ConceptIcon = Variable;
  let topicId = 'variabel';
  let categoryColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';

  if (level.zoneId === 'zone-2') {
    ConceptIcon = Repeat;
    topicId = 'perulangan';
    categoryColor = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  } else if (level.zoneId === 'zone-3') {
    ConceptIcon = ListOrdered;
    topicId = 'struktur_data';
    categoryColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  } else if (level.zoneId === 'zone-4') {
    ConceptIcon = Boxes;
    topicId = 'fungsi';
    categoryColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  } else if (level.zoneId === 'zone-5') {
    ConceptIcon = GitBranch;
    topicId = 'logika';
    categoryColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
  } else if (level.zoneId === 'zone-debug') {
    ConceptIcon = Bug;
    topicId = 'debugging';
    categoryColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  }

  const [animTick, setAnimTick] = useState(0);
  const prevRef = useRef(crystalsCollected);

  useEffect(() => {
    if (crystalsCollected > prevRef.current) {
      setAnimTick((t) => t + 1);
    }
    prevRef.current = crystalsCollected;
  }, [crystalsCollected]);

  useEffect(() => {
    if (animTick === 0) return;
    const timer = setTimeout(() => setAnimTick(0), 750);
    return () => clearTimeout(timer);
  }, [animTick]);

  const allCrystalsCollected = crystalsCollected >= totalCrystalsInLevel && totalCrystalsInLevel > 0;
  const [threeStarLimit, twoStarLimit] = getLevelThresholds(level);
  const isBlocksEfficient = totalBlocksUsed <= threeStarLimit;
  const isBlocksModerate = totalBlocksUsed <= twoStarLimit;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 shrink-0 flex items-center justify-between gap-2 shadow-sm">
      {/* Left Zone: Active Learning Concept & Story Briefing */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${categoryColor}`}>
          <ConceptIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white font-display truncate">
              {level.conceptTitle}
            </span>
            <button
              onClick={() => {
                sounds.playClick();
                onOpenConceptModal(topicId);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 hover:bg-cyan-900/80 px-2 py-0.5 rounded-lg border border-cyan-800/80 transition-colors shrink-0 min-h-[28px]"
              title="Baca teori koding, tabel trace & contoh Python untuk topik ini"
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Teori Komputasi</span>
              <span className="sm:hidden">Teori</span>
            </button>
            {onOpenFeatureGuide && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenFeatureGuide();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900/80 px-2 py-0.5 rounded-lg border border-emerald-700/80 transition-colors shrink-0 min-h-[28px]"
                title="Buka panduan cara menggunakan fitur di level ini"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>{featureGuideLabel || 'Cara Pakai'}</span>
              </button>
            )}
            {onOpenLevelTips && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenLevelTips();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-950/80 hover:bg-amber-900/80 px-2 py-0.5 rounded-lg border border-amber-700/80 transition-colors shrink-0 min-h-[28px]"
                title="Buka Tips Level langkah demi langkah untuk konsep misi ini"
              >
                <Lightbulb className="w-3 h-3 text-amber-400" />
                <span>Tips Level</span>
              </button>
            )}
            {level.realWorldCS && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded hidden xl:inline shrink-0">
                🚀 {level.realWorldCS}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-300 truncate max-w-2xl mt-0.5 hidden sm:block">
            {level.conceptExplanation || level.storyIntro}
          </p>
        </div>
      </div>

      {/* Right Zone: Objectives Checklist & Solution Button */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Clean Tabular Objectives Summary */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs bg-slate-950/80 border border-slate-800 px-2 sm:px-3 py-1 rounded-xl tabular-nums">
          <div className="hidden sm:flex items-center gap-1 text-slate-300 font-medium" title="Tujuan Utama">
            <Circle className="w-3.5 h-3.5 text-amber-400" />
            <span>Terminal Emas</span>
          </div>

          <div
            className={`flex items-center gap-1 font-medium transition-colors ${
              allCrystalsCollected ? 'text-emerald-400' : 'text-slate-300'
            }`}
            title="Kumpulkan Semua Kristal Energi"
          >
            {allCrystalsCollected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
            )}
            <span className="font-mono text-[11px] sm:text-xs flex items-center">
              <span
                key={`cb-num-${crystalsCollected}-${animTick}`}
                className={animTick > 0 ? 'animate-crystal-digit font-bold text-cyan-300' : ''}
              >
                {crystalsCollected}
              </span>
              <span>/{totalCrystalsInLevel}</span>
            </span>
          </div>

          <span className="text-slate-700 sm:hidden" aria-hidden="true">·</span>

          <div
            className={`flex items-center gap-1 font-medium font-mono transition-colors text-[11px] sm:text-xs ${
              isBlocksEfficient
                ? 'text-emerald-400'
                : isBlocksModerate
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
            title={`Acuan Bintang — 3★: maks. ${threeStarLimit} balok · 2★: maks. ${twoStarLimit} balok`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans hidden sm:inline">
              Balok:
            </span>
            <span>
              {totalBlocksUsed}/{threeStarLimit}★
            </span>
          </div>
        </div>

        {/* Load Starter / Solution Helper */}
        {onLoadStarterCode && (
          <button
            onClick={() => {
              sounds.playClick();
              onLoadStarterCode();
            }}
            disabled={isSimulating}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[34px] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-[11px] sm:text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
            title="Muat balok bantuan atau solusi awal untuk level ini"
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Contoh Solusi</span>
            <span className="sm:hidden">Solusi</span>
          </button>
        )}
      </div>
    </div>
  );
});
