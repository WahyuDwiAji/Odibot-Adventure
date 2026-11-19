import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CommandType, Direction, LevelDefinition, RobotSkinId, TileData } from '../types/game';
import { ROBOT_SKINS } from '../data/skins';
import { OdibotMascot } from './OdibotMascot';
import { sounds } from '../utils/audio';
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowUp,
  RotateCcw,
  ArrowUpRight,
  Sparkles,
  Gamepad2,
  Layers,
  Volume2,
} from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
  drag?: number;
  shape?: 'star' | 'circle' | 'spark';
}

interface FireworkRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  secondaryColor: string;
}

interface FireworkRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface RobotVisualState {
  gridX: number;
  gridY: number;
  gridH: number;
  dir: Direction;
  animProgress: number; // 0 to 1
  isMoving: boolean;
  isJumping: boolean;
  isTurning: boolean;
  fromX: number;
  fromY: number;
  fromH: number;
  fromAngle: number;
  targetAngle: number;
  currentAngle: number;
  jumpArc: number;
  squashX: number;
  squashY: number;
  leanAngle: number;
  stridePhase: number;
  landingBounce: number;
  actionPulse: number;
  commandPulse: number;
  commandLabel: string;
  lastActionType: string;
  pendingBurst: 'MOVE' | 'JUMP' | 'LAND' | 'COLLECT' | 'SWITCH' | 'COMMAND' | null;
  trailCooldown: number;
  blinkTimer: number;
  isBlinking: boolean;
}

interface IsometricCanvasProps {
  level: LevelDefinition;
  tiles: TileData[][];
  robotState: { x: number; y: number; height: number; dir: Direction };
  isSimulating: boolean;
  activeAction?: string;
  executionStepCount?: number;
  onTileClick?: (x: number, y: number) => void;
  isVictory?: boolean;
  celebratingVictory?: boolean;
  onManualAction?: (action: CommandType) => void;
  skinId?: RobotSkinId;
  autoRunCountdown?: number | null;
  autoRunEnabled?: boolean;
  isPaused?: boolean;
}

const DIR_ANGLES: Record<Direction, number> = {
  EAST: 0,
  SOUTH: Math.PI / 2,
  WEST: Math.PI,
  NORTH: (Math.PI * 3) / 2,
};

const THINKING_ACTIONS = new Set([
  'REPEAT',
  'WHILE_VAR',
  'IF_VAR',
  'IF_COLOR',
  'IF_OBSTACLE',
  'READ_LIST',
]);

