import { signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { getBadgeStatuses, syncUnlockedBadges } from '../data/badges';
import {
  LeaderboardEntry,
  LeaderboardSortMode,
  RobotSkinId,
  UserProgress,
} from '../types/game';

const VALID_SKINS: readonly RobotSkinId[] = [
  'CYAN',
  'NEON_VOLT',
  'CYBER_PINK',
  'EMERALD',
  'GOLDEN',
];

const clampInt = (value: unknown, min: number, max: number): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : min;
  return Math.max(min, Math.min(max, n));
};

const normalizeSkin = (skin?: string): RobotSkinId =>
  VALID_SKINS.includes(skin as RobotSkinId) ? (skin as RobotSkinId) : 'CYAN';

const sanitizeDisplayName = (name?: string, email?: string): string => {
  const raw = (name || '').trim() || (email ? email.split('@')[0] : '') || 'Penjelajah Odibot';
  return raw.slice(0, 40);
};

export function getLeaderboardMetrics(progress: UserProgress) {
  const badgeStatuses = getBadgeStatuses(progress);
  const badgeCount = clampInt(
    badgeStatuses.filter((b) => b.unlocked).length,
    0,
    10
  );
  const completedMissions = clampInt(
    Object.keys(progress.completedLevels || {}).length,
    0,
    64
  );
  const totalStars = clampInt(
    Object.values(progress.completedLevels || {}).reduce(
      (acc, lvl) => acc + (lvl?.stars || 0),
      0
    ),
    0,
    192
  );
  const rawFastest = progress.stats?.fastestMissionMs;
  const fastestMissionMs =
    typeof rawFastest === 'number' && rawFastest > 0
      ? clampInt(rawFastest, 500, 3600000)
      : 0;
  const fastestLevelTitle = (progress.stats?.fastestLevelTitle || '').trim().slice(0, 80);

  return {
    badgeCount,
    completedMissions,
    totalStars,
    fastestMissionMs,
    fastestLevelTitle,
  };
}

export function buildLeaderboardPayload(
  uid: string,
  displayName: string,
  progress: UserProgress
) {
  const metrics = getLeaderboardMetrics(progress);
  return {
    uid,
    displayName: sanitizeDisplayName(displayName, progress.userProfile?.email),
    skinId: normalizeSkin(progress.customSkin),
    badgeCount: metrics.badgeCount,
    fastestMissionMs: metrics.fastestMissionMs,
    fastestLevelTitle: metrics.fastestLevelTitle,
    completedMissions: metrics.completedMissions,
    totalStars: metrics.totalStars,
    updatedAt: serverTimestamp(),
  };
}

export function buildUserProfilePayload(
  uid: string,
  email: string,
  displayName: string,
  progress: UserProgress
) {
  const unlockedZones = Array.isArray(progress.unlockedZones) && progress.unlockedZones.length > 0
    ? progress.unlockedZones.slice(0, 10).map((z) => String(z).slice(0, 32))
    : ['zone-1'];

  const safeCompletedLevels: Record<string, { stars: number; bestBlockCount: number }> = {};
  Object.entries(progress.completedLevels || {})
    .slice(0, 100)
    .forEach(([levelId, data]) => {
      if (data && typeof data === 'object') {
        safeCompletedLevels[levelId.slice(0, 32)] = {
          stars: clampInt(data.stars, 0, 3),
          bestBlockCount: clampInt(data.bestBlockCount, 0, 999),
        };
      }
    });

  const safeUnlockedBadges: Record<string, string> = {};
  Object.entries(progress.unlockedBadges || {})
    .slice(0, 30)
    .forEach(([badgeId, ts]) => {
      if (typeof ts === 'string') {
        safeUnlockedBadges[badgeId.slice(0, 40)] = ts.slice(0, 40);
      }
    });

  const safeStats: {
    fastDebugSolves: number;
    totalPerfectRuns: number;
    fastestMissionMs?: number;
    fastestLevelTitle?: string;
  } = {
    fastDebugSolves: clampInt(progress.stats?.fastDebugSolves || 0, 0, 9999),
    totalPerfectRuns: clampInt(progress.stats?.totalPerfectRuns || 0, 0, 9999),
  };

  if (typeof progress.stats?.fastestMissionMs === 'number' && progress.stats.fastestMissionMs > 0) {
    safeStats.fastestMissionMs = clampInt(progress.stats.fastestMissionMs, 500, 3600000);
    if (progress.stats?.fastestLevelTitle) {
      safeStats.fastestLevelTitle = progress.stats.fastestLevelTitle.slice(0, 80);
    }
  }

  return {
    uid,
    email: email.trim().toLowerCase().slice(0, 120),
    displayName: sanitizeDisplayName(displayName, email),
    customSkin: normalizeSkin(progress.customSkin),
    currentLevelId: (progress.currentLevelId || 'lvl-1-1').slice(0, 32),
    unlockedZones,
    completedLevels: safeCompletedLevels,
    unlockedBadges: safeUnlockedBadges,
    stats: safeStats,
    updatedAt: serverTimestamp(),
  };
}

