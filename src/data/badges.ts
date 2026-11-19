import { UserProgress } from '../types/game';

export type BadgeColorTheme =
  | 'cyan'
  | 'purple'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'gold'
  | 'indigo';

export type BadgeIconName =
  | 'Rocket'
  | 'Cpu'
  | 'Repeat'
  | 'ListOrdered'
  | 'Boxes'
  | 'GitBranch'
  | 'Zap'
  | 'Bug'
  | 'Star'
  | 'Crown';

export interface AchievementBadgeDefinition {
  id: string;
  title: string;
  description: string;
  category: 'MISI' | 'KONSEP' | 'DEBUG' | 'BINTANG';
  icon: BadgeIconName;
  theme: BadgeColorTheme;
  target: number;
  evaluateProgress: (progress: UserProgress) => number;
}

export interface AchievementBadgeStatus extends AchievementBadgeDefinition {
  unlocked: boolean;
  unlockedAt?: string;
  current: number;
  percent: number;
}

const SEKTOR_1_IDS = Array.from({ length: 10 }, (_, i) => `lvl-1-${i + 1}`);
const SEKTOR_2_IDS = Array.from({ length: 10 }, (_, i) => `lvl-2-${i + 1}`);
const SEKTOR_3_IDS = Array.from({ length: 10 }, (_, i) => `lvl-3-${i + 1}`);
const SEKTOR_4_IDS = Array.from({ length: 10 }, (_, i) => `lvl-4-${i + 1}`);
const SEKTOR_5_IDS = Array.from({ length: 14 }, (_, i) => `lvl-5-${i + 1}`);
const DEBUG_IDS = Array.from({ length: 10 }, (_, i) => `dbg-${i + 1}`);

const countCompletedIn = (progress: UserProgress, ids: string[]): number =>
  ids.reduce((acc, id) => acc + (progress.completedLevels[id] ? 1 : 0), 0);

const getTotalStars = (progress: UserProgress): number =>
  Object.values(progress.completedLevels).reduce((acc, lvl) => acc + (lvl?.stars || 0), 0);

const has3StarDebugSolve = (progress: UserProgress): boolean =>
  DEBUG_IDS.some((id) => (progress.completedLevels[id]?.stars || 0) >= 3);

