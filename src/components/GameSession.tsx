import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { ALL_LEVELS } from '../data/levels';
import {
  AchievementBadgeStatus,
  getBadgeStatuses,
  syncUnlockedBadges,
} from '../data/badges';
import {
  BlockCommand,
  CommandType,
  Direction,
  ExecutionStep,
  LevelDefinition,
  TileData,
  UserProgress,
} from '../types/game';
import { runSimulation, SimulationResult } from '../utils/simulation';
import { countTotalBlocks, blocksToPython, getLevelThresholds } from '../utils/codeConverter';
import { sounds } from '../utils/audio';
import {
  loadConceptModal,
  loadGoogleCloudSyncModal,
  loadGuideModal,
  loadHintModal,
  loadLeaderboardModal,
  loadLevelSelectModal,
  loadSandboxEditor,
  loadSkinSelectorModal,
  prefetchPlayingModals,
} from '../utils/preload';
import { auth } from '../firebase';
import { syncUserProgressAndLeaderboard } from '../services/leaderboardService';

import { IsometricCanvas } from './IsometricCanvas';
import { BlockWorkspace } from './BlockWorkspace';
import { ConceptBar } from './ConceptBar';
import { CyberTerminalInspector } from './CyberTerminalInspector';
import { MissionWalkthrough } from './MissionWalkthrough';
import { FeatureGuideOverlay } from './FeatureGuideOverlay';
import { VictoryParticlesCanvas } from './VictoryParticlesCanvas';
import {
  FeatureGuideDefinition,
  FeatureGuideId,
  getLevelFeatureGuides,
} from '../data/featureGuides';

const VictoryModal = lazy(loadVictoryModalFromPreload);
const LevelSelectModal = lazy(loadLevelSelectModal);
const HintModal = lazy(loadHintModal);
const SandboxEditor = lazy(loadSandboxEditor);
const LevelTipsModal = lazy(() =>
  import('./LevelTipsModal').then((m) => ({ default: m.LevelTipsModal }))
);

function loadVictoryModalFromPreload() {
  return import('./VictoryModal').then((m) => ({ default: m.VictoryModal }));
}

import {
  Play,
  RotateCcw,
  StepForward,
  Lightbulb,
  Compass,
  ArrowLeft,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Bug,
  AlertTriangle,
  Battery,
  ListOrdered,
  Variable,
  HelpCircle,
  BookOpen,
  BookMarked,
  Cloud,
  Palette,
  CheckCircle2,
  Menu,
  X,
  Bot,
  Code2,
  Award,
  Trophy,
} from 'lucide-react';

export type GameLaunchMode = 'DEFAULT' | 'LEVEL_SELECT' | 'DEBUG' | 'SANDBOX';

interface GameSessionProps {
  progress: UserProgress;
  setProgress: React.Dispatch<React.SetStateAction<UserProgress>>;
  isMuted: boolean;
  onToggleMute: () => void;
  onBackToTitle: () => void;
  onOpenConceptModal: (topic?: string) => void;
  onOpenGuide: () => void;
  onOpenGoogleSync: () => void;
  onOpenLeaderboard: () => void;
  onOpenSkinSelector: () => void;
  externalModalOpen: boolean;
  launchMode: GameLaunchMode;
  launchNonce: number;
  walkthroughReplayNonce: number;
}

const ModalFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85">
    <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-2 shadow-xl">
      <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      <span>Membuka menu...</span>
    </div>
  </div>
);

