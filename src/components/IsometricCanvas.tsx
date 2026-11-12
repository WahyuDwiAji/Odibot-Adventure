import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CommandType, Direction, LevelDefinition, RobotSkinId, TileData } from '../types/game';
import { ROBOT_SKINS } from './SkinSelectorModal';
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
  shape?: 'star' | 'circle' | 'spark';
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
  squashY: number;
  blinkTimer: number;
  isBlinking: boolean;
}

interface IsometricCanvasProps {
  level: LevelDefinition;
  tiles: TileData[][];
  robotState: { x: number; y: number; height: number; dir: Direction };
  isSimulating: boolean;
  activeAction?: string;
  onTileClick?: (x: number, y: number) => void;
  celebratingVictory?: boolean;
  onManualAction?: (action: CommandType) => void;
  skinId?: RobotSkinId;
  autoRunCountdown?: number | null;
  autoRunEnabled?: boolean;
}

const DIR_ANGLES: Record<Direction, number> = {
  EAST: 0,
  SOUTH: Math.PI / 2,
  WEST: Math.PI,
  NORTH: (Math.PI * 3) / 2,
};

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

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
  level,
  tiles,
  robotState,
  isSimulating,
  activeAction,
  celebratingVictory = false,
  onManualAction,
  skinId = 'CYAN',
  autoRunCountdown = null,
  autoRunEnabled = true,
}) => {
  const activeSkin = ROBOT_SKINS.find((s) => s.id === skinId) || ROBOT_SKINS[0];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera & view mode
  const [perspectiveMode, setPerspectiveMode] = useState<'ISO' | 'TOP_DOWN'>('ISO');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [showDPad, setShowDPad] = useState(false);

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
    squashY: 1,
    blinkTimer: 2,
    isBlinking: false,
  });

  const particlesRef = useRef<Particle[]>([]);
  const animTimeRef = useRef<number>(0);
  const prevRobotStateRef = useRef(robotState);

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

  // Spawn particles
  const spawnParticles = useCallback((
    screenX: number,
    screenY: number,
    count: number,
    colors: string[],
    shape: 'star' | 'circle' | 'spark' = 'circle'
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      particlesRef.current.push({
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: shape === 'star' ? 4 + Math.random() * 4 : 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 25 + Math.random() * 25,
        shape,
      });
    }
  }, []);

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
    }
  }, [robotState, activeAction]);

  // Victory celebration confetti trigger
  useEffect(() => {
    if (celebratingVictory && canvasRef.current) {
      const width = canvasRef.current.width / (window.devicePixelRatio || 1);
      const height = canvasRef.current.height / (window.devicePixelRatio || 1);
      const colors = ['#06B6D4', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#38BDF8'];
      for (let i = 0; i < 90; i++) {
        spawnParticles(
          width / 2 + (Math.random() - 0.5) * 350,
          height / 2 + (Math.random() - 0.5) * 200,
          1,
          colors,
          'star'
        );
      }
    }
  }, [celebratingVictory, spawnParticles]);

  // Main 60 FPS Game Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamp dt for 60fps simulation
      animTimeRef.current += dt;

      // Resize canvas to match display size with DPR
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = Math.floor(rect.width * dpr);
      const displayHeight = Math.floor(rect.height * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      // 1. Draw Deep Space Background
      ctx.fillStyle = '#080C16';
      ctx.fillRect(0, 0, width, height);

      // Starry dust particles in background
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 123.45 + animTimeRef.current * 4) % width;
        const sy = (i * 267.89) % height;
        const size = i % 3 === 0 ? 1.5 : 1;
        ctx.fillRect(sx, sy, size, size);
      }
      ctx.restore();

      // Dynamic auto-fit zoom based on level grid dimensions
      const gridSpanX = (level.gridWidth + level.gridHeight) * 34;
      const gridSpanY = (level.gridWidth + level.gridHeight) * 17 + 70;
      const autoFit = Math.min(1.0, (width - 48) / gridSpanX, (height - 48) / gridSpanY);
      const effectiveZoom = zoom * Math.max(0.52, autoFit);

      // Camera view center (centered with slight upward bias so lower destination tiles are never hidden)
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y - (perspectiveMode === 'ISO' ? 12 : 0);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(effectiveZoom, effectiveZoom);

      // Geometry constants
      const tileW = 68;
      const tileH = 34;
      const heightScale = 22;
      const topDownTileSize = 58;

      // Projection mapping: ISO vs TOP_DOWN
      const toScreen = (gx: number, gy: number, gh: number) => {
        if (perspectiveMode === 'TOP_DOWN') {
          const midX = (level.gridWidth - 1) / 2;
          const midY = (level.gridHeight - 1) / 2;
          const screenX = (gx - midX) * topDownTileSize;
          const screenY = (gy - midY) * topDownTileSize;
          return { x: screenX, y: screenY, depth: gy * 10 + gx + gh * 0.1 };
        }

        // Isometric projection with camera rotation
        let rx = gx;
        let ry = gy;
        const rad = (rotationAngle * Math.PI) / 180;
        const cos = Math.round(Math.cos(rad));
        const sin = Math.round(Math.sin(rad));

        const midX = (level.gridWidth - 1) / 2;
        const midY = (level.gridHeight - 1) / 2;
        const ox = gx - midX;
        const oy = gy - midY;

        rx = ox * cos - oy * sin + midX;
        ry = ox * sin + oy * cos + midY;

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
      for (let y = 0; y < level.gridHeight; y++) {
        for (let x = 0; x < level.gridWidth; x++) {
          const t = tiles[y]?.[x];
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

      // Update robot visual state lerp
      const r = visualRobotRef.current;
      if (r.animProgress < 1) {
        const animSpeed = isSimulating ? 5.5 : 7.0;
        r.animProgress = Math.min(1, r.animProgress + dt * animSpeed);

        const t = r.animProgress;
        const ease = 1 - Math.pow(1 - t, 3);

        if (r.isMoving) {
          r.currentAngle = r.targetAngle;
          if (r.isJumping) {
            r.jumpArc = Math.sin(t * Math.PI) * 26;
            r.squashY = 1 + Math.sin(t * Math.PI) * 0.25;
          } else {
            r.jumpArc = Math.sin(t * Math.PI) * 5;
            r.squashY = 1;
          }
        }

        if (r.isTurning) {
          r.currentAngle = r.fromAngle + (r.targetAngle - r.fromAngle) * ease;
        }

        if (r.animProgress >= 1) {
          r.isMoving = false;
          r.isJumping = false;
          r.isTurning = false;
          r.currentAngle = r.targetAngle;
          r.jumpArc = 0;
          r.squashY = 1;
        }
      }

      // Interpolate current robot grid pos
      const t = r.animProgress;
      const ease = 1 - Math.pow(1 - t, 3);
      const curX = r.fromX + (r.gridX - r.fromX) * ease;
      const curY = r.fromY + (r.gridY - r.fromY) * ease;
      const curH = r.fromH + (r.gridH - r.fromH) * ease;

      const robotScreen = toScreen(curX, curY, curH);
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
        ctx.save();
        visitedTilesRef.current.forEach((pos) => {
          const tile = tiles[pos.y]?.[pos.x];
          const h = tile ? tile.height : 0;
          const posScreen = toScreen(pos.x, pos.y, h);
          ctx.beginPath();
          ctx.arc(posScreen.x, posScreen.y, perspectiveMode === 'TOP_DOWN' ? 4 : 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
          ctx.fill();
        });
        ctx.restore();
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
        if (perspectiveMode === 'TOP_DOWN') {
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
            ctx.fillStyle = tile.isSwitchActive ? '#059669' : '#D97706';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (tile.type === 'HAZARD') {
            ctx.fillStyle = tile.isHazardActive ? '#DC2626' : '#334155';
            ctx.fill();
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (tile.type === 'COLOR_BLUE') {
            ctx.fillStyle = '#0284C7';
            ctx.fill();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (tile.type === 'COLOR_YELLOW') {
            ctx.fillStyle = '#D97706';
            ctx.fill();
            ctx.strokeStyle = '#FBBF24';
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
            ctx.fillStyle = tile.isSwitchActive ? '#059669' : '#D97706';
            ctx.fill();
            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            break;
          }
          case 'HAZARD': {
            ctx.fillStyle = tile.isHazardActive ? '#DC2626' : '#374151';
            ctx.fill();
            ctx.strokeStyle = tile.isHazardActive ? '#EF4444' : '#4B5563';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            break;
          }
          case 'COLOR_BLUE': {
            ctx.fillStyle = '#0284C7';
            ctx.fill();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            break;
          }
          case 'COLOR_YELLOW': {
            ctx.fillStyle = '#D97706';
            ctx.fill();
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 1.5;
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

      // Helper to draw sparkling crystal
      const drawCrystal = (screenX: number, screenY: number) => {
        const floatY = Math.sin(animTimeRef.current * 3.5) * 4;
        const cy = screenY - 14 + floatY;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(screenX, screenY - 2, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(screenX, cy - 9);
        ctx.lineTo(screenX + 7, cy);
        ctx.lineTo(screenX, cy + 9);
        ctx.lineTo(screenX - 7, cy);
        ctx.closePath();

        const grad = ctx.createLinearGradient(screenX - 7, cy - 9, screenX + 7, cy + 9);
        grad.addColorStop(0, '#67E8F9');
        grad.addColorStop(0.5, '#06B6D4');
        grad.addColorStop(1, '#0891B2');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(screenX - 2, cy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      // Helper to draw Kodi robot
      const drawRobot = (screenX: number, screenY: number) => {
        const angle = r.currentAngle;

        ctx.save();
        ctx.translate(screenX, screenY - r.jumpArc);

        if (perspectiveMode === 'TOP_DOWN') {
          // --- 2D Top-Down Kodi Rover ---
          ctx.rotate(angle);

          // Headlight beam
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(28, -12);
          ctx.lineTo(28, 12);
          ctx.closePath();
          ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
          ctx.fill();

          // Body chassis
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fillStyle = activeSkin.primaryColor;
          ctx.fill();
          ctx.strokeStyle = activeSkin.visorColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Visor Face
          ctx.beginPath();
          ctx.arc(4, 0, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#111827';
          ctx.fill();

          // Glowing Eyes
          ctx.fillStyle = activeSkin.visorColor;
          ctx.beginPath();
          ctx.arc(6, -3, 2, 0, Math.PI * 2);
          ctx.arc(6, 3, 2, 0, Math.PI * 2);
          ctx.fill();

          // Front pointer arrow
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(9, -4);
          ctx.lineTo(9, 4);
          ctx.closePath();
          ctx.fillStyle = '#F59E0B';
          ctx.fill();

          ctx.restore();
          return;
        }

        // --- 3D Isometric Odibot Robot ---
        // Shadow
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        const idleBob = Math.sin(animTimeRef.current * 4) * 1.5;
        ctx.translate(0, idleBob);

        const bodyW = 24;
        const bodyH = 22;

        // Jetpack
        ctx.fillStyle = '#4B5563';
        ctx.fillRect(-bodyW / 2 - 4, -bodyH + 4, 4, 12);
        ctx.fillRect(bodyW / 2, -bodyH + 4, 4, 12);

        // Body base
        ctx.beginPath();
        drawRoundRect(ctx, -bodyW / 2, -bodyH, bodyW, bodyH, 6);
        ctx.fillStyle = activeSkin.primaryColor;
        ctx.fill();
        ctx.strokeStyle = activeSkin.visorColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Chest badge
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        drawRoundRect(ctx, -bodyW / 4, -bodyH + 6, bodyW / 2, 7, 2);
        ctx.fill();

        // Visor Face
        const headW = 26;
        const headH = 18;
        const headY = -bodyH - headH + 4;

        ctx.beginPath();
        drawRoundRect(ctx, -headW / 2, headY, headW, headH, 6);
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.strokeStyle = activeSkin.primaryColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        const eyeOffsetRatio = Math.sin(angle);
        const eyeXCenter = eyeOffsetRatio * 4;

        r.blinkTimer -= dt;
        if (r.blinkTimer <= 0) {
          r.isBlinking = true;
          if (r.blinkTimer <= -0.15) {
            r.isBlinking = false;
            r.blinkTimer = 2.5 + Math.random() * 2;
          }
        }

        ctx.fillStyle = activeSkin.visorColor;
        if (r.isBlinking) {
          ctx.fillRect(eyeXCenter - 6, headY + 8, 4, 1.5);
          ctx.fillRect(eyeXCenter + 2, headY + 8, 4, 1.5);
        } else {
          ctx.beginPath();
          ctx.arc(eyeXCenter - 4, headY + 8, 3, 0, Math.PI * 2);
          ctx.arc(eyeXCenter + 4, headY + 8, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(eyeXCenter - 4 + 1, headY + 8 - 1, 1, 0, Math.PI * 2);
          ctx.arc(eyeXCenter + 4 + 1, headY + 8 - 1, 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Antenna with pulsing light
        ctx.beginPath();
        ctx.moveTo(0, headY);
        ctx.lineTo(0, headY - 8);
        ctx.strokeStyle = '#9CA3AF';
        ctx.lineWidth = 2;
        ctx.stroke();

        const beaconPulse = (Math.sin(animTimeRef.current * 8) + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(0, headY - 9, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${0.8 + beaconPulse * 0.2})`;
        ctx.fill();

        // Direction pointer
        ctx.save();
        ctx.translate(0, 6);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(8, -4);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.restore();

        ctx.restore();
      };

      // 3. Render all sorted items
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

      // 4. Update and render particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'star') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [level, tiles, isSimulating, zoom, pan, rotationAngle, perspectiveMode]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
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
    setPan({ x: 0, y: 0 });
    setRotationAngle(0);
  };

  // Dynamic speech text for Odibot
  let speechText = 'Siap melangkah, Kapten! Susun balok kode atau gerakkan langsung dengan D-Pad/Panah.';
  if (celebratingVictory) {
    speechText = 'HORE! Misi berhasil diselesaikan dengan sukses! 🎉 Kamu pintar sekali!';
  } else if (autoRunCountdown !== null && autoRunCountdown !== undefined) {
    speechText = '⚡ Menyiapkan mesin! Robot Odibot akan melangkah otomatis dalam 1 detik...';
  } else if (isSimulating) {
    if (activeAction === 'MOVE_FORWARD') speechText = 'Melangkah maju 1 petak...';
    else if (activeAction === 'JUMP') speechText = 'Lompat mendaki tebing!';
    else if (activeAction === 'TURN_LEFT') speechText = 'Putar kiri 90 derajat...';
    else if (activeAction === 'TURN_RIGHT') speechText = 'Putar kanan 90 derajat...';
    else if (activeAction === 'COLLECT') speechText = 'Mengambil kristal energi 💎!';
    else if (activeAction === 'REPEAT') speechText = 'Menjalankan perulangan loop...';
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[380px] bg-slate-950 overflow-hidden select-none cursor-grab active:cursor-grabbing border border-slate-800 rounded-xl shadow-inner"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Odibot Mascot Speech Bubble HUD */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto flex items-center gap-2.5 p-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md pointer-events-auto max-w-md">
        <OdibotMascot size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
            <span>Odibot Si Robot</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 font-mono">
              ({robotState.x}, {robotState.y}) {dirInIndonesian[robotState.dir]}
            </span>
          </div>
          <div className="text-xs font-medium text-white truncate">
            {speechText}
          </div>
        </div>
      </div>

      {/* Floating Camera Controls (< 15% playfield obstruction) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-700/60 rounded-xl backdrop-blur-sm text-slate-300 pointer-events-auto shadow-md">
        {/* Toggle Perspective (3D vs 2D Denah) */}
        <button
          onClick={() => {
            sounds.playClick();
            setPerspectiveMode((prev) => (prev === 'ISO' ? 'TOP_DOWN' : 'ISO'));
          }}
          className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${
            perspectiveMode === 'TOP_DOWN'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Ganti Sudut Pandang (3D Isometrik / 2D Denah Atas)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{perspectiveMode === 'TOP_DOWN' ? 'Denah 2D' : 'Isometrik 3D'}</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        <button
          onClick={handleZoomIn}
          title="Perbesar Tampilan"
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Perkecil Tampilan"
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        {perspectiveMode === 'ISO' && (
          <button
            onClick={handleRotateCamera}
            title="Putar Sudut Kamera (90°)"
            className="p-1.5 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-xs font-mono"
          >
            <RotateCw className="w-4 h-4" />
            <span>{rotationAngle}°</span>
          </button>
        )}
        <button
          onClick={handleResetView}
          title="Reset Kamera"
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        <button
          onClick={() => setShowDPad(!showDPad)}
          title="Tampilkan / Sembunyikan Kemudi Robot"
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${
            showDPad ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px] font-semibold">Kemudi Manual</span>
        </button>
      </div>

      {/* Direct Interactive D-Pad / Remote Control */}
      {showDPad && onManualAction && (
        <div className="absolute bottom-3 right-3 p-2.5 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md pointer-events-auto flex flex-col items-center gap-1.5">
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

            {/* Middle row: Turn Left, Collect, Turn Right */}
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
              title="Ambil Kristal (E / Space)"
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

          <span className="text-[9px] text-slate-400 font-mono">
            Bisa gunakan Keyboard: Panah / WASD
          </span>
        </div>
      )}
    </div>
  );
};
