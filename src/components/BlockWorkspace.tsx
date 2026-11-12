import React, { useState } from 'react';
import { BlockCommand, CommandType, LevelDefinition } from '../types/game';
import { countTotalBlocks, blocksToPython } from '../utils/codeConverter';
import { sounds } from '../utils/audio';
import {
  ArrowUp,
  RotateCcw,
  RotateCw,
  ArrowUpRight,
  Sparkles,
  ToggleLeft,
  Repeat,
  GitBranch,
  Box,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Code2,
  Layers,
  Copy,
  Check,
  ListOrdered,
  BatteryCharging,
  SlidersHorizontal,
  HelpCircle,
  Play,
  Lightbulb,
  Zap,
  StepForward,
} from 'lucide-react';

interface BlockWorkspaceProps {
  level: LevelDefinition;
  mainBlocks: BlockCommand[];
  f1Blocks: BlockCommand[];
  f2Blocks: BlockCommand[];
  setMainBlocks: React.Dispatch<React.SetStateAction<BlockCommand[]>>;
  setF1Blocks: React.Dispatch<React.SetStateAction<BlockCommand[]>>;
  setF2Blocks: React.Dispatch<React.SetStateAction<BlockCommand[]>>;
  activeExecutingBlockId?: string;
  isSimulating: boolean;
  onLoadStarterCode?: () => void;
  onRunCode?: () => void;
  autoRunEnabled?: boolean;
  onToggleAutoRun?: () => void;
  onStepOnce?: () => void;
  autoRunCountdown?: number | null;
}

type PaletteCategory = 'ALL' | 'MOTION' | 'VARIABLE' | 'LOOP' | 'LOGIC' | 'FUNCTION';

