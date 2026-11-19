import React, { useMemo, useState } from 'react';
import { ALL_LEVELS, ZONES } from '../data/levels';
import { DifficultyLevel, LevelDefinition, UserProgress } from '../types/game';
import { sounds } from '../utils/audio';
import {
  X,
  Star,
  CheckCircle,
  Compass,
  Repeat,
  Boxes,
  GitBranch,
  Bug,
  ListOrdered,
  Filter,
} from 'lucide-react';

interface LevelSelectModalProps {
  currentLevelId: string;
  progress: UserProgress;
  onSelectLevel: (level: LevelDefinition) => void;
  onClose: () => void;
}

const DIFFICULTY_CONFIG: Record<
  DifficultyLevel,
  { label: string; badgeClass: string; activeBtnClass: string }
> = {
  MUDAH: {
    label: 'Mudah',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-500 shadow-sm',
  },
  SEDANG: {
    label: 'Sedang',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    activeBtnClass: 'bg-amber-600 text-white border-amber-500 shadow-sm',
  },
  SULIT: {
    label: 'Sulit',
    badgeClass: 'bg-orange-950/80 text-orange-300 border-orange-800/80',
    activeBtnClass: 'bg-orange-600 text-white border-orange-500 shadow-sm',
  },
  MASTER: {
    label: 'Master',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
    activeBtnClass: 'bg-purple-600 text-white border-purple-500 shadow-sm',
  },
};

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  progress,
  onSelectLevel,
  onClose,
}) => {
  const initialZone =
    ALL_LEVELS.find((l) => l.id === currentLevelId)?.zoneId || 'zone-1';
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZone);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'ALL'>('ALL');

  const selectedZone = useMemo(
    () => ZONES.find((z) => z.id === selectedZoneId) || ZONES[0],
    [selectedZoneId]
  );
  const zoneLevels = useMemo(
    () => ALL_LEVELS.filter((l) => l.zoneId === selectedZoneId),
    [selectedZoneId]
  );
  const filteredLevels = useMemo(
    () =>
      zoneLevels.filter(
        (l) => selectedDifficulty === 'ALL' || (l.difficulty || 'MUDAH') === selectedDifficulty
      ),
    [zoneLevels, selectedDifficulty]
  );

  const zoneStatsMap = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    for (const z of ZONES) {
      map[z.id] = { total: 0, completed: 0 };
    }
    for (const l of ALL_LEVELS) {
      const bucket = map[l.zoneId];
      if (bucket) {
        bucket.total += 1;
        if (progress.completedLevels[l.id]) bucket.completed += 1;
      }
    }
    return map;
  }, [progress.completedLevels]);

  const difficultyCounts = useMemo(() => {
    const counts: Record<DifficultyLevel, number> = {
      MUDAH: 0,
      SEDANG: 0,
      SULIT: 0,
      MASTER: 0,
    };
    for (const l of zoneLevels) {
      const diff = l.difficulty || 'MUDAH';
      counts[diff] += 1;
    }
    return counts;
  }, [zoneLevels]);

  const totalCompleted = useMemo(
    () => Object.keys(progress.completedLevels).length,
    [progress.completedLevels]
  );

  const getZoneIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-4 h-4" />;
      case 'Repeat':
        return <Repeat className="w-4 h-4" />;
      case 'ListOrdered':
        return <ListOrdered className="w-4 h-4" />;
      case 'Boxes':
        return <Boxes className="w-4 h-4" />;
      case 'GitBranch':
        return <GitBranch className="w-4 h-4" />;
      case 'Bug':
        return <Bug className="w-4 h-4" />;
      default:
        return <Compass className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/92 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800 bg-slate-950/70 gap-2 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold font-display text-white flex flex-wrap items-center gap-2">
              <span className="truncate">Peta {ALL_LEVELS.length} Misi Odibot</span>
              <span className="text-[11px] font-mono font-normal text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/80 shrink-0">
                {totalCompleted} / {ALL_LEVELS.length} Selesai
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
              Setiap zona memiliki misi bertingkat dari Mudah hingga Master
            </p>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone Selector Tabs */}
        <div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 bg-slate-950/50 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          {ZONES.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            const stats = zoneStatsMap[zone.id] || { total: 0, completed: 0 };
            const totalInZone = stats.total;
            const completedInZone = stats.completed;

            return (
              <button
                key={zone.id}
                onClick={() => {
                  sounds.playClick();
                  setSelectedZoneId(zone.id);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 min-h-[38px] text-xs font-semibold rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
                style={{
                  borderLeftColor: isSelected ? zone.color : undefined,
                  borderLeftWidth: isSelected ? '3px' : undefined,
                }}
              >
                <span style={{ color: zone.color }}>{getZoneIcon(zone.iconName)}</span>
                <span>{zone.title.split(':')[0]}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({completedInZone}/{totalInZone})
                </span>
              </button>
            );
          })}
        </div>

        {/* Zone Description & Difficulty Filter Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-950/30 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200 truncate">{selectedZone.title}</span>
              <span className="text-[11px] text-slate-400 shrink-0">· {zoneLevels.length} Misi</span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-2 sm:line-clamp-1">{selectedZone.description}</p>
          </div>

          {/* Difficulty Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[11px] text-slate-500 px-1.5 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" />
            </span>
            <button
              onClick={() => {
                sounds.playClick();
                setSelectedDifficulty('ALL');
              }}
              className={`px-2.5 py-1 min-h-[32px] rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                selectedDifficulty === 'ALL'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({zoneLevels.length})
            </button>
            {(['MUDAH', 'SEDANG', 'SULIT', 'MASTER'] as const).map((diff) => {
              const conf = DIFFICULTY_CONFIG[diff];
              const countInDiff = difficultyCounts[diff];
              const isActive = selectedDifficulty === diff;

              return (
                <button
                  key={diff}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedDifficulty(diff);
                  }}
                  className={`px-2.5 py-1 min-h-[32px] rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive ? conf.activeBtnClass : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {conf.label} ({countInDiff})
                </button>
              );
            })}
          </div>
        </div>

        {/* Levels Grid */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5 bg-slate-950/40">
          {filteredLevels.map((lvl) => {
            const levelProgress = progress.completedLevels[lvl.id];
            const isCompleted = !!levelProgress;
            const isCurrent = lvl.id === currentLevelId;
            const stars = levelProgress ? levelProgress.stars : 0;
            const diff = lvl.difficulty || 'MUDAH';
            const diffConf = DIFFICULTY_CONFIG[diff];

            return (
              <button
                key={lvl.id}
                onClick={() => {
                  sounds.playClick();
                  onSelectLevel(lvl);
                  onClose();
                }}
                className={`relative p-4 rounded-xl border text-left transition-all group flex flex-col justify-between min-h-[135px] ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : isCompleted
                    ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600 hover:bg-slate-850'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        Level {lvl.levelNumber}
                      </span>
                      {/* Difficulty Tag Badge */}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${diffConf.badgeClass}`}
                      >
                        {diffConf.label.toUpperCase()}
                      </span>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {lvl.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{lvl.subtitle}</p>

                  {lvl.realWorldCS && (
                    <div className="text-[10px] text-cyan-400/90 mt-1 truncate">
                      💡 {lvl.realWorldCS}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">Maks: {lvl.maxBlocksFor3Stars} balok</span>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Selesai
                    </span>
                  ) : (
                    <span className="text-cyan-400 font-medium group-hover:underline">Mainkan →</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
