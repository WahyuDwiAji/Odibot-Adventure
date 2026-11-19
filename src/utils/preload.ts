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

const scheduleIdle = (cb: () => void, delayMs: number) => {
  if (typeof window === 'undefined') return;
  const win = window as unknown as {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
  };
  const runWhenIdle = () => {
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(cb, { timeout: 2000 });
    } else {
      window.setTimeout(cb, 250);
    }
  };
  window.setTimeout(runWhenIdle, delayMs);
};

/**
 * Quietly prefetch ONLY GameSession after initial paint & user-idle gap.
 * Secondary modals prefetch instantaneously on hover/touch via TitleScreen buttons.
 */
export function prefetchIdleChunks() {
  if (idlePrefetchStarted) return;
  idlePrefetchStarted = true;

  const start = () => {
    scheduleIdle(() => {
      void loadGameSession();
    }, 1200);
  };

  if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    window.addEventListener('load', start, { once: true });
  } else {
    start();
  }
}

/**
 * Prefetch core in-game modals gently once the user is inside a mission.
 */
export function prefetchPlayingModals() {
  if (playingPrefetchStarted) return;
  playingPrefetchStarted = true;

  scheduleIdle(() => {
    void loadVictoryModal();
    void loadHintModal();
  }, 1400);
}