export const BlockWorkspace: React.FC<BlockWorkspaceProps> = ({
  level,
  mainBlocks,
  f1Blocks,
  f2Blocks,
  setMainBlocks,
  setF1Blocks,
  setF2Blocks,
  activeExecutingBlockId,
  isSimulating,
  onLoadStarterCode,
  onRunCode,
  autoRunEnabled = false,
  onToggleAutoRun,
  onStepOnce,
  autoRunCountdown = null,
}) => {
  const [activeTab, setActiveTab] = useState<'MAIN' | 'F1' | 'F2'>('MAIN');
  const [viewMode, setViewMode] = useState<'BLOCKS' | 'PYTHON'>('BLOCKS');
  const [paletteCategory, setPaletteCategory] = useState<PaletteCategory>('ALL');
  const [copiedPython, setCopiedPython] = useState(false);
  const [justAddedNotice, setJustAddedNotice] = useState<string | null>(null);
  const sequenceContainerRef = React.useRef<HTMLDivElement>(null);

  const totalUsedBlocks = countTotalBlocks(mainBlocks, f1Blocks, f2Blocks);
  const is3StarEligible = totalUsedBlocks <= level.maxBlocksFor3Stars;

  // Active list reference
  const currentList =
    activeTab === 'MAIN' ? mainBlocks : activeTab === 'F1' ? f1Blocks : f2Blocks;
  const setCurrentList =
    activeTab === 'MAIN'
      ? setMainBlocks
      : activeTab === 'F1'
      ? setF1Blocks
      : setF2Blocks;

  // Add command to active slot
  const handleAddCommand = (type: CommandType) => {
    if (isSimulating) return;
    sounds.playStep();
    setJustAddedNotice('Balok berhasil dipasang! 🚀');
    setTimeout(() => setJustAddedNotice(null), 3500);

    const newBlock: BlockCommand = {
      id: 'blk-' + Math.random().toString(36).substring(2, 9),
      type,
      repeatCount: type === 'REPEAT' ? 3 : undefined,
      conditionColor: type === 'IF_COLOR' ? 'BLUE' : undefined,
      conditionType:
        type === 'IF_COLOR'
          ? 'IS_BLUE'
          : type === 'IF_OBSTACLE'
          ? 'IS_OBSTACLE_AHEAD'
          : undefined,
      varName:
        type === 'SET_VAR' ||
        type === 'CHANGE_VAR' ||
        type === 'WHILE_VAR' ||
        type === 'IF_VAR'
          ? 'baterai'
          : undefined,
      varValue: type === 'SET_VAR' ? 5 : 0,
      varDelta: type === 'CHANGE_VAR' ? -1 : undefined,
      varOperator: type === 'WHILE_VAR' || type === 'IF_VAR' ? '>' : undefined,
      listName:
        type === 'READ_LIST'
          ? Object.keys(level.initialLists || {})[0] || 'daftar_rute'
          : undefined,
      children:
        type === 'REPEAT' ||
        type === 'WHILE_VAR' ||
        type === 'IF_VAR' ||
        type === 'IF_COLOR' ||
        type === 'IF_OBSTACLE'
          ? []
          : undefined,
    };

    setCurrentList((prev) => [...prev, newBlock]);

    // Smooth scroll to bottom so student immediately sees the new block added
    setTimeout(() => {
      if (sequenceContainerRef.current) {
        sequenceContainerRef.current.scrollTo({
          top: sequenceContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 50);
  };

  // Add child command into nested block
  const handleAddChildCommand = (parentId: string, type: CommandType) => {
    if (isSimulating) return;
    sounds.playStep();
    setJustAddedNotice('Balok dimasukkan ke dalam loop! ✨');
    setTimeout(() => setJustAddedNotice(null), 3500);

    const newChild: BlockCommand = {
      id: 'blk-' + Math.random().toString(36).substring(2, 9),
      type,
    };

    setCurrentList((prev) =>
      prev.map((b) => {
        if (b.id === parentId) {
          return {
            ...b,
            children: [...(b.children || []), newChild],
          };
        }
        return b;
      })
    );
  };

  // Delete block
  const handleDeleteBlock = (id: string, parentId?: string) => {
    if (isSimulating) return;
    sounds.playClick();

    if (parentId) {
      setCurrentList((prev) =>
        prev.map((b) => {
          if (b.id === parentId) {
            return {
              ...b,
              children: (b.children || []).filter((c) => c.id !== id),
            };
          }
          return b;
        })
      );
    } else {
      setCurrentList((prev) => prev.filter((b) => b.id !== id));
    }
  };

  // Move block up/down
  const handleMoveBlock = (index: number, direction: 'UP' | 'DOWN') => {
    if (isSimulating) return;
    sounds.playClick();
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const copy = [...currentList];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setCurrentList(copy);
  };

  // Adjust repeat count
  const handleAdjustRepeat = (id: string, delta: number) => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const current = b.repeatCount || 3;
          const next = Math.max(2, Math.min(8, current + delta));
          return { ...b, repeatCount: next };
        }
        return b;
      })
    );
  };

  // Toggle condition color
  const handleToggleColor = (id: string) => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const next = b.conditionColor === 'BLUE' ? 'YELLOW' : 'BLUE';
          return {
            ...b,
            conditionColor: next,
            conditionType: next === 'BLUE' ? 'IS_BLUE' : 'IS_YELLOW',
          };
        }
        return b;
      })
    );
  };

  // Clear current tab
  const handleClearCurrent = () => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList([]);
  };

  // Copy Python code
  const handleCopyPython = () => {
    const code = blocksToPython(
      mainBlocks,
      f1Blocks,
      f2Blocks,
      level.initialVariables,
      level.initialLists
    );
    navigator.clipboard.writeText(code);
    sounds.playClick();
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  const pythonCode = blocksToPython(
    mainBlocks,
    f1Blocks,
    f2Blocks,
    level.initialVariables,
    level.initialLists
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Header: Function Tabs & Visual/Python Toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-950/80 border-b border-slate-800 gap-2 shrink-0">
        {/* Function / Main Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('MAIN');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'MAIN'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Program Utama
          </button>

          {level.allowF1 && (
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('F1');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'F1'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Fungsi F1</span>
            </button>
          )}

          {level.allowF2 && (
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('F2');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'F2'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Fungsi F2</span>
            </button>
          )}
        </div>

        {/* View Mode Toggle (Scratch Blocks vs Python) */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => {
              sounds.playClick();
              setViewMode('BLOCKS');
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'BLOCKS'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilan Balok Visual Interaktif (Scratch-style)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Balok</span>
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              setViewMode('PYTHON');
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'PYTHON'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Lihat Kode Asli Python 3 (Persiapan SMP)"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Python</span>
          </button>
        </div>
      </div>

      {/* Primary Action Ribbon: JALANKAN KODE & Auto-Run Toggle */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {onToggleAutoRun && (
            <button
              onClick={() => {
                sounds.playClick();
                onToggleAutoRun();
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 border shadow-sm ${
                autoRunEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-amber-500/20 ring-1 ring-amber-400/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300 hover:bg-slate-850'
              }`}
              title="Ketika aktif, program akan otomatis diuji setiap kali kamu selesai menyusun balok"
            >
              <Zap className={`w-3.5 h-3.5 ${autoRunEnabled ? 'text-amber-400 fill-amber-400 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">⚡ Jalan Otomatis: {autoRunEnabled ? 'AKTIF' : 'MATI'}</span>
              <span className="sm:hidden">⚡ {autoRunEnabled ? 'Otomatis' : 'Manual'}</span>
            </button>
          )}

          {autoRunCountdown !== null && autoRunCountdown !== undefined && (
            <span className="text-[10px] sm:text-[11px] text-amber-300 font-mono flex items-center gap-1 animate-pulse px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>({autoRunCountdown}s)</span>
            </span>
          )}

          {justAddedNotice && (
            <span className="text-[10px] sm:text-[11px] bg-emerald-400 text-slate-950 font-bold px-2 sm:px-2.5 py-0.5 rounded-full shadow animate-pulse">
              {justAddedNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {onStepOnce && (
            <button
              onClick={onStepOnce}
              disabled={isSimulating}
              className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1"
              title="Jalankan 1 Langkah Debug"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1 Langkah</span>
              <span className="sm:hidden">Step</span>
            </button>
          )}

          {onRunCode && (
            <button
              onClick={onRunCode}
              className={`px-3 sm:px-5 py-2 rounded-xl text-xs sm:text-xs font-black font-display tracking-wider shadow-lg transition-all flex items-center gap-1.5 min-h-[40px] ${
                isSimulating
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/30 ring-2 ring-cyan-400/50 transform hover:scale-105 active:scale-95'
              }`}
              title="Jalankan Kode Program (Spasi)"
            >
              <Play className={`w-4 h-4 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'HENTIKAN' : '▶ JALANKAN'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Subheader: Block Count & Action Buttons */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/80 text-xs shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-slate-400 hidden sm:inline">Total Balok:</span>
          <span className="text-slate-400 sm:hidden">Balok:</span>
          <span
            className={`font-mono font-bold px-1.5 py-0.2 rounded ${
              is3StarEligible ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
            }`}
          >
            {totalUsedBlocks}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 hidden sm:inline">Target 3★:</span>
          <span className="text-slate-400 sm:hidden">★:</span>
          <span className="font-mono font-bold text-slate-300">≤ {level.maxBlocksFor3Stars}</span>
        </div>

        <div className="flex items-center gap-2">
          {onLoadStarterCode && (
            <button
              onClick={() => {
                sounds.playClick();
                onLoadStarterCode();
              }}
              disabled={isSimulating}
              className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-1 rounded-lg transition-colors font-semibold disabled:opacity-50"
              title="Muat kembali contoh susunan balok untuk level ini"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Contoh Solusi</span>
            </button>
          )}

          {viewMode === 'BLOCKS' && currentList.length > 0 && (
            <button
              onClick={handleClearCurrent}
              disabled={isSimulating}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
              title="Hapus semua balok di tab ini"
            >
              <Trash2 className="w-3 h-3" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      {viewMode === 'PYTHON' ? (
        <div className="flex-1 flex flex-col p-4 overflow-hidden bg-slate-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
              <Code2 className="w-4 h-4" />
              Sintaks Python 3 (Berdasarkan Balok Kodingmu)
            </span>
            <button
              onClick={handleCopyPython}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
            >
              {copiedPython ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPython ? 'Tersalin!' : 'Salin Python'}</span>
            </button>
          </div>
          <pre className="flex-1 p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-cyan-300 overflow-auto whitespace-pre leading-relaxed select-text shadow-inner">
            {pythonCode}
          </pre>
          <p className="mt-2 text-[11px] text-slate-400">
            Balok koding visual yang kamu rangkai otomatis diterjemahkan menjadi kode Python standar.
          </p>
        </div>
      ) : (
        /* WORKSPACE BODY - PALET DAN SUSUNAN KODE SELALU TERLIHAT BERSAMAAN */
        <div className="flex-1 flex flex-col sm:grid sm:grid-cols-12 min-h-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80 overflow-hidden">
          {/* BAGIAN KIRI / ATAS: PILIH BALOK PERINTAH (PALETTE) */}
          <div className="h-48 sm:h-full sm:col-span-5 flex flex-col min-h-0 bg-slate-900/60 overflow-hidden shrink-0 sm:shrink">
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider font-display">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>PILIH BALOK</span>
              </span>
              <span className="text-[10px] text-cyan-400/80 font-mono hidden sm:inline">Klik = Masuk ➔</span>
            </div>

            {/* Filter Kategori Balok */}
            <div className="px-2 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto shrink-0">
              {(
                [
                  { id: 'ALL' as PaletteCategory, label: 'Semua' },
                  { id: 'MOTION' as PaletteCategory, label: 'Gerak' },
                  { id: 'LOOP' as PaletteCategory, label: 'Loop' },
                  { id: 'VARIABLE' as PaletteCategory, label: 'Variabel' },
                  { id: 'LOGIC' as PaletteCategory, label: 'Logika' },
                  ...(level.allowF1 || level.allowF2 ? [{ id: 'FUNCTION' as PaletteCategory, label: 'Fungsi' }] : []),
                ]
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    sounds.playClick();
                    setPaletteCategory(cat.id);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                    paletteCategory === cat.id
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tombol-tombol Balok Koding */}
            <div className="flex-1 p-2 overflow-y-auto grid grid-cols-2 sm:grid-cols-1 xl:grid-cols-2 gap-1.5 content-start">
              {/* MOVE_FORWARD */}
              {level.allowedCommands.includes('MOVE_FORWARD') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('MOVE_FORWARD')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Maju 1 Petak ke Depan"
                  >
                    <ArrowUp className="w-3.5 h-3.5 shrink-0 text-cyan-200" />
                    <span className="truncate">🚶 Maju 1 Petak</span>
                  </button>
                )}

              {/* TURN_LEFT */}
              {level.allowedCommands.includes('TURN_LEFT') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('TURN_LEFT')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Putar Kiri 90 Derajat"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0 text-cyan-200" />
                    <span className="truncate">↺ Putar Kiri</span>
                  </button>
                )}

              {/* TURN_RIGHT */}
              {level.allowedCommands.includes('TURN_RIGHT') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('TURN_RIGHT')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Putar Kanan 90 Derajat"
                  >
                    <RotateCw className="w-3.5 h-3.5 shrink-0 text-cyan-200" />
                    <span className="truncate">↻ Putar Kanan</span>
                  </button>
                )}

              {/* JUMP */}
              {level.allowedCommands.includes('JUMP') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('JUMP')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-indigo-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Lompat Naik atau Turun Tebing"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-indigo-200" />
                    <span className="truncate">🦘 Lompat Tebing</span>
                  </button>
                )}

              {/* COLLECT */}
              {level.allowedCommands.includes('COLLECT') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('COLLECT')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-amber-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Ambil Kristal Energi"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                    <span className="truncate">💎 Ambil Kristal</span>
                  </button>
                )}

              {/* TOGGLE_SWITCH */}
              {level.allowedCommands.includes('TOGGLE_SWITCH') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('TOGGLE_SWITCH')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-amber-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Nyalakan Saklar Laser"
                  >
                    <ToggleLeft className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                    <span className="truncate">⚡ Saklar Laser</span>
                  </button>
                )}

              {/* REPEAT */}
              {level.allowedCommands.includes('REPEAT') &&
                (paletteCategory === 'ALL' || paletteCategory === 'LOOP') && (
                  <button
                    onClick={() => handleAddCommand('REPEAT')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-purple-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Ulangi Instruksi Berkali-kali"
                  >
                    <Repeat className="w-3.5 h-3.5 shrink-0 text-purple-200" />
                    <span className="truncate">🔁 Ulangi (Loop)</span>
                  </button>
                )}

              {/* WHILE_VAR */}
              {level.allowedCommands.includes('WHILE_VAR') &&
                (paletteCategory === 'ALL' || paletteCategory === 'LOOP' || paletteCategory === 'VARIABLE') && (
                  <button
                    onClick={() => handleAddCommand('WHILE_VAR')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-purple-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Perulangan Berdasarkan Variabel Baterai"
                  >
                    <Repeat className="w-3.5 h-3.5 shrink-0 text-purple-200" />
                    <span className="truncate">🔁 Selama (While)</span>
                  </button>
                )}

              {/* READ_LIST */}
              {level.allowedCommands.includes('READ_LIST') &&
                (paletteCategory === 'ALL' || paletteCategory === 'VARIABLE') && (
                  <button
                    onClick={() => handleAddCommand('READ_LIST')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Baca Data Rute dari List Array"
                  >
                    <ListOrdered className="w-3.5 h-3.5 shrink-0 text-cyan-200" />
                    <span className="truncate">📋 Baca List Rute</span>
                  </button>
                )}

              {/* SET_VAR */}
              {level.allowedCommands.includes('SET_VAR') &&
                (paletteCategory === 'ALL' || paletteCategory === 'VARIABLE') && (
                  <button
                    onClick={() => handleAddCommand('SET_VAR')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-teal-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Atur Nilai Variabel"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-teal-200" />
                    <span className="truncate">📦 Atur Variabel</span>
                  </button>
                )}

              {/* CHANGE_VAR */}
              {level.allowedCommands.includes('CHANGE_VAR') &&
                (paletteCategory === 'ALL' || paletteCategory === 'VARIABLE') && (
                  <button
                    onClick={() => handleAddCommand('CHANGE_VAR')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-teal-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Tambah/Kurangi Nilai Variabel"
                  >
                    <BatteryCharging className="w-3.5 h-3.5 shrink-0 text-teal-200" />
                    <span className="truncate">➕ Ubah Variabel</span>
                  </button>
                )}

              {/* IF_VAR */}
              {level.allowedCommands.includes('IF_VAR') &&
                (paletteCategory === 'ALL' || paletteCategory === 'LOGIC' || paletteCategory === 'VARIABLE') && (
                  <button
                    onClick={() => handleAddCommand('IF_VAR')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-orange-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Logika Percabangan Nilai Variabel"
                  >
                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                    <span className="truncate">❓ Jika Nilai</span>
                  </button>
                )}

              {/* IF_COLOR */}
              {level.allowedCommands.includes('IF_COLOR') &&
                (paletteCategory === 'ALL' || paletteCategory === 'LOGIC') && (
                  <button
                    onClick={() => handleAddCommand('IF_COLOR')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-orange-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Periksa Warna Petak Tempat Robot Berada"
                  >
                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                    <span className="truncate">🎨 Cek Warna</span>
                  </button>
                )}

              {/* CALL_F1 */}
              {level.allowF1 &&
                (paletteCategory === 'ALL' || paletteCategory === 'FUNCTION') && (
                  <button
                    onClick={() => handleAddCommand('CALL_F1')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-emerald-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Panggil Fungsi F1"
                  >
                    <Box className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
                    <span className="truncate">⚙️ Panggil F1()</span>
                  </button>
                )}

              {/* CALL_F2 */}
              {level.allowF2 &&
                (paletteCategory === 'ALL' || paletteCategory === 'FUNCTION') && (
                  <button
                    onClick={() => handleAddCommand('CALL_F2')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 p-2 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-emerald-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Panggil Fungsi F2"
                  >
                    <Box className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
                    <span className="truncate">⚙️ Panggil F2()</span>
                  </button>
                )}
            </div>
          </div>

          {/* BAGIAN KANAN: TEMPAT MENGECEK KODE (SUSUNAN BALOK ODIBOT) */}
          <div className="flex-1 sm:col-span-7 flex flex-col h-full min-h-0 bg-slate-950/80 overflow-hidden">
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider font-display">
                <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                <span>SUSUNAN KODE ODIBOT ({currentList.length})</span>
              </span>
              {currentList.length > 0 && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  Urutan 1 → {currentList.length}
                </span>
              )}
            </div>

            {/* Area Balok yang Sudah Dimasukkan */}
            <div ref={sequenceContainerRef} className="flex-1 p-2.5 overflow-y-auto space-y-1.5">
              {currentList.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-cyan-800/30 bg-slate-900/20 rounded-2xl text-slate-400">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-2 shadow text-lg animate-bounce">
                    👈
                  </div>
                  <p className="text-xs font-bold text-white mb-1 font-display">Klik Balok di Sebelah Kiri / Atas!</p>
                  <p className="text-[11px] max-w-xs text-slate-400 mb-3 leading-relaxed">
                    Setiap balok yang kamu klik akan otomatis masuk dan tersusun rapi di sini.
                  </p>
                  {onLoadStarterCode && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onLoadStarterCode();
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs shadow transition-all active:scale-95 flex items-center gap-1"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-slate-950 fill-current" />
                      <span>💡 Pasang Contoh Solusi</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {currentList.map((block, idx) => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      index={idx}
                      total={currentList.length}
                      isActive={block.id === activeExecutingBlockId}
                      isSimulating={isSimulating}
                      onDelete={() => handleDeleteBlock(block.id)}
                      onMoveUp={() => handleMoveBlock(idx, 'UP')}
                      onMoveDown={() => handleMoveBlock(idx, 'DOWN')}
                      onAdjustRepeat={(d) => handleAdjustRepeat(block.id, d)}
                      onToggleColor={() => handleToggleColor(block.id)}
                      onAddChild={(type) => handleAddChildCommand(block.id, type)}
                      onDeleteChild={(childId) => handleDeleteBlock(childId, block.id)}
                      activeExecutingBlockId={activeExecutingBlockId}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Child Block Card component with Scratch-style aesthetics & nesting support
interface BlockCardProps {
  block: BlockCommand;
  index: number;
  total: number;
  isActive: boolean;
  isSimulating: boolean;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAdjustRepeat: (delta: number) => void;
  onToggleColor: () => void;
  onAddChild: (type: CommandType) => void;
  onDeleteChild: (childId: string) => void;
  activeExecutingBlockId?: string;
}

const BlockCard: React.FC<BlockCardProps> = ({
  block,
  index,
  total,
  isActive,
  isSimulating,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAdjustRepeat,
  onToggleColor,
  onAddChild,
  onDeleteChild,
  activeExecutingBlockId,
}) => {
  const isLoop = block.type === 'REPEAT';
  const isWhileVar = block.type === 'WHILE_VAR';
  const isIfVar = block.type === 'IF_VAR';
  const isIfColor = block.type === 'IF_COLOR';
  const isIfObstacle = block.type === 'IF_OBSTACLE';
  const isContainer = isLoop || isWhileVar || isIfVar || isIfColor || isIfObstacle;

  let bgStyle = 'bg-blue-600 text-white';
  let label = 'Perintah';

  switch (block.type) {
    case 'MOVE_FORWARD':
      label = 'Maju 1 Langkah';
      bgStyle = 'bg-blue-600 border-blue-400/40 text-white';
      break;
    case 'TURN_LEFT':
      label = 'Putar Kiri 90°';
      bgStyle = 'bg-blue-600 border-blue-400/40 text-white';
      break;
    case 'TURN_RIGHT':
      label = 'Putar Kanan 90°';
      bgStyle = 'bg-blue-600 border-blue-400/40 text-white';
      break;
    case 'JUMP':
      label = 'Lompat (Mendaki/Turun)';
      bgStyle = 'bg-indigo-600 border-indigo-400/40 text-white';
      break;
    case 'COLLECT':
      label = 'Ambil Kristal Energi';
      bgStyle = 'bg-amber-600 border-amber-400/40 text-white';
      break;
    case 'TOGGLE_SWITCH':
      label = 'Tekan Saklar Pintu';
      bgStyle = 'bg-amber-600 border-amber-400/40 text-white';
      break;
    case 'REPEAT':
      label = `Ulangi (${block.repeatCount || 3}x)`;
      bgStyle = 'bg-purple-700 border-purple-400/40 text-white';
      break;
    case 'WHILE_VAR':
      label = `Selama (${block.varName || 'baterai'} > ${block.varValue ?? 0})`;
      bgStyle = 'bg-purple-800 border-purple-400/40 text-white';
      break;
    case 'IF_VAR':
      label = `Jika (${block.varName || 'baterai'} > ${block.varValue ?? 0})`;
      bgStyle = 'bg-orange-600 border-orange-400/40 text-white';
      break;
    case 'READ_LIST':
      label = `Baca Daftar List: [${block.listName || 'daftar_rute'}]`;
      bgStyle = 'bg-blue-700 border-blue-400/40 text-white';
      break;
    case 'SET_VAR':
      label = `Setel Variabel ${block.varName || 'baterai'} = ${block.varValue ?? 5}`;
      bgStyle = 'bg-teal-600 border-teal-400/40 text-white';
      break;
    case 'CHANGE_VAR':
      label = `Ubah ${block.varName || 'baterai'} (${block.varDelta ?? -1})`;
      bgStyle = 'bg-teal-600 border-teal-400/40 text-white';
      break;
    case 'IF_COLOR':
      label = `Jika di Ubin ${block.conditionColor === 'BLUE' ? 'Biru' : 'Kuning'}`;
      bgStyle = 'bg-orange-600 border-orange-400/40 text-white';
      break;
    case 'IF_OBSTACLE':
      label = 'Jika Ada Halangan di Depan';
      bgStyle = 'bg-orange-600 border-orange-400/40 text-white';
      break;
    case 'CALL_F1':
      label = 'Panggil Fungsi F1()';
      bgStyle = 'bg-emerald-600 border-emerald-400/40 text-white';
      break;
    case 'CALL_F2':
      label = 'Panggil Fungsi F2()';
      bgStyle = 'bg-emerald-700 border-emerald-400/40 text-white';
      break;
  }

  return (
    <div
      className={`relative rounded-xl border p-2.5 transition-all shadow-md ${bgStyle} ${
        isActive
          ? 'ring-4 ring-yellow-400 shadow-yellow-500/50 scale-[1.02] z-10'
          : 'hover:shadow-lg'
      }`}
    >
      {/* Top Header of the Block */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-bold truncate drop-shadow-sm">{label}</span>
          {isActive && (
            <span className="px-1.5 py-0.2 bg-yellow-400 text-slate-950 rounded text-[9px] font-black uppercase tracking-wider animate-pulse shrink-0">
              ▶ Eksekusi
            </span>
          )}
        </div>

        {/* Action Controls: Move Up, Move Down, Delete */}
        <div className="flex items-center gap-1 shrink-0">
          {isLoop && (
            <div className="flex items-center gap-1 bg-black/25 px-1.5 py-0.5 rounded-lg mr-1">
              <button
                onClick={() => onAdjustRepeat(-1)}
                disabled={isSimulating || (block.repeatCount || 3) <= 2}
                className="hover:text-yellow-300 disabled:opacity-40 p-0.5"
                title="Kurangi kali perulangan"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono font-bold px-1">
                {block.repeatCount || 3}x
              </span>
              <button
                onClick={() => onAdjustRepeat(1)}
                disabled={isSimulating || (block.repeatCount || 3) >= 8}
                className="hover:text-yellow-300 disabled:opacity-40 p-0.5"
                title="Tambah kali perulangan"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {isIfColor && (
            <button
              onClick={onToggleColor}
              disabled={isSimulating}
              className="text-[10px] font-bold px-2 py-0.5 bg-black/30 rounded-lg mr-1 hover:bg-black/50 transition-colors"
            >
              Ganti: {block.conditionColor === 'BLUE' ? 'Ubin Kuning' : 'Ubin Biru'}
            </button>
          )}

          <button
            onClick={onMoveUp}
            disabled={isSimulating || index === 0}
            className="p-1 hover:bg-black/20 rounded disabled:opacity-30"
            title="Geser ke Atas"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isSimulating || index === total - 1}
            className="p-1 hover:bg-black/20 rounded disabled:opacity-30"
            title="Geser ke Bawah"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={isSimulating}
            className="p-1 hover:bg-rose-600 rounded transition-colors disabled:opacity-30"
            title="Hapus Balok"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nested Body for Containers (Repeat / If) */}
      {isContainer && (
        <div className="mt-2.5 pl-3 border-l-2 border-white/40 space-y-1.5 bg-black/20 p-2 rounded-lg">
          <div className="text-[10px] font-semibold opacity-90 mb-1 flex items-center justify-between">
            <span>Balok di dalam perulangan:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAddChild('MOVE_FORWARD')}
                disabled={isSimulating}
                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[9px] font-bold transition-colors"
                title="Tambah Maju di dalam loop"
              >
                + Maju
              </button>
              <button
                onClick={() => onAddChild('COLLECT')}
                disabled={isSimulating}
                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[9px] font-bold transition-colors"
                title="Tambah Ambil di dalam loop"
              >
                + Ambil
              </button>
              <button
                onClick={() => onAddChild('TURN_RIGHT')}
                disabled={isSimulating}
                className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[9px] font-bold transition-colors"
                title="Tambah Belok di dalam loop"
              >
                + Kanan
              </button>
            </div>
          </div>

          {block.children && block.children.length > 0 ? (
            block.children.map((child, cIdx) => (
              <div
                key={child.id}
                className={`flex items-center justify-between p-1.5 rounded-lg bg-black/30 text-xs ${
                  child.id === activeExecutingBlockId ? 'ring-2 ring-yellow-400 bg-yellow-950/80' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] opacity-75 font-mono">{cIdx + 1}.</span>
                  <span className="font-semibold">
                    {child.type === 'MOVE_FORWARD'
                      ? 'Maju 1 Langkah'
                      : child.type === 'TURN_LEFT'
                      ? 'Putar Kiri'
                      : child.type === 'TURN_RIGHT'
                      ? 'Putar Kanan'
                      : child.type === 'JUMP'
                      ? 'Lompat'
                      : child.type === 'COLLECT'
                      ? 'Ambil Kristal'
                      : child.type}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteChild(child.id)}
                  disabled={isSimulating}
                  className="p-1 hover:text-rose-300 text-white/60"
                  title="Hapus sub-balok"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-white/70 italic py-1">
              (Loop masih kosong, klik tombol di atas untuk mengisi balok)
            </div>
          )}
        </div>
      )}
    </div>
  );
};