export const ACHIEVEMENT_BADGES: AchievementBadgeDefinition[] = [
  {
    id: 'first-mission',
    title: 'Langkah Pertama',
    description: 'Selesaikan misi koding Odibot pertama kamu.',
    category: 'MISI',
    icon: 'Rocket',
    theme: 'cyan',
    target: 1,
    evaluateProgress: (p) => Math.min(1, Object.keys(p.completedLevels).length),
  },
  {
    id: 'memory-architect',
    title: 'Arsitek Memori',
    description: 'Tuntaskan seluruh 10 misi Sektor 1 (Variabel & Memori RAM).',
    category: 'KONSEP',
    icon: 'Cpu',
    theme: 'indigo',
    target: 10,
    evaluateProgress: (p) => countCompletedIn(p, SEKTOR_1_IDS),
  },
  {
    id: 'loop-master',
    title: 'Master Perulangan',
    description: 'Tuntaskan seluruh 10 misi Sektor 2 (Loop For & While).',
    category: 'KONSEP',
    icon: 'Repeat',
    theme: 'purple',
    target: 10,
    evaluateProgress: (p) => countCompletedIn(p, SEKTOR_2_IDS),
  },
  {
    id: 'list-navigator',
    title: 'Navigator Array',
    description: 'Tuntaskan seluruh 10 misi Sektor 3 (Struktur Data List).',
    category: 'KONSEP',
    icon: 'ListOrdered',
    theme: 'blue',
    target: 10,
    evaluateProgress: (p) => countCompletedIn(p, SEKTOR_3_IDS),
  },
  {
    id: 'function-engineer',
    title: 'Insinyur Fungsi',
    description: 'Tuntaskan seluruh 10 misi Sektor 4 (Fungsi Modular F1/F2).',
    category: 'KONSEP',
    icon: 'Boxes',
    theme: 'emerald',
    target: 10,
    evaluateProgress: (p) => countCompletedIn(p, SEKTOR_4_IDS),
  },
  {
    id: 'ai-logic-master',
    title: 'Master Logika KA',
    description: 'Tuntaskan seluruh 14 misi Sektor 5 (Percabangan If-Else & AI).',
    category: 'KONSEP',
    icon: 'GitBranch',
    theme: 'amber',
    target: 14,
    evaluateProgress: (p) => countCompletedIn(p, SEKTOR_5_IDS),
  },
  {
    id: 'fast-debugger',
    title: 'Debugger Cepat',
    description: 'Selesaikan misi Detektif Bug dalam ≤ 30 detik, ≤ 2 percobaan, atau raih 3★.',
    category: 'DEBUG',
    icon: 'Zap',
    theme: 'rose',
    target: 1,
    evaluateProgress: (p) =>
      (p.stats?.fastDebugSolves || 0) >= 1 || has3StarDebugSolve(p) ? 1 : 0,
  },
  {
    id: 'forensic-detective',
    title: 'Detektif Forensik',
    description: 'Tuntaskan seluruh 10 tantangan Debugging Siber di Sektor 6.',
    category: 'DEBUG',
    icon: 'Bug',
    theme: 'rose',
    target: 10,
    evaluateProgress: (p) => countCompletedIn(p, DEBUG_IDS),
  },
  {
    id: 'star-collector-30',
    title: 'Kolektor Bintang',
    description: 'Kumpulkan minimal 30 bintang efisiensi algoritma.',
    category: 'BINTANG',
    icon: 'Star',
    theme: 'gold',
    target: 30,
    evaluateProgress: (p) => Math.min(30, getTotalStars(p)),
  },
  {
    id: 'grand-champion',
    title: 'Juara Koding & KA',
    description: 'Tuntaskan seluruh 64 misi petualangan Odibot.',
    category: 'MISI',
    icon: 'Crown',
    theme: 'gold',
    target: 64,
    evaluateProgress: (p) => Math.min(64, Object.keys(p.completedLevels).length),
  },
];

/**
 * Evaluates full badge list with unlock status & numeric progress.
 * Automatically treats previously completed milestones as unlocked even before persistence.
 */
export function getBadgeStatuses(progress: UserProgress): AchievementBadgeStatus[] {
  const savedMap = progress.unlockedBadges || {};
  return ACHIEVEMENT_BADGES.map((badge) => {
    const rawCurrent = badge.evaluateProgress(progress);
    const current = Math.min(badge.target, Math.max(0, rawCurrent));
    const unlockedByProgress = current >= badge.target;
    const unlockedAt = savedMap[badge.id];
    const unlocked = unlockedByProgress || Boolean(unlockedAt);
    const percent = Math.round(((unlocked ? badge.target : current) / badge.target) * 100);

    return {
      ...badge,
      unlocked,
      unlockedAt,
      current: unlocked ? badge.target : current,
      percent,
    };
  });
}

/**
 * Computes updated `unlockedBadges` map and returns any newly unlocked badges in this update.
 */
export function syncUnlockedBadges(progress: UserProgress): {
  unlockedBadges: Record<string, string>;
  newlyUnlocked: AchievementBadgeStatus[];
} {
  const prevSaved = progress.unlockedBadges || {};
  const nextSaved: Record<string, string> = { ...prevSaved };
  const nowIso = new Date().toISOString();
  const newlyUnlocked: AchievementBadgeStatus[] = [];

  const statuses = getBadgeStatuses(progress);
  for (const status of statuses) {
    if (status.unlocked && !prevSaved[status.id]) {
      nextSaved[status.id] = nowIso;
      newlyUnlocked.push({ ...status, unlockedAt: nowIso });
    }
  }

  return { unlockedBadges: nextSaved, newlyUnlocked };
}