export async function syncUserProgressAndLeaderboard(
  uid: string,
  email: string,
  displayName: string,
  progress: UserProgress
): Promise<void> {
  const userPath = `users/${uid}`;
  const leaderboardPath = `leaderboard/${uid}`;

  try {
    await setDoc(doc(db, 'users', uid), buildUserProfilePayload(uid, email, displayName, progress));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  try {
    await setDoc(doc(db, 'leaderboard', uid), buildLeaderboardPayload(uid, displayName, progress));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, leaderboardPath);
  }
}

export async function fetchUserCloudProgress(uid: string): Promise<Partial<UserProgress> | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      completedLevels:
        data.completedLevels && typeof data.completedLevels === 'object'
          ? data.completedLevels
          : {},
      currentLevelId:
        typeof data.currentLevelId === 'string' ? data.currentLevelId : 'lvl-1-1',
      unlockedZones: Array.isArray(data.unlockedZones)
        ? data.unlockedZones
        : ['zone-1'],
      customSkin: normalizeSkin(data.customSkin),
      unlockedBadges:
        data.unlockedBadges && typeof data.unlockedBadges === 'object'
          ? data.unlockedBadges
          : {},
      stats:
        data.stats && typeof data.stats === 'object' ? data.stats : undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function mergeUserProgress(
  local: UserProgress,
  cloud: Partial<UserProgress> | null
): UserProgress {
  if (!cloud) return local;

  const mergedLevels: Record<string, { stars: number; bestBlockCount: number }> = {
    ...(local.completedLevels || {}),
  };

  Object.entries(cloud.completedLevels || {}).forEach(([lvlId, cloudInfo]) => {
    const localInfo = mergedLevels[lvlId];
    if (!localInfo) {
      mergedLevels[lvlId] = cloudInfo;
    } else {
      mergedLevels[lvlId] = {
        stars: Math.max(localInfo.stars || 0, cloudInfo.stars || 0),
        bestBlockCount: Math.min(
          localInfo.bestBlockCount || 999,
          cloudInfo.bestBlockCount || 999
        ),
      };
    }
  });

  const mergedZones = Array.from(
    new Set([...(local.unlockedZones || ['zone-1']), ...(cloud.unlockedZones || ['zone-1'])])
  );

  const mergedBadges: Record<string, string> = {
    ...(cloud.unlockedBadges || {}),
    ...(local.unlockedBadges || {}),
  };

  const localFast = local.stats?.fastestMissionMs;
  const cloudFast = cloud.stats?.fastestMissionMs;
  let fastestMissionMs: number | undefined;
  let fastestLevelTitle: string | undefined;

  if (localFast && cloudFast) {
    if (localFast <= cloudFast) {
      fastestMissionMs = localFast;
      fastestLevelTitle = local.stats?.fastestLevelTitle || cloud.stats?.fastestLevelTitle;
    } else {
      fastestMissionMs = cloudFast;
      fastestLevelTitle = cloud.stats?.fastestLevelTitle || local.stats?.fastestLevelTitle;
    }
  } else if (localFast) {
    fastestMissionMs = localFast;
    fastestLevelTitle = local.stats?.fastestLevelTitle;
  } else if (cloudFast) {
    fastestMissionMs = cloudFast;
    fastestLevelTitle = cloud.stats?.fastestLevelTitle;
  }

  const base: UserProgress = {
    ...local,
    completedLevels: mergedLevels,
    unlockedZones: mergedZones,
    customSkin: local.customSkin || cloud.customSkin || 'CYAN',
    unlockedBadges: mergedBadges,
    stats: {
      fastDebugSolves: Math.max(
        local.stats?.fastDebugSolves || 0,
        cloud.stats?.fastDebugSolves || 0
      ),
      totalPerfectRuns: Math.max(
        local.stats?.totalPerfectRuns || 0,
        cloud.stats?.totalPerfectRuns || 0
      ),
      ...(fastestMissionMs ? { fastestMissionMs, fastestLevelTitle } : {}),
    },
  };

  const { unlockedBadges } = syncUnlockedBadges(base);
  return {
    ...base,
    unlockedBadges,
  };
}

