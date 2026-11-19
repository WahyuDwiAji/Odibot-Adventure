import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { TOTAL_LEVELS_COUNT } from './data/constants';
import { getBadgeStatuses, syncUnlockedBadges } from './data/badges';
import { subscribeCloudAuthSync, syncProgressIfSignedIn } from './services/cloudSyncLoader';
import { RobotSkinId, UserProgress } from './types/game';
import { sounds } from './utils/audio';
import {
  loadConceptModal,
  loadGameSession,
  loadGoogleCloudSyncModal,
  loadGuideModal,
  loadLeaderboardModal,
  loadSkinSelectorModal,
} from './utils/preload';
import { TitleScreen } from './components/TitleScreen';
import type { GameLaunchMode } from './components/GameSession';

const GameSession = lazy(loadGameSession);
const ConceptModal = lazy(loadConceptModal);
const GoogleCloudSyncModal = lazy(loadGoogleCloudSyncModal);
const SkinSelectorModal = lazy(loadSkinSelectorModal);
const GuideModal = lazy(loadGuideModal);
const LeaderboardModal = lazy(loadLeaderboardModal);

type GameScreen = 'TITLE' | 'PLAYING';

const ModalFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85">
    <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-2 shadow-xl">
      <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      <span>Membuka menu...</span>
    </div>
  </div>
);

const SessionFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-[#070B14] text-slate-200 gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
    <div className="text-xs font-semibold text-cyan-300 tracking-wide">
      Menyiapkan Arena &amp; Workspace Odibot...
    </div>
  </div>
);

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [launchMode, setLaunchMode] = useState<GameLaunchMode>('DEFAULT');
  const [launchNonce, setLaunchNonce] = useState(0);
  const [walkthroughReplayNonce, setWalkthroughReplayNonce] = useState(0);

  // Saved progress (sanitized so old/corrupt localStorage never crashes)
  const [progress, setProgress] = useState<UserProgress>(() => {
    const defaultProgress: UserProgress = {
      completedLevels: {},
      currentLevelId: 'lvl-1-1',
      unlockedZones: ['zone-1'],
    };
    try {
      const saved = localStorage.getItem('kodibot_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const sanitized: UserProgress = {
            ...defaultProgress,
            ...parsed,
            completedLevels:
              parsed.completedLevels && typeof parsed.completedLevels === 'object'
                ? parsed.completedLevels
                : {},
            unlockedZones: Array.isArray(parsed.unlockedZones)
              ? parsed.unlockedZones
              : ['zone-1'],
          };
          const { unlockedBadges, newlyUnlocked } = syncUnlockedBadges(sanitized);
          if (newlyUnlocked.length > 0) {
            const hydrated: UserProgress = { ...sanitized, unlockedBadges };
            try {
              localStorage.setItem('kodibot_progress', JSON.stringify(hydrated));
            } catch {}
            return hydrated;
          }
          return sanitized;
        }
      }
    } catch {}
    return defaultProgress;
  });

  // Shared Modals (accessible from both TitleScreen and GameSession)
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [showSkinSelectorModal, setShowSkinSelectorModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [activeConceptTopic, setActiveConceptTopic] = useState<string | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(() => sounds.getMuted());

  // Defer Firebase Auth SDK loading until after first paint so startup never stalls
  useEffect(() => {
    let cleanupAuth: (() => void) | null = null;
    let cancelled = false;

    const startSync = () => {
      if (cancelled) return;
      cleanupAuth = subscribeCloudAuthSync(setProgress);
    };

    const win = window as unknown as {
      requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(startSync, { timeout: 1400 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(idleId);
        cleanupAuth?.();
      };
    }

    const timerId = window.setTimeout(startSync, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      cleanupAuth?.();
    };
  }, []);

  const totalStars = useMemo(
    () =>
      Object.values(progress.completedLevels).reduce(
        (acc, curr) => acc + (curr?.stars || 0),
        0
      ),
    [progress.completedLevels]
  );

  const completedCount = useMemo(
    () => Object.keys(progress.completedLevels).length,
    [progress.completedLevels]
  );

  const badgeStatuses = useMemo(() => getBadgeStatuses(progress), [progress]);
  const unlockedBadgesCount = useMemo(
    () => badgeStatuses.filter((b) => b.unlocked).length,
    [badgeStatuses]
  );

  const launchGame = useCallback((mode: GameLaunchMode) => {
    setLaunchMode(mode);
    setLaunchNonce((n) => n + 1);
    setScreen('PLAYING');
  }, []);

  const handleStartCodingMission = useCallback(() => {
    launchGame('DEFAULT');
  }, [launchGame]);

  const handleOpenLevelSelect = useCallback(() => {
    launchGame('LEVEL_SELECT');
  }, [launchGame]);

  const handleOpenDebugMode = useCallback(() => {
    launchGame('DEBUG');
  }, [launchGame]);

  const handleOpenSandbox = useCallback(() => {
    launchGame('SANDBOX');
  }, [launchGame]);

  const handleOpenConceptGuide = useCallback((topic?: string) => {
    setActiveConceptTopic(topic);
    setShowConceptModal(true);
  }, []);

  const handleOpenGuide = useCallback(() => {
    setShowGuideModal(true);
  }, []);

  const handleOpenGoogleLogin = useCallback(() => {
    setShowGoogleSyncModal(true);
  }, []);

  const handleOpenLeaderboard = useCallback(() => {
    setShowLeaderboardModal(true);
  }, []);

  const handleOpenSkinSelector = useCallback(() => {
    setShowSkinSelectorModal(true);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(sounds.toggleMute());
  }, []);

  const handleBackToTitle = useCallback(() => {
    setScreen('TITLE');
  }, []);

  const handleSelectSkin = useCallback((skinId: RobotSkinId) => {
    setProgress((prev) => {
      const updated: UserProgress = {
        ...prev,
        customSkin: skinId,
      };
      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}
      void syncProgressIfSignedIn(updated);
      return updated;
    });
  }, []);

  const externalModalOpen =
    showConceptModal ||
    showGoogleSyncModal ||
    showSkinSelectorModal ||
    showGuideModal ||
    showLeaderboardModal;

  // Global keyboard shortcuts for Title screen & shared modals Escape handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === 'Escape') {
        if (showLeaderboardModal) setShowLeaderboardModal(false);
        else if (showGoogleSyncModal) setShowGoogleSyncModal(false);
        else if (showSkinSelectorModal) setShowSkinSelectorModal(false);
        else if (showGuideModal) setShowGuideModal(false);
        else if (showConceptModal) setShowConceptModal(false);
        return;
      }

      if (screen === 'TITLE' && !externalModalOpen && (e.code === 'Space' || e.code === 'Enter')) {
        if (e.repeat) return;
        e.preventDefault();
        launchGame('DEFAULT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    screen,
    externalModalOpen,
    launchGame,
    showLeaderboardModal,
    showGoogleSyncModal,
    showSkinSelectorModal,
    showGuideModal,
    showConceptModal,
  ]);

  return (
    <div className="w-full h-[100dvh] bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {screen === 'TITLE' ? (
        <TitleScreen
          onStartGame={handleStartCodingMission}
          onOpenLevelSelect={handleOpenLevelSelect}
          onOpenDebugMode={handleOpenDebugMode}
          onOpenSandbox={handleOpenSandbox}
          onOpenConceptGuide={() => handleOpenConceptGuide()}
          onOpenGuide={handleOpenGuide}
          onOpenGoogleLogin={handleOpenGoogleLogin}
          onOpenLeaderboard={handleOpenLeaderboard}
          onOpenSkinSelector={handleOpenSkinSelector}
          userProfile={progress.userProfile}
          currentSkin={progress.customSkin || 'CYAN'}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          completedCount={completedCount}
          totalLevels={TOTAL_LEVELS_COUNT}
          unlockedBadgesCount={unlockedBadgesCount}
          totalBadgesCount={badgeStatuses.length}
        />
      ) : (
        <Suspense fallback={<SessionFallback />}>
          <GameSession
            progress={progress}
            setProgress={setProgress}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onBackToTitle={handleBackToTitle}
            onOpenConceptModal={handleOpenConceptGuide}
            onOpenGuide={handleOpenGuide}
            onOpenGoogleSync={handleOpenGoogleLogin}
            onOpenLeaderboard={handleOpenLeaderboard}
            onOpenSkinSelector={handleOpenSkinSelector}
            externalModalOpen={externalModalOpen}
            launchMode={launchMode}
            launchNonce={launchNonce}
            walkthroughReplayNonce={walkthroughReplayNonce}
          />
        </Suspense>
      )}

      <Suspense fallback={<ModalFallback />}>
        {showConceptModal && (
          <ConceptModal
            activeConceptZoneId={activeConceptTopic}
            onClose={() => setShowConceptModal(false)}
          />
        )}

        {showGoogleSyncModal && (
          <GoogleCloudSyncModal
            progress={progress}
            onUpdateProgress={(newProgress) => {
              setProgress(newProgress);
              try {
                localStorage.setItem('kodibot_progress', JSON.stringify(newProgress));
              } catch {}
            }}
            onOpenLeaderboard={handleOpenLeaderboard}
            onClose={() => setShowGoogleSyncModal(false)}
          />
        )}

        {showLeaderboardModal && (
          <LeaderboardModal
            progress={progress}
            onUpdateProgress={(newProgress) => {
              setProgress(newProgress);
              try {
                localStorage.setItem('kodibot_progress', JSON.stringify(newProgress));
              } catch {}
            }}
            onClose={() => setShowLeaderboardModal(false)}
          />
        )}

        {showSkinSelectorModal && (
          <SkinSelectorModal
            currentSkin={progress.customSkin || 'CYAN'}
            totalStars={totalStars}
            onSelectSkin={handleSelectSkin}
            onClose={() => setShowSkinSelectorModal(false)}
          />
        )}

        {showGuideModal && (
          <GuideModal
            onClose={() => setShowGuideModal(false)}
            onStartFirstMission={screen === 'TITLE' ? handleStartCodingMission : undefined}
            onReplayWalkthrough={() => {
              setShowGuideModal(false);
              if (screen !== 'PLAYING') {
                launchGame('DEFAULT');
              }
              setWalkthroughReplayNonce((n) => n + 1);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
