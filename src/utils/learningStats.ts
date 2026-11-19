import { ALL_LEVELS } from '../data/levels';
import { CommandType, LevelDefinition, UserProgress } from '../types/game';

export type ConceptCategoryId =
  | 'variables'
  | 'loop'
  | 'list'
  | 'functions'
  | 'branching'
  | 'debugging';

export type ConceptIconName =
  | 'Cpu'
  | 'Repeat'
  | 'ListOrdered'
  | 'Boxes'
  | 'GitBranch'
  | 'Bug';

export interface ConceptMasteryStat {
  id: ConceptCategoryId;
  zoneId: string;
  label: string;
  shortLabel: string;
  sectorLabel: string;
  description: string;
  icon: ConceptIconName;
  colorHex: string;
  barClass: string;
  textClass: string;
  badgeClass: string;
  completedCount: number;
  totalCount: number;
  masteryPercent: number;
  shareOfCompletedPercent: number;
  starsEarned: number;
  maxStars: number;
  starPercent: number;
  perfectCount: number;
  exposureCompletedCount: number;
  exposureTotalCount: number;
  exposurePercent: number;
  exposureSharePercent: number;
}

export interface LoopVsBranchingComparison {
  loop: ConceptMasteryStat;
  branching: ConceptMasteryStat;
  leader: 'LOOP' | 'BRANCHING' | 'TIE' | 'NONE';
  summaryText: string;
}

export interface LearningStatsSummary {
  totalCompleted: number;
  totalLevels: number;
  overallPercent: number;
  totalStars: number;
  maxStars: number;
  perfectCount: number;
  totalExposureCompleted: number;
  concepts: ConceptMasteryStat[];
  rankedConcepts: ConceptMasteryStat[];
  topConcept: ConceptMasteryStat | null;
  recommendedConcept: ConceptMasteryStat | null;
  loopVsBranching: LoopVsBranchingComparison;
}

interface ConceptDefinition {
  id: ConceptCategoryId;
  zoneId: string;
  label: string;
  shortLabel: string;
  sectorLabel: string;
  description: string;
  icon: ConceptIconName;
  colorHex: string;
  barClass: string;
  textClass: string;
  badgeClass: string;
  matchesExposure: (level: LevelDefinition) => boolean;
}

const hasAnyCommand = (level: LevelDefinition, commands: CommandType[]): boolean =>
  commands.some((cmd) => level.allowedCommands.includes(cmd));

const CONCEPT_DEFINITIONS: ConceptDefinition[] = [
  {
    id: 'loop',
    zoneId: 'zone-2',
    label: 'Perulangan (Loop)',
    shortLabel: 'Perulangan',
    sectorLabel: 'Sektor 2',
    description: 'Efisiensi instruksi berulang menggunakan Repeat (For) & While.',
    icon: 'Repeat',
    colorHex: '#a855f7',
    barClass: 'bg-purple-500',
    textClass: 'text-purple-300',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    matchesExposure: (lvl) =>
      lvl.zoneId === 'zone-2' || hasAnyCommand(lvl, ['REPEAT', 'WHILE_VAR']),
  },
  {
    id: 'branching',
    zoneId: 'zone-5',
    label: 'Percabangan (If-Else)',
    shortLabel: 'Percabangan',
    sectorLabel: 'Sektor 5',
    description: 'Pengambilan keputusan logika sensor warna, rintangan, & variabel.',
    icon: 'GitBranch',
    colorHex: '#f59e0b',
    barClass: 'bg-amber-500',
    textClass: 'text-amber-300',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    matchesExposure: (lvl) =>
      lvl.zoneId === 'zone-5' || hasAnyCommand(lvl, ['IF_COLOR', 'IF_OBSTACLE', 'IF_VAR']),
  },
  {
    id: 'variables',
    zoneId: 'zone-1',
    label: 'Sekuensial & Memori',
    shortLabel: 'Sekuensial',
    sectorLabel: 'Sektor 1',
    description: 'Urutan algoritma dasar, navigasi grid, saklar, & manajemen variabel.',
    icon: 'Cpu',
    colorHex: '#06b6d4',
    barClass: 'bg-cyan-500',
    textClass: 'text-cyan-300',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    matchesExposure: (lvl) =>
      lvl.zoneId === 'zone-1' ||
      hasAnyCommand(lvl, ['SET_VAR', 'CHANGE_VAR']) ||
      Boolean(lvl.initialVariables && Object.keys(lvl.initialVariables).length > 0),
  },
  {
    id: 'list',
    zoneId: 'zone-3',
    label: 'Struktur Data (List)',
    shortLabel: 'List / Array',
    sectorLabel: 'Sektor 3',
    description: 'Mengelola kumpulan data berurutan dan pembacaan elemen array.',
    icon: 'ListOrdered',
    colorHex: '#3b82f6',
    barClass: 'bg-blue-500',
    textClass: 'text-blue-300',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    matchesExposure: (lvl) =>
      lvl.zoneId === 'zone-3' ||
      hasAnyCommand(lvl, ['READ_LIST']) ||
      Boolean(lvl.initialLists && Object.keys(lvl.initialLists).length > 0),
  },
  {
    id: 'functions',
    zoneId: 'zone-4',
    label: 'Fungsi Modular (F1/F2)',
    shortLabel: 'Fungsi F1/F2',
    sectorLabel: 'Sektor 4',
    description: 'Dekomposisi masalah besar menjadi subrutin F1 & F2 yang reusable.',
    icon: 'Boxes',
    colorHex: '#10b981',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-300',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    matchesExposure: (lvl) =>
      lvl.zoneId === 'zone-4' ||
      Boolean(lvl.allowF1 || lvl.allowF2) ||
      hasAnyCommand(lvl, ['CALL_F1', 'CALL_F2']),
  },
  {
    id: 'debugging',
    zoneId: 'zone-debug',
    label: 'Debugging Siber',
    shortLabel: 'Debugging',
    sectorLabel: 'Sektor 6',
    description: 'Analisis forensik kode, pelacakan bug logika, & perbaikan algoritma.',
    icon: 'Bug',
    colorHex: '#f43f5e',
    barClass: 'bg-rose-500',
    textClass: 'text-rose-300',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    matchesExposure: (lvl) => lvl.zoneId === 'zone-debug' || Boolean(lvl.isDebuggingChallenge),
  },
];