// Cross-browser safe rounded rectangle drawing
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export const IsometricCanvas: React.FC<IsometricCanvasProps> = React.memo(({
  level,
  tiles,
  robotState,
  isSimulating,
  activeAction,
  executionStepCount = 0,
  isVictory = false,
  celebratingVictory = false,
  onManualAction,
  skinId = 'CYAN',
  autoRunCountdown = null,
  autoRunEnabled = false,
  isPaused = false,
}) => {
  const victoryActive = Boolean(isVictory || celebratingVictory);
  const isThinking = Boolean(
    isSimulating && !victoryActive && activeAction && THINKING_ACTIONS.has(activeAction)
  );
  const activeSkin = ROBOT_SKINS.find((s) => s.id === skinId) || ROBOT_SKINS[0];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera & view mode
  const [perspectiveMode, setPerspectiveMode] = useState<'ISO' | 'TOP_DOWN'>('ISO');
  const [zoom, setZoom] = useState(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [showDPad, setShowDPad] = useState(false);
  const [isGreetingVoice, setIsGreetingVoice] = useState(false);
  const greetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (greetTimerRef.current) clearTimeout(greetTimerRef.current);
    };
  }, []);

  const triggerOdibotVoiceGreet = useCallback(() => {
    sounds.playRobotGreet();
    setIsGreetingVoice(true);
    if (greetTimerRef.current) clearTimeout(greetTimerRef.current);
    greetTimerRef.current = setTimeout(() => {
      setIsGreetingVoice(false);
      greetTimerRef.current = null;
    }, 900);
  }, []);

  // Drag pan
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Footprint visited tiles
  const visitedTilesRef = useRef<{ x: number; y: number }[]>([]);

  // Visual simulation state
  const visualRobotRef = useRef<RobotVisualState>({
    gridX: robotState.x,
    gridY: robotState.y,
    gridH: robotState.height,
    dir: robotState.dir,
    animProgress: 1,
    isMoving: false,
    isJumping: false,
    isTurning: false,
    fromX: robotState.x,
    fromY: robotState.y,
    fromH: robotState.height,
    fromAngle: DIR_ANGLES[robotState.dir],
    targetAngle: DIR_ANGLES[robotState.dir],
    currentAngle: DIR_ANGLES[robotState.dir],
    jumpArc: 0,
    squashX: 1,
    squashY: 1,
    leanAngle: 0,
    stridePhase: 0,
    landingBounce: 0,
    actionPulse: 0,
    commandPulse: 0,
    commandLabel: '',
    lastActionType: '',
    pendingBurst: null,
    trailCooldown: 0,
    blinkTimer: 2,
    isBlinking: false,
  });

  const particlesRef = useRef<Particle[]>([]);
  const fireworkRocketsRef = useRef<FireworkRocket[]>([]);
  const fireworkRingsRef = useRef<FireworkRing[]>([]);
  const fireworkTimerRef = useRef<number>(0);
  const victoryElapsedRef = useRef<number>(0);
  const animTimeRef = useRef<number>(0);
  const prevRobotStateRef = useRef(robotState);
  const prevTilesRef = useRef(tiles);
  const prevStepCountRef = useRef(executionStepCount);

  // Track footprints
  useEffect(() => {
    if (activeAction === 'RESET') {
      visitedTilesRef.current = [{ x: robotState.x, y: robotState.y }];
    } else {
      const already = visitedTilesRef.current.some(
        (t) => t.x === robotState.x && t.y === robotState.y
      );
      if (!already) {
        visitedTilesRef.current.push({ x: robotState.x, y: robotState.y });
      }
    }
  }, [robotState, activeAction]);

  // Spawn particles (in screen space)
  const spawnParticles = useCallback((
    screenX: number,
    screenY: number,
    count: number,
    colors: string[],
    shape: 'star' | 'circle' | 'spark' = 'circle'
  ) => {
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= 280) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = shape === 'spark' ? 2.2 + Math.random() * 4.5 : 1.4 + Math.random() * 3.8;
      particlesRef.current.push({
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (shape === 'spark' ? 0.6 : 1.4),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: shape === 'star' ? 4 + Math.random() * 3.5 : shape === 'spark' ? 2 + Math.random() * 2 : 2.5 + Math.random() * 2.5,
        alpha: 1,
        life: 0,
        maxLife: shape === 'spark' ? 36 + Math.random() * 24 : 32 + Math.random() * 24,
        gravity: shape === 'spark' ? 0.065 : 0.08,
        drag: shape === 'spark' ? 0.975 : 0.985,
        shape,
      });
    }
  }, []);

  const spawnFireworkBurst = useCallback((cx: number, cy: number, primary: string, secondary: string) => {
    const palette = [primary, secondary, '#FFFFFF', '#FDE68A'];
    fireworkRingsRef.current.push({
      x: cx,
      y: cy,
      radius: 4,
      maxRadius: 42 + Math.random() * 26,
      color: primary,
      alpha: 0.9,
    });

    const rays = 24;
    for (let i = 0; i < rays; i++) {
      if (particlesRef.current.length >= 280) break;
      const angle = (i / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      const speed = 2.6 + Math.random() * 2.8;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 3 === 0 ? secondary : primary,
        size: 2.5 + Math.random() * 2,
        alpha: 1,
        life: 0,
        maxLife: 38 + Math.random() * 20,
        gravity: 0.06,
        drag: 0.97,
        shape: 'spark',
      });
    }
    spawnParticles(cx, cy, 10, palette, 'star');
  }, [spawnParticles]);

  // Watch for state changes and trigger smooth animation
  useEffect(() => {
    const prev = prevRobotStateRef.current;
    const curr = robotState;
    prevRobotStateRef.current = curr;

    const r = visualRobotRef.current;

    // If reset action or level load: snap robot instantly
    if (activeAction === 'RESET') {
      r.fromX = curr.x;
      r.gridX = curr.x;
      r.fromY = curr.y;
      r.gridY = curr.y;
      r.fromH = curr.height;
      r.gridH = curr.height;
      r.dir = curr.dir;
      r.currentAngle = DIR_ANGLES[curr.dir];
      r.targetAngle = DIR_ANGLES[curr.dir];
      r.animProgress = 1;
      r.isMoving = false;
      r.isTurning = false;
      r.isJumping = false;
      r.jumpArc = 0;
      r.squashX = 1;
      r.squashY = 1;
      r.leanAngle = 0;
      r.landingBounce = 0;
      r.actionPulse = 0;
      r.pendingBurst = null;
      prevTilesRef.current = tiles;
      return;
    }

    // Detect turn
    if (prev.dir !== curr.dir || r.dir !== curr.dir) {
      r.dir = curr.dir;
      r.isTurning = true;
      r.fromAngle = r.currentAngle;

      let diff = DIR_ANGLES[curr.dir] - (r.currentAngle % (Math.PI * 2));
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      r.targetAngle = r.currentAngle + diff;
      r.animProgress = 0;
    }

    // Detect movement or jump
    if (
      prev.x !== curr.x ||
      prev.y !== curr.y ||
      prev.height !== curr.height ||
      r.gridX !== curr.x ||
      r.gridY !== curr.y ||
      r.gridH !== curr.height
    ) {
      r.fromX = r.gridX;
      r.fromY = r.gridY;
      r.fromH = r.gridH;
      r.gridX = curr.x;
      r.gridY = curr.y;
      r.gridH = curr.height;

      r.isMoving = true;
      r.isJumping = activeAction === 'JUMP';
      r.animProgress = 0;
      r.trailCooldown = 0;
      r.pendingBurst = r.isJumping ? 'JUMP' : 'MOVE';
    }
  }, [robotState, activeAction, tiles]);

  // Trigger expressive collect / switch particle animations whenever tiles change on those actions
  useEffect(() => {
    if (prevTilesRef.current === tiles) return;
    prevTilesRef.current = tiles;
    const r = visualRobotRef.current;
    if (activeAction === 'COLLECT') {
      r.actionPulse = 1;
      r.lastActionType = 'COLLECT';
      r.pendingBurst = 'COLLECT';
    } else if (activeAction === 'TOGGLE_SWITCH') {
      r.actionPulse = 1;
      r.lastActionType = 'TOGGLE_SWITCH';
      r.pendingBurst = 'SWITCH';
    }
  }, [tiles, activeAction]);

  // Trigger command-processing pulse on EVERY executed code step (including REPEAT, IF, SET_VAR, F1/F2, MOVE)
  useEffect(() => {
    if (executionStepCount === prevStepCountRef.current) return;
    prevStepCountRef.current = executionStepCount;
    if (!isSimulating || executionStepCount <= 0) return;

    const r = visualRobotRef.current;
    r.commandPulse = 1;

    if (activeAction === 'CALL_F1') r.commandLabel = 'F1';
    else if (activeAction === 'CALL_F2') r.commandLabel = 'F2';
    else if (activeAction === 'REPEAT' || activeAction === 'WHILE_VAR') r.commandLabel = '↻';
    else if (activeAction === 'IF_VAR' || activeAction === 'IF_COLOR' || activeAction === 'IF_OBSTACLE') r.commandLabel = 'IF';
    else if (activeAction === 'SET_VAR' || activeAction === 'CHANGE_VAR') r.commandLabel = 'X=';
    else if (activeAction === 'READ_LIST') r.commandLabel = '[ ]';
    else r.commandLabel = '▶';

    if (
      activeAction === 'SET_VAR' ||
      activeAction === 'CHANGE_VAR' ||
      activeAction === 'CALL_F1' ||
      activeAction === 'CALL_F2' ||
      THINKING_ACTIONS.has(activeAction || '')
    ) {
      r.actionPulse = Math.max(r.actionPulse, 0.72);
      r.lastActionType = activeAction || 'COMMAND';
      if (!r.pendingBurst) {
        r.pendingBurst = 'COMMAND';
      }
    }
  }, [executionStepCount, isSimulating, activeAction]);

  // Victory celebration fireworks & jump trigger
  useEffect(() => {
    if (victoryActive) {
      victoryElapsedRef.current = 0;
      fireworkTimerRef.current = 0.25;
      const { width, height } = canvasSizeRef.current;
      const w = width || (canvasRef.current ? canvasRef.current.width / (window.devicePixelRatio || 1) : 480);
      const h = height || (canvasRef.current ? canvasRef.current.height / (window.devicePixelRatio || 1) : 360);
      if (w > 0 && h > 0) {
        spawnFireworkBurst(w * 0.28, h * 0.30, '#F59E0B', '#FDE68A');
        spawnFireworkBurst(w * 0.72, h * 0.26, '#06B6D4', '#A5F3FC');
        spawnFireworkBurst(w * 0.50, h * 0.22, '#EC4899', '#C084FC');
      }
    } else {
      victoryElapsedRef.current = 0;
      fireworkRocketsRef.current = [];
      fireworkRingsRef.current = [];
    }
  }, [victoryActive, spawnFireworkBurst]);

  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const renderStateRef = useRef({
    level,
    tiles,
    isSimulating,
    isThinking,
    activeAction,
    victoryActive,
    zoom,
    rotationAngle,
    perspectiveMode,
    activeSkin,
  });
  renderStateRef.current = {
    level,
    tiles,
    isSimulating,
    isThinking,
    activeAction,
    victoryActive,
    zoom,
    rotationAngle,
    perspectiveMode,
    activeSkin,
  };

  // Measure canvas container ONLY on actual resize (zero layout thrashing inside rAF!)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = (w?: number, h?: number) => {
      const width = w ?? container.clientWidth;
      const height = h ?? container.clientHeight;
      if (width <= 0 || height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.floor(width * dpr);
      const displayHeight = Math.floor(height * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
      canvasSizeRef.current = { width, height, dpr };
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          updateSize(width, height);
        }
      });
      observer.observe(container);
      return () => observer.disconnect();
    }

    const onResize = () => updateSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const resumeCanvasLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isPaused) {
      resumeCanvasLoopRef.current?.();
    }
  }, [isPaused]);

  // Main 60 FPS Game Render Loop (single mount lifecycle — pauses cleanly when modal open or tab hidden)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let lastTime = performance.now();

    const render = (now: number) => {
      animationFrameId = null;
      if (isPausedRef.current || document.hidden) {
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamp dt for 60fps simulation
      animTimeRef.current += dt;

      const { width, height, dpr } = canvasSizeRef.current;
      if (width <= 0 || height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const {
        level: curLevel,
        tiles: curTiles,
        isSimulating: curSimulating,
        isThinking: curThinking,
        activeAction: curActiveAction,
        victoryActive: curVictory,
        zoom: curZoom,
        rotationAngle: curRotAngle,
        perspectiveMode: curPerspective,
        activeSkin: curSkin,
      } = renderStateRef.current;
      const curPan = panRef.current;

      if (curVictory) {
        victoryElapsedRef.current += dt;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. Draw Deep Space Background
      ctx.fillStyle = '#080C16';
      ctx.fillRect(0, 0, width, height);

      // Starry dust particles in background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 36; i++) {
        const sx = (i * 123.45 + animTimeRef.current * 4) % width;
        const sy = (i * 267.89) % height;
        const size = i % 3 === 0 ? 1.5 : 1;
        ctx.fillRect(sx, sy, size, size);
      }

      // Dynamic auto-fit zoom based on level grid dimensions (responsive for mobile & desktop)
      const gridSpanX =
        curPerspective === 'TOP_DOWN'
          ? curLevel.gridWidth * 58
          : (curLevel.gridWidth + curLevel.gridHeight) * 34;
      const gridSpanY =
        curPerspective === 'TOP_DOWN'
          ? curLevel.gridHeight * 58
          : (curLevel.gridWidth + curLevel.gridHeight) * 17 + 72;
      const pad = width < 480 ? 28 : 48;
      const autoFit = Math.min(1.0, (width - pad) / gridSpanX, (height - pad) / gridSpanY);
      const effectiveZoom = curZoom * Math.max(0.42, autoFit);

      // Camera view center (centered with slight upward bias so lower destination tiles are never hidden)
      const centerX = width / 2 + curPan.x;
      const centerY = height / 2 + curPan.y - (curPerspective === 'ISO' ? 12 : 0);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(effectiveZoom, effectiveZoom);

      // Geometry constants
      const tileW = 68;
      const tileH = 34;
      const heightScale = 22;
      const topDownTileSize = 58;

      const rad = (curRotAngle * Math.PI) / 180;
      const rotCos = Math.round(Math.cos(rad));
      const rotSin = Math.round(Math.sin(rad));
      const midX = (curLevel.gridWidth - 1) / 2;
      const midY = (curLevel.gridHeight - 1) / 2;

      // Projection mapping: ISO vs TOP_DOWN
      const toScreen = (gx: number, gy: number, gh: number) => {
        if (curPerspective === 'TOP_DOWN') {
          const screenX = (gx - midX) * topDownTileSize;
          const screenY = (gy - midY) * topDownTileSize;
          return { x: screenX, y: screenY, depth: gy * 10 + gx + gh * 0.1 };
        }

        const ox = gx - midX;
        const oy = gy - midY;
        const rx = ox * rotCos - oy * rotSin + midX;
        const ry = ox * rotSin + oy * rotCos + midY;

        const screenX = (rx - ry) * (tileW / 2);
        const screenY = (rx + ry) * (tileH / 2) - gh * heightScale;
        return { x: screenX, y: screenY, depth: rx + ry + gh * 0.1 };
      };

      // 2. Collect render items for depth sorting
      interface RenderItem {
        type: 'tile' | 'crystal' | 'robot';
        gx: number;
        gy: number;
        gh: number;
        depth: number;
        data?: TileData;
      }

      const items: RenderItem[] = [];

      // Add tiles
      for (let y = 0; y < curLevel.gridHeight; y++) {
        for (let x = 0; x < curLevel.gridWidth; x++) {
          const t = curTiles[y]?.[x];
          if (!t || t.type === 'EMPTY') continue;
          const screen = toScreen(x, y, t.height);
          items.push({
            type: 'tile',
            gx: x,
            gy: y,
            gh: t.height,
            depth: screen.depth,
            data: t,
          });

          // Add crystal
          if (t.hasCrystal) {
            items.push({
              type: 'crystal',
              gx: x,
              gy: y,
              gh: t.height,
              depth: screen.depth + 0.05,
            });
          }
        }
      }

      // Update robot visual state lerp & expressive motion kinematics
      const r = visualRobotRef.current;
      if (r.landingBounce > 0) {
        r.landingBounce = Math.max(0, r.landingBounce - dt * 4.5);
      }
      if (r.actionPulse > 0) {
        r.actionPulse = Math.max(0, r.actionPulse - dt * 2.2);
      }
      if (r.commandPulse > 0) {
        r.commandPulse = Math.max(0, r.commandPulse - dt * 2.5);
      }

      if (r.animProgress < 1) {
        const animSpeed = r.isJumping ? (curSimulating ? 4.4 : 5.4) : curSimulating ? 5.5 : 7.0;
        r.animProgress = Math.min(1, r.animProgress + dt * animSpeed);

        const t = r.animProgress;
        const ease = 1 - Math.pow(1 - t, 3);

        if (r.isMoving) {
          r.currentAngle = r.targetAngle;
          r.stridePhase += dt * 22;
          if (r.isJumping) {
            r.jumpArc = Math.sin(t * Math.PI) * 32;
            const stretch = Math.sin(t * Math.PI);
            r.squashY = 1 + stretch * 0.22;
            r.squashX = 1 - stretch * 0.1;
            r.leanAngle = Math.cos(t * Math.PI) * 0.14;
          } else {
            r.jumpArc = Math.abs(Math.sin(t * Math.PI * 2)) * 5.5;
            r.squashY = 1 + Math.sin(t * Math.PI) * 0.06;
            r.squashX = 1 - Math.sin(t * Math.PI) * 0.03;
            r.leanAngle = Math.sin(t * Math.PI) * 0.11;
          }
        }

        if (r.isTurning) {
          r.currentAngle = r.fromAngle + (r.targetAngle - r.fromAngle) * ease;
          const turnDelta = r.targetAngle - r.fromAngle;
          r.leanAngle = Math.sin(t * Math.PI) * Math.sign(turnDelta || 1) * 0.12;
          r.squashY = 1 + Math.sin(t * Math.PI) * 0.06;
          r.squashX = 1 - Math.sin(t * Math.PI) * 0.04;
        }

        if (r.animProgress >= 1) {
          if (r.isJumping) {
            r.landingBounce = 1;
            r.pendingBurst = 'LAND';
          }
          r.isMoving = false;
          r.isJumping = false;
          r.isTurning = false;
          r.currentAngle = r.targetAngle;
          r.jumpArc = 0;
          r.squashX = 1;
          r.squashY = 1;
          r.leanAngle = 0;
        }
      }

      // Compute final squash-and-stretch including landing cushion bounce
      const bounceSquash = r.landingBounce > 0 ? Math.sin(r.landingBounce * Math.PI) * 0.18 : 0;
      const actionLift = r.actionPulse > 0 ? Math.sin(r.actionPulse * Math.PI) * 7 : 0;
      const finalScaleY = r.squashY - bounceSquash;
      const finalScaleX = r.squashX + bounceSquash * 0.85;

      // Interpolate current robot grid pos
      const t = r.animProgress;
      const ease = 1 - Math.pow(1 - t, 3);
      const curX = r.fromX + (r.gridX - r.fromX) * ease;
      const curY = r.fromY + (r.gridY - r.fromY) * ease;
      const curH = r.fromH + (r.gridH - r.fromH) * ease;

      const robotScreen = toScreen(curX, curY, curH);

      // Emit world-synced screen-space motion & action particles at Odibot's exact rendered position
      const rxScreen = centerX + robotScreen.x * effectiveZoom;
      const ryScreen = centerY + (robotScreen.y - r.jumpArc - actionLift) * effectiveZoom;

      if (r.pendingBurst) {
        const burst = r.pendingBurst;
        r.pendingBurst = null;
        if (burst === 'MOVE') {
          spawnParticles(rxScreen, ryScreen + 2, 4, [curSkin.visorColor, curSkin.accentColor], 'circle');
        } else if (burst === 'JUMP') {
          spawnParticles(rxScreen, ryScreen + 4, 8, [curSkin.thrusterColor, '#FDE047', curSkin.visorColor], 'spark');
        } else if (burst === 'LAND') {
          spawnParticles(rxScreen, ryScreen + 2, 7, [curSkin.visorColor, curSkin.shellLightColor], 'circle');
        } else if (burst === 'COLLECT') {
          spawnParticles(rxScreen, ryScreen - 16 * effectiveZoom, 14, ['#22D3EE', '#67E8F9', '#FDE047', '#FFFFFF'], 'star');
        } else if (burst === 'SWITCH') {
          spawnParticles(rxScreen, ryScreen - 8 * effectiveZoom, 12, ['#10B981', '#FDE047', '#34D399'], 'spark');
          fireworkRingsRef.current.push({
            x: rxScreen,
            y: ryScreen - 4 * effectiveZoom,
            radius: 6,
            maxRadius: 34 * effectiveZoom,
            color: '#10B981',
            alpha: 0.85,
          });
        } else if (burst === 'COMMAND') {
          spawnParticles(rxScreen, ryScreen - 34 * effectiveZoom, 6, [curSkin.accentColor, curSkin.visorColor, '#E879F9'], 'spark');
          fireworkRingsRef.current.push({
            x: rxScreen,
            y: ryScreen - 36 * effectiveZoom,
            radius: 3,
            maxRadius: 20 * effectiveZoom,
            color: curSkin.accentColor,
            alpha: 0.75,
          });
        }
      }

      // Continuous jetpack spark trail while mid-jump
      if (r.isJumping && r.animProgress > 0.08 && r.animProgress < 0.85) {
        r.trailCooldown -= dt;
        if (r.trailCooldown <= 0 && particlesRef.current.length < 280) {
          r.trailCooldown = 0.045;
          particlesRef.current.push({
            x: rxScreen + (Math.random() - 0.5) * 10 * effectiveZoom,
            y: ryScreen - 4 * effectiveZoom,
            vx: (Math.random() - 0.5) * 0.9,
            vy: 1.2 + Math.random() * 1.4,
            color: Math.random() > 0.4 ? '#FBBF24' : curSkin.visorColor,
            size: 2.3,
            alpha: 0.95,
            life: 0,
            maxLife: 18,
            gravity: 0.04,
            drag: 0.96,
            shape: 'circle',
          });
        }
      }

      items.push({
        type: 'robot',
        gx: curX,
        gy: curY,
        gh: curH,
        depth: robotScreen.depth + 0.1,
      });

      // Sort items back-to-front
      items.sort((a, b) => a.depth - b.depth);

      // Draw footprint dots on visited tiles
      if (visitedTilesRef.current.length > 0) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
        visitedTilesRef.current.forEach((pos) => {
          const tile = curTiles[pos.y]?.[pos.x];
          const h = tile ? tile.height : 0;
          const posScreen = toScreen(pos.x, pos.y, h);
          ctx.beginPath();
          ctx.arc(posScreen.x, posScreen.y, curPerspective === 'TOP_DOWN' ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Helper to draw tile
      const drawTile = (
        screenX: number,
        screenY: number,
        h: number,
        tile: TileData,
        gx: number,
        gy: number
      ) => {
        if (curPerspective === 'TOP_DOWN') {
          // --- 2D Top-Down Clean Grid Tile ---
          const size = topDownTileSize - 4;
          const half = size / 2;

          ctx.save();
          ctx.beginPath();
          drawRoundRect(ctx, screenX - half, screenY - half, size, size, 8);

          // Tile colors based on type
          if (tile.type === 'GOAL') {
            ctx.fillStyle = '#F59E0B';
            ctx.fill();
            ctx.strokeStyle = '#FDE68A';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Star goal glyph
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', screenX, screenY);
          } else if (tile.type === 'SWITCH') {
            ctx.fillStyle = tile.isSwitchActive ? '#059669' : '#B45309';
            ctx.fill();
            ctx.strokeStyle = tile.isSwitchActive ? '#6EE7B7' : '#FCD34D';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Distinct switch pad ring
            ctx.beginPath();
            ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
            ctx.fillStyle = tile.isSwitchActive ? '#10B981' : '#F59E0B';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (tile.type === 'HAZARD') {
            ctx.fillStyle = tile.isHazardActive ? '#DC2626' : '#334155';
            ctx.fill();
            ctx.strokeStyle = tile.isHazardActive ? '#FCA5A5' : '#64748B';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (tile.isHazardActive) {
              ctx.beginPath();
              ctx.moveTo(screenX - 10, screenY - 10);
              ctx.lineTo(screenX + 10, screenY + 10);
              ctx.moveTo(screenX + 10, screenY - 10);
              ctx.lineTo(screenX - 10, screenY + 10);
              ctx.strokeStyle = '#FEE2E2';
              ctx.lineWidth = 2.5;
              ctx.stroke();
            }
          } else if (tile.type === 'COLOR_BLUE') {
            ctx.fillStyle = '#0284C7';
            ctx.fill();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.rect(screenX - 7, screenY - 7, 14, 14);
            ctx.strokeStyle = 'rgba(224, 242, 254, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (tile.type === 'COLOR_YELLOW') {
            ctx.fillStyle = '#CA8A04';
            ctx.fill();
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.rect(screenX - 7, screenY - 7, 14, 14);
            ctx.strokeStyle = 'rgba(254, 249, 195, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            // Standard PATH
            ctx.fillStyle = h > 0 ? '#1E293B' : '#0F172A';
            ctx.fill();
            ctx.strokeStyle = h > 0 ? '#475569' : '#1E293B';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Elevation badge if elevated
          if (h > 0) {
            ctx.fillStyle = '#38BDF8';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`+${h}m`, screenX + half - 4, screenY - half + 10);
          }

          // Coordinate label in corner (useful for 6th grade math & navigation!)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.font = '8px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${gx},${gy}`, screenX - half + 4, screenY + half - 4);

          ctx.restore();
          return;
        }

        // --- 3D Isometric Diamond Tile ---
        const w2 = tileW / 2;
        const h2 = tileH / 2;

        if (h > 0) {
          const sideH = h * heightScale;
          // Left side wall
          ctx.beginPath();
          ctx.moveTo(screenX - w2, screenY);
          ctx.lineTo(screenX, screenY + h2);
          ctx.lineTo(screenX, screenY + h2 + sideH);
          ctx.lineTo(screenX - w2, screenY + sideH);
          ctx.closePath();
          ctx.fillStyle = '#111827';
          ctx.fill();
          ctx.strokeStyle = '#1F2937';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Right side wall
          ctx.beginPath();
          ctx.moveTo(screenX, screenY + h2);
          ctx.lineTo(screenX + w2, screenY);
          ctx.lineTo(screenX + w2, screenY + sideH);
          ctx.lineTo(screenX, screenY + h2 + sideH);
          ctx.closePath();
          ctx.fillStyle = '#1F2937';
          ctx.fill();
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Top Surface Diamond
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - h2);
        ctx.lineTo(screenX + w2, screenY);
        ctx.lineTo(screenX, screenY + h2);
        ctx.lineTo(screenX - w2, screenY);
        ctx.closePath();

        switch (tile.type) {
          case 'GOAL': {
            const pulse = (Math.sin(animTimeRef.current * 4) + 1) * 0.15;
            ctx.fillStyle = `rgba(245, 158, 11, ${0.85 + pulse})`;
            ctx.fill();
            ctx.strokeStyle = '#FDE68A';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, w2 * 0.5, h2 * 0.5, 0, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case 'SWITCH': {
            ctx.fillStyle = tile.isSwitchActive ? '#059669' : '#B45309';
            ctx.fill();
            ctx.strokeStyle = tile.isSwitchActive ? '#6EE7B7' : '#FCD34D';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Button pad disc on top so Switch is visually distinct from Yellow Sensor
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, w2 * 0.42, h2 * 0.42, 0, 0, Math.PI * 2);
            ctx.fillStyle = tile.isSwitchActive ? '#10B981' : '#F59E0B';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            break;
          }
          case 'HAZARD': {
            ctx.fillStyle = tile.isHazardActive ? '#DC2626' : '#374151';
            ctx.fill();
            ctx.strokeStyle = tile.isHazardActive ? '#FCA5A5' : '#4B5563';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (tile.isHazardActive) {
              ctx.beginPath();
              ctx.moveTo(screenX - w2 * 0.45, screenY);
              ctx.lineTo(screenX + w2 * 0.45, screenY);
              ctx.moveTo(screenX, screenY - h2 * 0.45);
              ctx.lineTo(screenX, screenY + h2 * 0.45);
              ctx.strokeStyle = '#FEE2E2';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            break;
          }
          case 'COLOR_BLUE': {
            ctx.fillStyle = '#0284C7';
            ctx.fill();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(screenX, screenY - h2 * 0.45);
            ctx.lineTo(screenX + w2 * 0.45, screenY);
            ctx.lineTo(screenX, screenY + h2 * 0.45);
            ctx.lineTo(screenX - w2 * 0.45, screenY);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(224, 242, 254, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            break;
          }
          case 'COLOR_YELLOW': {
            ctx.fillStyle = '#CA8A04';
            ctx.fill();
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(screenX, screenY - h2 * 0.45);
            ctx.lineTo(screenX + w2 * 0.45, screenY);
            ctx.lineTo(screenX, screenY + h2 * 0.45);
            ctx.lineTo(screenX - w2 * 0.45, screenY);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(254, 249, 195, 0.8)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            break;
          }
          default: {
            ctx.fillStyle = h > 0 ? '#1E293B' : '#0F172A';
            ctx.fill();
            ctx.strokeStyle = h > 0 ? '#475569' : '#1E293B';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      };

      // Helper to draw sparkling crystal (zero gradient allocation per frame)
      const drawCrystal = (screenX: number, screenY: number) => {
        const floatY = Math.sin(animTimeRef.current * 3.5) * 4;
        const cy = screenY - 14 + floatY;

        ctx.beginPath();
        ctx.ellipse(screenX, screenY - 2, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Full diamond body
        ctx.beginPath();
        ctx.moveTo(screenX, cy - 9);
        ctx.lineTo(screenX + 7, cy);
        ctx.lineTo(screenX, cy + 9);
        ctx.lineTo(screenX - 7, cy);
        ctx.closePath();
        ctx.fillStyle = '#06B6D4';
        ctx.fill();
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Top sunlit facet
        ctx.beginPath();
        ctx.moveTo(screenX, cy - 9);
        ctx.lineTo(screenX + 7, cy);
        ctx.lineTo(screenX, cy);
        ctx.lineTo(screenX - 7, cy);
        ctx.closePath();
        ctx.fillStyle = '#67E8F9';
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(screenX - 2, cy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      };

      // Helper to draw ultra-cute chibi Odibot with 5 distinct costume shapes & expressive animations
      const drawRobot = (screenX: number, screenY: number) => {
        const angle = r.currentAngle;
        const shape = curSkin.shape;

        // Victory Jump & Cheer Kinematics
        const vPhase = curVictory ? (victoryElapsedRef.current * 2.4) % 1 : 0;
        const vJumpCurve = curVictory ? Math.sin(vPhase * Math.PI) : 0;
        const victoryHopHeight = curVictory ? vJumpCurve * 24 : 0;
        const victoryScaleY = curVictory ? (vJumpCurve < 0.12 ? 0.88 : 1 + vJumpCurve * 0.12) : 1;
        const victoryScaleX = curVictory ? (vJumpCurve < 0.12 ? 1.12 : 1 - vJumpCurve * 0.06) : 1;
        const victoryWobble = curVictory ? Math.sin(victoryElapsedRef.current * 6.5) * 0.12 : 0;
        const isHappyFace = curVictory || (r.actionPulse > 0.25 && r.lastActionType === 'COLLECT');
        const isProcessingCode = curSimulating && !curVictory;

        ctx.save();
        ctx.translate(screenX, screenY - r.jumpArc - actionLift);

        if (curPerspective === 'TOP_DOWN') {
          // --- 2D Top-Down Cute Chibi Robot with Costume Shape ---
          if (curVictory) {
            const auraRadius = 19 + Math.sin(victoryElapsedRef.current * 8) * 4;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          } else if (isProcessingCode) {
            const procPulse = (Math.sin(animTimeRef.current * 10) + 1) * 0.5;
            ctx.save();
            ctx.rotate(animTimeRef.current * (curThinking ? 5.5 : 3.8));
            ctx.beginPath();
            ctx.arc(0, 0, 20 + r.commandPulse * 2.5, 0, Math.PI * 1.1);
            ctx.strokeStyle = curThinking ? `rgba(192, 132, 252, ${0.7 + procPulse * 0.3})` : curSkin.accentColor;
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 20 + r.commandPulse * 2.5, Math.PI * 1.3, Math.PI * 1.85);
            ctx.strokeStyle = curSkin.visorColor;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }

          const topScale = (curVictory ? 1 + vJumpCurve * 0.22 : 1) * (1 + (finalScaleY - 1) * 0.5);
          ctx.scale(topScale, topScale);
          ctx.rotate(angle + victoryWobble);

          // Headlight scan beam cone
          ctx.beginPath();
          ctx.moveTo(4, 0);
          ctx.lineTo(31, -13);
          ctx.lineTo(31, 13);
          ctx.closePath();
          ctx.fillStyle = curVictory
            ? 'rgba(251, 191, 36, 0.34)'
            : curThinking
            ? 'rgba(192, 132, 252, 0.34)'
            : isProcessingCode
            ? 'rgba(56, 189, 248, 0.3)'
            : 'rgba(34, 211, 238, 0.2)';
          ctx.fill();

          // Subtle rear anti-gravity hover glow when moving/jumping/processing
          if (r.isMoving || r.isJumping || curVictory || isProcessingCode) {
            const fLen = (r.isJumping || curVictory ? 8 : 5) + Math.sin(animTimeRef.current * 36) * 2.2;
            ctx.fillStyle = r.isJumping || curVictory ? '#FDE047' : curSkin.thrusterColor;
            ctx.globalAlpha = 0.78;
            ctx.beginPath();
            ctx.moveTo(-12, -4);
            ctx.quadraticCurveTo(-14 - fLen, 0, -12, 4);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          // Top-down Modern-Tech Back Accessories (Jet Wings / Quantum Blades / Orbital Ring)
          if (shape === 'HOLODRONE_JET') {
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = curSkin.accentColor;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(2, -10);
            ctx.lineTo(-10, -18.5);
            ctx.lineTo(-13, -10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(2, 10);
            ctx.lineTo(-10, 18.5);
            ctx.lineTo(-13, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (shape === 'QUANTUM_PRIME') {
            ctx.fillStyle = curSkin.primaryColor;
            ctx.strokeStyle = curSkin.accentColor;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(0, -11);
            ctx.lineTo(-11, -18);
            ctx.lineTo(-9, -9);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, 11);
            ctx.lineTo(-11, 18);
            ctx.lineTo(-9, 9);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          // Cute Stubby Floating Mitten Arms (Top-Down)
          const armSwingTop = r.isMoving
            ? Math.sin(r.stridePhase) * 3.2
            : isProcessingCode
            ? Math.sin(animTimeRef.current * 14) * 1.6
            : Math.sin(animTimeRef.current * 3) * 0.8;

          ctx.fillStyle = curSkin.primaryColor;
          ctx.strokeStyle = curSkin.visorColor;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.ellipse(armSwingTop, -14, 4.5, 3.1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(-armSwingTop, 14, 4.5, 3.1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Cute Chubby Rounded Pod Silhouette
          const topChassisGrad = ctx.createLinearGradient(-13, -12, 14, 12);
          topChassisGrad.addColorStop(0, curSkin.shellLightColor);
          topChassisGrad.addColorStop(0.55, curSkin.primaryColor);
          topChassisGrad.addColorStop(1, curSkin.secondaryColor);
          ctx.beginPath();
          ctx.ellipse(0.5, 0, 13.5, 12.2, 0, 0, Math.PI * 2);
          ctx.fillStyle = topChassisGrad;
          ctx.fill();
          ctx.strokeStyle = curVictory
            ? '#FDE68A'
            : curThinking
            ? '#E879F9'
            : curSkin.shellLightColor;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Top-down Modern-Tech Headgear Features
          if (shape === 'PULSE_AUDIO') {
            // Cyber Headphone Arch & Ear-Cups
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(-1, 0, 13.5, Math.PI * 0.55, Math.PI * 1.45);
            ctx.stroke();
            ctx.fillStyle = '#0F172A';
            ctx.strokeStyle = curSkin.accentColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(-1, -13, 3.2, 2.2, 0, 0, Math.PI * 2);
            ctx.ellipse(-1, 13, 3.2, 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (shape === 'HOLODRONE_JET') {
            // Dual Swept Stealth Cyber-Fins
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = curSkin.accentColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -10.5);
            ctx.lineTo(-7, -15);
            ctx.lineTo(-8, -8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 10.5);
            ctx.lineTo(-7, 15);
            ctx.lineTo(-8, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (shape === 'ORBITAL_SAT') {
            // Orbital Gyro Ring & Optic Scanner Lens
            ctx.strokeStyle = curSkin.accentColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(-2, 0, 7, 15.5, 0.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = curSkin.accentColor;
            ctx.beginPath();
            ctx.arc(-2, -15, 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (shape === 'QUANTUM_PRIME') {
            // Mecha V-Fin Crest Top View
            ctx.strokeStyle = '#FEF08A';
            ctx.fillStyle = curSkin.accentColor;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.lineTo(-5, -10);
            ctx.lineTo(-3, 0);
            ctx.lineTo(-5, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          // Glossy Obsidian Oval Visor
          ctx.beginPath();
          ctx.ellipse(6.2, 0, 5.8, 8.8, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#050914';
          ctx.fill();
          ctx.strokeStyle = isProcessingCode ? curSkin.accentColor : curSkin.visorColor;
          ctx.lineWidth = 1.25;
          ctx.stroke();

          // Rosy Cheeks + Big Kawaii Eyes (Top-Down)
          ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
          ctx.beginPath();
          ctx.ellipse(4.8, -6.2, 1.3, 2, 0, 0, Math.PI * 2);
          ctx.ellipse(4.8, 6.2, 1.3, 2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = isHappyFace
            ? '#FDE047'
            : curThinking
            ? '#E879F9'
            : curSkin.visorColor;
          ctx.beginPath();
          ctx.ellipse(7.5, -3.5, 2.1, 2.9, -0.1, 0, Math.PI * 2);
          ctx.ellipse(7.5, 3.5, 2.1, 2.9, 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Crisp Front Pointer Chevron
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(13, -4);
          ctx.lineTo(13, 4);
          ctx.closePath();
          ctx.fillStyle = curThinking ? '#C084FC' : curSkin.accentColor;
          ctx.fill();

          ctx.restore();
          return;
        }

        // --- 3D Isometric Cute Chibi Odibot with Costume Shape ---
        // Floor Directional Holoprojector Ring & Chevron
        ctx.save();
        ctx.scale(1, 0.52);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, 18.5, -0.78, 0.78);
        ctx.strokeStyle = curVictory
          ? 'rgba(251, 191, 36, 0.88)'
          : curThinking
          ? 'rgba(192, 132, 252, 0.9)'
          : curSkin.visorColor;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(23.5, 0);
        ctx.lineTo(15.5, -5.5);
        ctx.lineTo(17.5, 0);
        ctx.lineTo(15.5, 5.5);
        ctx.closePath();
        ctx.fillStyle = curThinking ? '#C084FC' : curSkin.accentColor;
        ctx.fill();
        ctx.restore();

        // Active Code-Processing Rotating Tech Ring on Floor
        if (isProcessingCode) {
          ctx.save();
          ctx.scale(1, 0.52);
          ctx.rotate(animTimeRef.current * (curThinking ? 5.2 : 3.6));
          const ringR = 17 + r.commandPulse * 3;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 0.7);
          ctx.strokeStyle = curThinking ? '#E879F9' : curSkin.accentColor;
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 0, ringR, Math.PI, Math.PI * 1.7);
          ctx.strokeStyle = curSkin.visorColor;
          ctx.lineWidth = 2.2;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(ringR, 0, 2.2, 0, Math.PI * 2);
          ctx.arc(-ringR, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Pulsing Victory Spotlight Ring
        if (curVictory) {
          const ringPulse = (Math.sin(victoryElapsedRef.current * 7) + 1) * 0.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 17 + ringPulse * 6, 8.5 + ringPulse * 3, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 + ringPulse * 0.45})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Dynamic Ground Shadow
        const totalAirH = r.jumpArc + victoryHopHeight + actionLift;
        const shadowShrink = Math.max(0.45, 1 - totalAirH / 54);
        ctx.beginPath();
        ctx.ellipse(0, 1, 12.5 * shadowShrink, 5.5 * shadowShrink, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.fill();

        const processNod = isProcessingCode ? Math.sin(animTimeRef.current * 12) * 1.2 + r.commandPulse * 2 : 0;
        const idleBob = curVictory
          ? 0
          : isProcessingCode
          ? processNod
          : Math.sin(animTimeRef.current * 3.8) * 2.1;
        ctx.translate(0, idleBob - victoryHopHeight - 4);
        ctx.scale(finalScaleX * victoryScaleX, finalScaleY * victoryScaleY);
        ctx.rotate(
          (curVictory ? victoryWobble * 0.6 : 0) +
          (isProcessingCode ? Math.sin(animTimeRef.current * 8) * 0.04 : 0) +
          r.leanAngle
        );

        // Chubby Mini Pod Torso Proportions (Kawaii 1.35:1 head-to-body ratio)
        const bodyW = 22;
        const bodyH = 18;
        const bodyTopY = -bodyH - 2;

        // Subtle Anti-Gravity Hover Halo Glow beneath chubby pod
        const hoverGlowColor = r.isJumping || curVictory ? '#FDE047' : curSkin.thrusterColor;
        const hoverPulse = 0.28 + Math.sin(animTimeRef.current * (isProcessingCode ? 18 : 8)) * 0.1;
        ctx.beginPath();
        ctx.ellipse(0, 0.5, 6.5, 2.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = hoverGlowColor;
        ctx.globalAlpha = hoverPulse;
        ctx.fill();

        const centerGlowH = 4 + (r.isJumping || curVictory ? 4.5 : isProcessingCode ? 2.5 + Math.sin(animTimeRef.current * 20) * 1 : Math.sin(animTimeRef.current * 12) * 0.9);
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.moveTo(-3.2, -2);
        ctx.lineTo(0, -2 + centerGlowH);
        ctx.lineTo(3.2, -2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // --- MODERN-TECH BACK ACCESSORIES (Jet Wings / Quantum Energy Blades) ---
        if (shape === 'HOLODRONE_JET') {
          // Swept Micro-Thruster Stealth Jet Wings
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(-bodyW / 2 + 1, bodyTopY + 3);
          ctx.lineTo(-bodyW / 2 - 9.5, bodyTopY - 2);
          ctx.lineTo(-bodyW / 2 - 7, bodyTopY + 9);
          ctx.lineTo(-bodyW / 2 + 1, bodyTopY + 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(bodyW / 2 - 1, bodyTopY + 3);
          ctx.lineTo(bodyW / 2 + 9.5, bodyTopY - 2);
          ctx.lineTo(bodyW / 2 + 7, bodyTopY + 9);
          ctx.lineTo(bodyW / 2 - 1, bodyTopY + 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = curSkin.accentColor;
          ctx.beginPath();
          ctx.arc(-bodyW / 2 - 7.5, bodyTopY + 3.5, 1.5, 0, Math.PI * 2);
          ctx.arc(bodyW / 2 + 7.5, bodyTopY + 3.5, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'QUANTUM_PRIME') {
          // Floating Quantum Energy Wing-Blades
          ctx.fillStyle = curSkin.primaryColor;
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.moveTo(-bodyW / 2, bodyTopY + 2);
          ctx.lineTo(-bodyW / 2 - 10, bodyTopY - 5);
          ctx.lineTo(-bodyW / 2 - 7.5, bodyTopY + 7);
          ctx.lineTo(-bodyW / 2, bodyTopY + 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(bodyW / 2, bodyTopY + 2);
          ctx.lineTo(bodyW / 2 + 10, bodyTopY - 5);
          ctx.lineTo(bodyW / 2 + 7.5, bodyTopY + 7);
          ctx.lineTo(bodyW / 2, bodyTopY + 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Cute Stubby Floating Mitten Arms
        const armSwing = r.isMoving
          ? Math.sin(r.stridePhase) * 0.34
          : isProcessingCode
          ? Math.sin(animTimeRef.current * 14) * 0.18
          : Math.sin(animTimeRef.current * 3) * 0.06;
        const leftArmAngle = curVictory || r.isJumping
          ? 2.25 + Math.sin(animTimeRef.current * 14) * 0.18
          : r.actionPulse > 0.1
          ? 0.95 + Math.sin(animTimeRef.current * 18) * 0.16
          : 0.18 + armSwing;
        const rightArmAngle = curVictory || r.isJumping
          ? -2.25 - Math.sin(animTimeRef.current * 14) * 0.18
          : isProcessingCode
          ? -1.05 + Math.sin(animTimeRef.current * 12) * 0.18
          : r.actionPulse > 0.1
          ? -0.95
          : -0.18 + armSwing;

        const armGrad = ctx.createLinearGradient(-3, 0, 3, 11);
        armGrad.addColorStop(0, curSkin.shellLightColor);
        armGrad.addColorStop(0.55, curSkin.primaryColor);
        armGrad.addColorStop(1, curSkin.secondaryColor);

        const drawFloatingMittenArm = (hoverX: number, hoverY: number, armRot: number, side: -1 | 1) => {
          ctx.save();
          ctx.translate(hoverX, hoverY);
          ctx.rotate(armRot);

          ctx.beginPath();
          ctx.ellipse(side * 0.4, 4.5, 3, 5.2, 0, 0, Math.PI * 2);
          ctx.fillStyle = armGrad;
          ctx.fill();
          ctx.strokeStyle = curSkin.visorColor;
          ctx.globalAlpha = 0.65;
          ctx.lineWidth = 1.05;
          ctx.stroke();
          ctx.globalAlpha = 1;

          ctx.beginPath();
          ctx.arc(side * 0.8, 2.5, 1.1, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.fill();
          ctx.restore();
        };

        drawFloatingMittenArm(-bodyW / 2 - 2.6, bodyTopY + 5, leftArmAngle, -1);
        drawFloatingMittenArm(bodyW / 2 + 2.6, bodyTopY + 5, rightArmAngle, 1);

        // Chubby Cute Egg-Bean Torso
        const torsoGrad = ctx.createLinearGradient(-bodyW / 2, bodyTopY, bodyW / 2, -2);
        torsoGrad.addColorStop(0, curSkin.shellLightColor);
        torsoGrad.addColorStop(0.52, curSkin.primaryColor);
        torsoGrad.addColorStop(1, curSkin.secondaryColor);

        ctx.beginPath();
        ctx.moveTo(-bodyW / 2 + 1.5, bodyTopY + 3.5);
        ctx.bezierCurveTo(-bodyW / 2 + 1.5, bodyTopY - 1, bodyW / 2 - 1.5, bodyTopY - 1, bodyW / 2 - 1.5, bodyTopY + 3.5);
        ctx.bezierCurveTo(bodyW / 2, bodyTopY + 11, bodyW / 3 + 1.5, -2.2, 0, -2);
        ctx.bezierCurveTo(-bodyW / 3 - 1.5, -2.2, -bodyW / 2, bodyTopY + 11, -bodyW / 2 + 1.5, bodyTopY + 3.5);
        ctx.closePath();
        ctx.fillStyle = torsoGrad;
        ctx.fill();
        ctx.strokeStyle = curVictory
          ? '#FDE68A'
          : isProcessingCode
          ? curSkin.accentColor
          : curSkin.shellLightColor;
        ctx.lineWidth = curVictory || isProcessingCode ? 1.8 : 1.3;
        ctx.stroke();

        // Porcelain Specular Gloss Streak on Left Torso Curve
        ctx.beginPath();
        ctx.moveTo(-bodyW / 2 + 4.2, bodyTopY + 4);
        ctx.bezierCurveTo(-bodyW / 2 + 4.2, bodyTopY + 9, -bodyW / 4, -5, -2.6, -4);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Sleek Chest Directive / Modern-Tech Module Indicator
        if (isProcessingCode) {
          ctx.beginPath();
          drawRoundRect(ctx, -6, bodyTopY + 6.2, 12, 4.6, 2.3);
          ctx.fillStyle = '#091124';
          ctx.fill();
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 0.9;
          ctx.stroke();

          const ledSpeed = curThinking ? 12 : 9;
          const activeLed = Math.floor(animTimeRef.current * ledSpeed) % 3;
          for (let led = 0; led < 3; led++) {
            ctx.fillStyle =
              led === activeLed
                ? curSkin.accentColor
                : led === (activeLed + 1) % 3
                ? curSkin.visorColor
                : curThinking
                ? '#E879F9'
                : '#34D399';
            ctx.beginPath();
            ctx.arc(-3 + led * 3, bodyTopY + 8.5, led === activeLed ? 1.25 : 0.85, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (shape === 'PULSE_AUDIO') {
          // 3-Bar Audio Equalizer
          ctx.beginPath();
          drawRoundRect(ctx, -5, bodyTopY + 6, 10, 5.2, 1.5);
          ctx.fillStyle = '#091124';
          ctx.fill();
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          for (let b = 0; b < 3; b++) {
            const barH = 1.6 + Math.abs(Math.sin(animTimeRef.current * 8 + b * 1.4)) * 2.2;
            ctx.fillStyle = b === 1 ? curSkin.visorColor : curSkin.accentColor;
            ctx.fillRect(-3.4 + b * 2.8, bodyTopY + 10.4 - barH, 1.5, barH);
          }
        } else if (shape === 'HOLODRONE_JET') {
          // Stealth Hexagon Core
          ctx.fillStyle = curSkin.accentColor;
          ctx.beginPath();
          ctx.moveTo(0, bodyTopY + 5.6);
          ctx.lineTo(2.8, bodyTopY + 7.2);
          ctx.lineTo(2.8, bodyTopY + 10.2);
          ctx.lineTo(0, bodyTopY + 11.8);
          ctx.lineTo(-2.8, bodyTopY + 10.2);
          ctx.lineTo(-2.8, bodyTopY + 7.2);
          ctx.closePath();
          ctx.fill();
        } else if (shape === 'ORBITAL_SAT') {
          // Biosphere Radar Core
          ctx.beginPath();
          ctx.arc(0, bodyTopY + 8.5, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#091124';
          ctx.fill();
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, bodyTopY + 8.5, 1.3, 0, Math.PI * 2);
          ctx.fillStyle = curSkin.accentColor;
          ctx.fill();
        } else if (shape === 'QUANTUM_PRIME') {
          // Diamond Quantum Prism
          ctx.fillStyle = curSkin.accentColor;
          ctx.beginPath();
          ctx.moveTo(0, bodyTopY + 5.5);
          ctx.lineTo(2.6, bodyTopY + 8.5);
          ctx.lineTo(0, bodyTopY + 11.5);
          ctx.lineTo(-2.6, bodyTopY + 8.5);
          ctx.closePath();
          ctx.fill();
        } else {
          const corePulse = (Math.sin(animTimeRef.current * 5) + 1) * 0.5;
          const leafColor = isHappyFace ? '#34D399' : curSkin.accentColor;
          ctx.beginPath();
          ctx.arc(0, bodyTopY + 8.5, 3.1 + corePulse * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = leafColor;
          ctx.globalAlpha = 0.25;
          ctx.fill();
          ctx.globalAlpha = 1;

          ctx.beginPath();
          ctx.moveTo(0, bodyTopY + 6.2);
          ctx.quadraticCurveTo(2.6, bodyTopY + 7.6, 0, bodyTopY + 10.8);
          ctx.quadraticCurveTo(-2.6, bodyTopY + 7.6, 0, bodyTopY + 6.2);
          ctx.closePath();
          ctx.fillStyle = leafColor;
          ctx.fill();
        }

        // Big Round Kawaii Chibi Dome Head
        const headW = 30;
        const headH = 22;
        const headY = bodyTopY - headH - 2;

        // --- MODERN-TECH HEADGEAR BEHIND/ON MAIN DOME ---
        const helmetGrad = ctx.createLinearGradient(-headW / 2, headY, headW / 2, headY + headH);
        helmetGrad.addColorStop(0, curSkin.shellLightColor);
        helmetGrad.addColorStop(0.5, curSkin.primaryColor);
        helmetGrad.addColorStop(1, curSkin.secondaryColor);

        if (shape === 'PULSE_AUDIO') {
          // Cyber Headphone Arch curving over Head
          ctx.beginPath();
          ctx.arc(0, headY + 11, headW / 2 + 2.2, Math.PI * 1.02, Math.PI * 1.98);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 3.6;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, headY + 11, headW / 2 + 2.2, Math.PI * 1.18, Math.PI * 1.82);
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (shape === 'HOLODRONE_JET') {
          // Dual Swept Stealth Cyber Radar Fins
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(-headW / 2 + 3.5, headY + 6.5);
          ctx.lineTo(-headW / 2 - 2.5, headY - 6.5);
          ctx.lineTo(-headW / 2 + 8, headY + 1.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(headW / 2 - 3.5, headY + 6.5);
          ctx.lineTo(headW / 2 + 2.5, headY - 6.5);
          ctx.lineTo(headW / 2 - 8, headY + 1.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (shape === 'ORBITAL_SAT') {
          // Back Arc of Tilted Orbital Gyro Ring
          ctx.beginPath();
          ctx.ellipse(0, headY + 1, 16, 4.5, -0.06, Math.PI, Math.PI * 2);
          ctx.strokeStyle = curSkin.accentColor;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Main Big Round Chibi Dome Head
        ctx.beginPath();
        ctx.moveTo(-headW / 2, headY + 12);
        ctx.bezierCurveTo(-headW / 2, headY + 0.5, -headW / 4, headY - 1.5, 0, headY - 1.5);
        ctx.bezierCurveTo(headW / 4, headY - 1.5, headW / 2, headY + 0.5, headW / 2, headY + 12);
        ctx.bezierCurveTo(headW / 2, headY + 19.5, headW / 3, headY + headH, 0, headY + headH);
        ctx.bezierCurveTo(-headW / 3, headY + headH, -headW / 2, headY + 19.5, -headW / 2, headY + 12);
        ctx.closePath();
        ctx.fillStyle = helmetGrad;
        ctx.fill();
        ctx.strokeStyle = curVictory
          ? '#FDE68A'
          : curThinking
          ? '#C084FC'
          : curSkin.shellLightColor;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Foreground Headphone Ear-Cups / Orbital Gyro Front / Mecha V-Fin Crest
        if (shape === 'PULSE_AUDIO') {
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          drawRoundRect(ctx, -headW / 2 - 3.4, headY + 7.5, 4.6, 8.5, 2.2);
          drawRoundRect(ctx, headW / 2 - 1.2, headY + 7.5, 4.6, 8.5, 2.2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = curSkin.accentColor;
          ctx.beginPath();
          ctx.arc(-headW / 2 - 1.1, headY + 11.7, 1.3, 0, Math.PI * 2);
          ctx.arc(headW / 2 + 1.1, headY + 11.7, 1.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'ORBITAL_SAT') {
          // Front Arc of Orbital Gyro + Micro Satellite & Right Optic Scanner
          ctx.beginPath();
          ctx.ellipse(0, headY + 1, 16, 4.5, -0.06, 0, Math.PI);
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.8;
          ctx.stroke();
          const satAngle = animTimeRef.current * 2.5;
          const satX = Math.cos(satAngle) * 16;
          const satY = headY + 1 + Math.sin(satAngle) * 4.5;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(satX, satY, 1.8, 0, Math.PI * 2);
          ctx.fill();
          // Right Temple Optic Pod
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(headW / 2 + 0.5, headY + 11, 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = curSkin.accentColor;
          ctx.beginPath();
          ctx.arc(headW / 2 + 0.5, headY + 11, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'QUANTUM_PRIME') {
          // Sleek Futuristic Mecha V-Fin Crest
          ctx.beginPath();
          ctx.moveTo(0, headY - 0.5);
          ctx.lineTo(-11.5, headY - 8.5);
          ctx.lineTo(-7.5, headY - 1.5);
          ctx.lineTo(0, headY + 1);
          ctx.lineTo(7.5, headY - 1.5);
          ctx.lineTo(11.5, headY - 8.5);
          ctx.closePath();
          ctx.fillStyle = curSkin.shellLightColor;
          ctx.fill();
          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 1.1;
          ctx.stroke();
          ctx.fillStyle = curSkin.accentColor;
          ctx.beginPath();
          ctx.arc(0, headY - 0.2, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Porcelain Crown Specular Highlight
        ctx.beginPath();
        ctx.moveTo(-9, headY + 3);
        ctx.quadraticCurveTo(-2, headY, 6, headY + 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glossy Obsidian Kawaii Visor
        ctx.beginPath();
        ctx.moveTo(-headW / 2 + 2.4, headY + 12);
        ctx.bezierCurveTo(-headW / 2 + 2.4, headY + 4, -headW / 4 + 0.8, headY + 2.2, 0, headY + 2.2);
        ctx.bezierCurveTo(headW / 4 - 0.8, headY + 2.2, headW / 2 - 2.4, headY + 4, headW / 2 - 2.4, headY + 12);
        ctx.bezierCurveTo(headW / 2 - 2.4, headY + 18, headW / 4, headY + headH - 2, 0, headY + headH - 2);
        ctx.bezierCurveTo(-headW / 4, headY + headH - 2, -headW / 2 + 2.4, headY + 18, -headW / 2 + 2.4, headY + 12);
        ctx.closePath();
        ctx.fillStyle = '#050914';
        ctx.fill();
        ctx.strokeStyle = isProcessingCode ? curSkin.accentColor : curSkin.secondaryColor;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Sweeping Holographic Visor Telemetry Scanline while processing commands
        if (isProcessingCode) {
          const scanRatio = (Math.sin(animTimeRef.current * 8.5) + 1) * 0.5;
          const scanX = -headW / 2 + 4.5 + scanRatio * (headW - 13);
          ctx.fillStyle = curThinking ? 'rgba(232, 121, 249, 0.28)' : 'rgba(56, 189, 248, 0.26)';
          ctx.fillRect(scanX, headY + 4.5, 4, headH - 8);
        }

        // Curved Glass Sheen Reflection
        ctx.beginPath();
        ctx.moveTo(-headW / 2 + 5.5, headY + 5);
        ctx.lineTo(-headW / 2 + 10, headY + 4.5);
        ctx.lineTo(-headW / 2 + 6.5, headY + headH - 4.5);
        ctx.lineTo(-headW / 2 + 4, headY + headH - 5.5);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();

        const eyeOffsetRatio = Math.sin(angle);
        const thinkingScanOffset = isProcessingCode ? Math.sin(animTimeRef.current * 10) * 1.4 : 0;
        const eyeXCenter = eyeOffsetRatio * 3.5 + thinkingScanOffset;

        // Cute Rosy Cheek Blushes inside Visor!
        ctx.fillStyle = shape === 'HOLODRONE_JET' ? 'rgba(244, 114, 182, 0.62)' : 'rgba(251, 113, 133, 0.56)';
        ctx.beginPath();
        ctx.ellipse(eyeXCenter - 8.5, headY + 15.2, 2.4, 1.2, 0, 0, Math.PI * 2);
        ctx.ellipse(eyeXCenter + 8.5, headY + 15.2, 2.4, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        r.blinkTimer -= dt;
        if (r.blinkTimer <= 0) {
          r.isBlinking = true;
          if (r.blinkTimer <= -0.14) {
            r.isBlinking = false;
            r.blinkTimer = 2.4 + Math.random() * 2.2;
          }
        }

        // Big Sparkly Kawaii Digital Eyes
        if (isHappyFace) {
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(eyeXCenter - 5.5, headY + 13, 3.4, Math.PI * 1.12, Math.PI * 1.88);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(eyeXCenter + 5.5, headY + 13, 3.4, Math.PI * 1.12, Math.PI * 1.88);
          ctx.stroke();
        } else if (curThinking) {
          const thinkEyeColor = Math.sin(animTimeRef.current * 12) > 0 ? '#E879F9' : '#38BDF8';
          ctx.fillStyle = thinkEyeColor;
          ctx.beginPath();
          ctx.ellipse(eyeXCenter - 5.4, headY + 11.4, 3.4, 2.5, -0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(eyeXCenter + 5.4, headY + 11.4, 3.4, 3.1, 0.12, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(eyeXCenter - 6.3, headY + 10.3, 1.1, 0, Math.PI * 2);
          ctx.arc(eyeXCenter + 4.5, headY + 10.1, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (r.isBlinking) {
          ctx.strokeStyle = curSkin.visorColor;
          ctx.lineWidth = 1.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(eyeXCenter - 7.8, headY + 11.5);
          ctx.lineTo(eyeXCenter - 3, headY + 11.5);
          ctx.moveTo(eyeXCenter + 3, headY + 11.5);
          ctx.lineTo(eyeXCenter + 7.8, headY + 11.5);
          ctx.stroke();
        } else {
          const eyeColor = isProcessingCode ? curSkin.accentColor : curSkin.visorColor;
          const eyeRY = r.isJumping ? 3.5 : 3.2;
          ctx.fillStyle = eyeColor;
          ctx.beginPath();
          ctx.ellipse(eyeXCenter - 5.4, headY + 11.4, 3.4, eyeRY, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(eyeXCenter + 5.4, headY + 11.4, 3.4, eyeRY, 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Cute white sparkle highlights
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(eyeXCenter - 6.3, headY + 10.1, 1.25, 0, Math.PI * 2);
          ctx.arc(eyeXCenter + 4.5, headY + 10.1, 1.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eyeXCenter - 4.4, headY + 12.6, 0.6, 0, Math.PI * 2);
          ctx.arc(eyeXCenter + 6.4, headY + 12.6, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Wireless Command Signal Waves curving above Head when processing
        if (isProcessingCode) {
          const waveProgress = (animTimeRef.current * 2.2) % 1;
          const waveOriginY = shape === 'QUANTUM_PRIME' || shape === 'ORBITAL_SAT' ? headY - 7 : headY - 2;
          ctx.save();
          ctx.strokeStyle = curThinking ? '#E879F9' : curSkin.accentColor;
          ctx.globalAlpha = Math.max(0.15, 1 - waveProgress);
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, waveOriginY, 7 + waveProgress * 7, Math.PI * 1.22, Math.PI * 1.78);
          ctx.stroke();

          ctx.strokeStyle = curSkin.visorColor;
          ctx.globalAlpha = Math.max(0.1, (1 - waveProgress) * 0.75);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, waveOriginY, 10 + waveProgress * 9, Math.PI * 1.25, Math.PI * 1.75);
          ctx.stroke();
          ctx.restore();

          if (curThinking) {
            ctx.save();
            ctx.translate(0, waveOriginY - 8);
            ctx.rotate(animTimeRef.current * 6.5);
            ctx.beginPath();
            ctx.arc(0, 0, 5.2, 0, Math.PI * 1.25);
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
          }
        }

        // Floating Micro Command Hologram Badge when a code step triggers
        if (r.commandPulse > 0.12 && r.commandLabel && !curVictory && !curThinking) {
          const popProgress = 1 - r.commandPulse;
          const badgeY = headY - (shape === 'QUANTUM_PRIME' || shape === 'ORBITAL_SAT' ? 20 : 16) - popProgress * 10;
          ctx.save();
          ctx.globalAlpha = Math.min(1, r.commandPulse * 1.4);
          ctx.beginPath();
          drawRoundRect(ctx, -11, badgeY - 7, 22, 13, 5);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fill();
          ctx.strokeStyle = curSkin.accentColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = curSkin.shellLightColor;
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(r.commandLabel, 0, badgeY - 0.5);
          ctx.restore();
        }

        // Floating Thought Bubble + Loading Indicator above 3D robot when thinking
        if (curThinking) {
          const floatOffset = Math.sin(animTimeRef.current * 6) * 1.5;
          const bubbleY = headY - (shape === 'QUANTUM_PRIME' || shape === 'ORBITAL_SAT' ? 33 : 29) + floatOffset;

          ctx.fillStyle = 'rgba(192, 132, 252, 0.9)';
          ctx.beginPath();
          ctx.arc(5, bubbleY + 13, 1.4, 0, Math.PI * 2);
          ctx.arc(8, bubbleY + 9, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          drawRoundRect(ctx, -16, bubbleY - 8, 34, 15, 7);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
          ctx.fill();
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          const isBranchLogic =
            curActiveAction === 'IF_VAR' ||
            curActiveAction === 'IF_COLOR' ||
            curActiveAction === 'IF_OBSTACLE';
          ctx.save();
          ctx.translate(-8.5, bubbleY - 0.5);
          ctx.rotate(animTimeRef.current * 7);
          ctx.beginPath();
          ctx.arc(0, 0, 3.6, 0, Math.PI * 1.35);
          ctx.strokeStyle = isBranchLogic ? '#F59E0B' : '#38BDF8';
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();

          for (let d = 0; d < 3; d++) {
            const dotWave = Math.sin(animTimeRef.current * 10 - d * 1.1);
            const dotY = bubbleY - 0.5 - Math.max(0, dotWave) * 2.2;
            ctx.beginPath();
            ctx.arc(0 + d * 5, dotY, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = d === 0 ? '#38BDF8' : d === 1 ? '#E879F9' : '#A855F7';
            ctx.fill();
          }
        }

        ctx.restore();
      };

      // 3. Render all sorted world items
      for (const item of items) {
        const screen = toScreen(item.gx, item.gy, item.gh);
        if (item.type === 'tile' && item.data) {
          drawTile(screen.x, screen.y, item.gh, item.data, item.gx, item.gy);
        } else if (item.type === 'crystal') {
          drawCrystal(screen.x, screen.y);
        } else if (item.type === 'robot') {
          drawRobot(screen.x, screen.y);
        }
      }

      // Restore world camera transform before drawing screen-space fireworks & confetti
      ctx.restore();

      // 4. Screen-space Fireworks Launcher & Shockwave Rings during Victory
      if (curVictory) {
        fireworkTimerRef.current -= dt;
        const rockets = fireworkRocketsRef.current;
        if (fireworkTimerRef.current <= 0 && rockets.length < 5) {
          fireworkTimerRef.current = 0.42 + Math.random() * 0.35;
          const colorPairs: [string, string][] = [
            ['#F59E0B', '#FDE68A'],
            ['#06B6D4', '#A5F3FC'],
            ['#EC4899', '#F9A8D4'],
            ['#10B981', '#6EE7B7'],
            ['#A855F7', '#D8B4FE'],
          ];
          const [primary, secondary] = colorPairs[Math.floor(Math.random() * colorPairs.length)];
          rockets.push({
            x: width * (0.16 + Math.random() * 0.68),
            y: height * 0.94,
            vx: (Math.random() - 0.5) * 1.6,
            vy: -(6.5 + Math.random() * 3.2),
            targetY: height * (0.18 + Math.random() * 0.34),
            color: primary,
            secondaryColor: secondary,
          });
        }
      }

      // Update & draw rising firework rockets
      const rockets = fireworkRocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const rk = rockets[i];
        rk.x += rk.vx;
        rk.y += rk.vy;
        rk.vy += 0.08;

        // Rising rocket comet head
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rk.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rk.x, rk.y);
        ctx.lineTo(rk.x - rk.vx * 3, rk.y - rk.vy * 2.5);
        ctx.stroke();
        ctx.restore();

        // Trail spark
        if (Math.random() < 0.6 && particlesRef.current.length < 280) {
          particlesRef.current.push({
            x: rk.x,
            y: rk.y,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.6 + Math.random() * 0.8,
            color: rk.secondaryColor,
            size: 1.8,
            alpha: 0.9,
            life: 0,
            maxLife: 14,
            gravity: 0.03,
            drag: 0.96,
            shape: 'circle',
          });
        }

        if (rk.y <= rk.targetY || rk.vy >= -0.5) {
          spawnFireworkBurst(rk.x, rk.y, rk.color, rk.secondaryColor);
          rockets.splice(i, 1);
        }
      }

      // Update & draw firework shockwave rings
      const rings = fireworkRingsRef.current;
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.radius += (ring.maxRadius - ring.radius) * 0.14;
        ring.alpha -= 0.035;
        if (ring.alpha <= 0.02) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ring.alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 5. Update and render screen-space firework sparks & confetti stars
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.vx *= p.drag ?? 0.985;
        p.vy *= p.drag ?? 0.985;
        p.vy += p.gravity ?? 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.shape === 'spark') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.2, p.size * 0.65);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size * 0.45), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * 0.12);
          ctx.beginPath();
          const spikes = 4;
          const outerR = p.size;
          const innerR = p.size * 0.42;
          for (let s = 0; s < spikes * 2; s++) {
            const radStar = s % 2 === 0 ? outerR : innerR;
            const angStar = (s * Math.PI) / spikes;
            const sx = Math.cos(angStar) * radStar;
            const sy = Math.sin(angStar) * radStar;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();

      if (!isPausedRef.current && !document.hidden) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const scheduleRender = () => {
      if (animationFrameId === null && !isPausedRef.current && !document.hidden) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };

    resumeCanvasLoopRef.current = scheduleRender;

    const handleVisibility = () => {
      if (!document.hidden) {
        scheduleRender();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    scheduleRender();

    return () => {
      resumeCanvasLoopRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  // Unified Pointer pan handlers (ref-backed for zero React re-renders during drag)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target !== canvasRef.current) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    panRef.current = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Camera toolbar buttons
  const handleZoomIn = () => {
    sounds.playClick();
    setZoom((z) => Math.min(2.0, z + 0.15));
  };

  const handleZoomOut = () => {
    sounds.playClick();
    setZoom((z) => Math.max(0.65, z - 0.15));
  };

  const handleRotateCamera = () => {
    sounds.playClick();
    setRotationAngle((a) => (a + 90) % 360);
  };

  const handleResetView = () => {
    sounds.playClick();
    setZoom(1);
    panRef.current = { x: 0, y: 0 };
    setRotationAngle(0);
  };

  // Dynamic speech text for Odibot
  let speechText = 'Siap melangkah, Kapten! Susun balok kode atau gerakkan langsung dengan D-Pad/Panah.';
  if (victoryActive) {
    speechText = 'HORE! Misi berhasil diselesaikan dengan sukses! 🎉 Kamu pintar sekali!';
  } else if (autoRunCountdown !== null && autoRunCountdown !== undefined) {
    speechText = '⚡ Menyiapkan mesin! Robot Odibot akan melangkah otomatis dalam 1 detik...';
  } else if (isSimulating) {
    if (activeAction === 'MOVE_FORWARD') speechText = 'Melangkah maju 1 petak...';
    else if (activeAction === 'JUMP') speechText = 'Lompat mendaki tebing!';
    else if (activeAction === 'TURN_LEFT') speechText = 'Putar kiri 90 derajat...';
    else if (activeAction === 'TURN_RIGHT') speechText = 'Putar kanan 90 derajat...';
    else if (activeAction === 'COLLECT') speechText = 'Mengambil kristal energi 💎!';
    else if (activeAction === 'REPEAT') speechText = '🤔 Berpikir... memproses perulangan Loop!';
    else if (activeAction === 'WHILE_VAR') speechText = '🤔 Berpikir... mengecek syarat Selama (While)!';
    else if (activeAction === 'IF_VAR') speechText = '🤔 Berpikir... mengevaluasi percabangan Variabel!';
    else if (activeAction === 'IF_COLOR') speechText = '🤔 Berpikir... memindai warna ubin (If-Else)!';
    else if (activeAction === 'IF_OBSTACLE') speechText = '🤔 Berpikir... memindai halangan di depan!';
    else if (activeAction === 'READ_LIST') speechText = '🤔 Berpikir... membaca daftar rute!';
    else speechText = 'Menjalankan baris perintah koding...';
  } else if (autoRunEnabled) {
    speechText = '⚡ Gerak Otomatis AKTIF! Begitu kamu selesai pasang balok, aku akan langsung jalan!';
  }

  const dirInIndonesian: Record<Direction, string> = {
    NORTH: 'Utara (Atas)',
    EAST: 'Timur (Kanan)',
    SOUTH: 'Selatan (Bawah)',
    WEST: 'Barat (Kiri)',
  };

  const hasSwitchInLevel =
    level.allowedCommands.includes('TOGGLE_SWITCH') ||
    tiles.some((row) => row.some((t) => t.type === 'SWITCH'));

  return (
    <div className="flex flex-col w-full h-full min-h-[200px] sm:min-h-[340px] gap-1.5">
      <div
        ref={containerRef}
        className="relative flex-1 w-full min-h-[180px] bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing border border-slate-800 rounded-xl shadow-inner"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block touch-none" />

        {/* Floating Odibot Mascot Speech Bubble HUD (compact on mobile so grid stays clear) */}
        <div
          className={`absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-auto flex items-center gap-2 p-1.5 sm:p-2 bg-slate-900/95 border rounded-xl sm:rounded-2xl shadow-lg pointer-events-auto max-w-md transition-colors ${
            isSimulating && !victoryActive ? 'border-cyan-500/65' : 'border-slate-700/80'
          }`}
        >
          <button
            type="button"
            onClick={triggerOdibotVoiceGreet}
            title="Klik untuk mendengar suara robot Odibot!"
            className="shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-400/70 active:scale-95 transition-transform cursor-pointer"
          >
            <OdibotMascot
              size="sm"
              skinId={skinId}
              animated={isSimulating || isGreetingVoice || victoryActive}
              mood={
                victoryActive || isGreetingVoice
                  ? 'happy'
                  : isThinking
                  ? 'thinking'
                  : activeAction === 'JUMP'
                  ? 'jumping'
                  : isSimulating
                  ? 'processing'
                  : 'idle'
              }
            />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 tracking-wide">
              <span className="truncate">Odibot</span>
              <button
                type="button"
                onClick={triggerOdibotVoiceGreet}
                title="Bunyikan suara robot Odibot"
                className="inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-800 text-cyan-300 hover:text-amber-300 transition-colors"
              >
                <Volume2 className="w-3 h-3" />
              </button>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-300 font-mono truncate tabular-nums">
                ({robotState.x},{robotState.y}) {dirInIndonesian[robotState.dir].split(' ')[0]}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-white truncate">
              {speechText}
            </div>
          </div>
        </div>

        {/* Floating Camera Controls (touch-sized buttons, never colliding on mobile) */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex items-center gap-1 p-1 bg-slate-900/95 border border-slate-700/60 rounded-xl text-slate-300 pointer-events-auto shadow-md max-w-[calc(100%-16px)] overflow-x-auto no-scrollbar">
          {/* Toggle Perspective (3D vs 2D Denah) */}
          <button
            onClick={() => {
              sounds.playClick();
              setPerspectiveMode((prev) => (prev === 'ISO' ? 'TOP_DOWN' : 'ISO'));
            }}
            className={`px-2 py-1 min-h-[34px] rounded-lg transition-colors flex items-center gap-1 text-[11px] sm:text-xs font-bold shrink-0 ${
              perspectiveMode === 'TOP_DOWN'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Ganti Sudut Pandang (3D Isometrik / 2D Denah Atas)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{perspectiveMode === 'TOP_DOWN' ? '2D' : '3D'}</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />

          <button
            onClick={handleZoomIn}
            title="Perbesar Tampilan"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Perkecil Tampilan"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {perspectiveMode === 'ISO' && (
            <button
              onClick={handleRotateCamera}
              title="Putar Sudut Kamera (90°)"
              className="min-h-[34px] px-1.5 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-mono shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{rotationAngle}°</span>
            </button>
          )}
          <button
            onClick={handleResetView}
            title="Reset Kamera"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />

          <button
            onClick={() => setShowDPad(!showDPad)}
            title="Tampilkan / Sembunyikan Kemudi Robot"
            className={`min-h-[34px] px-2 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold shrink-0 ${
              showDPad ? 'text-amber-300 bg-amber-950/60 border border-amber-500/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Kemudi</span>
          </button>
        </div>

        {/* Desktop/Tablet Floating Interactive D-Pad (sm+) */}
        {showDPad && onManualAction && (
          <div className="hidden sm:flex absolute bottom-3 right-3 p-2.5 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl pointer-events-auto flex-col items-center gap-1.5">
            <div className="text-[10px] font-bold text-amber-400 tracking-wider flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>KEMUDI LANGSUNG</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 w-36">
              <div />
              <button
                onClick={() => onManualAction('MOVE_FORWARD')}
                disabled={isSimulating}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center disabled:opacity-50"
                title="Maju 1 Langkah (Panah Atas / W)"
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-[8px] font-bold mt-0.5">Maju</span>
              </button>
              <button
                onClick={() => onManualAction('JUMP')}
                disabled={isSimulating}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center disabled:opacity-50"
                title="Lompat Naik/Turun Tebing (J)"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-[8px] font-bold mt-0.5">Lompat</span>
              </button>

              <button
                onClick={() => onManualAction('TURN_LEFT')}
                disabled={isSimulating}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 rounded-xl border border-slate-700 shadow transition-all flex flex-col items-center justify-center disabled:opacity-50"
                title="Putar Kiri 90° (Panah Kiri / A)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[8px] font-bold mt-0.5">Kiri</span>
              </button>
              <button
                onClick={() => onManualAction('COLLECT')}
                disabled={isSimulating}
                className="p-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center disabled:opacity-50"
                title="Ambil Kristal (E)"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-[8px] font-bold mt-0.5">Ambil</span>
              </button>
              <button
                onClick={() => onManualAction('TURN_RIGHT')}
                disabled={isSimulating}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 rounded-xl border border-slate-700 shadow transition-all flex flex-col items-center justify-center disabled:opacity-50"
                title="Putar Kanan 90° (Panah Kanan / D)"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[8px] font-bold mt-0.5">Kanan</span>
              </button>
            </div>

            {hasSwitchInLevel && (
              <button
                onClick={() => onManualAction('TOGGLE_SWITCH')}
                disabled={isSimulating}
                className="w-full py-1.5 px-2 bg-amber-700/90 hover:bg-amber-600 active:scale-95 text-white rounded-xl shadow text-[10px] font-bold transition-all disabled:opacity-50"
                title="Tekan Saklar di Ubin Ini (F)"
              >
                ⚡ Tekan Saklar (F)
              </button>
            )}

            <span className="text-[9px] text-slate-400 font-mono">
              Keyboard: Panah/WASD · J Lompat · E Ambil
            </span>
          </div>
        )}
      </div>

      {/* Mobile Docked Thumb-Friendly D-Pad (< sm) — sits cleanly BELOW canvas so it NEVER covers the grid! */}
      {showDPad && onManualAction && (
        <div className="sm:hidden shrink-0 p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            <button
              onClick={() => onManualAction('TURN_LEFT')}
              disabled={isSimulating}
              className="min-h-[44px] bg-slate-800 active:bg-slate-700 text-cyan-300 rounded-xl border border-slate-700 flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Kiri</span>
            </button>
            <button
              onClick={() => onManualAction('MOVE_FORWARD')}
              disabled={isSimulating}
              className="min-h-[44px] bg-blue-600 active:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Maju</span>
            </button>
            <button
              onClick={() => onManualAction('TURN_RIGHT')}
              disabled={isSimulating}
              className="min-h-[44px] bg-slate-800 active:bg-slate-700 text-cyan-300 rounded-xl border border-slate-700 flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
            >
              <RotateCw className="w-4 h-4" />
              <span>Kanan</span>
            </button>
            <button
              onClick={() => onManualAction('JUMP')}
              disabled={isSimulating}
              className="min-h-[44px] bg-indigo-600 active:bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Lompat</span>
            </button>
            <button
              onClick={() => onManualAction('COLLECT')}
              disabled={isSimulating}
              className="min-h-[44px] bg-amber-600 active:bg-amber-500 text-white rounded-xl flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ambil</span>
            </button>
            {hasSwitchInLevel ? (
              <button
                onClick={() => onManualAction('TOGGLE_SWITCH')}
                disabled={isSimulating}
                className="min-h-[44px] bg-emerald-600 active:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
              >
                <span>⚡ Saklar</span>
              </button>
            ) : (
              <button
                onClick={() => setShowDPad(false)}
                className="min-h-[44px] bg-slate-800 active:bg-slate-700 text-slate-400 rounded-xl border border-slate-700 text-xs font-semibold"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