export const GameSession: React.FC<GameSessionProps> = ({
  progress,
  setProgress,
  isMuted,
  onToggleMute,
  onBackToTitle,
  onOpenConceptModal,
  onOpenGuide,
  onOpenGoogleSync,
  onOpenLeaderboard,
  onOpenSkinSelector,
  externalModalOpen,
  launchMode,
  launchNonce,
  walkthroughReplayNonce,
}) => {
  const [currentLevel, setCurrentLevel] = useState<LevelDefinition>(ALL_LEVELS[0]);

  // Level runtime state
  const [tiles, setTiles] = useState<TileData[][]>([]);
  const [robotState, setRobotState] = useState<{
    x: number;
    y: number;
    height: number;
    dir: Direction;
  }>({ x: 0, y: 0, height: 0, dir: 'EAST' });
  const [crystalsCollected, setCrystalsCollected] = useState(0);
  const [crystalAnimTick, setCrystalAnimTick] = useState(0);
  const prevCrystalsRef = useRef(0);

  // Live computer memory variables & lists state
  const [currentVariables, setCurrentVariables] = useState<Record<string, number>>({});
  const [currentLists, setCurrentLists] = useState<Record<string, string[]>>({});

  // Coding blocks
  const [mainBlocks, setMainBlocks] = useState<BlockCommand[]>([]);
  const [f1Blocks, setF1Blocks] = useState<BlockCommand[]>([]);
  const [f2Blocks, setF2Blocks] = useState<BlockCommand[]>([]);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<1 | 2 | 4>(1);
  const [activeExecutingBlockId, setActiveExecutingBlockId] = useState<string | undefined>(undefined);
  const [activeAction, setActiveAction] = useState<string | undefined>(undefined);
  const [simulationErrorMessage, setSimulationErrorMessage] = useState<string | null>(null);

  // Victory celebration state
  const [isVictory, setIsVictory] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<AchievementBadgeStatus[]>([]);

  // In-session Modals
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [showLevelTips, setShowLevelTips] = useState(false);
  const [levelFailureCount, setLevelFailureCount] = useState(0);
  const [lastFailureReason, setLastFailureReason] = useState<string | null>(null);

  // Auto-Run (Jalan Otomatis) State & Countdown
  const [autoRunEnabled, setAutoRunEnabled] = useState<boolean>(() => {
    try {
      localStorage.removeItem('odibot_autorun');
      const saved = localStorage.getItem('odibot_autorun_v2');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [autoRunCountdown, setAutoRunCountdown] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'ARENA' | 'CODE'>('ARENA');
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);

  // Interactive First-Time Mission Walkthrough
  const [walkthroughDone, setWalkthroughDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem('odibot_walkthrough_done_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const walkthroughArenaRef = useRef<HTMLDivElement | null>(null);
  const walkthroughWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const walkthroughDesktopPlaybackRef = useRef<HTMLDivElement | null>(null);
  const walkthroughMobileDockRef = useRef<HTMLDivElement | null>(null);

  // Per-feature onboarding guides (auto-shown once when entering a level with new mechanics like F1)
  const [seenFeatures, setSeenFeatures] = useState<FeatureGuideId[]>(() => {
    try {
      const raw = localStorage.getItem('odibot_seen_features_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as FeatureGuideId[]) : [];
    } catch {
      return [];
    }
  });
  const [activeFeatureGuides, setActiveFeatureGuides] = useState<FeatureGuideDefinition[]>([]);

  // Cyber Terminal Execution History
  const [executionHistory, setExecutionHistory] = useState<ExecutionStep[]>([]);

  // Step simulation queue and runner ref
  const simulationStepsRef = useRef<ExecutionStep[]>([]);
  const currentSimResultRef = useRef<SimulationResult | null>(null);
  const currentStepIndexRef = useRef<number>(0);
  const simulationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationRunIdRef = useRef<number>(0);
  const lastAutoRunSignatureRef = useRef<string>('');
  const processNextStepRef = useRef<(simResult: SimulationResult, runId: number) => void>(() => {});
  const handleRunCodeRef = useRef<() => void>(() => {});
  const isSimulatingRef = useRef<boolean>(false);
  const levelStartTimeRef = useRef<number>(Date.now());
  const levelAttemptsRef = useRef<number>(0);
  const levelFailureCountRef = useRef<number>(0);
  const runFailureRecordedRef = useRef<boolean>(false);
  const tipsAutoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<UserProgress>(progress);
  progressRef.current = progress;

  useEffect(() => {
    prefetchPlayingModals();
  }, []);

  const recordLevelFailure = useCallback((reason?: string) => {
    if (runFailureRecordedRef.current) return;
    runFailureRecordedRef.current = true;

    const next = levelFailureCountRef.current + 1;
    levelFailureCountRef.current = next;
    setLevelFailureCount(next);
    if (reason) {
      setLastFailureReason(reason);
    }

    if (next === 3) {
      if (tipsAutoOpenTimerRef.current) {
        clearTimeout(tipsAutoOpenTimerRef.current);
      }
      tipsAutoOpenTimerRef.current = setTimeout(() => {
        setShowLevelTips(true);
        tipsAutoOpenTimerRef.current = null;
      }, 480);
    }
  }, []);

  const triggerVictorySequence = useCallback(() => {
    if (victoryModalTimerRef.current) {
      clearTimeout(victoryModalTimerRef.current);
      victoryModalTimerRef.current = null;
    }
    if (tipsAutoOpenTimerRef.current) {
      clearTimeout(tipsAutoOpenTimerRef.current);
      tipsAutoOpenTimerRef.current = null;
    }
    levelFailureCountRef.current = 0;
    setLevelFailureCount(0);
    setLastFailureReason(null);
    setShowLevelTips(false);
    sounds.playLevelClear();
    setIsVictory(true);
    setShowVictoryModal(false);
    victoryModalTimerRef.current = setTimeout(() => {
      setShowVictoryModal(true);
      victoryModalTimerRef.current = null;
    }, 950);
  }, []);

  useEffect(() => {
    return () => {
      if (victoryModalTimerRef.current) {
        clearTimeout(victoryModalTimerRef.current);
      }
      if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
      }
      if (tipsAutoOpenTimerRef.current) {
        clearTimeout(tipsAutoOpenTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (crystalsCollected > prevCrystalsRef.current) {
      setCrystalAnimTick((t) => t + 1);
    }
    prevCrystalsRef.current = crystalsCollected;
  }, [crystalsCollected]);

  useEffect(() => {
    if (crystalAnimTick === 0) return;
    const timer = setTimeout(() => setCrystalAnimTick(0), 900);
    return () => clearTimeout(timer);
  }, [crystalAnimTick]);

  // Load a level and configure initial state
  const loadLevel = useCallback((level: LevelDefinition) => {
    simulationRunIdRef.current += 1;
    lastAutoRunSignatureRef.current = '';
    levelStartTimeRef.current = Date.now();
    levelAttemptsRef.current = 0;
    levelFailureCountRef.current = 0;
    runFailureRecordedRef.current = false;
    if (tipsAutoOpenTimerRef.current) {
      clearTimeout(tipsAutoOpenTimerRef.current);
      tipsAutoOpenTimerRef.current = null;
    }
    setLevelFailureCount(0);
    setLastFailureReason(null);
    setShowLevelTips(false);
    setAutoRunCountdown(null);
    setCurrentLevel(level);
    setIsSimulating(false);
    setIsVictory(false);
    setShowVictoryModal(false);
    setNewlyUnlockedBadges([]);
    setSimulationErrorMessage(null);
    setActiveExecutingBlockId(undefined);
    setActiveAction('RESET');
    setExecutionHistory([]);

    if (victoryModalTimerRef.current) {
      clearTimeout(victoryModalTimerRef.current);
      victoryModalTimerRef.current = null;
    }
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    const clonedTiles: TileData[][] = level.tiles.map((row) =>
      row.map((t) => ({ ...t }))
    );
    setTiles(clonedTiles);

    const initialHeight = clonedTiles[level.startPos.y]?.[level.startPos.x]?.height ?? 0;
    setRobotState({
      x: level.startPos.x,
      y: level.startPos.y,
      height: initialHeight,
      dir: level.startDir,
    });
    setCrystalsCollected(0);
    setCurrentVariables({ ...(level.initialVariables || {}) });
    setCurrentLists({ ...(level.initialLists || {}) });

    if (level.isDebuggingChallenge && level.buggySolution) {
      const cloneWithIds = (list: BlockCommand[], prefix: string): BlockCommand[] =>
        list.map((b) => ({
          ...b,
          id: `${prefix}-${Math.random().toString(36).substring(2, 8)}`,
          children: b.children ? cloneWithIds(b.children, prefix) : undefined,
          elseChildren: b.elseChildren ? cloneWithIds(b.elseChildren, prefix) : undefined,
        }));
      const buggyMain = cloneWithIds(level.buggySolution.main, 'dbg');
      const buggyF1 = level.buggySolution.f1
        ? cloneWithIds(level.buggySolution.f1, 'dbg')
        : [];
      const buggyF2 = level.buggySolution.f2
        ? cloneWithIds(level.buggySolution.f2, 'dbg')
        : [];
      setMainBlocks(buggyMain);
      setF1Blocks(buggyF1);
      setF2Blocks(buggyF2);
      lastAutoRunSignatureRef.current = JSON.stringify({
        levelId: level.id,
        mainBlocks: buggyMain,
        f1Blocks: buggyF1,
        f2Blocks: buggyF2,
      });
    } else {
      setMainBlocks([]);
      setF1Blocks([]);
      setF2Blocks([]);
    }
  }, []);

  // Handle launch intents from TitleScreen
  const lastHandledLaunchNonceRef = useRef<number>(-1);
  useEffect(() => {
    if (lastHandledLaunchNonceRef.current === launchNonce) return;
    lastHandledLaunchNonceRef.current = launchNonce;

    if (launchMode === 'DEBUG') {
      const firstDebugLevel = ALL_LEVELS.find((l) => l.isDebuggingChallenge) || ALL_LEVELS[0];
      loadLevel(firstDebugLevel);
      setShowLevelSelect(false);
      setShowSandbox(false);
    } else if (launchMode === 'LEVEL_SELECT') {
      if (tiles.length === 0) {
        loadLevel(ALL_LEVELS[0]);
      }
      setShowLevelSelect(true);
      setShowSandbox(false);
    } else if (launchMode === 'SANDBOX') {
      if (tiles.length === 0) {
        loadLevel(ALL_LEVELS[0]);
      }
      setShowSandbox(true);
      setShowLevelSelect(false);
    } else {
      const firstLevel = ALL_LEVELS[0];
      const alreadyCleanOnFirst =
        currentLevel.id === firstLevel.id &&
        tiles.length > 0 &&
        executionHistory.length === 0 &&
        crystalsCollected === 0 &&
        !isVictory &&
        robotState.x === firstLevel.startPos.x &&
        robotState.y === firstLevel.startPos.y &&
        robotState.dir === firstLevel.startDir;

      if (!alreadyCleanOnFirst) {
        loadLevel(firstLevel);
      }
      setShowLevelSelect(false);
      setShowSandbox(false);
    }
  }, [
    launchMode,
    launchNonce,
    loadLevel,
    currentLevel.id,
    tiles.length,
    executionHistory.length,
    crystalsCollected,
    isVictory,
    robotState,
  ]);

  // Trigger walkthrough replay when requested from GuideModal
  const lastWalkthroughNonceRef = useRef(0);
  useEffect(() => {
    if (walkthroughReplayNonce > lastWalkthroughNonceRef.current) {
      lastWalkthroughNonceRef.current = walkthroughReplayNonce;
      const t = setTimeout(() => setShowWalkthrough(true), 120);
      return () => clearTimeout(t);
    }
  }, [walkthroughReplayNonce]);

  const handleLoadStarterCode = useCallback(() => {
    const cloneWithIds = (list: BlockCommand[], prefix: string): BlockCommand[] =>
      list.map((b) => ({
        ...b,
        id: `${prefix}-${Math.random().toString(36).substring(2, 8)}`,
        children: b.children ? cloneWithIds(b.children, prefix) : undefined,
        elseChildren: b.elseChildren ? cloneWithIds(b.elseChildren, prefix) : undefined,
      }));

    if (currentLevel.starterBlocks) {
      setMainBlocks(cloneWithIds(currentLevel.starterBlocks.main, 'st'));
      setF1Blocks(
        currentLevel.starterBlocks.f1
          ? cloneWithIds(currentLevel.starterBlocks.f1, 'st')
          : []
      );
      setF2Blocks(
        currentLevel.starterBlocks.f2
          ? cloneWithIds(currentLevel.starterBlocks.f2, 'st')
          : []
      );
      sounds.playClick();
    } else if (currentLevel.isDebuggingChallenge && currentLevel.buggySolution) {
      setMainBlocks(cloneWithIds(currentLevel.buggySolution.main, 'dbg'));
      setF1Blocks(
        currentLevel.buggySolution.f1
          ? cloneWithIds(currentLevel.buggySolution.f1, 'dbg')
          : []
      );
      setF2Blocks(
        currentLevel.buggySolution.f2
          ? cloneWithIds(currentLevel.buggySolution.f2, 'dbg')
          : []
      );
      sounds.playClick();
    }
  }, [currentLevel]);

  const resetLevelState = useCallback(() => {
    simulationRunIdRef.current += 1;
    setAutoRunCountdown(null);
    setIsSimulating(false);
    setIsVictory(false);
    setShowVictoryModal(false);
    setNewlyUnlockedBadges([]);
    setSimulationErrorMessage(null);
    setActiveExecutingBlockId(undefined);
    setActiveAction('RESET');

    if (victoryModalTimerRef.current) {
      clearTimeout(victoryModalTimerRef.current);
      victoryModalTimerRef.current = null;
    }
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    const clonedTiles: TileData[][] = currentLevel.tiles.map((row) =>
      row.map((t) => ({ ...t }))
    );
    setTiles(clonedTiles);

    const initialHeight = clonedTiles[currentLevel.startPos.y]?.[currentLevel.startPos.x]?.height ?? 0;
    setRobotState({
      x: currentLevel.startPos.x,
      y: currentLevel.startPos.y,
      height: initialHeight,
      dir: currentLevel.startDir,
    });
    setCrystalsCollected(0);
    setCurrentVariables({ ...(currentLevel.initialVariables || {}) });
    setCurrentLists({ ...(currentLevel.initialLists || {}) });
    setExecutionHistory([]);
  }, [currentLevel]);

  const executeStep = useCallback((step: ExecutionStep) => {
    setActiveExecutingBlockId(step.blockId);
    setActiveAction(step.action);
    setExecutionHistory((prev) => [...prev, step]);

    switch (step.action) {
      case 'MOVE_FORWARD':
        sounds.playStep();
        break;
      case 'TURN_LEFT':
      case 'TURN_RIGHT':
        sounds.playTurn();
        break;
      case 'JUMP':
        sounds.playJump();
        break;
      case 'COLLECT':
        if (step.status === 'SUCCESS') {
          sounds.playCollect();
        }
        break;
      case 'TOGGLE_SWITCH':
        sounds.playSwitch();
        break;
      case 'SET_VAR':
      case 'CHANGE_VAR':
        sounds.playClick();
        break;
      case 'REPEAT':
      case 'WHILE_VAR':
      case 'IF_VAR':
      case 'IF_COLOR':
      case 'IF_OBSTACLE':
      case 'READ_LIST':
        if (step.status === 'SUCCESS') {
          sounds.playThink();
        }
        break;
    }

    setRobotState(step.robotState);
    setCrystalsCollected(step.crystalsCollected);

    if (step.variablesSnapshot) {
      setCurrentVariables(step.variablesSnapshot);
    }
    if (step.listsSnapshot) {
      setCurrentLists(step.listsSnapshot);
    }

    if (step.tileStateChanges && step.tileStateChanges.length > 0) {
      setTiles((prev) => {
        const copy = prev.map((row) => row.map((t) => ({ ...t })));
        step.tileStateChanges?.forEach((chg) => {
          if (copy[chg.y]?.[chg.x]) {
            if (chg.hasCrystal !== undefined) copy[chg.y][chg.x].hasCrystal = chg.hasCrystal;
            if (chg.isSwitchActive !== undefined) copy[chg.y][chg.x].isSwitchActive = chg.isSwitchActive;
            if (chg.isHazardActive !== undefined) copy[chg.y][chg.x].isHazardActive = chg.isHazardActive;
          }
        });
        return copy;
      });
    }

    if (
      step.status === 'FALLEN' ||
      step.status === 'BLOCKED' ||
      step.status === 'ZAPPED' ||
      step.status === 'OUT_OF_ENERGY'
    ) {
      sounds.playBump();
      setSimulationErrorMessage(step.message || 'Pergerakan robot terhenti!');
    }
  }, []);

  const recordLevelVictory = useCallback(
    (stars: number, blockCountUsed: number) => {
      const prev = progressRef.current;
      const elapsedMs = Math.max(
        500,
        Math.min(3600000, Math.round(Date.now() - levelStartTimeRef.current))
      );
      const isFastDebug =
        Boolean(currentLevel.isDebuggingChallenge) &&
        (elapsedMs <= 30000 || levelAttemptsRef.current <= 2 || stars === 3);

      const prevStars = prev.completedLevels[currentLevel.id]?.stars || 0;
      const bestBlocks = prev.completedLevels[currentLevel.id]?.bestBlockCount || 999;

      const prevFastest = prev.stats?.fastestMissionMs;
      const isNewPersonalBest =
        !prevFastest || prevFastest <= 0 || elapsedMs < prevFastest;

      const candidate: UserProgress = {
        ...prev,
        completedLevels: {
          ...prev.completedLevels,
          [currentLevel.id]: {
            stars: Math.max(prevStars, stars),
            bestBlockCount: Math.min(bestBlocks, blockCountUsed),
          },
        },
        stats: {
          fastDebugSolves:
            (prev.stats?.fastDebugSolves || 0) + (isFastDebug ? 1 : 0),
          totalPerfectRuns:
            (prev.stats?.totalPerfectRuns || 0) + (stars === 3 ? 1 : 0),
          fastestMissionMs: isNewPersonalBest ? elapsedMs : prevFastest,
          fastestLevelTitle: isNewPersonalBest
            ? currentLevel.title
            : prev.stats?.fastestLevelTitle,
        },
      };

      const { unlockedBadges, newlyUnlocked } = syncUnlockedBadges(candidate);
      const updated: UserProgress = {
        ...candidate,
        unlockedBadges,
      };

      progressRef.current = updated;
      setProgress(updated);
      setNewlyUnlockedBadges(newlyUnlocked);

      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}

      const firebaseUser = auth.currentUser;
      if (firebaseUser && firebaseUser.emailVerified) {
        const displayName =
          updated.userProfile?.displayName ||
          firebaseUser.displayName ||
          firebaseUser.email?.split('@')[0] ||
          'Penjelajah Odibot';
        void syncUserProgressAndLeaderboard(
          firebaseUser.uid,
          firebaseUser.email || updated.userProfile?.email || '',
          displayName,
          updated
        ).catch(() => {});
      }
    },
    [currentLevel, setProgress]
  );

  const finalizeSimulationResult = useCallback(
    (simResult: SimulationResult) => {
      setIsSimulating(false);
      setActiveExecutingBlockId(undefined);
      setActiveAction(undefined);

      if (simResult.success) {
        triggerVictorySequence();

        const usedBlocks = countTotalBlocks(mainBlocks, f1Blocks, f2Blocks);
        const [threeStarLimit, twoStarLimit] = getLevelThresholds(currentLevel);
        let stars = 1;
        if (simResult.totalCrystalsCollected >= simResult.totalCrystalsInLevel) {
          if (usedBlocks <= threeStarLimit) {
            stars = 3;
          } else if (usedBlocks <= twoStarLimit) {
            stars = 2;
          } else {
            stars = 1;
          }
        }
        setStarsEarned(stars);
        recordLevelVictory(stars, usedBlocks);
      } else {
        const failReason =
          simResult.failureReason || 'Misi belum berhasil. Periksa kembali logika kodingmu!';
        sounds.playError();
        setSimulationErrorMessage(failReason);
        recordLevelFailure(failReason);
      }
    },
    [
      mainBlocks,
      f1Blocks,
      f2Blocks,
      currentLevel,
      triggerVictorySequence,
      recordLevelVictory,
      recordLevelFailure,
    ]
  );

  const processNextStep = useCallback((simResult: SimulationResult, runId: number) => {
    if (runId !== simulationRunIdRef.current) return;

    const steps = simulationStepsRef.current;
    const idx = currentStepIndexRef.current;

    if (idx >= steps.length) {
      finalizeSimulationResult(simResult);
      return;
    }

    const currentStep = steps[idx];
    executeStep(currentStep);
    currentStepIndexRef.current = idx + 1;

    if (
      currentStep.status === 'FALLEN' ||
      currentStep.status === 'BLOCKED' ||
      currentStep.status === 'ZAPPED' ||
      currentStep.status === 'OUT_OF_ENERGY'
    ) {
      setIsSimulating(false);
      setActiveAction(undefined);
      recordLevelFailure(currentStep.message || 'Pergerakan robot terhenti!');
      return;
    }

    const isLogicStep =
      currentStep.action === 'REPEAT' ||
      currentStep.action === 'WHILE_VAR' ||
      currentStep.action === 'IF_VAR' ||
      currentStep.action === 'IF_COLOR' ||
      currentStep.action === 'IF_OBSTACLE' ||
      currentStep.action === 'READ_LIST';
    const delay = isLogicStep
      ? simulationSpeed === 4
        ? 110
        : simulationSpeed === 2
        ? 220
        : 420
      : simulationSpeed === 4
      ? 130
      : simulationSpeed === 2
      ? 260
      : 520;
    simulationTimerRef.current = setTimeout(() => {
      processNextStepRef.current(simResult, runId);
    }, delay);
  }, [simulationSpeed, executeStep, finalizeSimulationResult, recordLevelFailure]);

  useEffect(() => {
    processNextStepRef.current = processNextStep;
  }, [processNextStep]);

  const checkManualVictory = useCallback((rx: number, ry: number, currentTiles: TileData[][]) => {
    const tile = currentTiles[ry]?.[rx];
    if (tile && tile.type === 'GOAL') {
      let remaining = 0;
      currentTiles.forEach((row) => {
        row.forEach((t) => {
          if (t.hasCrystal) remaining++;
        });
      });

      if (remaining === 0) {
        triggerVictorySequence();
        setStarsEarned(3);
        recordLevelVictory(3, 1);
      }
    }
  }, [triggerVictorySequence, recordLevelVictory]);

  const handleManualAction = useCallback((action: CommandType) => {
    if (isSimulating || isVictory) return;
    setSimulationErrorMessage(null);

    const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
      NORTH: { dx: 0, dy: -1 },
      EAST: { dx: 1, dy: 0 },
      SOUTH: { dx: 0, dy: 1 },
      WEST: { dx: -1, dy: 0 },
    };

    const ROTATE_LEFT: Record<Direction, Direction> = {
      NORTH: 'WEST',
      WEST: 'SOUTH',
      SOUTH: 'EAST',
      EAST: 'NORTH',
    };

    const ROTATE_RIGHT: Record<Direction, Direction> = {
      NORTH: 'EAST',
      EAST: 'SOUTH',
      SOUTH: 'WEST',
      WEST: 'NORTH',
    };

    if (action === 'TURN_LEFT') {
      sounds.playTurn();
      setActiveAction('TURN_LEFT');
      setRobotState((prev) => ({
        ...prev,
        dir: ROTATE_LEFT[prev.dir],
      }));
      return;
    }

    if (action === 'TURN_RIGHT') {
      sounds.playTurn();
      setActiveAction('TURN_RIGHT');
      setRobotState((prev) => ({
        ...prev,
        dir: ROTATE_RIGHT[prev.dir],
      }));
      return;
    }

    if (action === 'MOVE_FORWARD' || action === 'JUMP') {
      const vec = DIR_VECTORS[robotState.dir];
      const nx = robotState.x + vec.dx;
      const ny = robotState.y + vec.dy;

      if (
        nx < 0 ||
        nx >= currentLevel.gridWidth ||
        ny < 0 ||
        ny >= currentLevel.gridHeight ||
        !tiles[ny]?.[nx] ||
        tiles[ny][nx].type === 'EMPTY'
      ) {
        sounds.playBump();
        setSimulationErrorMessage('Kodi tidak bisa melangkah ke sana, itu jurang ruang hampa!');
        return;
      }

      const targetTile = tiles[ny][nx];

      if (action === 'MOVE_FORWARD') {
        if (targetTile.height > robotState.height) {
          sounds.playBump();
          setSimulationErrorMessage('Tebing terlalu tinggi! Gunakan tombol "Lompat" untuk mendaki.');
          return;
        }
        if (targetTile.height < robotState.height) {
          sounds.playBump();
          setSimulationErrorMessage('Tebing curam! Gunakan tombol "Lompat" untuk turun aman.');
          return;
        }
      } else {
        if (targetTile.height > robotState.height + 1) {
          sounds.playBump();
          setSimulationErrorMessage('Dinding terlalu tinggi (+2 tingkat)! Lompatan hanya menjangkau selisih 1 tingkat.');
          return;
        }
      }

      if (targetTile.type === 'HAZARD' && targetTile.isHazardActive) {
        sounds.playBump();
        setSimulationErrorMessage('Awas! Laser merah menyengat Kodi! Aktifkan saklar terlebih dahulu.');
        return;
      }

      if (action === 'MOVE_FORWARD' && currentVariables['baterai'] !== undefined) {
        if (currentVariables['baterai'] <= 0) {
          sounds.playBump();
          setSimulationErrorMessage('Baterai Kodi habis (0)! Silakan atur ulang level (R).');
          return;
        }
        setCurrentVariables((prev) => ({
          ...prev,
          baterai: Math.max(0, (prev.baterai || 0) - 1),
          ...(prev.langkah !== undefined ? { langkah: (prev.langkah || 0) + 1 } : {}),
        }));
      } else if (currentVariables['langkah'] !== undefined) {
        setCurrentVariables((prev) => ({
          ...prev,
          langkah: (prev.langkah || 0) + 1,
        }));
      }

      if (action === 'MOVE_FORWARD') {
        sounds.playStep();
        setActiveAction('MOVE_FORWARD');
      } else {
        sounds.playJump();
        setActiveAction('JUMP');
      }

      setRobotState({
        x: nx,
        y: ny,
        height: targetTile.height,
        dir: robotState.dir,
      });

      let updatedTiles = tiles;
      if (targetTile.type === 'SWITCH' && !targetTile.isSwitchActive) {
        sounds.playSwitch();
        updatedTiles = tiles.map((row) => row.map((t) => ({ ...t })));
        const sw = updatedTiles[ny][nx];
        sw.isSwitchActive = true;

        if (sw.switchTargetCoords && sw.switchTargetCoords.length > 0) {
          sw.switchTargetCoords.forEach((coord) => {
            const ht = updatedTiles[coord.y]?.[coord.x];
            if (ht && ht.type === 'HAZARD') {
              ht.isHazardActive = false;
            }
          });
        } else {
          updatedTiles.forEach((row) => {
            row.forEach((t) => {
              if (t.type === 'HAZARD') {
                t.isHazardActive = false;
              }
            });
          });
        }
        setTiles(updatedTiles);
        setCurrentVariables((prev) => ({
          ...prev,
          ...(prev.saklar_aktif !== undefined ? { saklar_aktif: 1 } : {}),
          ...(prev.saklar1 !== undefined && nx <= 2 ? { saklar1: 1 } : {}),
          ...(prev.saklar2 !== undefined && nx > 2 ? { saklar2: 1 } : {}),
        }));
      }

      checkManualVictory(nx, ny, updatedTiles);
      return;
    }

    if (action === 'TOGGLE_SWITCH') {
      const curTile = tiles[robotState.y]?.[robotState.x];
      if (curTile && curTile.type === 'SWITCH') {
        if (curTile.isSwitchActive) {
          sounds.playClick();
          setSimulationErrorMessage('Saklar ini sudah aktif dan gerbang laser sudah terbuka!');
          return;
        }
        sounds.playSwitch();
        setActiveAction('TOGGLE_SWITCH');
        const updatedTiles = tiles.map((row) => row.map((t) => ({ ...t })));
        const sw = updatedTiles[robotState.y][robotState.x];
        sw.isSwitchActive = true;

        if (sw.switchTargetCoords && sw.switchTargetCoords.length > 0) {
          sw.switchTargetCoords.forEach((coord) => {
            const ht = updatedTiles[coord.y]?.[coord.x];
            if (ht && ht.type === 'HAZARD') {
              ht.isHazardActive = false;
            }
          });
        } else {
          updatedTiles.forEach((row) => {
            row.forEach((t) => {
              if (t.type === 'HAZARD') {
                t.isHazardActive = false;
              }
            });
          });
        }
        setTiles(updatedTiles);
        setCurrentVariables((prev) => ({
          ...prev,
          ...(prev.saklar_aktif !== undefined ? { saklar_aktif: 1 } : {}),
          ...(prev.saklar1 !== undefined && robotState.x <= 2 ? { saklar1: 1 } : {}),
          ...(prev.saklar2 !== undefined && robotState.x > 2 ? { saklar2: 1 } : {}),
        }));
      } else {
        sounds.playBump();
        setSimulationErrorMessage('Tidak ada saklar laser di ubin ini!');
      }
      return;
    }

    if (action === 'COLLECT') {
      const curTile = tiles[robotState.y]?.[robotState.x];
      if (curTile && curTile.hasCrystal) {
        sounds.playCollect();
        setActiveAction('COLLECT');
        const updatedTiles = tiles.map((row) => row.map((t) => ({ ...t })));
        if (updatedTiles[robotState.y]?.[robotState.x]) {
          updatedTiles[robotState.y][robotState.x].hasCrystal = false;
        }
        setTiles(updatedTiles);
        setCrystalsCollected((prev) => prev + 1);
        setCurrentVariables((vars) => {
          if (vars['kristal'] !== undefined) {
            return { ...vars, kristal: (vars.kristal || 0) + 1 };
          }
          return vars;
        });
        checkManualVictory(robotState.x, robotState.y, updatedTiles);
      } else {
        sounds.playBump();
        setSimulationErrorMessage('Tidak ada kristal di ubin ini!');
      }
    }
  }, [
    isSimulating,
    isVictory,
    robotState,
    currentLevel,
    tiles,
    currentVariables,
    checkManualVictory,
  ]);

  const handleRunCode = useCallback(() => {
    if (isSimulating) {
      simulationRunIdRef.current += 1;
      setIsSimulating(false);
      setActiveExecutingBlockId(undefined);
      setActiveAction(undefined);
      if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      return;
    }

    resetLevelState();
    sounds.playClick();

    if (mainBlocks.length === 0) {
      setSimulationErrorMessage('Susun minimal 1 balok perintah di Program Utama sebelum menjalankan Odibot!');
      return;
    }

    levelAttemptsRef.current += 1;
    runFailureRecordedRef.current = false;
    const simResult = runSimulation(currentLevel, mainBlocks, f1Blocks, f2Blocks);
    const runId = ++simulationRunIdRef.current;
    currentSimResultRef.current = simResult;
    simulationStepsRef.current = simResult.steps;
    currentStepIndexRef.current = 0;
    setIsSimulating(true);
    setMobileTab('ARENA');

    simulationTimerRef.current = setTimeout(() => {
      processNextStep(simResult, runId);
    }, 180);
  }, [
    isSimulating,
    mainBlocks,
    f1Blocks,
    f2Blocks,
    currentLevel,
    resetLevelState,
    processNextStep,
  ]);

  const handleStepOnce = useCallback(() => {
    sounds.playClick();
    if (!isSimulating) {
      if (mainBlocks.length === 0) {
        setSimulationErrorMessage('Susun minimal 1 balok perintah terlebih dahulu!');
        return;
      }
      resetLevelState();
      levelAttemptsRef.current += 1;
      runFailureRecordedRef.current = false;
      const simResult = runSimulation(currentLevel, mainBlocks, f1Blocks, f2Blocks);
      const runId = ++simulationRunIdRef.current;
      currentSimResultRef.current = simResult;
      simulationStepsRef.current = simResult.steps;
      currentStepIndexRef.current = 0;
      setIsSimulating(true);
      setMobileTab('ARENA');

      simulationTimerRef.current = setTimeout(() => {
        if (runId !== simulationRunIdRef.current) return;
        if (simResult.steps.length > 0) {
          const step0 = simResult.steps[0];
          executeStep(step0);
          currentStepIndexRef.current = 1;
          if (
            step0.status === 'FALLEN' ||
            step0.status === 'BLOCKED' ||
            step0.status === 'ZAPPED' ||
            step0.status === 'OUT_OF_ENERGY'
          ) {
            setIsSimulating(false);
            recordLevelFailure(step0.message || 'Pergerakan robot terhenti!');
          } else if (simResult.steps.length === 1) {
            finalizeSimulationResult(simResult);
          }
        } else {
          finalizeSimulationResult(simResult);
        }
      }, 150);
      return;
    }

    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    const steps = simulationStepsRef.current;
    const idx = currentStepIndexRef.current;
    const simResult = currentSimResultRef.current;

    if (idx < steps.length) {
      const step = steps[idx];
      executeStep(step);
      currentStepIndexRef.current = idx + 1;
      if (
        step.status === 'FALLEN' ||
        step.status === 'BLOCKED' ||
        step.status === 'ZAPPED' ||
        step.status === 'OUT_OF_ENERGY'
      ) {
        setIsSimulating(false);
        recordLevelFailure(step.message || 'Pergerakan robot terhenti!');
      } else if (idx + 1 >= steps.length && simResult) {
        finalizeSimulationResult(simResult);
      }
    } else if (simResult) {
      finalizeSimulationResult(simResult);
    } else {
      setIsSimulating(false);
      setActiveExecutingBlockId(undefined);
    }
  }, [
    isSimulating,
    mainBlocks,
    f1Blocks,
    f2Blocks,
    currentLevel,
    resetLevelState,
    executeStep,
    finalizeSimulationResult,
    recordLevelFailure,
  ]);

  const hasNextLevel = useMemo(() => {
    const currentIdx = ALL_LEVELS.findIndex((l) => l.id === currentLevel.id);
    return currentIdx !== -1 && currentIdx + 1 < ALL_LEVELS.length;
  }, [currentLevel.id]);

  const handleNextLevel = () => {
    const currentIdx = ALL_LEVELS.findIndex((l) => l.id === currentLevel.id);
    if (currentIdx !== -1 && currentIdx + 1 < ALL_LEVELS.length) {
      loadLevel(ALL_LEVELS[currentIdx + 1]);
    } else {
      setIsVictory(false);
      setShowVictoryModal(false);
      setShowLevelSelect(true);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('odibot_autorun_v2', String(autoRunEnabled));
    } catch {}
    if (!autoRunEnabled) {
      setAutoRunCountdown(null);
    }
  }, [autoRunEnabled]);

  useEffect(() => {
    handleRunCodeRef.current = handleRunCode;
  }, [handleRunCode]);

  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  const codeSignature = useMemo(() => {
    if (!autoRunEnabled || isVictory || mainBlocks.length === 0) {
      return '';
    }
    return JSON.stringify({
      levelId: currentLevel.id,
      mainBlocks,
      f1Blocks,
      f2Blocks,
    });
  }, [autoRunEnabled, isVictory, currentLevel.id, mainBlocks, f1Blocks, f2Blocks]);

  useEffect(() => {
    if (!autoRunEnabled || isVictory) {
      setAutoRunCountdown(null);
      return;
    }
    if (mainBlocks.length === 0) {
      lastAutoRunSignatureRef.current = '';
      setAutoRunCountdown(null);
      return;
    }
    if (codeSignature === lastAutoRunSignatureRef.current) {
      return;
    }

    setAutoRunCountdown(2);
    const countTimer = setTimeout(() => setAutoRunCountdown(1), 800);
    const timer = setTimeout(() => {
      setAutoRunCountdown(null);
      lastAutoRunSignatureRef.current = codeSignature;
      if (!isSimulatingRef.current) {
        handleRunCodeRef.current();
      }
    }, 1600);

    return () => {
      clearTimeout(countTimer);
      clearTimeout(timer);
    };
  }, [codeSignature, mainBlocks.length, autoRunEnabled, isVictory]);

  const levelFeatureGuides = useMemo(
    () => getLevelFeatureGuides(currentLevel),
    [currentLevel]
  );

  const anyModalOpen =
    showWalkthrough ||
    activeFeatureGuides.length > 0 ||
    showLevelTips ||
    showLevelSelect ||
    showHintModal ||
    showSandbox ||
    externalModalOpen ||
    isVictory;

  // Launch interactive walkthrough automatically on first mission entry
  useEffect(() => {
    if (walkthroughDone || anyModalOpen) {
      return;
    }
    const timer = setTimeout(() => {
      setShowWalkthrough(true);
    }, 220);
    return () => clearTimeout(timer);
  }, [walkthroughDone, anyModalOpen]);

  // Auto-show feature guide whenever the player enters a level with an unseen feature (e.g. F1, F2, Jump, Repeat, Debug)
  useEffect(() => {
    if (!walkthroughDone || anyModalOpen || levelFeatureGuides.length === 0) {
      return;
    }
    const unseen = levelFeatureGuides.filter((g) => !seenFeatures.includes(g.id));
    if (unseen.length === 0) return;

    const timer = setTimeout(() => {
      setActiveFeatureGuides(unseen);
    }, 260);
    return () => clearTimeout(timer);
  }, [walkthroughDone, anyModalOpen, levelFeatureGuides, seenFeatures]);

  const handleCompleteWalkthrough = useCallback(() => {
    setShowWalkthrough(false);
    setWalkthroughDone(true);
    try {
      localStorage.setItem('odibot_walkthrough_done_v1', 'true');
    } catch {}
  }, []);

  const handleCloseFeatureGuide = useCallback(() => {
    setSeenFeatures((prev) => {
      const newIds = activeFeatureGuides
        .map((g) => g.id)
        .filter((id) => !prev.includes(id));
      if (newIds.length === 0) return prev;
      const updated = [...prev, ...newIds];
      try {
        localStorage.setItem('odibot_seen_features_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setActiveFeatureGuides([]);
  }, [activeFeatureGuides]);

  const handleOpenCurrentFeatureGuides = useCallback(() => {
    if (levelFeatureGuides.length === 0) return;
    setActiveFeatureGuides(levelFeatureGuides);
  }, [levelFeatureGuides]);

  const featureGuideLabel = useMemo(() => {
    if (levelFeatureGuides.length === 0) return undefined;
    if (currentLevel.allowF1) {
      return currentLevel.allowF2 ? 'Panduan F1/F2' : 'Panduan F1';
    }
    return 'Cara Pakai Fitur';
  }, [levelFeatureGuides.length, currentLevel.allowF1, currentLevel.allowF2]);

  // Keyboard controls for gameplay & in-session modals
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
        if (showLevelTips) setShowLevelTips(false);
        else if (showLevelSelect) setShowLevelSelect(false);
        else if (showHintModal) setShowHintModal(false);
        else if (showSandbox) setShowSandbox(false);
        return;
      }

      if (anyModalOpen) return;

      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        handleRunCode();
      } else if (e.code === 'KeyR') {
        if (e.repeat) return;
        e.preventDefault();
        resetLevelState();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleManualAction('MOVE_FORWARD');
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        handleManualAction('TURN_LEFT');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        handleManualAction('TURN_RIGHT');
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        handleManualAction('TURN_RIGHT');
      } else if (e.code === 'KeyJ') {
        e.preventDefault();
        handleManualAction('JUMP');
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        handleManualAction('COLLECT');
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        handleManualAction('TOGGLE_SWITCH');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    anyModalOpen,
    handleRunCode,
    resetLevelState,
    handleManualAction,
    showLevelTips,
    showLevelSelect,
    showHintModal,
    showSandbox,
  ]);

  const totalCrystalsInLevel = useMemo(() => {
    let count = 0;
    currentLevel.tiles.forEach((row) =>
      row.forEach((t) => {
        if (t.hasCrystal) count++;
      })
    );
    return count;
  }, [currentLevel]);

  const totalBlocksUsed = useMemo(
    () => countTotalBlocks(mainBlocks, f1Blocks, f2Blocks),
    [mainBlocks, f1Blocks, f2Blocks]
  );

  const badgeStatuses = useMemo(() => getBadgeStatuses(progress), [progress]);
  const unlockedBadgesCount = useMemo(
    () => badgeStatuses.filter((b) => b.unlocked).length,
    [badgeStatuses]
  );

  const handleOpenConceptForTopic = useCallback(
    (topic?: string) => {
      onOpenConceptModal(topic);
    },
    [onOpenConceptModal]
  );

  const handleToggleAutoRun = useCallback(() => {
    setAutoRunEnabled((prev) => !prev);
  }, []);

  const starterCodeHandler = useMemo(
    () =>
      currentLevel.starterBlocks || currentLevel.isDebuggingChallenge
        ? handleLoadStarterCode
        : undefined,
    [currentLevel, handleLoadStarterCode]
  );

  // Pause background 60fps canvas animation while a modal covers it (keeps UI & menus snappy!)
  const isCanvasPaused =
    showLevelSelect ||
    showHintModal ||
    showSandbox ||
    showLevelTips ||
    externalModalOpen ||
    showWalkthrough ||
    activeFeatureGuides.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header Zone: Breadcrumbs, Level Title, Global Controls */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 border-b border-slate-800 shrink-0 gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            onClick={() => {
              sounds.playClick();
              onBackToTitle();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
            title="Kembali ke Layar Judul"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs min-w-0">
              <span className="font-semibold text-cyan-400 truncate">{currentLevel.zoneName}</span>
              <span className="text-slate-600 shrink-0">/</span>
              <span className="text-slate-400 font-mono shrink-0">Lv {currentLevel.levelNumber}</span>
              {currentLevel.isDebuggingChallenge && (
                <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-semibold hidden sm:flex items-center gap-1 shrink-0">
                  <Bug className="w-3 h-3" />
                  Cari Bug
                </span>
              )}
            </div>
            <h1 className="text-xs sm:text-base font-bold text-white truncate font-display">
              {currentLevel.title}
            </h1>
          </div>
        </div>

        {/* Quick Action Controls in Header */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setShowLevelSelect(true);
            }}
            onMouseEnter={() => void loadLevelSelectModal()}
            onTouchStart={() => void loadLevelSelectModal()}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-xl text-xs font-bold transition-colors min-h-[40px] min-w-[40px]"
            title={`Peta ${ALL_LEVELS.length} Misi Tantangan`}
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{ALL_LEVELS.length} Misi</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setShowHintModal(true);
            }}
            onMouseEnter={() => void loadHintModal()}
            onTouchStart={() => void loadHintModal()}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-amber-300 transition-colors min-h-[40px] min-w-[40px]"
            title="Buka Petunjuk Misi"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Petunjuk</span>
          </button>

          {/* Desktop Only Buttons (hidden on < lg) */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={() => {
                sounds.playClick();
                onOpenGoogleSync();
              }}
              onMouseEnter={() => void loadGoogleCloudSyncModal()}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all min-h-[36px] ${
                progress.userProfile
                  ? 'bg-slate-800/90 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-amber-500/40 hover:border-amber-400'
              }`}
              title="Profil Pengguna, Lencana Prestasi & Google Cloud"
            >
              {progress.userProfile ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Award className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{progress.userProfile ? 'Profil' : 'Profil & Lencana'}</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                {unlockedBadgesCount}/{badgeStatuses.length}
              </span>
              {progress.userProfile && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard();
              }}
              onMouseEnter={() => void loadLeaderboardModal()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors min-h-[36px]"
              title="Papan Peringkat Odibot (Firebase)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Peringkat</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onOpenSkinSelector();
              }}
              onMouseEnter={() => void loadSkinSelectorModal()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-pink-300 hover:text-pink-200 transition-colors min-h-[36px]"
              title="Bengkel Kostum Robot Odibot"
            >
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              <span>Kostum</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onOpenGuide();
              }}
              onMouseEnter={() => void loadGuideModal()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 rounded-xl text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors min-h-[36px]"
              title="Panduan Menggunakan Odibot"
            >
              <BookMarked className="w-3.5 h-3.5 text-cyan-400" />
              <span>Panduan</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onOpenConceptModal();
              }}
              onMouseEnter={() => void loadConceptModal()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 transition-all shadow-sm min-h-[36px]"
              title="Buka Pusat Teori Dasar Koding &amp; KA"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Konsep Koding</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setShowSandbox(true);
              }}
              onMouseEnter={() => void loadSandboxEditor()}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1.5 min-h-[36px]"
              title="Studio Kreatif Sandbox"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Sandbox</span>
            </button>
          </div>

          {/* Mobile / Tablet Dropdown Menu Trigger (< lg) */}
          <div className="relative lg:hidden">
            <button
              onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
              className={`flex items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-colors min-h-[40px] min-w-[40px] justify-center ${
                showMobileMoreMenu
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Menu Lainnya (Google, Kostum, Teori, Sandbox)"
            >
              {showMobileMoreMenu ? <X className="w-4 h-4 text-cyan-400" /> : <Menu className="w-4 h-4 text-cyan-400" />}
            </button>

            {showMobileMoreMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowMobileMoreMenu(false);
                    onOpenGuide();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-cyan-300 transition-colors text-left"
                >
                  <BookMarked className="w-4 h-4 text-cyan-400" />
                  <span>Panduan Menggunakan Odibot</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowMobileMoreMenu(false);
                    onOpenGoogleSync();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-amber-200 transition-colors text-left"
                >
                  <span className="flex items-center gap-2.5">
                    {progress.userProfile ? (
                      <Cloud className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Award className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{progress.userProfile ? 'Profil & Cloud' : 'Profil & Lencana'}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                    {unlockedBadgesCount}/{badgeStatuses.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowMobileMoreMenu(false);
                    onOpenLeaderboard();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-amber-300 transition-colors text-left"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Papan Peringkat</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowMobileMoreMenu(false);
                    onOpenSkinSelector();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-pink-300 transition-colors text-left"
                >
                  <Palette className="w-4 h-4 text-pink-400" />
                  <span>Bengkel Kostum Robot</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowMobileMoreMenu(false);
                    onOpenConceptModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-amber-300 transition-colors text-left"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Pusat Teori Konsep Koding</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowMobileMoreMenu(false);
                    setShowSandbox(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-purple-300 transition-colors text-left"
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Studio Kreatif Sandbox</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Active Learning Concept Bar */}
      <ConceptBar
        level={currentLevel}
        crystalsCollected={crystalsCollected}
        totalCrystalsInLevel={totalCrystalsInLevel}
        totalBlocksUsed={totalBlocksUsed}
        onOpenConceptModal={handleOpenConceptForTopic}
        onOpenFeatureGuide={
          levelFeatureGuides.length > 0 ? handleOpenCurrentFeatureGuides : undefined
        }
        featureGuideLabel={featureGuideLabel}
        onOpenLevelTips={
          levelFailureCount >= 3 ? () => setShowLevelTips(true) : undefined
        }
        onLoadStarterCode={starterCodeHandler}
        isSimulating={isSimulating}
      />

      {/* Error Banner */}
      {simulationErrorMessage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-rose-950/90 border-b border-rose-800/80 text-rose-200 text-xs shrink-0 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{simulationErrorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {levelFailureCount >= 3 && (
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowLevelTips(true);
                }}
                className="px-2.5 py-1.5 min-h-[34px] bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs transition-colors flex items-center gap-1"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Tips Level</span>
              </button>
            )}
            {currentLevel.starterBlocks && (
              <button
                onClick={handleLoadStarterCode}
                className="px-2.5 py-1.5 min-h-[34px] bg-rose-900/60 hover:bg-rose-800 text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Pakai Contoh</span>
              </button>
            )}
            <button
              onClick={resetLevelState}
              className="px-3 py-1.5 min-h-[34px] bg-rose-800 hover:bg-rose-700 text-white rounded-lg font-medium text-xs transition-colors"
            >
              Atur Ulang
            </button>
          </div>
        </div>
      )}

      {/* Mobile View Switcher */}
      <div className="md:hidden flex items-center bg-slate-950 px-2 py-1.5 border-b border-slate-800 gap-1.5 shrink-0">
        <button
          onClick={() => {
            sounds.playClick();
            setMobileTab('ARENA');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
            mobileTab === 'ARENA'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md ring-1 ring-cyan-400/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Arena Robot</span>
        </button>
        <button
          onClick={() => {
            sounds.playClick();
            setMobileTab('CODE');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
            mobileTab === 'CODE'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-1 ring-emerald-400/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Susun Kode ({totalBlocksUsed})</span>
        </button>
      </div>

      {/* Main Playfield Grid */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-1.5 sm:gap-3 p-1.5 sm:p-3 min-h-0 overflow-hidden">
        {/* Left Playfield */}
        <div className={`${mobileTab === 'ARENA' ? 'flex' : 'hidden md:flex'} md:col-span-5 flex flex-col h-full min-h-0 overflow-hidden relative`}>
          {/* Computer Memory HUD */}
          <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-0.5 text-xs text-slate-300 shrink-0 gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div
                key={crystalAnimTick > 0 ? `chip-${crystalAnimTick}` : 'chip-idle'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 border transition-colors ${
                  crystalAnimTick > 0
                    ? 'animate-crystal-chip bg-cyan-950/90 border-cyan-400/80'
                    : crystalsCollected >= totalCrystalsInLevel && totalCrystalsInLevel > 0
                    ? 'bg-emerald-950/50 border-emerald-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span className="text-amber-400 font-bold">💎 Kristal:</span>
                <span className="font-mono font-bold text-white tabular-nums flex items-center gap-0.5">
                  <span
                    key={`num-${crystalsCollected}-${crystalAnimTick}`}
                    className={crystalAnimTick > 0 ? 'animate-crystal-digit text-cyan-300' : ''}
                  >
                    {crystalsCollected}
                  </span>
                  <span className="text-slate-400">/</span>
                  <span>{totalCrystalsInLevel}</span>
                </span>
                {crystalAnimTick > 0 && (
                  <span
                    key={`plus-${crystalAnimTick}`}
                    className="animate-crystal-plus px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black leading-tight"
                  >
                    +1
                  </span>
                )}
              </div>

              {Object.keys(currentVariables).length > 0 && (() => {
                const isBatteryLow =
                  currentVariables['baterai'] !== undefined &&
                  currentVariables['baterai'] < 2;
                return (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 border transition-colors ${
                      isBatteryLow
                        ? 'animate-battery-shake bg-rose-950/90 border-rose-500/90 text-rose-200 shadow-sm shadow-rose-500/25'
                        : 'bg-slate-900 border-teal-800/80 text-teal-300'
                    }`}
                    title={
                      isBatteryLow
                        ? 'Peringatan: Sisa energi baterai robot hampir habis!'
                        : undefined
                    }
                  >
                    <Variable
                      className={`w-3.5 h-3.5 ${
                        isBatteryLow ? 'text-rose-400' : 'text-teal-400'
                      }`}
                    />
                    {Object.entries(currentVariables).map(([k, v]) => {
                      const isThisBatteryLow = k === 'baterai' && v < 2;
                      return (
                        <span
                          key={k}
                          className={`font-mono font-bold ${
                            isThisBatteryLow ? 'text-rose-200' : 'text-white'
                          }`}
                        >
                          {k}={v}
                          {k === 'baterai' && (
                            <Battery
                              className={`w-3.5 h-3.5 inline ml-1 ${
                                isThisBatteryLow
                                  ? 'text-rose-400 animate-pulse'
                                  : 'text-cyan-400'
                              }`}
                            />
                          )}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}

              {Object.keys(currentLists).length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-blue-800/80 rounded-lg text-blue-300 max-w-[220px] sm:max-w-[280px] whitespace-nowrap shrink-0">
                  <ListOrdered className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  {Object.entries(currentLists).map(([k, l]) => (
                    <span key={k} className="font-mono font-bold text-white truncate text-[11px]">
                      {k}=[{l.slice(0, 3).join(', ')}{l.length > 3 ? '...' : ''}]
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
              <span className="text-[11px] text-slate-500 px-1 flex items-center gap-1">
                <Gauge className="w-3 h-3" />
              </span>
              {([1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    sounds.playClick();
                    setSimulationSpeed(spd);
                  }}
                  className={`px-2 py-1 min-h-[28px] rounded text-[11px] font-mono font-bold transition-colors ${
                    simulationSpeed === spd
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Isolated Isometric Canvas Viewport */}
          <div ref={walkthroughArenaRef} className="flex-1 relative min-h-[200px] sm:min-h-[300px]">
            <IsometricCanvas
              level={currentLevel}
              tiles={tiles}
              robotState={robotState}
              isSimulating={isSimulating}
              activeAction={activeAction}
              isVictory={isVictory}
              celebratingVictory={isVictory}
              onManualAction={handleManualAction}
              skinId={progress.customSkin || 'CYAN'}
              autoRunCountdown={autoRunCountdown}
              autoRunEnabled={autoRunEnabled}
              isPaused={isCanvasPaused}
            />

            {isVictory && !showVictoryModal && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center px-4 z-20 animate-in zoom-in-90 fade-in duration-300">
                <div className="px-5 py-2.5 rounded-2xl bg-slate-950/90 border border-amber-400/70 shadow-2xl shadow-amber-500/25 flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '2.5s' }} />
                  <div className="text-left">
                    <div className="text-sm sm:text-base font-black font-display text-amber-300 tracking-wide">
                      MISI SELESAI!
                    </div>
                    <div className="text-[11px] text-cyan-200 font-medium">
                      Menghitung perolehan bintang...
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Bottom Playback Bar */}
          <div
            ref={walkthroughDesktopPlaybackRef}
            className="hidden md:flex items-center justify-between mt-2 pt-1 gap-2 shrink-0"
          >
            <button
              onClick={resetLevelState}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
              title="Atur Ulang Posisi (R)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset Posisi</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStepOnce}
                disabled={isVictory}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                title="Jalankan 1 Langkah Saja (Debug Step)"
              >
                <StepForward className="w-4 h-4" />
                <span>Langkah Demi Langkah</span>
              </button>

              <button
                onClick={handleRunCode}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold font-display shadow-lg transition-all ${
                  isSimulating
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 transform hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                <Play className={`w-4 h-4 fill-current ${isSimulating ? 'animate-pulse' : ''}`} />
                <span>{isSimulating ? 'Hentikan' : 'Jalankan Program (Space)'}</span>
              </button>
            </div>
          </div>

          {/* Cyber Terminal Inspector */}
          <div className="mt-1.5 sm:mt-2 shrink-0">
            <CyberTerminalInspector
              level={currentLevel}
              robotState={robotState}
              variables={currentVariables}
              lists={currentLists}
              crystalsCollected={crystalsCollected}
              totalCrystals={totalCrystalsInLevel}
              activeAction={activeAction}
              isSimulating={isSimulating}
              historySteps={executionHistory}
            />
          </div>
        </div>

        {/* Right Panel: Block Workspace */}
        <div
          ref={walkthroughWorkspaceRef}
          className={`${mobileTab === 'CODE' ? 'flex' : 'hidden md:flex'} md:col-span-7 flex flex-col h-full min-h-0 overflow-hidden`}
        >
          <BlockWorkspace
            level={currentLevel}
            mainBlocks={mainBlocks}
            f1Blocks={f1Blocks}
            f2Blocks={f2Blocks}
            setMainBlocks={setMainBlocks}
            setF1Blocks={setF1Blocks}
            setF2Blocks={setF2Blocks}
            activeExecutingBlockId={activeExecutingBlockId}
            isSimulating={isSimulating}
            onLoadStarterCode={starterCodeHandler}
            autoRunEnabled={autoRunEnabled}
            onToggleAutoRun={handleToggleAutoRun}
            autoRunCountdown={autoRunCountdown}
            onRunCode={handleRunCode}
          />
        </div>
      </div>

      {/* Unified Mobile Thumb-Zone Bottom Dock */}
      <div
        ref={walkthroughMobileDockRef}
        className="md:hidden px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-slate-900/95 border-t border-slate-800 flex items-center gap-2 shrink-0"
      >
        <button
          onClick={resetLevelState}
          className="min-h-[44px] min-w-[44px] px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
          title="Reset Posisi Robot"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden min-[380px]:inline">Reset</span>
        </button>

        <button
          onClick={handleStepOnce}
          disabled={isVictory}
          className="min-h-[44px] px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shrink-0"
          title="Jalankan 1 Langkah"
        >
          <StepForward className="w-4 h-4" />
          <span>1 Langkah</span>
        </button>

        <button
          onClick={handleRunCode}
          className={`flex-1 min-h-[44px] px-4 rounded-xl text-xs font-black tracking-wide font-display flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all ${
            isSimulating
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
              : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/25'
          }`}
        >
          <Play className={`w-4 h-4 fill-current ${isSimulating ? 'animate-pulse' : ''}`} />
          <span>{isSimulating ? 'HENTIKAN' : 'JALANKAN'}</span>
        </button>
      </div>

      {/* Subtle Developer Attribution Bar */}
      <footer className="hidden md:flex px-4 py-1 bg-slate-950/90 border-t border-slate-900 items-center justify-between text-[11px] text-slate-500 shrink-0">
        <span className="truncate">Odibot Adventure · Dasar Pelajaran Koding dan Kecerdasan Artifisial (KA)</span>
        <span className="text-slate-400 font-medium truncate">
          Pengembang: <span className="text-cyan-400 font-semibold">Wahyu Dwi Aji, S.Pd., M.Pd.</span>
        </span>
      </footer>

      <Suspense fallback={<ModalFallback />}>
        {isVictory && showVictoryModal && (
          <VictoryModal
            level={currentLevel}
            starsEarned={starsEarned}
            totalBlocksUsed={totalBlocksUsed}
            crystalsCollected={crystalsCollected}
            totalCrystals={totalCrystalsInLevel}
            newlyUnlockedBadges={newlyUnlockedBadges}
            pythonCode={blocksToPython(
              mainBlocks,
              f1Blocks,
              f2Blocks,
              currentLevel.initialVariables,
              currentLevel.initialLists
            )}
            onNextLevel={handleNextLevel}
            onReplay={resetLevelState}
            hasNextLevel={hasNextLevel}
            onOpenLevelSelect={() => {
              setIsVictory(false);
              setShowVictoryModal(false);
              setShowLevelSelect(true);
            }}
          />
        )}

        {showLevelSelect && (
          <LevelSelectModal
            currentLevelId={currentLevel.id}
            progress={progress}
            onSelectLevel={(lvl) => loadLevel(lvl)}
            onClose={() => setShowLevelSelect(false)}
          />
        )}

        {showHintModal && (
          <HintModal
            level={currentLevel}
            onClose={() => setShowHintModal(false)}
          />
        )}

        {showSandbox && (
          <SandboxEditor
            onPlayCustomLevel={(lvl) => {
              setShowSandbox(false);
              loadLevel(lvl);
            }}
            onClose={() => setShowSandbox(false)}
          />
        )}

        {showLevelTips && (
          <LevelTipsModal
            level={currentLevel}
            failureCount={Math.max(3, levelFailureCount)}
            lastFailureReason={lastFailureReason}
            onLoadStarterCode={starterCodeHandler}
            onClose={() => setShowLevelTips(false)}
          />
        )}
      </Suspense>

      {isVictory && <VictoryParticlesCanvas isActive={isVictory} />}

      {showWalkthrough && (
        <MissionWalkthrough
          targets={{
            arenaRef: walkthroughArenaRef,
            workspaceRef: walkthroughWorkspaceRef,
            desktopPlaybackRef: walkthroughDesktopPlaybackRef,
            mobileDockRef: walkthroughMobileDockRef,
          }}
          onEnsureMobileTab={(tab) => setMobileTab(tab)}
          onComplete={handleCompleteWalkthrough}
        />
      )}

      {activeFeatureGuides.length > 0 && (
        <FeatureGuideOverlay
          guides={activeFeatureGuides}
          targets={{
            arenaRef: walkthroughArenaRef,
            workspaceRef: walkthroughWorkspaceRef,
            desktopPlaybackRef: walkthroughDesktopPlaybackRef,
            mobileDockRef: walkthroughMobileDockRef,
          }}
          onEnsureMobileTab={(tab) => setMobileTab(tab)}
          onClose={handleCloseFeatureGuide}
        />
      )}
    </div>
  );
};
