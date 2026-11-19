// Centralized lazy chunk loaders with promise caching and idle background prefetching
// Ensures initial TitleScreen stays lightweight while menu clicks open instantaneously.

export const loadGameSession = () =>
  import('../components/GameSession').then((m) => ({ default: m.GameSession }));
export const loadVictoryModal = () =>
  import('../components/VictoryModal').then((m) => ({ default: m.VictoryModal }));
export const loadLevelSelectModal = () =>
  import('../components/LevelSelectModal').then((m) => ({ default: m.LevelSelectModal }));
export const loadHintModal = () =>
  import('../components/HintModal').then((m) => ({ default: m.HintModal }));
export const loadSandboxEditor = () =>
  import('../components/SandboxEditor').then((m) => ({ default: m.SandboxEditor }));
export const loadConceptModal = () =>
  import('../components/ConceptModal').then((m) => ({ default: m.ConceptModal }));
export const loadGoogleCloudSyncModal = () =>
  import('../components/GoogleCloudSyncModal').then((m) => ({ default: m.GoogleCloudSyncModal }));
export const loadSkinSelectorModal = () =>
  import('../components/SkinSelectorModal').then((m) => ({ default: m.SkinSelectorModal }));
export const loadGuideModal = () =>
  import('../components/GuideModal').then((m) => ({ default: m.GuideModal }));
export const loadLeaderboardModal = () =>
  import('../components/LeaderboardModal').then((m) => ({ default: m.LeaderboardModal }));

let idlePrefetchStarted = false;
let playingPrefetchStarted = false;

const scheduleIdle = (cb: () => void, timeoutMs: number) => {
  if (typeof window === 'undefined') return;
  const win = window as unknown as {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(cb, { timeout: timeoutMs });
  } else {
    window.setTimeout(cb, Math.min(timeoutMs, 250));
  }
};

/**
 * Quietly prefetch TitleScreen menus and GameSession right after initial paint.
 */
export function prefetchIdleChunks() {
  if (idlePrefetchStarted) return;
  idlePrefetchStarted = true;

  scheduleIdle(() => {
    void loadGuideModal();
    void loadConceptModal();
    void loadSkinSelectorModal();
    void loadGoogleCloudSyncModal();
    void loadLeaderboardModal();

    scheduleIdle(() => {
      void loadLevelSelectModal();
      void loadGameSession();
    }, 900);
  }, 450);
}

/**
 * Prefetch in-game modals once the user enters a mission.
 */
export function prefetchPlayingModals() {
  if (playingPrefetchStarted) return;
  playingPrefetchStarted = true;

  scheduleIdle(() => {
    void loadHintModal();
    void loadVictoryModal();
    void loadSandboxEditor();
  }, 600);
}
