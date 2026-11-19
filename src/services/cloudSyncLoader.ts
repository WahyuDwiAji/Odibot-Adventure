import type { UserProgress } from '../types/game';

/**
 * Lazy-loaded Firebase Auth + Cloud Progress helpers.
 * Keeps the ~850KB Firebase SDK completely out of the initial boot bundle
 * and only loads it asynchronously after first paint or when a user signs in / syncs.
 */
export function subscribeCloudAuthSync(
  onSyncedProgress: (updater: (prev: UserProgress) => UserProgress) => void
): () => void {
  let cancelled = false;
  let unsubscribeAuth: (() => void) | null = null;

  void (async () => {
    try {
      const [{ onAuthStateChanged }, { auth }, leaderboard] = await Promise.all([
        import('firebase/auth'),
        import('../firebase'),
        import('./leaderboardService'),
      ]);
      if (cancelled) return;

      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled || !firebaseUser || !firebaseUser.emailVerified) {
          return;
        }
        try {
          const cloudPartial = await leaderboard.fetchUserCloudProgress(firebaseUser.uid);
          if (cancelled) return;

          onSyncedProgress((prev) => {
            const merged = leaderboard.mergeUserProgress(prev, cloudPartial);
            const displayName =
              merged.userProfile?.displayName ||
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              'Penjelajah Odibot';
            const updated: UserProgress = {
              ...merged,
              userProfile: {
                uid: firebaseUser.uid,
                email: firebaseUser.email || merged.userProfile?.email || '',
                displayName: displayName.slice(0, 40),
                avatarUrl: firebaseUser.photoURL || merged.userProfile?.avatarUrl,
                lastSynced: new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
              },
            };
            try {
              localStorage.setItem('kodibot_progress', JSON.stringify(updated));
            } catch {}
            void leaderboard
              .syncUserProgressAndLeaderboard(
                firebaseUser.uid,
                updated.userProfile?.email || '',
                updated.userProfile?.displayName || displayName,
                updated
              )
              .catch(() => {});
            return updated;
          });
        } catch {
          // Ignore silent background sync errors on boot
        }
      });
    } catch {
      // Ignore silent lazy-load errors when offline
    }
  })();

  return () => {
    cancelled = true;
    if (unsubscribeAuth) {
      unsubscribeAuth();
      unsubscribeAuth = null;
    }
  };
}

export async function syncProgressIfSignedIn(updated: UserProgress): Promise<void> {
  if (!updated.userProfile?.uid) return;
  try {
    const [{ auth }, { syncUserProgressAndLeaderboard }] = await Promise.all([
      import('../firebase'),
      import('./leaderboardService'),
    ]);
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.emailVerified) return;

    const displayName =
      updated.userProfile?.displayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split('@')[0] ||
      'Penjelajah Odibot';

    await syncUserProgressAndLeaderboard(
      firebaseUser.uid,
      firebaseUser.email || updated.userProfile?.email || '',
      displayName,
      updated
    );
  } catch {
    // Ignore silent sync failures
  }
}
