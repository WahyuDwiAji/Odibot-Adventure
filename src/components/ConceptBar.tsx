import React from 'react';
import { LevelDefinition } from '../types/game';
import { sounds } from '../utils/audio';
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
} from 'lucide-react';

interface ConceptBarProps {
  level: LevelDefinition;
  crystalsCollected: number;
  totalCrystalsInLevel: number;
  totalBlocksUsed: number;
  onOpenConceptModal: (zoneId?: string) => void;
  onLoadStarterCode?: () => void;
  isSimulating: boolean;
}

export const ConceptBar: React.FC<ConceptBarProps> = ({
  level,
  crystalsCollected,
  totalCrystalsInLevel,
  totalBlocksUsed,
  onOpenConceptModal,
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

  const allCrystalsCollected = crystalsCollected >= totalCrystalsInLevel && totalCrystalsInLevel > 0;
  const isBlocksEfficient = totalBlocksUsed <= level.maxBlocksFor3Stars;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 shrink-0 flex items-center justify-between gap-2 sm:gap-3 shadow-sm overflow-hidden">
      {/* Left Zone: Active Learning Concept & Story Briefing */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className={`p-1.5 sm:p-2 rounded-xl border flex items-center justify-center shrink-0 ${categoryColor}`}>
          <ConceptIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-xs font-bold text-white flex items-center gap-1 font-display truncate">
              <span>{level.conceptTitle}</span>
            </span>
            <button
              onClick={() => {
                sounds.playClick();
                onOpenConceptModal(topicId);
              }}
              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 hover:bg-cyan-900/80 px-2 py-0.5 rounded-full border border-cyan-800/80 transition-colors shrink-0"
              title="Baca teori koding, tabel trace & contoh Python untuk topik ini"
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Teori Komputasi</span>
              <span className="sm:hidden">Teori</span>
            </button>
            {level.realWorldCS && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.2 rounded hidden xl:inline">
                🚀 {level.realWorldCS}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-300 truncate max-w-2xl mt-0.5 hidden sm:block">
            {level.conceptExplanation || level.storyIntro}
          </p>
        </div>
      </div>

      {/* Right Zone: 3-Star Objectives Checklist */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Objectives Progress */}
        <div className="flex items-center gap-3 text-xs bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
          <div className="flex items-center gap-1 text-slate-300 font-medium" title="Tujuan Utama">
            <Circle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Terminal Emas</span>
          </div>

          <div
            className={`flex items-center gap-1 font-medium transition-colors ${
              allCrystalsCollected ? 'text-emerald-400' : 'text-slate-400'
            }`}
            title="Kumpulkan Semua Kristal Energi"
          >
            {allCrystalsCollected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>
              💎 {crystalsCollected}/{totalCrystalsInLevel}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 font-medium font-mono transition-colors ${
              isBlocksEfficient ? 'text-emerald-400' : 'text-amber-400'
            }`}
            title={`Efisiensi: Maksimal ${level.maxBlocksFor3Stars} balok`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans hidden sm:inline">
              Balok:
            </span>
            <span>
              {totalBlocksUsed}/{level.maxBlocksFor3Stars}★
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
            title="Muat balok bantuan atau solusi awal untuk level ini"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Contoh Solusi</span>
          </button>
        )}
      </div>
    </div>
  );
};