export function computeLearningStats(progress: UserProgress): LearningStatsSummary {
  const completedMap = progress.completedLevels || {};

  let totalCompleted = 0;
  let totalStars = 0;
  let perfectCount = 0;

  for (const level of ALL_LEVELS) {
    const record = completedMap[level.id];
    if (record) {
      totalCompleted += 1;
      const stars = Math.min(3, Math.max(0, record.stars || 0));
      totalStars += stars;
      if (stars >= 3) perfectCount += 1;
    }
  }

  const rawExposureCompletedSum = CONCEPT_DEFINITIONS.reduce((acc, def) => {
    const count = ALL_LEVELS.filter(
      (lvl) => def.matchesExposure(lvl) && Boolean(completedMap[lvl.id])
    ).length;
    return acc + count;
  }, 0);

  const concepts: ConceptMasteryStat[] = CONCEPT_DEFINITIONS.map((def) => {
    const sectorLevels = ALL_LEVELS.filter((lvl) => lvl.zoneId === def.zoneId);
    const totalCount = sectorLevels.length;
    let completedCount = 0;
    let starsEarned = 0;
    let sectorPerfectCount = 0;

    for (const lvl of sectorLevels) {
      const record = completedMap[lvl.id];
      if (record) {
        completedCount += 1;
        const stars = Math.min(3, Math.max(0, record.stars || 0));
        starsEarned += stars;
        if (stars >= 3) sectorPerfectCount += 1;
      }
    }

    const exposureLevels = ALL_LEVELS.filter((lvl) => def.matchesExposure(lvl));
    const exposureTotalCount = exposureLevels.length;
    const exposureCompletedCount = exposureLevels.filter((lvl) =>
      Boolean(completedMap[lvl.id])
    ).length;

    const maxStars = totalCount * 3;
    const masteryPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const shareOfCompletedPercent =
      totalCompleted > 0 ? Math.round((completedCount / totalCompleted) * 100) : 0;
    const starPercent = maxStars > 0 ? Math.round((starsEarned / maxStars) * 100) : 0;
    const exposurePercent =
      exposureTotalCount > 0
        ? Math.round((exposureCompletedCount / exposureTotalCount) * 100)
        : 0;
    const exposureSharePercent =
      rawExposureCompletedSum > 0
        ? Math.round((exposureCompletedCount / rawExposureCompletedSum) * 100)
        : 0;

    return {
      id: def.id,
      zoneId: def.zoneId,
      label: def.label,
      shortLabel: def.shortLabel,
      sectorLabel: def.sectorLabel,
      description: def.description,
      icon: def.icon,
      colorHex: def.colorHex,
      barClass: def.barClass,
      textClass: def.textClass,
      badgeClass: def.badgeClass,
      completedCount,
      totalCount,
      masteryPercent,
      shareOfCompletedPercent,
      starsEarned,
      maxStars,
      starPercent,
      perfectCount: sectorPerfectCount,
      exposureCompletedCount,
      exposureTotalCount,
      exposurePercent,
      exposureSharePercent,
    };
  });

  const rankedConcepts = [...concepts].sort((a, b) => {
    if (b.masteryPercent !== a.masteryPercent) return b.masteryPercent - a.masteryPercent;
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
    return b.starsEarned - a.starsEarned;
  });

  const topConcept =
    totalCompleted > 0 && rankedConcepts[0] && rankedConcepts[0].completedCount > 0
      ? rankedConcepts[0]
      : null;

  const unfinishedConcepts = concepts.filter((c) => c.completedCount < c.totalCount);
  const recommendedConcept =
    unfinishedConcepts.length > 0
      ? [...unfinishedConcepts].sort((a, b) => {
          // Prefer concepts that have started but not finished, or lowest mastery
          if (a.masteryPercent !== b.masteryPercent) return a.masteryPercent - b.masteryPercent;
          return a.completedCount - b.completedCount;
        })[0]
      : null;

  const loopStat = concepts.find((c) => c.id === 'loop')!;
  const branchingStat = concepts.find((c) => c.id === 'branching')!;

  let leader: LoopVsBranchingComparison['leader'] = 'NONE';
  let summaryText =
    'Selesaikan misi di Sektor 2 (Perulangan) dan Sektor 5 (Percabangan) untuk membandingkan kekuatan logikamu.';

  if (loopStat.completedCount > 0 || branchingStat.completedCount > 0) {
    if (loopStat.masteryPercent > branchingStat.masteryPercent) {
      leader = 'LOOP';
      summaryText = `Penguasaan Perulangan (${loopStat.masteryPercent}% · ${loopStat.completedCount}/${loopStat.totalCount} misi) lebih tinggi dibanding Percabangan (${branchingStat.masteryPercent}% · ${branchingStat.completedCount}/${branchingStat.totalCount} misi). Lanjutkan Sektor 5 untuk menyeimbangkan logika If-Else.`;
    } else if (branchingStat.masteryPercent > loopStat.masteryPercent) {
      leader = 'BRANCHING';
      summaryText = `Penguasaan Percabangan (${branchingStat.masteryPercent}% · ${branchingStat.completedCount}/${branchingStat.totalCount} misi) lebih unggul dibanding Perulangan (${loopStat.masteryPercent}% · ${loopStat.completedCount}/${loopStat.totalCount} misi). Asah efisiensi Loop di Sektor 2.`;
    } else if (loopStat.completedCount === branchingStat.completedCount) {
      leader = 'TIE';
      summaryText = `Keduanya seimbang (${loopStat.masteryPercent}% mastery). Kamu menguasai logika iterasi dan percabangan secara merata!`;
    } else if (loopStat.starsEarned >= branchingStat.starsEarned) {
      leader = 'LOOP';
      summaryText = `Tingkat penguasaan seimbang (${loopStat.masteryPercent}%), dengan Perulangan unggul di perolehan bintang (${loopStat.starsEarned}★ vs ${branchingStat.starsEarned}★).`;
    } else {
      leader = 'BRANCHING';
      summaryText = `Tingkat penguasaan seimbang (${branchingStat.masteryPercent}%), dengan Percabangan unggul di perolehan bintang (${branchingStat.starsEarned}★ vs ${loopStat.starsEarned}★).`;
    }
  }

  const totalLevels = ALL_LEVELS.length;
  return {
    totalCompleted,
    totalLevels,
    overallPercent: totalLevels > 0 ? Math.round((totalCompleted / totalLevels) * 100) : 0,
    totalStars,
    maxStars: totalLevels * 3,
    perfectCount,
    totalExposureCompleted: rawExposureCompletedSum,
    concepts,
    rankedConcepts,
    topConcept,
    recommendedConcept,
    loopVsBranching: {
      loop: loopStat,
      branching: branchingStat,
      leader,
      summaryText,
    },
  };
}
