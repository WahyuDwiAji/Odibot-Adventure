import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Lightbulb,
  Zap,
  Play,
  Square,
  CornerDownRight,
  X,
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
  autoRunEnabled?: boolean;
  onToggleAutoRun?: () => void;
  autoRunCountdown?: number | null;
  onRunCode?: () => void;
}

type PaletteCategory = 'ALL' | 'MOTION' | 'VARIABLE' | 'LOOP' | 'LOGIC' | 'FUNCTION';

interface PaletteItemDef {
  type: CommandType;
  category: Exclude<PaletteCategory, 'ALL'>;
  alsoCategories?: Exclude<PaletteCategory, 'ALL'>[];
  label: string;
  shortLabel: string;
  title: string;
  buttonClass: string;
  icon: React.ReactNode;
}

export const BlockWorkspace: React.FC<BlockWorkspaceProps> = React.memo(({
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
  autoRunEnabled = false,
  onToggleAutoRun,
  autoRunCountdown = null,
  onRunCode,
}) => {
  const [activeTab, setActiveTab] = useState<'MAIN' | 'F1' | 'F2'>('MAIN');
  const [viewMode, setViewMode] = useState<'BLOCKS' | 'PYTHON'>('BLOCKS');
  const [paletteCategory, setPaletteCategory] = useState<PaletteCategory>('ALL');
  const [copiedPython, setCopiedPython] = useState(false);
  const [justAddedNotice, setJustAddedNotice] = useState<string | null>(null);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [activeContainerBranch, setActiveContainerBranch] = useState<'THEN' | 'ELSE'>('THEN');
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(true);
  const [lastAddedBlockId, setLastAddedBlockId] = useState<string | null>(null);
  const sequenceContainerRef = useRef<HTMLDivElement>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (msg: string) => {
    setJustAddedNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setJustAddedNotice(null);
      noticeTimerRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setActiveContainerId(null);
    setActiveContainerBranch('THEN');
    setInsertAfterId(null);
  }, [level.id, activeTab]);

  useEffect(() => {
    setActiveTab('MAIN');
    setPaletteCategory('ALL');
    setMobilePaletteOpen(true);
  }, [level.id]);

  // Smoothly keep newly added or currently executing block visible inside sequence container
  useEffect(() => {
    const targetId = activeExecutingBlockId || lastAddedBlockId;
    if (!targetId || !sequenceContainerRef.current) return;
    const el = sequenceContainerRef.current.querySelector(
      `[data-block-id="${targetId}"]`
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: isSimulating ? 'auto' : 'smooth' });
    }
    if (lastAddedBlockId) {
      const t = setTimeout(() => setLastAddedBlockId(null), 350);
      return () => clearTimeout(t);
    }
  }, [activeExecutingBlockId, lastAddedBlockId, isSimulating]);

  const totalUsedBlocks = countTotalBlocks(mainBlocks, f1Blocks, f2Blocks);
  const [threeStarLimit, twoStarLimit] = getLevelThresholds(level);
  const is3StarEligible = totalUsedBlocks <= threeStarLimit;
  const is2StarEligible = totalUsedBlocks <= twoStarLimit;

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
      if (item.elseChildren) {
        const foundElse = findBlockById(item.elseChildren, targetId);
        if (foundElse) return foundElse;
      }
    }
    return null;
  };

  const activeContainer = useMemo(
    () => (activeContainerId ? findBlockById(currentList, activeContainerId) : null),
    [activeContainerId, currentList]
  );

  const insertTargetBlock = useMemo(
    () => (insertAfterId ? findBlockById(currentList, insertAfterId) : null),
    [insertAfterId, currentList]
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

  const cloneBlockDeep = (b: BlockCommand): BlockCommand => ({
    ...b,
    id: 'blk-' + Math.random().toString(36).substring(2, 9),
    children: b.children ? b.children.map(cloneBlockDeep) : undefined,
    elseChildren: b.elseChildren ? b.elseChildren.map(cloneBlockDeep) : undefined,
  });

  const mapBlocksRecursive = (
    list: BlockCommand[],
    targetId: string,
    updater: (b: BlockCommand) => BlockCommand
  ): BlockCommand[] =>
    list.map((b) => {
      const updated = b.id === targetId ? updater(b) : b;
      const mappedChildren = updated.children
        ? mapBlocksRecursive(updated.children, targetId, updater)
        : undefined;
      const mappedElse = updated.elseChildren
        ? mapBlocksRecursive(updated.elseChildren, targetId, updater)
        : undefined;
      if (mappedChildren !== updated.children || mappedElse !== updated.elseChildren) {
        return {
          ...updated,
          ...(mappedChildren ? { children: mappedChildren } : {}),
          ...(mappedElse ? { elseChildren: mappedElse } : {}),
        };
      }
      return updated;
    });

  const insertAfterRecursive = (
    list: BlockCommand[],
    afterId: string,
    newBlock: BlockCommand
  ): { list: BlockCommand[]; inserted: boolean } => {
    const idx = list.findIndex((b) => b.id === afterId);
    if (idx !== -1) {
      return {
        list: [...list.slice(0, idx + 1), newBlock, ...list.slice(idx + 1)],
        inserted: true,
      };
    }
    let changed = false;
    const mapped = list.map((b) => {
      if (changed) return b;
      let nextB = b;
      if (b.children) {
        const res = insertAfterRecursive(b.children, afterId, newBlock);
        if (res.inserted) {
          changed = true;
          nextB = { ...nextB, children: res.list };
        }
      }
      if (!changed && b.elseChildren) {
        const resElse = insertAfterRecursive(b.elseChildren, afterId, newBlock);
        if (resElse.inserted) {
          changed = true;
          nextB = { ...nextB, elseChildren: resElse.list };
        }
      }
      return nextB;
    });
    return { list: mapped, inserted: changed };
  };

  const deleteBlockRecursive = (list: BlockCommand[], targetId: string): BlockCommand[] =>
    list
      .filter((b) => b.id !== targetId)
      .map((b) => ({
        ...b,
        ...(b.children ? { children: deleteBlockRecursive(b.children, targetId) } : {}),
        ...(b.elseChildren ? { elseChildren: deleteBlockRecursive(b.elseChildren, targetId) } : {}),
      }));

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
    return list.map((b) => ({
      ...b,
      ...(b.children ? { children: moveSiblingRecursive(b.children, targetId, direction) } : {}),
      ...(b.elseChildren
        ? { elseChildren: moveSiblingRecursive(b.elseChildren, targetId, direction) }
        : {}),
    }));
  };

  // Add command to active slot (inside activeContainer, right after insertAfterId, or at end)
  const handleAddCommand = (type: CommandType) => {
    if (isSimulating) return;
    sounds.playStep();

    const newBlock = createBlockCommand(type);
    const isLoopBlock = type === 'REPEAT' || type === 'WHILE_VAR';
    const isConditionalBlock = type === 'IF_VAR' || type === 'IF_COLOR' || type === 'IF_OBSTACLE';

    // 1. Inside an active Loop or Conditional branch
    if (activeContainer && !isLoopBlock) {
      const targetBranch =
        activeContainerBranch === 'ELSE' && activeContainer.elseChildren !== undefined
          ? 'ELSE'
          : 'THEN';
      setCurrentList((prev) =>
        mapBlocksRecursive(prev, activeContainer.id, (b) =>
          targetBranch === 'ELSE'
            ? { ...b, elseChildren: [...(b.elseChildren || []), newBlock] }
            : { ...b, children: [...(b.children || []), newBlock] }
        )
      );
      setLastAddedBlockId(newBlock.id);
      if (isConditionalBlock) {
        setActiveContainerId(newBlock.id);
        setActiveContainerBranch('THEN');
        showNotice('Kondisi masuk! Klik perintah isi bloknya.');
      } else {
        showNotice(
          targetBranch === 'ELSE' ? 'Masuk ke cabang ELSE' : 'Masuk ke dalam Loop/Blok'
        );
      }
      return;
    }

    // 2. Inserting right after a selected block cursor
    if (insertTargetBlock) {
      setCurrentList((prev) => {
        const res = insertAfterRecursive(prev, insertTargetBlock.id, newBlock);
        return res.inserted ? res.list : [...prev, newBlock];
      });
      setLastAddedBlockId(newBlock.id);
      if (isContainerType(type)) {
        setInsertAfterId(null);
        setActiveContainerId(newBlock.id);
        setActiveContainerBranch('THEN');
        showNotice('Blok disisipkan & mode isi aktif!');
      } else {
        setInsertAfterId(newBlock.id);
        showNotice('Balok disisipkan di posisi tanda');
      }
      return;
    }

    // 3. Default append to end
    setCurrentList((prev) => [...prev, newBlock]);
    setLastAddedBlockId(newBlock.id);
    if (isContainerType(type)) {
      setActiveContainerId(newBlock.id);
      setActiveContainerBranch('THEN');
      showNotice('Mode Isi Blok aktif — klik balok isi di palet');
    } else {
      showNotice('Balok ditambahkan');
    }
  };

  const handleAddChildCommand = (
    parentId: string,
    type: CommandType,
    branch: 'THEN' | 'ELSE' = 'THEN'
  ) => {
    if (isSimulating) return;
    sounds.playStep();
    showNotice(branch === 'ELSE' ? 'Masuk ke cabang ELSE' : 'Masuk ke dalam blok');

    const newChild = createBlockCommand(type);
    setCurrentList((prev) =>
      mapBlocksRecursive(prev, parentId, (b) =>
        branch === 'ELSE'
          ? { ...b, elseChildren: [...(b.elseChildren || []), newChild] }
          : { ...b, children: [...(b.children || []), newChild] }
      )
    );
    setLastAddedBlockId(newChild.id);
    if (isContainerType(type)) {
      setInsertAfterId(null);
      setActiveContainerId(newChild.id);
      setActiveContainerBranch('THEN');
    }
  };

  const handleDuplicateBlock = (block: BlockCommand) => {
    if (isSimulating) return;
    sounds.playStep();
    const copy = cloneBlockDeep(block);
    setCurrentList((prev) => {
      const res = insertAfterRecursive(prev, block.id, copy);
      return res.inserted ? res.list : [...prev, copy];
    });
    setLastAddedBlockId(copy.id);
    showNotice('Balok diduplikasi');
  };

  const handleToggleInsertAfter = (id: string) => {
    if (isSimulating) return;
    sounds.playClick();
    setActiveContainerId(null);
    setActiveContainerBranch('THEN');
    setInsertAfterId((prev) => (prev === id ? null : id));
  };

  const handleToggleElseBranch = (id: string, enable: boolean) => {
    if (isSimulating) return;
    sounds.playClick();
    setInsertAfterId(null);
    setCurrentList((prev) =>
      mapBlocksRecursive(prev, id, (b) => ({
        ...b,
        elseChildren: enable ? b.elseChildren || [] : undefined,
      }))
    );
    if (enable) {
      setActiveContainerId(id);
      setActiveContainerBranch('ELSE');
    } else if (activeContainerId === id && activeContainerBranch === 'ELSE') {
      setActiveContainerBranch('THEN');
    }
  };

  const handleDeleteBlock = (id: string) => {
    if (isSimulating) return;
    sounds.playClick();
    if (id === activeContainerId) {
      setActiveContainerId(null);
      setActiveContainerBranch('THEN');
    }
    if (id === insertAfterId) {
      setInsertAfterId(null);
    }
    setCurrentList((prev) => deleteBlockRecursive(prev, id));
  };

  const handleMoveBlock = (id: string, direction: 'UP' | 'DOWN') => {
    if (isSimulating) return;
    sounds.playClick();
    setCurrentList((prev) => moveSiblingRecursive(prev, id, direction));
  };

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

  const handleClearCurrent = () => {
    if (isSimulating) return;
    sounds.playClick();
    setActiveContainerId(null);
    setInsertAfterId(null);
    setCurrentList([]);
  };

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

  const availablePaletteItems = useMemo<PaletteItemDef[]>(() => {
    const items: PaletteItemDef[] = [];
    const has = (t: CommandType) => level.allowedCommands.includes(t);

    if (has('MOVE_FORWARD')) {
      items.push({
        type: 'MOVE_FORWARD',
        category: 'MOTION',
        label: 'Maju 1 Petak',
        shortLabel: 'Maju',
        title: 'Maju 1 Petak ke Depan',
        buttonClass: 'bg-blue-600 hover:bg-blue-500 border-blue-400/35 text-white',
        icon: <ArrowUp className="w-3.5 h-3.5 shrink-0 text-cyan-200" />,
      });
    }
    if (has('TURN_LEFT')) {
      items.push({
        type: 'TURN_LEFT',
        category: 'MOTION',
        label: 'Putar Kiri',
        shortLabel: 'Kiri',
        title: 'Putar Kiri 90 Derajat',
        buttonClass: 'bg-blue-600 hover:bg-blue-500 border-blue-400/35 text-white',
        icon: <RotateCcw className="w-3.5 h-3.5 shrink-0 text-cyan-200" />,
      });
    }
    if (has('TURN_RIGHT')) {
      items.push({
        type: 'TURN_RIGHT',
        category: 'MOTION',
        label: 'Putar Kanan',
        shortLabel: 'Kanan',
        title: 'Putar Kanan 90 Derajat',
        buttonClass: 'bg-blue-600 hover:bg-blue-500 border-blue-400/35 text-white',
        icon: <RotateCw className="w-3.5 h-3.5 shrink-0 text-cyan-200" />,
      });
    }
    if (has('JUMP')) {
      items.push({
        type: 'JUMP',
        category: 'MOTION',
        label: 'Lompat Tebing',
        shortLabel: 'Lompat',
        title: 'Lompat Naik atau Turun Tebing (±1m)',
        buttonClass: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/35 text-white',
        icon: <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-indigo-200" />,
      });
    }
    if (has('COLLECT')) {
      items.push({
        type: 'COLLECT',
        category: 'MOTION',
        label: 'Ambil Kristal',
        shortLabel: 'Ambil',
        title: 'Ambil Kristal Energi di ubin ini',
        buttonClass: 'bg-amber-600 hover:bg-amber-500 border-amber-400/35 text-white',
        icon: <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-200" />,
      });
    }
    if (has('TOGGLE_SWITCH')) {
      items.push({
        type: 'TOGGLE_SWITCH',
        category: 'MOTION',
        label: 'Saklar Laser',
        shortLabel: 'Saklar',
        title: 'Nyalakan/Matikan Saklar Laser',
        buttonClass: 'bg-amber-600 hover:bg-amber-500 border-amber-400/35 text-white',
        icon: <ToggleLeft className="w-3.5 h-3.5 shrink-0 text-amber-200" />,
      });
    }
    if (has('REPEAT')) {
      items.push({
        type: 'REPEAT',
        category: 'LOOP',
        label: 'Ulangi (Loop)',
        shortLabel: 'Ulangi',
        title: 'Ulangi Instruksi Berkali-kali',
        buttonClass: 'bg-purple-600 hover:bg-purple-500 border-purple-400/35 text-white',
        icon: <Repeat className="w-3.5 h-3.5 shrink-0 text-purple-200" />,
      });
    }
    if (has('WHILE_VAR')) {
      items.push({
        type: 'WHILE_VAR',
        category: 'LOOP',
        alsoCategories: ['VARIABLE'],
        label: 'Selama (While)',
        shortLabel: 'Selama',
        title: 'Perulangan Berdasarkan Kondisi Variabel',
        buttonClass: 'bg-purple-700 hover:bg-purple-600 border-purple-400/35 text-white',
        icon: <Repeat className="w-3.5 h-3.5 shrink-0 text-purple-200" />,
      });
    }
    if (has('READ_LIST')) {
      items.push({
        type: 'READ_LIST',
        category: 'VARIABLE',
        label: 'Baca List Rute',
        shortLabel: 'List',
        title: 'Baca Daftar Rute dari Array List',
        buttonClass: 'bg-blue-700 hover:bg-blue-600 border-blue-400/35 text-white',
        icon: <ListOrdered className="w-3.5 h-3.5 shrink-0 text-cyan-200" />,
      });
    }
    if (has('SET_VAR')) {
      items.push({
        type: 'SET_VAR',
        category: 'VARIABLE',
        label: 'Atur Variabel',
        shortLabel: 'Set Var',
        title: 'Atur Nilai Variabel',
        buttonClass: 'bg-teal-600 hover:bg-teal-500 border-teal-400/35 text-white',
        icon: <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-teal-200" />,
      });
    }
    if (has('CHANGE_VAR')) {
      items.push({
        type: 'CHANGE_VAR',
        category: 'VARIABLE',
        label: 'Ubah Variabel',
        shortLabel: 'Ubah Var',
        title: 'Tambah atau Kurangi Nilai Variabel',
        buttonClass: 'bg-teal-600 hover:bg-teal-500 border-teal-400/35 text-white',
        icon: <BatteryCharging className="w-3.5 h-3.5 shrink-0 text-teal-200" />,
      });
    }
    if (has('IF_VAR')) {
      items.push({
        type: 'IF_VAR',
        category: 'LOGIC',
        alsoCategories: ['VARIABLE'],
        label: 'Jika Nilai',
        shortLabel: 'Jika Var',
        title: 'Logika Percabangan Nilai Variabel',
        buttonClass: 'bg-orange-600 hover:bg-orange-500 border-orange-400/35 text-white',
        icon: <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-200" />,
      });
    }
    if (has('IF_COLOR')) {
      items.push({
        type: 'IF_COLOR',
        category: 'LOGIC',
        label: 'Cek Warna',
        shortLabel: 'Warna',
        title: 'Periksa Warna Ubin di Bawah Odibot',
        buttonClass: 'bg-orange-600 hover:bg-orange-500 border-orange-400/35 text-white',
        icon: <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-200" />,
      });
    }
    if (has('IF_OBSTACLE')) {
      items.push({
        type: 'IF_OBSTACLE',
        category: 'LOGIC',
        label: 'Jika Halangan',
        shortLabel: 'Halangan',
        title: 'Deteksi Jurang, Tebing, atau Laser di Depan',
        buttonClass: 'bg-orange-700 hover:bg-orange-600 border-orange-400/35 text-white',
        icon: <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-200" />,
      });
    }
    if (level.allowF1) {
      items.push({
        type: 'CALL_F1',
        category: 'FUNCTION',
        label: 'Panggil F1()',
        shortLabel: 'F1()',
        title: 'Panggil Subrutin Fungsi F1',
        buttonClass: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/35 text-white',
        icon: <Box className="w-3.5 h-3.5 shrink-0 text-emerald-200" />,
      });
    }
    if (level.allowF2) {
      items.push({
        type: 'CALL_F2',
        category: 'FUNCTION',
        label: 'Panggil F2()',
        shortLabel: 'F2()',
        title: 'Panggil Subrutin Fungsi F2',
        buttonClass: 'bg-emerald-700 hover:bg-emerald-600 border-emerald-400/35 text-white',
        icon: <Box className="w-3.5 h-3.5 shrink-0 text-emerald-200" />,
      });
    }
    return items;
  }, [level.allowedCommands, level.allowF1, level.allowF2]);

  const showCategoryFilters = availablePaletteItems.length > 8;

  const filteredPaletteItems = useMemo(() => {
    if (!showCategoryFilters || paletteCategory === 'ALL') {
      return availablePaletteItems;
    }
    return availablePaletteItems.filter(
      (item) =>
        item.category === paletteCategory ||
        (item.alsoCategories && item.alsoCategories.includes(paletteCategory))
    );
  }, [availablePaletteItems, paletteCategory, showCategoryFilters]);

  const availableCategories = useMemo(() => {
    const cats: { id: PaletteCategory; label: string }[] = [{ id: 'ALL', label: 'Semua' }];
    const hasCat = (c: Exclude<PaletteCategory, 'ALL'>) =>
      availablePaletteItems.some((i) => i.category === c || i.alsoCategories?.includes(c));
    if (hasCat('MOTION')) cats.push({ id: 'MOTION', label: 'Gerak' });
    if (hasCat('LOOP')) cats.push({ id: 'LOOP', label: 'Loop' });
    if (hasCat('VARIABLE')) cats.push({ id: 'VARIABLE', label: 'Variabel' });
    if (hasCat('LOGIC')) cats.push({ id: 'LOGIC', label: 'Logika' });
    if (hasCat('FUNCTION')) cats.push({ id: 'FUNCTION', label: 'Fungsi' });
    return cats;
  }, [availablePaletteItems]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
      {/* Row 1: Unified Header — Tabs, Run Button (Desktop), Auto-Run, Mode & Actions */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 gap-2 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('MAIN');
            }}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[34px] text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'MAIN'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="sm:hidden">Utama</span>
            <span className="hidden sm:inline">Program Utama</span>
            {mainBlocks.length > 0 && (
              <span className="font-mono text-[10px] opacity-80 tabular-nums">
                ({mainBlocks.length})
              </span>
            )}
          </button>

          {level.allowF1 && (
            <button
              data-feature-target="f1-tab"
              onClick={() => {
                sounds.playClick();
                setActiveTab('F1');
              }}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[34px] text-xs font-bold rounded-xl transition-all flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'F1'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>F1</span>
              {f1Blocks.length > 0 && (
                <span className="font-mono text-[10px] opacity-85 tabular-nums">
                  ({f1Blocks.length})
                </span>
              )}
            </button>
          )}

          {level.allowF2 && (
            <button
              data-feature-target="f2-tab"
              onClick={() => {
                sounds.playClick();
                setActiveTab('F2');
              }}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[34px] text-xs font-bold rounded-xl transition-all flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'F2'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>F2</span>
              {f2Blocks.length > 0 && (
                <span className="font-mono text-[10px] opacity-85 tabular-nums">
                  ({f2Blocks.length})
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRunCode && (
            <button
              onClick={onRunCode}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-bold font-display transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                isSimulating
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-sm'
              }`}
              title={isSimulating ? 'Hentikan Simulasi' : 'Jalankan Program (Space)'}
            >
              {isSimulating ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Hentikan</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Jalankan</span>
                </>
              )}
            </button>
          )}

          {onToggleAutoRun && (
            <button
              onClick={() => {
                sounds.playClick();
                onToggleAutoRun();
              }}
              className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 whitespace-nowrap transition-colors ${
                autoRunEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Jalankan otomatis setiap kali selesai menyusun balok"
            >
              <Zap className={`w-3.5 h-3.5 ${autoRunEnabled ? 'text-amber-400 fill-amber-400' : ''}`} />
              <span className="hidden lg:inline">Auto: {autoRunEnabled ? 'Aktif' : 'Mati'}</span>
              <span className="lg:hidden">{autoRunEnabled ? 'Auto' : 'Manual'}</span>
              {autoRunCountdown !== null && autoRunCountdown !== undefined && (
                <span className="font-mono text-[10px]">({autoRunCountdown}s)</span>
              )}
            </button>
          )}

          <div className="flex items-center gap-0.5 p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('BLOCKS');
              }}
              className={`px-2 py-1 min-h-[30px] text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'BLOCKS'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tampilan Balok Visual Interaktif"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Balok</span>
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setViewMode('PYTHON');
              }}
              className={`px-2 py-1 min-h-[30px] text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'PYTHON'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lihat Kode Python 3"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Python</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Block Meter + Insertion Target Bar + Quick Clear/Starter */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1 bg-slate-950/50 border-b border-slate-800/80 text-xs shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 tabular-nums shrink-0">
            <span className="text-slate-400 text-[11px]">Balok:</span>
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
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
              className="font-mono font-bold text-slate-300 text-[11px]"
              title={`Acuan Bintang — 3★: maks. ${threeStarLimit} balok · 2★: maks. ${twoStarLimit} balok`}
            >
              {threeStarLimit}★
            </span>
          </div>

          {justAddedNotice && (
            <span className="text-[11px] text-emerald-300 font-semibold truncate">
              · {justAddedNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onLoadStarterCode && (
            <button
              onClick={() => {
                sounds.playClick();
                onLoadStarterCode();
              }}
              disabled={isSimulating}
              className="hidden md:inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-1 rounded-lg transition-colors font-semibold disabled:opacity-50 whitespace-nowrap"
              title="Muat contoh susunan balok untuk level ini"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Contoh Solusi</span>
            </button>
          )}

          {viewMode === 'BLOCKS' && currentList.length > 0 && (
            <button
              onClick={handleClearCurrent}
              disabled={isSimulating}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 py-1 min-h-[30px] rounded-lg transition-colors disabled:opacity-50 font-semibold whitespace-nowrap"
              title="Hapus semua balok di tab ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kosongkan</span>
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
        /* Desktop: Side-by-side (Left Palette 5 cols + Right Sequence 7 cols)
           Mobile: Sequence on top (flex-1) + Compact Zero-Scroll Tap Dock at bottom */
        <div className="flex-1 flex flex-col-reverse sm:grid sm:grid-cols-12 min-h-0 sm:divide-x divide-slate-800/80 overflow-hidden">
          {/* PALETTE DOCK: Always reachable without scrolling between top & bottom */}
          <div className="sm:h-full sm:col-span-5 flex flex-col min-h-0 bg-slate-900/95 border-t sm:border-t-0 border-slate-700/80 overflow-hidden shrink-0 sm:shrink">
            <div className="px-2.5 py-1.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5 font-display truncate">
                <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  {activeContainer
                    ? 'Pilih Balok Isi Blok'
                    : insertTargetBlock
                    ? 'Pilih Balok Sisipan'
                    : 'Palet Balok Perintah'}
                </span>
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
                  Klik = Tambah ➔
                </span>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setMobilePaletteOpen((o) => !o);
                  }}
                  className="sm:hidden px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center gap-1"
                >
                  {mobilePaletteOpen ? (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      <span>Tutup</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      <span>Buka Balok</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {mobilePaletteOpen && (
              <>
                {showCategoryFilters && (
                  <div className="px-2 py-1 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          sounds.playClick();
                          setPaletteCategory(cat.id);
                        }}
                        className={`px-2 py-1 min-h-[28px] rounded-lg text-[10px] font-bold transition-all shrink-0 whitespace-nowrap ${
                          paletteCategory === cat.id
                            ? 'bg-cyan-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Compact 2/3-col grid so commands stay visible together with minimal/no scrolling */}
                <div className="max-h-[34dvh] sm:max-h-none sm:flex-1 p-2 overflow-y-auto grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-2 gap-1.5 content-start">
                  {filteredPaletteItems.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleAddCommand(item.type)}
                      disabled={isSimulating}
                      className={`flex items-center gap-1.5 min-h-[40px] sm:min-h-[38px] px-2.5 py-1.5 text-[11px] font-bold rounded-xl border shadow-sm transition-all active:scale-95 disabled:opacity-50 text-left cursor-pointer ${item.buttonClass}`}
                      title={item.title}
                    >
                      {item.icon}
                      <span className="truncate sm:hidden">{item.shortLabel}</span>
                      <span className="truncate hidden sm:inline">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* SEQUENCE CANVAS: Susunan Kode Odibot */}
          <div className="flex-1 sm:col-span-7 flex flex-col h-full min-h-0 bg-slate-950/80 overflow-hidden">
            {/* Sequence Title & Active Target Banner */}
            <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-display truncate">
                <ListOrdered className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {activeTab === 'F1'
                    ? `Isi Fungsi F1() · ${currentList.length} balok`
                    : activeTab === 'F2'
                    ? `Isi Fungsi F2() · ${currentList.length} balok`
                    : `Susunan Kode · ${currentList.length} balok`}
                </span>
              </span>
              {currentList.length > 0 && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline shrink-0">
                  Klik + untuk sisip di baris tertentu
                </span>
              )}
            </div>

            {(activeTab === 'F1' || activeTab === 'F2') && (
              <div className="mx-2.5 mt-2 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-[11px] text-emerald-100 leading-snug shrink-0">
                <span className="font-bold text-emerald-300">
                  Resep {activeTab}():
                </span>{' '}
                Susun perintah berulang di sini, lalu panggil dari tab{' '}
                <strong className="text-white">Program Utama</strong> dengan{' '}
                <strong className="text-emerald-300">Panggil {activeTab}()</strong>.
              </div>
            )}

            {/* Active Container Targeting Banner */}
            {activeContainer && (
              <div className="mx-2.5 mt-2 px-3 py-1.5 rounded-xl bg-indigo-950/90 border border-amber-400/70 flex items-center justify-between gap-2 shadow-sm shrink-0">
                <div className="text-[11px] text-indigo-100 leading-snug min-w-0 truncate">
                  <span className="font-bold text-amber-300">
                    {activeContainerBranch === 'ELSE' ? 'Mengisi Cabang ELSE:' : 'Mengisi Blok:'}
                  </span>{' '}
                  <span className="text-white font-semibold">
                    {activeContainer.type === 'REPEAT'
                      ? `Ulangi (${activeContainer.repeatCount || 3}x)`
                      : activeContainer.type === 'WHILE_VAR'
                      ? `Selama (${activeContainer.varName || 'baterai'} ${activeContainer.varOperator || '>'} ${activeContainer.varValue ?? 0})`
                      : activeContainerBranch === 'ELSE'
                      ? 'Jika Tidak (Else)'
                      : 'Kondisi Jika'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setActiveContainerId(null);
                    setActiveContainerBranch('THEN');
                  }}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg shrink-0 shadow transition-colors whitespace-nowrap"
                >
                  ✓ Selesai Isi
                </button>
              </div>
            )}

            {/* Active Insert-After Cursor Banner */}
            {!activeContainer && insertTargetBlock && (
              <div className="mx-2.5 mt-2 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-400/70 flex items-center justify-between gap-2 shadow-sm shrink-0">
                <div className="text-[11px] text-cyan-100 leading-snug flex items-center gap-1.5 min-w-0 truncate">
                  <CornerDownRight className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="truncate">
                    Balok baru dari palet disisipkan tepat setelah blok yang ditandai.
                  </span>
                </div>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setInsertAfterId(null);
                  }}
                  className="px-2 py-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] rounded-lg shrink-0 flex items-center gap-1 whitespace-nowrap"
                >
                  <X className="w-3 h-3" />
                  <span>Batal</span>
                </button>
              </div>
            )}

            {/* Sequence Blocks Scrollable Area */}
            <div ref={sequenceContainerRef} className="flex-1 p-2 sm:p-2.5 overflow-y-auto space-y-1.5">
              {currentList.length === 0 ? (
                <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-cyan-800/35 bg-slate-900/25 rounded-2xl text-slate-400">
                  <p className="text-xs font-bold text-white mb-1 font-display">
                    Klik Balok di Palet untuk Mulai Menyusun
                  </p>
                  <p className="text-[11px] max-w-xs text-slate-400 mb-3 leading-relaxed">
                    Semua perintah tersedia langsung di layar tanpa perlu menggulir bolak-balik.
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
                      <span>Pasang Contoh Solusi</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {currentList.map((block, idx) => (
                    <React.Fragment key={block.id}>
                      <BlockCard
                        block={block}
                        index={idx}
                        total={currentList.length}
                        level={level}
                        depth={0}
                        isActive={block.id === activeExecutingBlockId}
                        isInsertTarget={block.id === insertAfterId}
                        isSimulating={isSimulating}
                        onDelete={handleDeleteBlock}
                        onDuplicate={handleDuplicateBlock}
                        onToggleInsertAfter={handleToggleInsertAfter}
                        onMove={handleMoveBlock}
                        onAdjustRepeat={handleAdjustRepeat}
                        onAdjustVarValue={handleAdjustVarValue}
                        onCycleVarOperator={handleCycleVarOperator}
                        onToggleColor={handleToggleColor}
                        onAddChild={handleAddChildCommand}
                        onToggleElseBranch={handleToggleElseBranch}
                        activeExecutingBlockId={activeExecutingBlockId}
                        activeContainerId={activeContainerId}
                        activeContainerBranch={activeContainerBranch}
                        insertAfterId={insertAfterId}
                        onToggleTargetContainer={(id, branch = 'THEN') => {
                          sounds.playClick();
                          setInsertAfterId(null);
                          if (activeContainerId === id && activeContainerBranch === branch) {
                            setActiveContainerId(null);
                            setActiveContainerBranch('THEN');
                          } else {
                            setActiveContainerId(id);
                            setActiveContainerBranch(branch);
                          }
                        }}
                      />

                      {insertAfterId === block.id && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-dashed border-cyan-400 bg-cyan-950/60 text-[11px] text-cyan-200">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <CornerDownRight className="w-3.5 h-3.5 text-cyan-300" />
                            <span>Sisipkan balok di baris ini (klik balok di palet)</span>
                          </span>
                          <button
                            onClick={() => setInsertAfterId(null)}
                            className="text-cyan-300 hover:text-white font-bold text-[10px]"
                          >
                            Tutup
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  ))}

                  {activeContainer && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setActiveContainerId(null);
                        setActiveContainerBranch('THEN');
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-950/60 text-cyan-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>✓ Selesai Isi Blok — Tambah Balok Berikutnya di Luar</span>
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
});

// Child Block Card component with Scratch-style aesthetics & compact container nesting
interface BlockCardProps {
  block: BlockCommand;
  index: number;
  total: number;
  level: LevelDefinition;
  depth: number;
  isActive: boolean;
  isInsertTarget: boolean;
  isSimulating: boolean;
  onDelete: (id: string) => void;
  onDuplicate: (block: BlockCommand) => void;
  onToggleInsertAfter: (id: string) => void;
  onMove: (id: string, direction: 'UP' | 'DOWN') => void;
  onAdjustRepeat: (id: string, delta: number) => void;
  onAdjustVarValue: (id: string, delta: number) => void;
  onCycleVarOperator: (id: string) => void;
  onToggleColor: (id: string) => void;
  onAddChild: (parentId: string, type: CommandType, branch?: 'THEN' | 'ELSE') => void;
  onToggleElseBranch: (id: string, enable: boolean) => void;
  activeExecutingBlockId?: string;
  activeContainerId: string | null;
  activeContainerBranch: 'THEN' | 'ELSE';
  insertAfterId: string | null;
  onToggleTargetContainer: (id: string, branch?: 'THEN' | 'ELSE') => void;
}

const CHILD_COMMAND_LABELS: { type: CommandType; shortLabel: string; title: string }[] = [
  { type: 'MOVE_FORWARD', shortLabel: '+ Maju', title: 'Tambah Maju' },
  { type: 'TURN_LEFT', shortLabel: '+ Kiri', title: 'Tambah Putar Kiri' },
  { type: 'TURN_RIGHT', shortLabel: '+ Kanan', title: 'Tambah Putar Kanan' },
  { type: 'JUMP', shortLabel: '+ Lompat', title: 'Tambah Lompat' },
  { type: 'COLLECT', shortLabel: '+ Ambil', title: 'Tambah Ambil Kristal' },
  { type: 'TOGGLE_SWITCH', shortLabel: '+ Saklar', title: 'Tambah Tekan Saklar' },
  { type: 'READ_LIST', shortLabel: '+ List', title: 'Tambah Baca List Rute' },
  { type: 'SET_VAR', shortLabel: '+ Set Var', title: 'Tambah Atur Variabel' },
  { type: 'CHANGE_VAR', shortLabel: '+ Ubah Var', title: 'Tambah Ubah Variabel' },
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
  isInsertTarget,
  isSimulating,
  onDelete,
  onDuplicate,
  onToggleInsertAfter,
  onMove,
  onAdjustRepeat,
  onAdjustVarValue,
  onCycleVarOperator,
  onToggleColor,
  onAddChild,
  onToggleElseBranch,
  activeExecutingBlockId,
  activeContainerId,
  activeContainerBranch,
  insertAfterId,
  onToggleTargetContainer,
}) => {
  const [showQuickThen, setShowQuickThen] = useState(false);
  const [showQuickElse, setShowQuickElse] = useState(false);

  const isLoop = block.type === 'REPEAT';
  const isWhileVar = block.type === 'WHILE_VAR';
  const isIfVar = block.type === 'IF_VAR';
  const isIfColor = block.type === 'IF_COLOR';
  const isIfObstacle = block.type === 'IF_OBSTACLE';
  const isConditional = isIfVar || isIfColor || isIfObstacle;
  const isContainer = isLoop || isWhileVar || isConditional;
  const isTargetedThen = isContainer && activeContainerId === block.id && activeContainerBranch === 'THEN';
  const isTargetedElse = isConditional && activeContainerId === block.id && activeContainerBranch === 'ELSE';
  const isTargeted = isTargetedThen || isTargetedElse;
  const hasElseBranch = isConditional && block.elseChildren !== undefined;

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
      data-block-id={block.id}
      className={`relative rounded-xl border px-2.5 py-2 transition-all shadow-sm ${bgStyle} ${
        isActive
          ? 'ring-4 ring-yellow-400 shadow-yellow-500/40 z-10'
          : isTargeted
          ? 'ring-2 ring-amber-300'
          : isInsertTarget
          ? 'ring-2 ring-cyan-300'
          : ''
      }`}
    >
      {/* Top Header of the Block */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-mono font-bold tabular-nums shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-bold truncate drop-shadow-sm">{label}</span>
          {isActive && (
            <span className="px-1.5 py-0.2 bg-yellow-400 text-slate-950 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
              Aktif
            </span>
          )}
        </div>

        {/* Action Controls: Parameters, Insert After, Duplicate, Move Up/Down, Delete */}
        <div className="flex items-center gap-0.5 shrink-0 flex-wrap">
          {isLoop && (
            <div className="flex items-center gap-0.5 bg-black/25 px-1 py-0.5 rounded-lg mr-0.5">
              <button
                onClick={() => onAdjustRepeat(block.id, -1)}
                disabled={isSimulating || (block.repeatCount || 3) <= 1}
                className="min-h-[30px] min-w-[30px] sm:min-h-0 sm:min-w-0 flex items-center justify-center hover:text-yellow-300 disabled:opacity-40 p-1 sm:p-0.5"
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
                className="min-h-[30px] min-w-[30px] sm:min-h-0 sm:min-w-0 flex items-center justify-center hover:text-yellow-300 disabled:opacity-40 p-1 sm:p-0.5"
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
              className="text-[11px] sm:text-[10px] font-bold px-2 py-1 bg-black/30 rounded-lg mr-0.5 hover:bg-black/50 transition-colors"
            >
              {block.conditionColor === 'BLUE' ? 'Ubin Biru' : 'Ubin Kuning'}
            </button>
          )}

          {isConditional && !hasElseBranch && (
            <button
              onClick={() => onToggleElseBranch(block.id, true)}
              disabled={isSimulating}
              className="text-[10px] font-bold px-2 py-1 bg-amber-300 text-slate-950 hover:bg-amber-200 rounded-lg mr-0.5 transition-colors"
              title="Tambahkan cabang Jika Tidak (Else)"
            >
              + Else
            </button>
          )}

          <button
            onClick={() => onToggleInsertAfter(block.id)}
            disabled={isSimulating}
            className={`min-h-[30px] min-w-[30px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1 rounded-lg transition-colors disabled:opacity-30 ${
              isInsertTarget
                ? 'bg-cyan-400 text-slate-950'
                : 'hover:bg-black/25'
            }`}
            title="Sisipkan balok baru tepat setelah baris ini"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDuplicate(block)}
            disabled={isSimulating}
            className="min-h-[30px] min-w-[30px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1 hover:bg-black/25 rounded-lg disabled:opacity-30"
            title="Duplikat balok ini"
          >
            <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
          </button>

          <button
            onClick={() => onMove(block.id, 'UP')}
            disabled={isSimulating || index === 0}
            className="min-h-[30px] min-w-[30px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1 hover:bg-black/25 rounded-lg disabled:opacity-30"
            title="Geser ke Atas"
          >
            <ChevronUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={() => onMove(block.id, 'DOWN')}
            disabled={isSimulating || index === total - 1}
            className="min-h-[30px] min-w-[30px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1 hover:bg-black/25 rounded-lg disabled:opacity-30"
            title="Geser ke Bawah"
          >
            <ChevronDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={() => onDelete(block.id)}
            disabled={isSimulating}
            className="min-h-[30px] min-w-[30px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-30"
            title="Hapus Balok"
          >
            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Nested Body for Containers (Repeat / While / If THEN branch) */}
      {isContainer && (
        <div className="mt-2 ml-2 space-y-1.5 bg-black/25 border border-white/20 p-2 rounded-lg">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-white/95">
              {isConditional ? 'JIKA Benar (Then):' : 'Di dalam loop:'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleTargetContainer(block.id, 'THEN')}
                disabled={isSimulating}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  isTargetedThen
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                {isTargetedThen ? '✓ Sedang Diisi dari Palet' : '+ Isi dari Palet'}
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowQuickThen((s) => !s);
                }}
                disabled={isSimulating}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/25 hover:bg-black/40 text-white/90"
                title="Tampilkan tombol tambah cepat di dalam blok ini"
              >
                {showQuickThen ? 'Tutup +Cepat' : '+ Cepat'}
              </button>
            </div>
          </div>

          {showQuickThen && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {availableChildActions.map((act) => (
                <button
                  key={act.type}
                  onClick={() => onAddChild(block.id, act.type, 'THEN')}
                  disabled={isSimulating}
                  className="px-2 py-1 bg-white/20 hover:bg-white/35 border border-white/25 active:scale-95 rounded text-[10px] font-bold transition-colors disabled:opacity-40"
                  title={act.title}
                >
                  {act.shortLabel}
                </button>
              ))}
            </div>
          )}

          {block.children && block.children.length > 0 ? (
            <div className="space-y-1.5">
              {block.children.map((child, cIdx) => (
                <React.Fragment key={child.id}>
                  <BlockCard
                    block={child}
                    index={cIdx}
                    total={block.children?.length || 0}
                    level={level}
                    depth={depth + 1}
                    isActive={child.id === activeExecutingBlockId}
                    isInsertTarget={child.id === insertAfterId}
                    isSimulating={isSimulating}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onToggleInsertAfter={onToggleInsertAfter}
                    onMove={onMove}
                    onAdjustRepeat={onAdjustRepeat}
                    onAdjustVarValue={onAdjustVarValue}
                    onCycleVarOperator={onCycleVarOperator}
                    onToggleColor={onToggleColor}
                    onAddChild={onAddChild}
                    onToggleElseBranch={onToggleElseBranch}
                    activeExecutingBlockId={activeExecutingBlockId}
                    activeContainerId={activeContainerId}
                    activeContainerBranch={activeContainerBranch}
                    insertAfterId={insertAfterId}
                    onToggleTargetContainer={onToggleTargetContainer}
                  />
                  {insertAfterId === child.id && (
                    <div className="flex items-center justify-between px-2.5 py-1 rounded border border-dashed border-cyan-400 bg-cyan-950/70 text-[10px] text-cyan-200">
                      <span>Sisipkan balok di sini (klik balok di palet)</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-amber-200 font-medium py-1 px-2 rounded bg-amber-500/15 border border-amber-400/30">
              {isConditional ? 'Cabang Jika kosong' : 'Loop masih kosong'} — klik <strong>+ Isi dari Palet</strong> lalu pilih perintah di palet.
            </div>
          )}
        </div>
      )}

      {/* Compact Nested ELSE Branch for Conditionals (If-Else) */}
      {hasElseBranch && (
        <div className="mt-2 ml-2 space-y-1.5 bg-slate-950/50 border border-amber-300/50 p-2 rounded-lg">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-200">JIKA TIDAK (Else):</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleTargetContainer(block.id, 'ELSE')}
                disabled={isSimulating}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                  isTargetedElse
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                {isTargetedElse ? '✓ Isi Else Aktif' : '+ Isi Else dari Palet'}
              </button>
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowQuickElse((s) => !s);
                }}
                disabled={isSimulating}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/30 hover:bg-black/50 text-amber-100"
              >
                {showQuickElse ? 'Tutup +Cepat' : '+ Cepat'}
              </button>
              <button
                onClick={() => onToggleElseBranch(block.id, false)}
                disabled={isSimulating}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/25 hover:bg-rose-500/45 text-rose-200 transition-colors"
                title="Hapus cabang Else"
              >
                Hapus Else
              </button>
            </div>
          </div>

          {showQuickElse && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {availableChildActions.map((act) => (
                <button
                  key={`else-${act.type}`}
                  onClick={() => onAddChild(block.id, act.type, 'ELSE')}
                  disabled={isSimulating}
                  className="px-2 py-1 bg-amber-400/20 hover:bg-amber-400/35 border border-amber-300/30 active:scale-95 rounded text-[10px] font-bold text-amber-100 transition-colors disabled:opacity-40"
                  title={`${act.title} ke cabang Else`}
                >
                  {act.shortLabel}
                </button>
              ))}
            </div>
          )}

          {block.elseChildren && block.elseChildren.length > 0 ? (
            <div className="space-y-1.5">
              {block.elseChildren.map((child, cIdx) => (
                <React.Fragment key={child.id}>
                  <BlockCard
                    block={child}
                    index={cIdx}
                    total={block.elseChildren?.length || 0}
                    level={level}
                    depth={depth + 1}
                    isActive={child.id === activeExecutingBlockId}
                    isInsertTarget={child.id === insertAfterId}
                    isSimulating={isSimulating}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onToggleInsertAfter={onToggleInsertAfter}
                    onMove={onMove}
                    onAdjustRepeat={onAdjustRepeat}
                    onAdjustVarValue={onAdjustVarValue}
                    onCycleVarOperator={onCycleVarOperator}
                    onToggleColor={onToggleColor}
                    onAddChild={onAddChild}
                    onToggleElseBranch={onToggleElseBranch}
                    activeExecutingBlockId={activeExecutingBlockId}
                    activeContainerId={activeContainerId}
                    activeContainerBranch={activeContainerBranch}
                    insertAfterId={insertAfterId}
                    onToggleTargetContainer={onToggleTargetContainer}
                  />
                  {insertAfterId === child.id && (
                    <div className="flex items-center justify-between px-2.5 py-1 rounded border border-dashed border-cyan-400 bg-cyan-950/70 text-[10px] text-cyan-200">
                      <span>Sisipkan balok di sini (klik balok di palet)</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-amber-200 font-medium py-1 px-2 rounded bg-amber-500/15 border border-amber-400/30">
              Cabang Else kosong — isi perintah alternatif saat kondisi bernilai Salah!
            </div>
          )}
        </div>
      )}
    </div>
  );
});
