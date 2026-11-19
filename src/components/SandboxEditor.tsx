import React, { useState } from 'react';
import { Direction, LevelDefinition, TileData } from '../types/game';
import { sounds } from '../utils/audio';
import { X, Play, RotateCcw, Sparkles } from 'lucide-react';

interface SandboxEditorProps {
  onPlayCustomLevel: (level: LevelDefinition) => void;
  onClose: () => void;
}

type BrushTool =
  | 'PATH'
  | 'ELEVATED_1'
  | 'ELEVATED_2'
  | 'GOAL'
  | 'CRYSTAL'
  | 'SWITCH'
  | 'HAZARD'
  | 'BLUE_SENSOR'
  | 'YELLOW_SENSOR'
  | 'START_ROBOT'
  | 'ERASE';

export const SandboxEditor: React.FC<SandboxEditorProps> = ({
  onPlayCustomLevel,
  onClose,
}) => {
  const [gridSize, setGridSize] = useState<number>(5);
  const [activeBrush, setActiveBrush] = useState<BrushTool>('PATH');
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startDir, setStartDir] = useState<Direction>('EAST');

  // Initialize empty grid
  const createEmptyGrid = (size: number): TileData[][] => {
    return Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => {
        if (x === 0 && y === 0) return { type: 'PATH', height: 0 };
        if (x === size - 1 && y === size - 1) return { type: 'GOAL', height: 0 };
        return { type: 'PATH', height: 0 };
      })
    );
  };

  const [tiles, setTiles] = useState<TileData[][]>(() => createEmptyGrid(5));

  // Change grid size
  const handleSizeChange = (newSize: number) => {
    sounds.playClick();
    setGridSize(newSize);
    setTiles(createEmptyGrid(newSize));
    setStartPos({ x: 0, y: 0 });
  };

  // Handle cell click
  const handleCellClick = (x: number, y: number) => {
    sounds.playClick();
    if (activeBrush === 'START_ROBOT') {
      setStartPos({ x, y });
      setTiles((prev) => {
        const copy = prev.map((row) => row.map((t) => ({ ...t })));
        if (copy[y][x].type === 'EMPTY') {
          copy[y][x] = { type: 'PATH', height: 0 };
        }
        return copy;
      });
      return;
    }

    setTiles((prev) => {
      const copy = prev.map((row) => row.map((t) => ({ ...t })));
      const cell = copy[y][x];

      switch (activeBrush) {
        case 'PATH':
          copy[y][x] = { type: 'PATH', height: 0 };
          break;
        case 'ELEVATED_1':
          copy[y][x] = { type: 'ELEVATED', height: 1 };
          break;
        case 'ELEVATED_2':
          copy[y][x] = { type: 'ELEVATED', height: 2 };
          break;
        case 'GOAL':
          copy[y][x] = { type: 'GOAL', height: cell.height };
          break;
        case 'CRYSTAL':
          copy[y][x] = { ...cell, hasCrystal: !cell.hasCrystal };
          break;
        case 'SWITCH':
          copy[y][x] = { type: 'SWITCH', height: cell.height, isSwitchActive: false };
          break;
        case 'HAZARD':
          copy[y][x] = { type: 'HAZARD', height: cell.height, isHazardActive: true };
          break;
        case 'BLUE_SENSOR':
          copy[y][x] = { type: 'COLOR_BLUE', height: cell.height };
          break;
        case 'YELLOW_SENSOR':
          copy[y][x] = { type: 'COLOR_YELLOW', height: cell.height };
          break;
        case 'ERASE':
          if (startPos.x === x && startPos.y === y) {
            copy[y][x] = { type: 'PATH', height: 0 };
          } else {
            copy[y][x] = { type: 'EMPTY', height: 0 };
          }
          break;
      }
      return copy;
    });
  };

  // Play Level
  const handleStartPlay = () => {
    sounds.playVictory();

    const customTiles = tiles.map((row) => row.map((t) => ({ ...t })));

    // Ensure robot start tile is walkable
    if (customTiles[startPos.y]?.[startPos.x]?.type === 'EMPTY') {
      customTiles[startPos.y][startPos.x] = { type: 'PATH', height: 0 };
    }

    // Verify at least 1 goal tile
    let hasGoal = false;
    customTiles.forEach((row) => {
      row.forEach((t) => {
        if (t.type === 'GOAL') hasGoal = true;
      });
    });

    if (!hasGoal) {
      const gx = startPos.x === gridSize - 1 && startPos.y === gridSize - 1 ? 0 : gridSize - 1;
      const gy = startPos.x === gridSize - 1 && startPos.y === gridSize - 1 ? 0 : gridSize - 1;
      customTiles[gy][gx] = { type: 'GOAL', height: 0 };
    }

    const customLevel: LevelDefinition = {
      id: 'custom-' + Date.now(),
      zoneId: 'custom',
      zoneName: 'Studio Kreatif',
      levelNumber: 99,
      title: 'Peta Kustom Buatanmu',
      subtitle: 'Tantangan Koding Desain Sendiri',
      storyIntro: 'Ini adalah stasiun luar angkasa ciptaanmu sendiri! Tulis program koding untuk menyelesaikan tantangan ini.',
      conceptTitle: 'Kreativitas & Desain Game',
      conceptExplanation: 'Membuat puzzle sendiri melatih pemahaman mendalam tentang batasan algoritma dan kondisi kemenangan program.',
      hint: 'Perhatikan rute yang kamu gambar dan susun balok perintah yang sesuai.',
      gridWidth: gridSize,
      gridHeight: gridSize,
      tiles: customTiles,
      startPos,
      startDir,
      maxBlocksFor3Stars: 10,
      allowedCommands: [
        'MOVE_FORWARD',
        'TURN_LEFT',
        'TURN_RIGHT',
        'JUMP',
        'COLLECT',
        'TOGGLE_SWITCH',
        'REPEAT',
        'IF_COLOR',
        'IF_OBSTACLE',
        'CALL_F1',
      ],
      allowF1: true,
    };

    onPlayCustomLevel(customLevel);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/92 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/60 gap-2 shrink-0">
          <div className="flex items-center gap-2 text-amber-400 min-w-0">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold font-display text-white truncate">Studio Kreatif: Buat Level</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Pilih alat lalu ketuk ubin untuk menggambar rute</p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tools Palette & Grid Size */}
        <div className="p-3 sm:p-4 bg-slate-950/40 border-b border-slate-800 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400">Ukuran:</span>
              {[4, 5, 6].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSizeChange(s)}
                  className={`px-2.5 py-1 min-h-[34px] rounded-lg font-mono font-bold transition-colors ${
                    gridSize === s
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x{s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400">Arah:</span>
              {(['EAST', 'SOUTH', 'WEST', 'NORTH'] as Direction[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    sounds.playClick();
                    setStartDir(d);
                  }}
                  className={`px-2.5 py-1 min-h-[34px] rounded-lg text-[11px] font-mono transition-colors ${
                    startDir === d
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d === 'EAST' ? 'Timur' : d === 'SOUTH' ? 'Selatan' : d === 'WEST' ? 'Barat' : 'Utara'}
                </button>
              ))}
            </div>
          </div>

          {/* Brush Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] sm:text-xs">
            {[
              { id: 'START_ROBOT', label: 'Robot Mulai', color: 'bg-cyan-600 text-white' },
              { id: 'PATH', label: 'Ubin Biasa', color: 'bg-slate-700 text-white' },
              { id: 'ELEVATED_1', label: 'Tebing (+1m)', color: 'bg-blue-700 text-white' },
              { id: 'ELEVATED_2', label: 'Tebing (+2m)', color: 'bg-indigo-700 text-white' },
              { id: 'CRYSTAL', label: 'Kristal Energi', color: 'bg-amber-600 text-white' },
              { id: 'GOAL', label: 'Terminal Emas', color: 'bg-yellow-500 text-slate-950 font-bold' },
              { id: 'SWITCH', label: 'Tombol Saklar', color: 'bg-emerald-600 text-white' },
              { id: 'HAZARD', label: 'Laser Merah', color: 'bg-rose-600 text-white' },
              { id: 'BLUE_SENSOR', label: 'Sensor Biru', color: 'bg-sky-600 text-white' },
              { id: 'YELLOW_SENSOR', label: 'Sensor Kuning', color: 'bg-amber-500 text-slate-950 font-bold' },
              { id: 'ERASE', label: 'Hapus (Jurang)', color: 'bg-slate-900 border border-slate-700 text-slate-400' },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveBrush(tool.id as BrushTool);
                }}
                className={`min-h-[38px] py-1.5 px-2 rounded-lg font-medium text-center transition-all ${tool.color} ${
                  activeBrush === tool.id ? 'ring-2 ring-white shadow-md' : 'opacity-85 hover:opacity-100'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2D Interactive Grid Canvas */}
        <div className="flex-1 p-3 sm:p-6 flex items-center justify-center bg-slate-950 overflow-auto">
          <div
            className="grid gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-inner"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {tiles.map((row, y) =>
              row.map((cell, x) => {
                const isStart = startPos.x === x && startPos.y === y;
                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(x, y)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg border flex flex-col items-center justify-center relative text-[9px] sm:text-[10px] font-mono transition-transform active:scale-95 ${
                      cell.type === 'EMPTY'
                        ? 'bg-slate-950 border-slate-800 text-slate-600'
                        : cell.type === 'GOAL'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                        : cell.type === 'ELEVATED'
                        ? cell.height === 2
                          ? 'bg-indigo-900/60 border-indigo-500 text-indigo-300'
                          : 'bg-blue-900/60 border-blue-500 text-blue-300'
                        : cell.type === 'SWITCH'
                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300'
                        : cell.type === 'HAZARD'
                        ? 'bg-rose-900/60 border-rose-500 text-rose-300'
                        : cell.type === 'COLOR_BLUE'
                        ? 'bg-sky-900/60 border-sky-400 text-sky-300'
                        : cell.type === 'COLOR_YELLOW'
                        ? 'bg-amber-900/60 border-amber-400 text-amber-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    }`}
                  >
                    {isStart && (
                      <span className="absolute -top-2 px-1 bg-cyan-500 text-slate-950 font-bold rounded text-[8px] sm:text-[9px]">
                        ROBOT
                      </span>
                    )}
                    {cell.hasCrystal && (
                      <span className="text-amber-400 font-bold text-xs">💎</span>
                    )}
                    <span className="truncate max-w-full px-0.5">{cell.type === 'EMPTY' ? 'Jurang' : cell.type}</span>
                    {cell.height > 0 && <span className="text-[8px] text-slate-400">{cell.height}m</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950/60 gap-2 shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setTiles(createEmptyGrid(gridSize));
            }}
            className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/70 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleStartPlay}
            className="min-h-[44px] flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-display text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mainkan Tantangan!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
