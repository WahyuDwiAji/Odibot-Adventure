import React, { useState, useMemo, useEffect } from 'react';
import { BlockCommand, CommandType, LevelDefinition } from '../types/game';
import { countTotalBlocks, blocksToPython, getLevelThresholds } from '../utils/codeConverter';
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
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const sequenceContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveContainerId(null);
  }, [level.id, activeTab]);

  const totalUsedBlocks = countTotalBlocks(mainBlocks, f1Blocks, f2Blocks);
  const [threeStarLimit, twoStarLimit] = getLevelThresholds(level);
  const is3StarEligible = totalUsedBlocks <= threeStarLimit;
  const is2StarEligible = totalUsedBlocks <= twoStarLimit;

  // Active list reference
  const currentList =
    activeTab === 'MAIN' ? mainBlocks : activeTab === 'F1' ? f1Blocks : f2Blocks;
  const setCurrentList =
    activeTab === 'MAIN'
      ? setMainBlocks
      : activeTab === 'F1'
      ? setF1Blocks
      : setF2Blocks;

  const findBlockById = (list: BlockCommand[], targetId: string): BlockCommand | null => {
    for (const item of list) {
      if (item.id === targetId) return item;
      if (item.children) {
        const found = findBlockById(item.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const activeContainer = useMemo(
    () => (activeContainerId ? findBlockById(currentList, activeContainerId) : null),
    [activeContainerId, currentList]
  );

  const isContainerType = (type: CommandType) =>
    type === 'REPEAT' ||
    type === 'WHILE_VAR' ||
    type === 'IF_VAR' ||
    type === 'IF_COLOR' ||
    type === 'IF_OBSTACLE';

  const createBlockCommand = (type: CommandType): BlockCommand => {
    const defaultVarName = Object.keys(level.initialVariables || {})[0] || 'baterai';
    const defaultListName = Object.keys(level.initialLists || {})[0] || 'daftar_rute';
    return {
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
          ? defaultVarName
          : undefined,
      varValue: type === 'SET_VAR' ? 5 : type === 'WHILE_VAR' || type === 'IF_VAR' ? 0 : undefined,
      varDelta: type === 'CHANGE_VAR' ? -1 : undefined,
      varOperator: type === 'WHILE_VAR' || type === 'IF_VAR' ? '>' : undefined,
      listName: type === 'READ_LIST' ? defaultListName : undefined,
      children:
        type === 'REPEAT' ||
        type === 'WHILE_VAR' ||
        type === 'IF_VAR' ||
        type === 'IF_COLOR' ||
        type === 'IF_OBSTACLE'
          ? []
          : undefined,
    };
  };

  // Recursive tree update helpers
  const mapBlocksRecursive = (
    list: BlockCommand[],
    targetId: string,
    updater: (b: BlockCommand) => BlockCommand
  ): BlockCommand[] =>
    list.map((b) => {
      const updated = b.id === targetId ? updater(b) : b;
      if (updated.children) {
        return {
          ...updated,
          children: mapBlocksRecursive(updated.children, targetId, updater),
        };
      }
      return updated;
    });

  const deleteBlockRecursive = (list: BlockCommand[], targetId: string): BlockCommand[] =>
    list
      .filter((b) => b.id !== targetId)
      .map((b) =>
        b.children
          ? { ...b, children: deleteBlockRecursive(b.children, targetId) }
          : b
      );

  const moveSiblingRecursive = (
    list: BlockCommand[],
    targetId: string,
    direction: 'UP' | 'DOWN'
  ): BlockCommand[] => {
    const idx = list.findIndex((b) => b.id === targetId);
    if (idx !== -1) {
      const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return list;
      const copy = [...list];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    }
    return list.map((b) =>
      b.children
        ? { ...b, children: moveSiblingRecursive(b.children, targetId, direction) }
        : b
    );
  };

  // Add command to active slot (or inside activeContainerId if user is currently filling a loop/if)
  const handleAddCommand = (type: CommandType) => {
    if (isSimulating) return;
    sounds.playStep();

    const newBlock = createBlockCommand(type);
    const isLoopBlock = type === 'REPEAT' || type === 'WHILE_VAR';
    const isConditionalBlock = type === 'IF_VAR' || type === 'IF_COLOR' || type === 'IF_OBSTACLE';

    // If user is currently filling a loop/conditional and clicks a regular action or conditional, put it inside!
    // If user clicks REPEAT/WHILE_VAR from main palette, add at root so sequential loops work effortlessly and auto-target the new loop.
    if (activeContainer && !isLoopBlock) {
      setCurrentList((prev) =>
        mapBlocksRecursive(prev, activeContainer.id, (b) => ({
          ...b,
          children: [...(b.children || []), newBlock],
        }))
      );
      if (isConditionalBlock) {
        setActiveContainerId(newBlock.id);
        setJustAddedNotice('Kondisi masuk ke blok! Isi aksinya ✨');
      } else {
        setJustAddedNotice('Masuk ke dalam Loop/Blok! 🔁');
      }
      setTimeout(() => setJustAddedNotice(null), 3500);
      return;
    }

    setCurrentList((prev) => [...prev, newBlock]);
    if (isContainerType(type)) {
      setActiveContainerId(newBlock.id);
      setJustAddedNotice('Mode Isi Blok aktif! Klik perintah di kiri 🔁');
    } else {
      setJustAddedNotice('Balok berhasil dipasang! 🚀');
    }
    setTimeout(() => setJustAddedNotice(null), 3500);

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

  // Add child command into nested block (works at any nesting depth)
  const handleAddChildCommand = (parentId: string, type: CommandType) => {
    if (isSimulating) return;
    sounds.playStep();
    setJustAddedNotice('Balok dimasukkan ke dalam blok! ✨');
    setTimeout(() => setJustAddedNotice(null), 3500);

    const newChild = createBlockCommand(type);
    setCurrentList((prev) =>
      mapBlocksRecursive(prev, parentId, (b) => ({
        ...b,
        children: [...(b.children || []), newChild],
      }))
    );
    if (isContainerType(type)) {
      setActiveContainerId(newChild.id);
    }
  };

  // Delete block at any depth
  const handleDeleteBlock = (id: string) => {
    if (isSimulating) return;
    sounds.playClick();
    if (id === activeContainerId) {
      setActiveContainerId(null);
    }
    setCurrentList((prev) => deleteBlockRecursive(prev, id));
  };

  // Move block up/down within its sibling list at any depth
  const handleMoveBlock = (id: string, direction: 'UP' | 'DOWN') => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList((prev) => moveSiblingRecursive(prev, id, direction));
  };

  // Adjust repeat count at any depth
  const handleAdjustRepeat = (id: string, delta: number) => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList((prev) =>
      mapBlocksRecursive(prev, id, (b) => {
        const current = b.repeatCount || 3;
        const next = Math.max(1, Math.min(12, current + delta));
        return { ...b, repeatCount: next };
      })
    );
  };

  // Adjust variable threshold (WHILE_VAR / IF_VAR)
  const handleAdjustVarValue = (id: string, delta: number) => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList((prev) =>
      mapBlocksRecursive(prev, id, (b) => {
        const current = typeof b.varValue === 'number' ? b.varValue : 0;
        const next = Math.max(0, Math.min(20, current + delta));
        return { ...b, varValue: next };
      })
    );
  };

  // Cycle variable comparison operator (WHILE_VAR / IF_VAR)
  const handleCycleVarOperator = (id: string) => {
    if (isSimulating) return;
    sounds.playClick();
    const ops: Array<'>' | '>=' | '==' | '<'> = ['>', '>=', '==', '<'];
    setCurrentList((prev) =>
      mapBlocksRecursive(prev, id, (b) => {
        const idx = ops.indexOf((b.varOperator as '>' | '>=' | '==' | '<') || '>');
        const next = ops[(idx + 1) % ops.length];
        return { ...b, varOperator: next };
      })
    );
  };

  // Toggle condition color at any depth
  const handleToggleColor = (id: string) => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList((prev) =>
      mapBlocksRecursive(prev, id, (b) => {
        const next = b.conditionColor === 'BLUE' ? 'YELLOW' : 'BLUE';
        return {
          ...b,
          conditionColor: next,
          conditionType: next === 'BLUE' ? 'IS_BLUE' : 'IS_YELLOW',
        };
      })
    );
  };

  // Clear current tab
  const handleClearCurrent = () => {
    if (isSimulating) return;
    sounds.playClick();
    setActiveContainerId(null);
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
    try {
      navigator.clipboard?.writeText(code)?.catch(() => {});
    } catch {}
    sounds.playClick();
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  const pythonCode = useMemo(
    () =>
      viewMode === 'PYTHON'
        ? blocksToPython(
            mainBlocks,
            f1Blocks,
            f2Blocks,
            level.initialVariables,
            level.initialLists
          )
        : '',
    [viewMode, mainBlocks, f1Blocks, f2Blocks, level.initialVariables, level.initialLists]
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
      {/* Top Header: Function Tabs, Compact Mobile Auto-Run & Visual/Python Toggle */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-2 bg-slate-950/80 border-b border-slate-800 gap-1.5 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
        {/* Function / Main Tabs */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('MAIN');
            }}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'MAIN'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="sm:hidden">Utama</span>
            <span className="hidden sm:inline">Program Utama</span>
          </button>

          {level.allowF1 && (
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('F1');
              }}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'F1'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>F1</span>
            </button>
          )}

          {level.allowF2 && (
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('F2');
              }}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'F2'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>F2</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Compact Mobile Auto-Run Toggle (hidden on md+ where full ribbon shows) */}
          {onToggleAutoRun && (
            <button
              onClick={() => {
                sounds.playClick();
                onToggleAutoRun();
              }}
              className={`md:hidden min-h-[36px] px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 whitespace-nowrap ${
                autoRunEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title="Aktifkan/Matikan Jalan Otomatis"
            >
              <Zap className={`w-3.5 h-3.5 ${autoRunEnabled ? 'text-amber-400 fill-amber-400' : ''}`} />
              <span>{autoRunEnabled ? 'Auto' : 'Manual'}</span>
            </button>
          )}

          {/* View Mode Toggle (Scratch Blocks vs Python) */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('BLOCKS');
              }}
              className={`px-2.5 py-1 min-h-[32px] text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'BLOCKS'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tampilan Balok Visual Interaktif (Scratch-style)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Balok</span>
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('PYTHON');
              }}
              className={`px-2.5 py-1 min-h-[32px] text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'PYTHON'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lihat Kode Asli Python 3 (Persiapan SMP)"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Action Ribbon: JALANKAN KODE & Auto-Run Toggle (hidden on mobile because unified bottom dock handles Run/Step) */}
      <div className="hidden md:flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {onToggleAutoRun && (
            <button
              onClick={() => {
                sounds.playClick();
                onToggleAutoRun();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                autoRunEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-amber-500/20 ring-1 ring-amber-400/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300 hover:bg-slate-850'
              }`}
              title="Ketika aktif, program akan otomatis diuji setiap kali kamu selesai menyusun balok"
            >
              <Zap className={`w-3.5 h-3.5 ${autoRunEnabled ? 'text-amber-400 fill-amber-400 animate-pulse' : ''}`} />
              <span>⚡ Jalan Otomatis: {autoRunEnabled ? 'AKTIF' : 'MATI'}</span>
            </button>
          )}

          {autoRunCountdown !== null && autoRunCountdown !== undefined && (
            <span className="text-[11px] text-amber-300 font-mono flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-800/40">
              <span>({autoRunCountdown}s)</span>
            </span>
          )}

          {justAddedNotice && (
            <span className="text-[11px] bg-emerald-400 text-slate-950 font-bold px-2.5 py-0.5 rounded-full shadow">
              {justAddedNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onStepOnce && (
            <button
              onClick={onStepOnce}
              disabled={isSimulating}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1"
              title="Jalankan 1 Langkah Debug"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>1 Langkah</span>
            </button>
          )}

          {onRunCode && (
            <button
              onClick={onRunCode}
              className={`px-5 py-2 rounded-xl text-xs font-black font-display tracking-wider shadow-lg transition-all flex items-center gap-1.5 min-h-[40px] ${
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
        <div className="flex items-center gap-1.5 tabular-nums">
          <span className="text-slate-400">Balok:</span>
          <span
            className={`font-mono font-bold px-1.5 py-0.5 rounded ${
              is3StarEligible
                ? 'bg-emerald-950 text-emerald-300'
                : is2StarEligible
                ? 'bg-amber-950 text-amber-300'
                : 'bg-rose-950 text-rose-300'
            }`}
          >
            {totalUsedBlocks}
          </span>
          <span className="text-slate-600">/</span>
          <span
            className="font-mono font-bold text-slate-300"
            title={`Acuan Bintang — 3★: maks. ${threeStarLimit} balok · 2★: maks. ${twoStarLimit} balok`}
          >
            Maks. {threeStarLimit}★
          </span>
          {justAddedNotice && (
            <span className="md:hidden text-[10px] bg-emerald-400 text-slate-950 font-bold px-2 py-0.5 rounded-full ml-1 truncate max-w-[130px]">
              {justAddedNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {onLoadStarterCode && (
            <button
              onClick={() => {
                sounds.playClick();
                onLoadStarterCode();
              }}
              disabled={isSimulating}
              className="hidden md:flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-1 rounded-lg transition-colors font-semibold disabled:opacity-50"
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
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1 min-h-[32px] rounded-lg transition-colors disabled:opacity-50 font-semibold"
              title="Hapus semua balok di tab ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      {viewMode === 'PYTHON' ? (
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden bg-slate-950">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5 truncate">
              <Code2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Sintaks Python 3</span>
            </span>
            <button
              onClick={handleCopyPython}
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium shrink-0"
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
        /* WORKSPACE BODY: On mobile (< sm), flex-col-reverse puts sequence ABOVE palette for effortless thumb tapping! */
        <div className="flex-1 flex flex-col-reverse sm:grid sm:grid-cols-12 min-h-0 sm:divide-x divide-slate-800/80 overflow-hidden">
          {/* PALETTE BALOK PERINTAH (Bottom thumb-zone on mobile, Left 5 cols on sm+) */}
          <div className="max-h-[44%] sm:max-h-none sm:h-full sm:col-span-5 flex flex-col min-h-0 bg-slate-900/90 border-t sm:border-t-0 border-slate-700/80 overflow-hidden shrink-0 sm:shrink">
            <div className="px-3 py-1.5 sm:py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] sm:text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider font-display">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>PILIH BALOK PERINTAH</span>
              </span>
              <span className="text-[10px] text-cyan-400/80 font-mono">
                <span className="sm:hidden">Tap = Tambah ↑</span>
                <span className="hidden sm:inline">Klik = Masuk ➔</span>
              </span>
            </div>

            {/* Filter Kategori Balok */}
            <div className="px-2 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
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
                  className={`px-2.5 py-1 min-h-[32px] rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                    paletteCategory === cat.id
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tombol-tombol Balok Koding (Large 44px touch targets on mobile) */}
            <div className="flex-1 p-2 overflow-y-auto grid grid-cols-2 sm:grid-cols-1 xl:grid-cols-2 gap-1.5 sm:gap-1.5 content-start">
              {/* MOVE_FORWARD */}
              {level.allowedCommands.includes('MOVE_FORWARD') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('MOVE_FORWARD')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs sm:text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Maju 1 Petak ke Depan"
                  >
                    <ArrowUp className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 text-cyan-200" />
                    <span className="truncate">🚶 Maju 1 Petak</span>
                  </button>
                )}

              {/* TURN_LEFT */}
              {level.allowedCommands.includes('TURN_LEFT') &&
                (paletteCategory === 'ALL' || paletteCategory === 'MOTION') && (
                  <button
                    onClick={() => handleAddCommand('TURN_LEFT')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-indigo-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-amber-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-amber-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-purple-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-purple-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-blue-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-teal-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-teal-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-orange-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-orange-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Periksa Warna Petak Tempat Robot Berada"
                  >
                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                    <span className="truncate">🎨 Cek Warna</span>
                  </button>
                )}

              {/* IF_OBSTACLE */}
              {level.allowedCommands.includes('IF_OBSTACLE') &&
                (paletteCategory === 'ALL' || paletteCategory === 'LOGIC') && (
                  <button
                    onClick={() => handleAddCommand('IF_OBSTACLE')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-orange-700 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-orange-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
                    title="Deteksi Tebing, Laser, atau Jurang di Depan"
                  >
                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                    <span className="truncate">🚧 Jika Halangan</span>
                  </button>
                )}

              {/* CALL_F1 */}
              {level.allowF1 &&
                (paletteCategory === 'ALL' || paletteCategory === 'FUNCTION') && (
                  <button
                    onClick={() => handleAddCommand('CALL_F1')}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-emerald-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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
                    className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold rounded-xl border border-emerald-400/30 shadow transition-all disabled:opacity-50 text-left cursor-pointer"
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

            {/* Active Container Targeting Banner */}
            {activeContainer && (
              <div className="mx-2.5 mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-950 to-indigo-950 border border-amber-400/70 flex items-center justify-between gap-2 shadow-md shrink-0">
                <div className="text-[11px] text-purple-100 leading-snug min-w-0">
                  <span className="font-bold text-amber-300">🎯 Mengisi ke Dalam Loop/Blok:</span>{' '}
                  <span className="text-slate-200">
                    Klik perintah di palet untuk memasukkannya ke dalam{' '}
                    <strong className="text-white">
                      {activeContainer.type === 'REPEAT'
                        ? `Ulangi (${activeContainer.repeatCount || 3}x)`
                        : activeContainer.type === 'WHILE_VAR'
                        ? `Selama (${activeContainer.varName || 'baterai'} ${activeContainer.varOperator || '>'} ${activeContainer.varValue ?? 0})`
                        : 'Blok Kondisi'}
                    </strong>
                    .
                  </span>
                </div>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setActiveContainerId(null);
                  }}
                  className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg shrink-0 shadow transition-colors"
                >
                  ✓ Selesai Isi
                </button>
              </div>
            )}

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
                      level={level}
                      depth={0}
                      isActive={block.id === activeExecutingBlockId}
                      isSimulating={isSimulating}
                      onDelete={handleDeleteBlock}
                      onMove={handleMoveBlock}
                      onAdjustRepeat={handleAdjustRepeat}
                      onAdjustVarValue={handleAdjustVarValue}
                      onCycleVarOperator={handleCycleVarOperator}
                      onToggleColor={handleToggleColor}
                      onAddChild={handleAddChildCommand}
                      activeExecutingBlockId={activeExecutingBlockId}
                      activeContainerId={activeContainerId}
                      onToggleTargetContainer={(id) => {
                        sounds.playClick();
                        setActiveContainerId((prev) => (prev === id ? null : id));
                      }}
                    />
                  ))}

                  {activeContainer && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setActiveContainerId(null);
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-950/60 text-cyan-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>↳ Selesai Isi Loop — Tambah Balok Selanjutnya di Luar</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Child Block Card component with Scratch-style aesthetics & full recursive nesting support
interface BlockCardProps {
  block: BlockCommand;
  index: number;
  total: number;
  level: LevelDefinition;
  depth: number;
  isActive: boolean;
  isSimulating: boolean;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'UP' | 'DOWN') => void;
  onAdjustRepeat: (id: string, delta: number) => void;
  onAdjustVarValue: (id: string, delta: number) => void;
  onCycleVarOperator: (id: string) => void;
  onToggleColor: (id: string) => void;
  onAddChild: (parentId: string, type: CommandType) => void;
  activeExecutingBlockId?: string;
  activeContainerId: string | null;
  onToggleTargetContainer: (id: string) => void;
}

const CHILD_COMMAND_LABELS: { type: CommandType; shortLabel: string; title: string }[] = [
  { type: 'MOVE_FORWARD', shortLabel: '+ Maju', title: 'Tambah Maju' },
  { type: 'TURN_LEFT', shortLabel: '+ Kiri', title: 'Tambah Putar Kiri' },
  { type: 'TURN_RIGHT', shortLabel: '+ Kanan', title: 'Tambah Putar Kanan' },
  { type: 'JUMP', shortLabel: '+ Lompat', title: 'Tambah Lompat' },
  { type: 'COLLECT', shortLabel: '+ Ambil', title: 'Tambah Ambil Kristal' },
  { type: 'TOGGLE_SWITCH', shortLabel: '+ Saklar', title: 'Tambah Tekan Saklar' },
  { type: 'IF_COLOR', shortLabel: '+ Cek Warna', title: 'Tambah Cek Warna' },
  { type: 'IF_OBSTACLE', shortLabel: '+ Halangan', title: 'Tambah Jika Halangan' },
  { type: 'IF_VAR', shortLabel: '+ Jika Nilai', title: 'Tambah Jika Nilai' },
  { type: 'REPEAT', shortLabel: '+ Ulangi', title: 'Tambah Loop Ulangi' },
  { type: 'CALL_F1', shortLabel: '+ F1()', title: 'Tambah Panggil F1()' },
  { type: 'CALL_F2', shortLabel: '+ F2()', title: 'Tambah Panggil F2()' },
];

const BlockCard: React.FC<BlockCardProps> = React.memo(({
  block,
  index,
  total,
  level,
  depth,
  isActive,
  isSimulating,
  onDelete,
  onMove,
  onAdjustRepeat,
  onAdjustVarValue,
  onCycleVarOperator,
  onToggleColor,
  onAddChild,
  activeExecutingBlockId,
  activeContainerId,
  onToggleTargetContainer,
}) => {
  const isLoop = block.type === 'REPEAT';
  const isWhileVar = block.type === 'WHILE_VAR';
  const isIfVar = block.type === 'IF_VAR';
  const isIfColor = block.type === 'IF_COLOR';
  const isIfObstacle = block.type === 'IF_OBSTACLE';
  const isContainer = isLoop || isWhileVar || isIfVar || isIfColor || isIfObstacle;
  const isTargeted = isContainer && activeContainerId === block.id;

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
      label = `Selama (${block.varName || 'baterai'} ${block.varOperator || '>'} ${block.varValue ?? 0})`;
      bgStyle = 'bg-purple-800 border-purple-400/40 text-white';
      break;
    case 'IF_VAR':
      label = `Jika (${block.varName || 'baterai'} ${block.varOperator || '>'} ${block.varValue ?? 0})`;
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

  const availableChildActions = CHILD_COMMAND_LABELS.filter((item) => {
    const isNestContainer =
      item.type === 'REPEAT' ||
      item.type === 'IF_COLOR' ||
      item.type === 'IF_OBSTACLE' ||
      item.type === 'IF_VAR';
    if (isNestContainer && depth >= 2) return false;
    if (item.type === 'CALL_F1') return !!level.allowF1;
    if (item.type === 'CALL_F2') return !!level.allowF2;
    return level.allowedCommands.includes(item.type);
  });

  return (
    <div
      className={`relative rounded-xl border p-2.5 transition-all shadow-md ${bgStyle} ${
        isActive
          ? 'ring-4 ring-yellow-400 shadow-yellow-500/50 scale-[1.02] z-10'
          : isTargeted
          ? 'ring-2 ring-amber-300 shadow-amber-400/20'
          : 'hover:shadow-lg'
      }`}
    >
      {/* Top Header of the Block */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
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

        {/* Action Controls: Move Up, Move Down, Delete (touch-sized on mobile) */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          {isLoop && (
            <div className="flex items-center gap-0.5 bg-black/25 px-1 py-0.5 rounded-lg mr-0.5">
              <button
                onClick={() => onAdjustRepeat(block.id, -1)}
                disabled={isSimulating || (block.repeatCount || 3) <= 1}
                className="min-h-[32px] min-w-[32px] sm:min-h-0 sm:min-w-0 flex items-center justify-center hover:text-yellow-300 disabled:opacity-40 p-1 sm:p-0.5"
                title="Kurangi kali perulangan"
              >
                <Minus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
              <span className="text-xs sm:text-[11px] font-mono font-bold px-1 tabular-nums">
                {block.repeatCount || 3}x
              </span>
              <button
                onClick={() => onAdjustRepeat(block.id, 1)}
                disabled={isSimulating || (block.repeatCount || 3) >= 12}
                className="min-h-[32px] min-w-[32px] sm:min-h-0 sm:min-w-0 flex items-center justify-center hover:text-yellow-300 disabled:opacity-40 p-1 sm:p-0.5"
                title="Tambah kali perulangan"
              >
                <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          )}

          {(isWhileVar || isIfVar) && (
            <div className="flex items-center gap-0.5 bg-black/25 px-1 py-0.5 rounded-lg mr-0.5">
              <button
                onClick={() => onCycleVarOperator(block.id)}
                disabled={isSimulating}
                className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-black/30 hover:bg-black/50 rounded text-amber-300"
                title="Ubah operator perbandingan"
              >
                {block.varOperator || '>'}
              </button>
              <button
                onClick={() => onAdjustVarValue(block.id, -1)}
                disabled={isSimulating || (typeof block.varValue === 'number' ? block.varValue : 0) <= 0}
                className="min-h-[28px] min-w-[28px] sm:min-h-0 sm:min-w-0 flex items-center justify-center hover:text-yellow-300 disabled:opacity-40 p-0.5"
                title="Kurangi nilai pembanding"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono font-bold px-1 tabular-nums">
                {block.varValue ?? 0}
              </span>
              <button
                onClick={() => onAdjustVarValue(block.id, 1)}
                disabled={isSimulating || (typeof block.varValue === 'number' ? block.varValue : 0) >= 20}
                className="min-h-[28px] min-w-[28px] sm:min-h-0 sm:min-w-0 flex items-center justify-center hover:text-yellow-300 disabled:opacity-40 p-0.5"
                title="Tambah nilai pembanding"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {isIfColor && (
            <button
              onClick={() => onToggleColor(block.id)}
              disabled={isSimulating}
              className="text-[11px] sm:text-[10px] font-bold px-2.5 py-1.5 sm:px-2 sm:py-0.5 bg-black/30 rounded-lg mr-0.5 hover:bg-black/50 transition-colors min-h-[32px] sm:min-h-0"
            >
              {block.conditionColor === 'BLUE' ? 'Ubin Biru' : 'Ubin Kuning'}
            </button>
          )}

          <button
            onClick={() => onMove(block.id, 'UP')}
            disabled={isSimulating || index === 0}
            className="min-h-[34px] min-w-[34px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1.5 sm:p-1 hover:bg-black/20 rounded-lg disabled:opacity-30"
            title="Geser ke Atas"
          >
            <ChevronUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={() => onMove(block.id, 'DOWN')}
            disabled={isSimulating || index === total - 1}
            className="min-h-[34px] min-w-[34px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1.5 sm:p-1 hover:bg-black/20 rounded-lg disabled:opacity-30"
            title="Geser ke Bawah"
          >
            <ChevronDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={() => onDelete(block.id)}
            disabled={isSimulating}
            className="min-h-[34px] min-w-[34px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1.5 sm:p-1 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-30"
            title="Hapus Balok"
          >
            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>

      {/* Nested Body for Containers (Repeat / While / If) */}
      {isContainer && (
        <div className="mt-2.5 pl-2.5 border-l-2 border-white/40 space-y-2 bg-black/25 p-2 rounded-lg">
          <div className="text-[11px] sm:text-[10px] font-semibold opacity-95 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span>Isi perintah di dalam blok:</span>
              <button
                onClick={() => onToggleTargetContainer(block.id)}
                disabled={isSimulating}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  isTargeted
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                {isTargeted ? '🎯 Sedang Diisi (Klik untuk Selesai)' : '+ Isi dari Palet Kiri'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableChildActions.map((act) => (
                <button
                  key={act.type}
                  onClick={() => onAddChild(block.id, act.type)}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 sm:px-2 sm:py-1 min-h-[34px] sm:min-h-0 bg-white/25 hover:bg-white/40 border border-white/25 active:scale-95 rounded-lg sm:rounded text-[11px] sm:text-[10px] font-bold transition-colors disabled:opacity-40"
                  title={act.title}
                >
                  {act.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {block.children && block.children.length > 0 ? (
            <div className="space-y-1.5">
              {block.children.map((child, cIdx) => (
                <BlockCard
                  key={child.id}
                  block={child}
                  index={cIdx}
                  total={block.children?.length || 0}
                  level={level}
                  depth={depth + 1}
                  isActive={child.id === activeExecutingBlockId}
                  isSimulating={isSimulating}
                  onDelete={onDelete}
                  onMove={onMove}
                  onAdjustRepeat={onAdjustRepeat}
                  onAdjustVarValue={onAdjustVarValue}
                  onCycleVarOperator={onCycleVarOperator}
                  onToggleColor={onToggleColor}
                  onAddChild={onAddChild}
                  activeExecutingBlockId={activeExecutingBlockId}
                  activeContainerId={activeContainerId}
                  onToggleTargetContainer={onToggleTargetContainer}
                />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-amber-200 font-medium py-1.5 px-2 rounded bg-amber-500/15 border border-amber-400/30">
              ⚠️ Blok loop masih kosong — klik tombol <strong>+</strong> di atas atau balok di palet kiri untuk mengisinya!
            </div>
          )}
        </div>
      )}
    </div>
  );
});