export async function signInWithGoogleAndSync(localProgress: UserProgress): Promise<UserProgress> {
  const credential = await signInWithPopup(auth, googleProvider);
  const firebaseUser = credential.user;
  const uid = firebaseUser.uid;
  const email = firebaseUser.email || '';
  const displayName = sanitizeDisplayName(firebaseUser.displayName || undefined, email);

  const cloudPartial = await fetchUserCloudProgress(uid);
  const merged = mergeUserProgress(localProgress, cloudPartial);

  const nowStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const finalProgress: UserProgress = {
    ...merged,
    userProfile: {
      uid,
      email,
      displayName,
      avatarUrl: firebaseUser.photoURL || undefined,
      lastSynced: nowStr,
    },
  };

  await syncUserProgressAndLeaderboard(uid, email, displayName, finalProgress);
  return finalProgress;
}

export async function signOutFromGoogle(localProgress: UserProgress): Promise<UserProgress> {
  await signOut(auth);
  return {
    ...localProgress,
    userProfile: undefined,
  };
}

function mapDocToLeaderboardEntry(data: Record<string, unknown>): LeaderboardEntry {
  const updatedRaw = data.updatedAt;
  let updatedAt: string | undefined;
  if (updatedRaw instanceof Timestamp) {
    updatedAt = updatedRaw.toDate().toISOString();
  } else if (typeof updatedRaw === 'string') {
    updatedAt = updatedRaw;
  }

  return {
    uid: String(data.uid || ''),
    displayName: String(data.displayName || 'Penjelajah Odibot'),
    skinId: normalizeSkin(typeof data.skinId === 'string' ? data.skinId : undefined),
    badgeCount: clampInt(data.badgeCount, 0, 10),
    fastestMissionMs: clampInt(data.fastestMissionMs, 0, 3600000),
    fastestLevelTitle: String(data.fastestLevelTitle || ''),
    completedMissions: clampInt(data.completedMissions, 0, 64),
    totalStars: clampInt(data.totalStars, 0, 192),
    updatedAt,
  };
}

function sortLeaderboardEntries(
  entries: LeaderboardEntry[],
  mode: LeaderboardSortMode
): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (mode === 'SPEED') {
      const aTime = a.fastestMissionMs > 0 ? a.fastestMissionMs : Number.MAX_SAFE_INTEGER;
      const bTime = b.fastestMissionMs > 0 ? b.fastestMissionMs : Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount;
      return b.totalStars - a.totalStars;
    }

    if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount;
    if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
    if (b.completedMissions !== a.completedMissions) {
      return b.completedMissions - a.completedMissions;
    }
    const aTime = a.fastestMissionMs > 0 ? a.fastestMissionMs : Number.MAX_SAFE_INTEGER;
    const bTime = b.fastestMissionMs > 0 ? b.fastestMissionMs : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function buildLeaderboardQuery(mode: LeaderboardSortMode, maxRows = 30) {
  const col = collection(db, 'leaderboard');
  if (mode === 'SPEED') {
    return query(
      col,
      where('fastestMissionMs', '>', 0),
      orderBy('fastestMissionMs', 'asc'),
      limit(maxRows)
    );
  }
  return query(
    col,
    where('badgeCount', '>=', 0),
    orderBy('badgeCount', 'desc'),
    limit(maxRows)
  );
}

export function subscribeLeaderboard(
  mode: LeaderboardSortMode,
  onData: (entries: LeaderboardEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const q = buildLeaderboardQuery(mode, 30);
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) =>
        mapDocToLeaderboardEntry(d.data() as Record<string, unknown>)
      );
      onData(sortLeaderboardEntries(rows, mode));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'leaderboard');
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function fetchLeaderboardOnce(mode: LeaderboardSortMode): Promise<LeaderboardEntry[]> {
  try {
    const snapshot = await getDocs(buildLeaderboardQuery(mode, 30));
    const rows = snapshot.docs.map((d) =>
      mapDocToLeaderboardEntry(d.data() as Record<string, unknown>)
    );
    return sortLeaderboardEntries(rows, mode);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'leaderboard');
  }
}

export function formatDurationMs(ms?: number): string {
  if (!ms || ms <= 0) return '—';
  if (ms < 60000) {
    const sec = (ms / 1000).toFixed(1).replace('.', ',');
    return `${sec} dtk`;
  }
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}d`;
}
