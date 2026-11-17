import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { ALL_LEVELS } from './data/levels';
import {
  BlockCommand,
  CommandType,
  Direction,
  ExecutionStep,
  LevelDefinition,
  RobotSkinId,
  TileData,
  UserProgress,
} from './types/game';
import { runSimulation, SimulationResult } from './utils/simulation';
import { countTotalBlocks, blocksToPython, getLevelThresholds } from './utils/codeConverter';
export { getLevelThresholds };
import { sounds } from './utils/audio';

import { IsometricCanvas } from './components/IsometricCanvas';
import { BlockWorkspace } from './components/BlockWorkspace';
import { TitleScreen } from './components/TitleScreen';
import { ConceptBar } from './components/ConceptBar';
import { CyberTerminalInspector } from './components/CyberTerminalInspector';

const VictoryModal = lazy(() =>
  import('./components/VictoryModal').then((m) => ({ default: m.VictoryModal }))
);
const LevelSelectModal = lazy(() =>
  import('./components/LevelSelectModal').then((m) => ({ default: m.LevelSelectModal }))
);
const HintModal = lazy(() =>
  import('./components/HintModal').then((m) => ({ default: m.HintModal }))
);
const SandboxEditor = lazy(() =>
  import('./components/SandboxEditor').then((m) => ({ default: m.SandboxEditor }))
);
const ConceptModal = lazy(() =>
  import('./components/ConceptModal').then((m) => ({ default: m.ConceptModal }))
);
const GoogleCloudSyncModal = lazy(() =>
  import('./components/GoogleCloudSyncModal').then((m) => ({ default: m.GoogleCloudSyncModal }))
);
const SkinSelectorModal = lazy(() =>
  import('./components/SkinSelectorModal').then((m) => ({ default: m.SkinSelectorModal }))
);

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
  Cloud,
  Palette,
  CheckCircle2,
  Menu,
  X,
  Bot,
  Code2,
} from 'lucide-react';

type GameScreen = 'TITLE' | 'PLAYING';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [currentLevel, setCurrentLevel] = useState<LevelDefinition>(ALL_LEVELS[0]);

  // Saved progress (sanitized so old/corrupt localStorage never crashes)
  const [progress, setProgress] = useState<UserProgress>(() => {
    const defaultProgress: UserProgress = {
      completedLevels: {},
      currentLevelId: ALL_LEVELS[0].id,
      unlockedZones: ['zone-1'],
    };
    try {
      const saved = localStorage.getItem('kodibot_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
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
        }
      }
    } catch {}
    return defaultProgress;
  });

  // Level runtime state
  const [tiles, setTiles] = useState<TileData[][]>([]);
  const [robotState, setRobotState] = useState<{
    x: number;
    y: number;
    height: number;
    dir: Direction;
  }>({ x: 0, y: 0, height: 0, dir: 'EAST' });
  const [crystalsCollected, setCrystalsCollected] = useState(0);

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
  const [starsEarned, setStarsEarned] = useState(0);

  // Modals
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [showSkinSelectorModal, setShowSkinSelectorModal] = useState(false);
  const [activeConceptTopic, setActiveConceptTopic] = useState<string | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(() => sounds.getMuted());

  // Auto-Run (Jalan Otomatis) State & Countdown - ALWAYS default FALSE with v2 key so old 'true' in localStorage never auto-runs robot
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

  // Total stars calculated across all levels
  const totalStars = Object.values(progress.completedLevels).reduce(
    (acc, curr) => acc + (curr?.stars || 0),
    0
  );

  // Cyber Terminal Execution History (Trace Table & Console Log)
  const [executionHistory, setExecutionHistory] = useState<ExecutionStep[]>([]);

  // Step simulation queue and runner ref
  const simulationStepsRef = useRef<ExecutionStep[]>([]);
  const currentSimResultRef = useRef<SimulationResult | null>(null);
  const currentStepIndexRef = useRef<number>(0);
  const simulationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationRunIdRef = useRef<number>(0);
  const lastAutoRunSignatureRef = useRef<string>('');
  const processNextStepRef = useRef<(simResult: SimulationResult, runId: number) => void>(() => {});
  const handleRunCodeRef = useRef<() => void>(() => {});
  const isSimulatingRef = useRef<boolean>(false);

  // Load a level and configure initial state
  const loadLevel = useCallback((level: LevelDefinition) => {
    simulationRunIdRef.current += 1;
    lastAutoRunSignatureRef.current = '';
    setAutoRunCountdown(null);
    setCurrentLevel(level);
    setIsSimulating(false);
    setIsVictory(false);
    setSimulationErrorMessage(null);
    setActiveExecutingBlockId(undefined);
    setActiveAction('RESET');
    setExecutionHistory([]);

    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    // Clone tiles
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

    // Kosongkan kotak kode ketika pindah misi berikutnya (user request).
    // Khusus tantangan 'Debugging' (isDebuggingChallenge), muat kode yang sengaja salah untuk diperbaiki.
    // Contoh solusi untuk misi biasa tetap bisa dibuka siswa lewat tombol '💡 Contoh Solusi'.
    if (level.isDebuggingChallenge && level.buggySolution) {
      const buggyMain = level.buggySolution.main.map((b) => ({
        ...b,
        id: 'dbg-' + Math.random().toString(36).substring(2, 7),
      }));
      const buggyF1 = level.buggySolution.f1
        ? level.buggySolution.f1.map((b) => ({
            ...b,
            id: 'dbg-' + Math.random().toString(36).substring(2, 7),
          }))
        : [];
      setMainBlocks(buggyMain);
      setF1Blocks(buggyF1);
      setF2Blocks([]);
      lastAutoRunSignatureRef.current = JSON.stringify({
        levelId: level.id,
        mainBlocks: buggyMain,
        f1Blocks: buggyF1,
        f2Blocks: [],
      });
    } else {
      setMainBlocks([]);
      setF1Blocks([]);
      setF2Blocks([]);
    }
  }, []);

  // Initialize first level on mount
  useEffect(() => {
    loadLevel(ALL_LEVELS[0]);
  }, [loadLevel]);

  // Restore starter code on user request
  const handleLoadStarterCode = useCallback(() => {
    if (currentLevel.starterBlocks) {
      setMainBlocks(
        currentLevel.starterBlocks.main.map((b) => ({
          ...b,
          id: 'st-' + Math.random().toString(36).substring(2, 7),
        }))
      );
      setF1Blocks(
        currentLevel.starterBlocks.f1
          ? currentLevel.starterBlocks.f1.map((b) => ({
              ...b,
              id: 'st-' + Math.random().toString(36).substring(2, 7),
            }))
          : []
      );
      setF2Blocks([]);
      sounds.playClick();
    } else if (currentLevel.isDebuggingChallenge && currentLevel.buggySolution) {
      setMainBlocks(
        currentLevel.buggySolution.main.map((b) => ({
          ...b,
          id: 'dbg-' + Math.random().toString(36).substring(2, 7),
        }))
      );
      setF1Blocks(
        currentLevel.buggySolution.f1
          ? currentLevel.buggySolution.f1.map((b) => ({
              ...b,
              id: 'dbg-' + Math.random().toString(36).substring(2, 7),
            }))
          : []
      );
      setF2Blocks([]);
      sounds.playClick();
    }
  }, [currentLevel]);

  // Reset current level to beginning without clearing student's code
  const resetLevelState = useCallback(() => {
    simulationRunIdRef.current += 1;
    setAutoRunCountdown(null);
    setIsSimulating(false);
    setIsVictory(false);
    setSimulationErrorMessage(null);
    setActiveExecutingBlockId(undefined);
    setActiveAction('RESET');

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

  // Execute a single step in simulation
  const executeStep = useCallback((step: ExecutionStep) => {
    setActiveExecutingBlockId(step.blockId);
    setActiveAction(step.action);
    setExecutionHistory((prev) => [...prev, step]);

    // Sound effect
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
    }

    // Update robot position and crystals
    setRobotState(step.robotState);
    setCrystalsCollected(step.crystalsCollected);

    // Update live memory variables and lists HUD
    if (step.variablesSnapshot) {
      setCurrentVariables(step.variablesSnapshot);
    }
    if (step.listsSnapshot) {
      setCurrentLists(step.listsSnapshot);
    }

    // Apply tile changes
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

    // Handle failure statuses
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

  // Shared simulation completion handler (used by both auto-run/Run and Step-by-Step)
  const finalizeSimulationResult = useCallback(
    (simResult: SimulationResult) => {
      setIsSimulating(false);
      setActiveExecutingBlockId(undefined);

      if (simResult.success) {
        sounds.playVictory();
        setIsVictory(true);

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

        setProgress((prev) => {
          const prevStars = prev.completedLevels[currentLevel.id]?.stars || 0;
          const bestBlocks = prev.completedLevels[currentLevel.id]?.bestBlockCount || 999;
          const updated: UserProgress = {
            ...prev,
            completedLevels: {
              ...prev.completedLevels,
              [currentLevel.id]: {
                stars: Math.max(prevStars, stars),
                bestBlockCount: Math.min(bestBlocks, usedBlocks),
              },
            },
          };
          try {
            localStorage.setItem('kodibot_progress', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        sounds.playError();
        setSimulationErrorMessage(
          simResult.failureReason || 'Misi belum berhasil. Periksa kembali logika kodingmu!'
        );
      }
    },
    [mainBlocks, f1Blocks, f2Blocks, currentLevel]
  );

  // Process next step in simulation loop
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

    // Stop if failure state encountered
    if (
      currentStep.status === 'FALLEN' ||
      currentStep.status === 'BLOCKED' ||
      currentStep.status === 'ZAPPED' ||
      currentStep.status === 'OUT_OF_ENERGY'
    ) {
      setIsSimulating(false);
      return;
    }

    // Schedule next step with runner reference to prevent stale closures
    const delay = simulationSpeed === 4 ? 130 : simulationSpeed === 2 ? 260 : 520;
    simulationTimerRef.current = setTimeout(() => {
      processNextStepRef.current(simResult, runId);
    }, delay);
  }, [simulationSpeed, executeStep, finalizeSimulationResult]);

  // Keep processNextStepRef updated
  useEffect(() => {
    processNextStepRef.current = processNextStep;
  }, [processNextStep]);

  // Check victory condition on manual direct movement
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
        sounds.playVictory();
        setIsVictory(true);
        setStarsEarned(3);
        setProgress((prev) => {
          const prevStars = prev.completedLevels[currentLevel.id]?.stars || 0;
          const updated: UserProgress = {
            ...prev,
            completedLevels: {
              ...prev.completedLevels,
              [currentLevel.id]: {
                stars: Math.max(prevStars, 3),
                bestBlockCount: Math.min(prev.completedLevels[currentLevel.id]?.bestBlockCount || 999, 1),
              },
            },
          };
          try {
            localStorage.setItem('kodibot_progress', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    }
  }, [currentLevel]);

  // Direct manual walking / action handler (Kemudi Langsung via D-Pad atau Keyboard)
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

      // Check bounds & empty space FIRST before deducting energy
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

      // Check hazard BEFORE deducting battery
      if (targetTile.type === 'HAZARD' && targetTile.isHazardActive) {
        sounds.playBump();
        setSimulationErrorMessage('Awas! Laser merah menyengat Kodi! Aktifkan saklar terlebih dahulu.');
        return;
      }

      // Check battery on MOVE_FORWARD (consistent with simulation engine)
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

      // Move robot state
      setRobotState({
        x: nx,
        y: ny,
        height: targetTile.height,
        dir: robotState.dir,
      });

      // Auto-toggle switch if stepping onto a SWITCH tile manually
      let updatedTiles = tiles;
      if (targetTile.type === 'SWITCH') {
        sounds.playSwitch();
        updatedTiles = tiles.map((row) => row.map((t) => ({ ...t })));
        const sw = updatedTiles[ny][nx];
        const newSwitchState = !sw.isSwitchActive;
        sw.isSwitchActive = newSwitchState;

        if (sw.switchTargetCoords && sw.switchTargetCoords.length > 0) {
          sw.switchTargetCoords.forEach((coord) => {
            const ht = updatedTiles[coord.y]?.[coord.x];
            if (ht && ht.type === 'HAZARD') {
              ht.isHazardActive = !ht.isHazardActive;
            }
          });
        } else {
          updatedTiles.forEach((row) => {
            row.forEach((t) => {
              if (t.type === 'HAZARD') {
                t.isHazardActive = !newSwitchState;
              }
            });
          });
        }
        setTiles(updatedTiles);
        setCurrentVariables((prev) => ({
          ...prev,
          ...(prev.saklar_aktif !== undefined ? { saklar_aktif: newSwitchState ? 1 : 0 } : {}),
          ...(prev.saklar1 !== undefined && nx <= 2 ? { saklar1: newSwitchState ? 1 : 0 } : {}),
          ...(prev.saklar2 !== undefined && nx > 2 ? { saklar2: newSwitchState ? 1 : 0 } : {}),
        }));
      }

      // Check victory
      checkManualVictory(nx, ny, updatedTiles);
      return;
    }

    if (action === 'TOGGLE_SWITCH') {
      const curTile = tiles[robotState.y]?.[robotState.x];
      if (curTile && curTile.type === 'SWITCH') {
        sounds.playSwitch();
        setActiveAction('TOGGLE_SWITCH');
        const updatedTiles = tiles.map((row) => row.map((t) => ({ ...t })));
        const sw = updatedTiles[robotState.y][robotState.x];
        const newSwitchState = !sw.isSwitchActive;
        sw.isSwitchActive = newSwitchState;

        if (sw.switchTargetCoords && sw.switchTargetCoords.length > 0) {
          sw.switchTargetCoords.forEach((coord) => {
            const ht = updatedTiles[coord.y]?.[coord.x];
            if (ht && ht.type === 'HAZARD') {
              ht.isHazardActive = !ht.isHazardActive;
            }
          });
        } else {
          updatedTiles.forEach((row) => {
            row.forEach((t) => {
              if (t.type === 'HAZARD') {
                t.isHazardActive = !newSwitchState;
              }
            });
          });
        }
        setTiles(updatedTiles);
        setCurrentVariables((prev) => ({
          ...prev,
          ...(prev.saklar_aktif !== undefined ? { saklar_aktif: newSwitchState ? 1 : 0 } : {}),
          ...(prev.saklar1 !== undefined && robotState.x <= 2 ? { saklar1: newSwitchState ? 1 : 0 } : {}),
          ...(prev.saklar2 !== undefined && robotState.x > 2 ? { saklar2: newSwitchState ? 1 : 0 } : {}),
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
        setCrystalsCollected((prev) => {
          const nextVal = prev + 1;
          setCurrentVariables((vars) => {
            if (vars['kristal'] !== undefined) {
              return { ...vars, kristal: (vars.kristal || 0) + 1 };
            }
            return vars;
          });
          return nextVal;
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

  // Start running simulation
  const handleRunCode = useCallback(() => {
    if (isSimulating) {
      // Stop simulation cleanly
      simulationRunIdRef.current += 1;
      setIsSimulating(false);
      setActiveExecutingBlockId(undefined);
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

    // Run simulation algorithm
    const simResult = runSimulation(currentLevel, mainBlocks, f1Blocks, f2Blocks);
    const runId = ++simulationRunIdRef.current;
    currentSimResultRef.current = simResult;
    simulationStepsRef.current = simResult.steps;
    currentStepIndexRef.current = 0;
    setIsSimulating(true);
    setMobileTab('ARENA');

    // Give 180ms delay so reset takes effect visually before playing step 0
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

  // Step-by-step debug stepping
  const handleStepOnce = useCallback(() => {
    sounds.playClick();
    if (!isSimulating) {
      if (mainBlocks.length === 0) {
        setSimulationErrorMessage('Susun minimal 1 balok perintah terlebih dahulu!');
        return;
      }
      resetLevelState();
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
          } else if (simResult.steps.length === 1) {
            finalizeSimulationResult(simResult);
          }
        } else {
          finalizeSimulationResult(simResult);
        }
      }, 150);
      return;
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
  ]);

  // Next level navigation
  const handleNextLevel = () => {
    const currentIdx = ALL_LEVELS.findIndex((l) => l.id === currentLevel.id);
    if (currentIdx !== -1 && currentIdx + 1 < ALL_LEVELS.length) {
      loadLevel(ALL_LEVELS[currentIdx + 1]);
    } else {
      setShowLevelSelect(true);
    }
  };

  // Save auto-run preference
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

  // Safe Debounced Auto-Run Effect: ONLY runs ONCE per code edit when student explicitly activates Jalan Otomatis.
  // Never depends on isSimulating or handleRunCode, so finishing a failed run NEVER restarts in an infinite loop!
  const codeSignature = useMemo(() => {
    if (!autoRunEnabled || isVictory || screen !== 'PLAYING' || mainBlocks.length === 0) {
      return '';
    }
    return JSON.stringify({
      levelId: currentLevel.id,
      mainBlocks,
      f1Blocks,
      f2Blocks,
    });
  }, [autoRunEnabled, isVictory, screen, currentLevel.id, mainBlocks, f1Blocks, f2Blocks]);

  useEffect(() => {
    if (!autoRunEnabled || isVictory || screen !== 'PLAYING') {
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
  }, [codeSignature, mainBlocks.length, autoRunEnabled, isVictory, screen]);

  // Costume / Skin change handler
  const handleSelectSkin = (skinId: RobotSkinId) => {
    setProgress((prev) => {
      const updated: UserProgress = {
        ...prev,
        customSkin: skinId,
      };
      try {
        localStorage.setItem('kodibot_progress', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Keyboard controls (only active when no modal is blocking)
  useEffect(() => {
    const anyModalOpen =
      showLevelSelect ||
      showHintModal ||
      showSandbox ||
      showConceptModal ||
      showGoogleSyncModal ||
      showSkinSelectorModal ||
      isVictory;

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
        if (showGoogleSyncModal) setShowGoogleSyncModal(false);
        else if (showSkinSelectorModal) setShowSkinSelectorModal(false);
        else if (showConceptModal) setShowConceptModal(false);
        else if (showLevelSelect) setShowLevelSelect(false);
        else if (showHintModal) setShowHintModal(false);
        else if (showSandbox) setShowSandbox(false);
        return;
      }

      if (anyModalOpen) return;

      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        if (screen === 'TITLE') {
          setScreen('PLAYING');
        } else {
          handleRunCode();
        }
      } else if (e.code === 'Enter' && screen === 'TITLE') {
        e.preventDefault();
        setScreen('PLAYING');
      } else if (e.code === 'KeyR' && screen === 'PLAYING') {
        if (e.repeat) return;
        e.preventDefault();
        resetLevelState();
      } else if (screen === 'PLAYING') {
        // Direct walk / turn shortcuts
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    screen,
    handleRunCode,
    resetLevelState,
    handleManualAction,
    showLevelSelect,
    showHintModal,
    showSandbox,
    showConceptModal,
    showGoogleSyncModal,
    showSkinSelectorModal,
    isVictory,
  ]);

  // Total crystals in level (memoized per level)
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

  const handleStartCodingMission = useCallback(() => {
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

    setScreen('PLAYING');
    if (!alreadyCleanOnFirst) {
      loadLevel(firstLevel);
    }
  }, [currentLevel.id, tiles.length, executionHistory.length, crystalsCollected, isVictory, robotState, loadLevel]);

  return (
    <div className="w-full h-[100dvh] bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {screen === 'TITLE' ? (
        <TitleScreen
          onStartGame={handleStartCodingMission}
          onOpenLevelSelect={() => {
            setScreen('PLAYING');
            setShowLevelSelect(true);
          }}
          onOpenDebugMode={() => {
            setScreen('PLAYING');
            const firstDebugLevel = ALL_LEVELS.find((l) => l.isDebuggingChallenge) || ALL_LEVELS[0];
            loadLevel(firstDebugLevel);
          }}
          onOpenSandbox={() => {
            setScreen('PLAYING');
            setShowSandbox(true);
          }}
          onOpenConceptGuide={() => {
            setShowConceptModal(true);
          }}
          onOpenGoogleLogin={() => setShowGoogleSyncModal(true)}
          onOpenSkinSelector={() => setShowSkinSelectorModal(true)}
          userProfile={progress.userProfile}
          currentSkin={progress.customSkin || 'CYAN'}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(sounds.toggleMute())}
          completedCount={Object.keys(progress.completedLevels).length}
          totalLevels={ALL_LEVELS.length}
        />
      ) : (
        /* PLAYING VIEWPORT */
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Header Zone: Breadcrumbs, Level Title, Global Controls */}
          <header className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 border-b border-slate-800 shrink-0 gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <button
                onClick={() => {
                  sounds.playClick();
                  setScreen('TITLE');
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
              {/* Primary: 60 Misi */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowLevelSelect(true);
                }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-xl text-xs font-bold transition-colors min-h-[40px] min-w-[40px]"
                title="Peta 60 Misi Tantangan"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">60 Misi</span>
              </button>

              {/* Primary: Petunjuk */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowHintModal(true);
                }}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-amber-300 transition-colors min-h-[40px] min-w-[40px]"
                title="Buka Petunjuk Misi"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Petunjuk</span>
              </button>

              {/* Desktop Only Buttons (hidden on < lg) */}
              <div className="hidden lg:flex items-center gap-1.5">
                {/* Google Cloud Sync Status */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowGoogleSyncModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all min-h-[36px] ${
                    progress.userProfile
                      ? 'bg-slate-800/90 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="Sinkronisasi Data Google Cloud"
                >
                  <Cloud className={`w-3.5 h-3.5 ${progress.userProfile ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{progress.userProfile ? 'Google Cloud' : 'Masuk Google'}</span>
                  {progress.userProfile && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </button>

                {/* Kostum Odibot */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowSkinSelectorModal(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-pink-300 hover:text-pink-200 transition-colors min-h-[36px]"
                  title="Bengkel Kostum Robot Odibot"
                >
                  <Palette className="w-3.5 h-3.5 text-pink-400" />
                  <span>Kostum</span>
                </button>

                {/* Pusat Konsep Koding SD Kelas 6 */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowConceptModal(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 transition-all shadow-sm min-h-[36px]"
                  title="Buka Pusat Teori Konsep Koding SD Kelas 6"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Konsep SD</span>
                </button>

                {/* Studio Kreatif Sandbox */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowSandbox(true);
                  }}
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
                        setShowGoogleSyncModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-colors text-left"
                    >
                      <Cloud className={`w-4 h-4 ${progress.userProfile ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{progress.userProfile ? 'Google Cloud (Tersambung)' : 'Masuk Google Cloud'}</span>
                    </button>

                    <button
                      onClick={() => {
                        sounds.playClick();
                        setShowMobileMoreMenu(false);
                        setShowSkinSelectorModal(true);
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
                        setShowConceptModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold hover:bg-slate-800 text-amber-300 transition-colors text-left"
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>Pusat Teori Konsep SD</span>
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

              {/* Mute Button */}
              <button
                onClick={() => setIsMuted(sounds.toggleMute())}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </header>

          {/* Active Learning Concept Bar (Kurikulum Merdeka SD Kelas 6) */}
          <ConceptBar
            level={currentLevel}
            crystalsCollected={crystalsCollected}
            totalCrystalsInLevel={totalCrystalsInLevel}
            totalBlocksUsed={totalBlocksUsed}
            onOpenConceptModal={(topic) => {
              setActiveConceptTopic(topic);
              setShowConceptModal(true);
            }}
            onLoadStarterCode={handleLoadStarterCode}
            isSimulating={isSimulating}
          />

          {/* Error Banner when robot encounters obstacle or fails */}
          {simulationErrorMessage && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-rose-950/90 border-b border-rose-800/80 text-rose-200 text-xs shrink-0 animate-in slide-in-from-top-1">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{simulationErrorMessage}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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

          {/* Mobile View Switcher (Robot vs Kode) - Visible only on mobile (< md) */}
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

          {/* Main Playfield Grid: Side-by-side on tablet/desktop, Tabbed on mobile */}
          <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-1.5 sm:gap-3 p-1.5 sm:p-3 min-h-0 overflow-hidden">
            {/* Left Playfield: 5 Cols on tablet/desktop, visible on mobile when mobileTab === 'ARENA' */}
            <div className={`${mobileTab === 'ARENA' ? 'flex' : 'hidden md:flex'} md:col-span-5 flex flex-col h-full min-h-0 overflow-hidden relative`}>
              {/* Computer Memory HUD (Variables & Lists State) - Single line scrollable on mobile */}
              <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-0.5 text-xs text-slate-300 shrink-0 gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Crystals */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg whitespace-nowrap shrink-0">
                    <span className="text-amber-400 font-bold">💎 Kristal:</span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {crystalsCollected}/{totalCrystalsInLevel}
                    </span>
                  </div>

                  {/* Variables HUD */}
                  {Object.keys(currentVariables).length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-teal-800/80 rounded-lg text-teal-300 whitespace-nowrap shrink-0">
                      <Variable className="w-3.5 h-3.5 text-teal-400" />
                      {Object.entries(currentVariables).map(([k, v]) => (
                        <span key={k} className="font-mono font-bold text-white">
                          {k}={v}
                          {k === 'baterai' && (
                            <Battery className="w-3.5 h-3.5 inline ml-1 text-cyan-400" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Data Structures (Lists) HUD */}
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

                {/* Speed Selector */}
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
              <div className="flex-1 relative min-h-[200px] sm:min-h-[300px]">
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
                />
              </div>

              {/* Desktop Bottom Playback Bar (hidden on mobile < md) */}
              <div className="hidden md:flex items-center justify-between mt-2 pt-1 gap-2 shrink-0">
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

              {/* Cyber Terminal Inspector: Memori RAM, Tabel Trace & Konsol */}
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

            {/* Right Panel: Block Workspace (Visible on mobile when mobileTab === 'CODE', always visible on md+) */}
            <div className={`${mobileTab === 'CODE' ? 'flex' : 'hidden md:flex'} md:col-span-7 flex flex-col h-full min-h-0 overflow-hidden`}>
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
                onLoadStarterCode={handleLoadStarterCode}
                onRunCode={handleRunCode}
                autoRunEnabled={autoRunEnabled}
                onToggleAutoRun={() => setAutoRunEnabled((prev) => !prev)}
                onStepOnce={handleStepOnce}
                autoRunCountdown={autoRunCountdown}
              />
            </div>
          </div>

          {/* Unified Mobile Thumb-Zone Bottom Dock (< md) — visible in BOTH Arena & Code tabs */}
          <div className="md:hidden px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-slate-900/95 border-t border-slate-800 flex items-center gap-2 shrink-0">
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

          {/* Subtle Developer Attribution Bar (Desktop & Tablet) */}
          <footer className="hidden md:flex px-4 py-1 bg-slate-950/90 border-t border-slate-900 items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span className="truncate">Odibot Adventure · Koding dan Kecerdasan Artifisial (KA) SD Fase C</span>
            <span className="text-slate-400 font-medium truncate">
              Pengembang: <span className="text-cyan-400 font-semibold">Wahyu Dwi Aji, S.Pd., M.Pd.</span>
            </span>
          </footer>
        </div>
      )}

      <Suspense fallback={null}>
        {/* Victory Celebration Modal */}
        {isVictory && (
          <VictoryModal
            level={currentLevel}
            starsEarned={starsEarned}
            totalBlocksUsed={totalBlocksUsed}
            crystalsCollected={crystalsCollected}
            totalCrystals={totalCrystalsInLevel}
            pythonCode={blocksToPython(
              mainBlocks,
              f1Blocks,
              f2Blocks,
              currentLevel.initialVariables,
              currentLevel.initialLists
            )}
            onNextLevel={handleNextLevel}
            onReplay={resetLevelState}
            onOpenLevelSelect={() => {
              setIsVictory(false);
              setShowLevelSelect(true);
            }}
          />
        )}

        {/* Level Selection Modal */}
        {showLevelSelect && (
          <LevelSelectModal
            currentLevelId={currentLevel.id}
            progress={progress}
            onSelectLevel={(lvl) => loadLevel(lvl)}
            onClose={() => setShowLevelSelect(false)}
          />
        )}

        {/* Hint Modal */}
        {showHintModal && (
          <HintModal
            level={currentLevel}
            onClose={() => setShowHintModal(false)}
          />
        )}

        {/* Sandbox Editor Modal */}
        {showSandbox && (
          <SandboxEditor
            onPlayCustomLevel={(lvl) => {
              setShowSandbox(false);
              loadLevel(lvl);
            }}
            onClose={() => setShowSandbox(false)}
          />
        )}

        {/* Concept Guide Modal (Kurikulum Merdeka SD) */}
        {showConceptModal && (
          <ConceptModal
            activeConceptZoneId={activeConceptTopic}
            onClose={() => setShowConceptModal(false)}
          />
        )}

        {/* Google Sign-In & Cloud Sync Modal */}
        {showGoogleSyncModal && (
          <GoogleCloudSyncModal
            progress={progress}
            onUpdateProgress={(newProgress) => {
              setProgress(newProgress);
              try {
                localStorage.setItem('kodibot_progress', JSON.stringify(newProgress));
              } catch {}
            }}
            onClose={() => setShowGoogleSyncModal(false)}
          />
        )}

        {/* Robot Skin / Costume Selector Modal */}
        {showSkinSelectorModal && (
          <SkinSelectorModal
            currentSkin={progress.customSkin || 'CYAN'}
            totalStars={totalStars}
            onSelectSkin={handleSelectSkin}
            onClose={() => setShowSkinSelectorModal(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
