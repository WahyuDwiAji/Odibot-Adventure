import {
  BlockCommand,
  Direction,
  ExecutionStep,
  LevelDefinition,
  TileData,
} from '../types/game';

const DIRS: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

export function turnLeft(dir: Direction): Direction {
  const idx = DIRS.indexOf(dir);
  return DIRS[(idx + 3) % 4];
}

export function turnRight(dir: Direction): Direction {
  const idx = DIRS.indexOf(dir);
  return DIRS[(idx + 1) % 4];
}

export function getForwardCoord(x: number, y: number, dir: Direction): { x: number; y: number } {
  switch (dir) {
    case 'NORTH':
      return { x, y: y - 1 };
    case 'SOUTH':
      return { x, y: y + 1 };
    case 'EAST':
      return { x: x + 1, y };
    case 'WEST':
      return { x: x - 1, y };
  }
}

export interface SimulationResult {
  steps: ExecutionStep[];
  success: boolean;
  totalCrystalsCollected: number;
  totalCrystalsInLevel: number;
  failureReason?: string;
  reachedGoal: boolean;
}

export function runSimulation(
  level: LevelDefinition,
  mainBlocks: BlockCommand[],
  f1Blocks: BlockCommand[] = [],
  f2Blocks: BlockCommand[] = []
): SimulationResult {
  // Deep clone tiles
  const tiles: TileData[][] = level.tiles.map((row) =>
    row.map((t) => ({ ...t }))
  );

  let totalCrystalsInLevel = 0;
  tiles.forEach((row) => {
    row.forEach((t) => {
      if (t.hasCrystal) totalCrystalsInLevel += 1;
    });
  });

  let currentPos = { ...level.startPos };
  let currentDir = level.startDir;
  let currentHeight = tiles[currentPos.y]?.[currentPos.x]?.height ?? 0;
  let crystalsCollected = 0;

  // Variables and Lists environment
  const variables: Record<string, number> = { ...(level.initialVariables || {}) };
  const lists: Record<string, string[]> = { ...(level.initialLists || {}) };

  const steps: ExecutionStep[] = [];
  let executionCount = 0;
  const MAX_STEPS = 250;
  let failed = false;
  let failureReason = '';

  function isObstacleAhead(): boolean {
    const forward = getForwardCoord(currentPos.x, currentPos.y, currentDir);
    if (
      forward.x < 0 ||
      forward.x >= level.gridWidth ||
      forward.y < 0 ||
      forward.y >= level.gridHeight
    ) {
      return true; // Edge of station
    }
    const targetTile = tiles[forward.y]?.[forward.x];
    if (!targetTile || targetTile.type === 'EMPTY') {
      return true;
    }
    if (targetTile.height > currentHeight) {
      return true;
    }
    if (targetTile.type === 'HAZARD' && targetTile.isHazardActive) {
      return true;
    }
    return false;
  }

  function checkVarCondition(
    varName: string = 'baterai',
    op: string = '>',
    targetVal: number = 0
  ): boolean {
    const val = variables[varName] ?? 0;
    switch (op) {
      case '>':
        return val > targetVal;
      case '<':
        return val < targetVal;
      case '==':
        return val === targetVal;
      case '>=':
        return val >= targetVal;
      default:
        return val > targetVal;
    }
  }

  function executeBlockList(
    blocks: BlockCommand[],
    scope: 'MAIN' | 'F1' | 'F2',
    depth: number
  ) {
    if (failed || executionCount >= MAX_STEPS || depth > 12) return;

    for (const block of blocks) {
      if (failed || executionCount >= MAX_STEPS) return;

      switch (block.type) {
        case 'MOVE_FORWARD': {
          executionCount++;

          // Check battery if level has battery variable
          if (variables['baterai'] !== undefined) {
            if (variables['baterai'] <= 0) {
              steps.push({
                blockId: block.id,
                scope,
                action: 'MOVE_FORWARD',
                robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
                crystalsCollected,
                variablesSnapshot: { ...variables },
                listsSnapshot: { ...lists },
                status: 'OUT_OF_ENERGY',
                message: 'Baterai Kodi habis! Perhatikan penggunaan energi.',
              });
              failed = true;
              failureReason = 'Baterai robot habis sebelum sampai tujuan! Gunakan loop atau optimasi langkah.';
              return;
            }
            variables['baterai'] -= 1;
          }

          const fwd = getForwardCoord(currentPos.x, currentPos.y, currentDir);

          // Check out of bounds / empty abyss
          if (
            fwd.x < 0 ||
            fwd.x >= level.gridWidth ||
            fwd.y < 0 ||
            fwd.y >= level.gridHeight ||
            !tiles[fwd.y]?.[fwd.x] ||
            tiles[fwd.y][fwd.x].type === 'EMPTY'
          ) {
            steps.push({
              blockId: block.id,
              scope,
              action: 'MOVE_FORWARD',
              robotState: { x: fwd.x, y: fwd.y, height: currentHeight, dir: currentDir },
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'FALLEN',
              message: 'Kodi jatuh keluar dari platform stasiun luar angkasa!',
            });
            failed = true;
            failureReason = 'Kodi jatuh ke jurang ruang hampa! Periksa langkah atau arah belok.';
            return;
          }

          const targetTile = tiles[fwd.y][fwd.x];

          // Check height difference
          if (targetTile.height > currentHeight) {
            steps.push({
              blockId: block.id,
              scope,
              action: 'MOVE_FORWARD',
              robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'BLOCKED',
              message: 'Kodi menabrak tebing! Gunakan blok "Lompat" untuk mendaki.',
            });
            failed = true;
            failureReason = 'Kodi menabrak ubin yang lebih tinggi. Gunakan instruksi Lompat!';
            return;
          }

          if (targetTile.height < currentHeight) {
            steps.push({
              blockId: block.id,
              scope,
              action: 'MOVE_FORWARD',
              robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'BLOCKED',
              message: 'Ketinggian terlalu curam untuk melangkah! Gunakan "Lompat" untuk turun dengan aman.',
            });
            failed = true;
            failureReason = 'Kodi tidak bisa melangkah turun tanpa instruksi Lompat.';
            return;
          }

          // Check hazard
          if (targetTile.type === 'HAZARD' && targetTile.isHazardActive) {
            steps.push({
              blockId: block.id,
              scope,
              action: 'MOVE_FORWARD',
              robotState: { x: fwd.x, y: fwd.y, height: targetTile.height, dir: currentDir },
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'ZAPPED',
              message: 'Kodi terkena sengatan laser merah!',
            });
            failed = true;
            failureReason = 'Laser merah aktif menghalangi jalan! Injak saklar terlebih dahulu.';
            return;
          }

          currentPos = fwd;
          currentHeight = targetTile.height;

          steps.push({
            blockId: block.id,
            scope,
            action: 'MOVE_FORWARD',
            robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
            crystalsCollected,
            variablesSnapshot: { ...variables },
            listsSnapshot: { ...lists },
            status: 'SUCCESS',
            message: 'Maju satu langkah.',
          });
          break;
        }

        case 'TURN_LEFT': {
          executionCount++;
          currentDir = turnLeft(currentDir);
          steps.push({
            blockId: block.id,
            scope,
            action: 'TURN_LEFT',
            robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
            crystalsCollected,
            variablesSnapshot: { ...variables },
            listsSnapshot: { ...lists },
            status: 'SUCCESS',
            message: 'Putar kiri 90 derajat.',
          });
          break;
        }

        case 'TURN_RIGHT': {
          executionCount++;
          currentDir = turnRight(currentDir);
          steps.push({
            blockId: block.id,
            scope,
            action: 'TURN_RIGHT',
            robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
            crystalsCollected,
            variablesSnapshot: { ...variables },
            listsSnapshot: { ...lists },
            status: 'SUCCESS',
            message: 'Putar kanan 90 derajat.',
          });
          break;
        }

        case 'JUMP': {
          executionCount++;
          const fwd = getForwardCoord(currentPos.x, currentPos.y, currentDir);

          if (
            fwd.x < 0 ||
            fwd.x >= level.gridWidth ||
            fwd.y < 0 ||
            fwd.y >= level.gridHeight ||
            !tiles[fwd.y]?.[fwd.x] ||
            tiles[fwd.y][fwd.x].type === 'EMPTY'
          ) {
            steps.push({
              blockId: block.id,
              scope,
              action: 'JUMP',
              robotState: { x: fwd.x, y: fwd.y, height: currentHeight, dir: currentDir },
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'FALLEN',
              message: 'Kodi melompat keluar dari stasiun!',
            });
            failed = true;
            failureReason = 'Kodi melompat ke jurang hampa!';
            return;
          }

          const targetTile = tiles[fwd.y][fwd.x];
          if (targetTile.height > currentHeight + 1) {
            steps.push({
              blockId: block.id,
              scope,
              action: 'JUMP',
              robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'BLOCKED',
              message: 'Dinding terlalu tinggi untuk dilompati!',
            });
            failed = true;
            failureReason = 'Dinding terlalu tinggi (+2 tingkat). Lompatan hanya bisa menjangkau selisih 1 tingkat.';
            return;
          }

          currentPos = fwd;
          currentHeight = targetTile.height;

          steps.push({
            blockId: block.id,
            scope,
            action: 'JUMP',
            robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
            crystalsCollected,
            variablesSnapshot: { ...variables },
            listsSnapshot: { ...lists },
            status: 'SUCCESS',
            message: 'Melompat!',
          });
          break;
        }

        case 'COLLECT': {
          executionCount++;
          const tile = tiles[currentPos.y]?.[currentPos.x];
          if (tile && tile.hasCrystal) {
            tile.hasCrystal = false;
            crystalsCollected++;

            if (variables['kristal'] !== undefined) {
              variables['kristal'] += 1;
            }

            steps.push({
              blockId: block.id,
              scope,
              action: 'COLLECT',
              robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
              tileStateChanges: [
                { x: currentPos.x, y: currentPos.y, hasCrystal: false },
              ],
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'SUCCESS',
              message: 'Berhasil mengumpulkan 1 Kristal Biner!',
            });
          } else {
            steps.push({
              blockId: block.id,
              scope,
              action: 'COLLECT',
              robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'NOTHING_TO_COLLECT',
              message: 'Tidak ada kristal di ubin ini.',
            });
          }
          break;
        }

        case 'TOGGLE_SWITCH': {
          executionCount++;
          const tile = tiles[currentPos.y]?.[currentPos.x];
          if (tile && tile.type === 'SWITCH') {
            tile.isSwitchActive = !tile.isSwitchActive;
            const changes: {
              x: number;
              y: number;
              hasCrystal?: boolean;
              isSwitchActive?: boolean;
              isHazardActive?: boolean;
            }[] = [
              { x: currentPos.x, y: currentPos.y, isSwitchActive: tile.isSwitchActive },
            ];

            if (tile.switchTargetCoords) {
              tile.switchTargetCoords.forEach((coord) => {
                const targetT = tiles[coord.y]?.[coord.x];
                if (targetT && targetT.type === 'HAZARD') {
                  targetT.isHazardActive = !targetT.isHazardActive;
                  changes.push({
                    x: coord.x,
                    y: coord.y,
                    isHazardActive: targetT.isHazardActive,
                  });
                }
              });
            }

            steps.push({
              blockId: block.id,
              scope,
              action: 'TOGGLE_SWITCH',
              robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
              tileStateChanges: changes,
              crystalsCollected,
              variablesSnapshot: { ...variables },
              listsSnapshot: { ...lists },
              status: 'SUCCESS',
              message: 'Saklar ditekan! Gerbang laser dinonaktifkan.',
            });
          }
          break;
        }

        case 'SET_VAR': {
          executionCount++;
          const vName = block.varName || 'baterai';
          const vVal = typeof block.varValue === 'number' ? block.varValue : 5;
          variables[vName] = vVal;

          steps.push({
            blockId: block.id,
            scope,
            action: 'SET_VAR',
            robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
            crystalsCollected,
            variablesSnapshot: { ...variables },
            listsSnapshot: { ...lists },
            status: 'SUCCESS',
            message: `Set variabel ${vName} = ${vVal}`,
          });
          break;
        }

        case 'CHANGE_VAR': {
          executionCount++;
          const vName = block.varName || 'baterai';
          const delta = block.varDelta ?? -1;
          variables[vName] = (variables[vName] ?? 0) + delta;

          steps.push({
            blockId: block.id,
            scope,
            action: 'CHANGE_VAR',
            robotState: { x: currentPos.x, y: currentPos.y, height: currentHeight, dir: currentDir },
            crystalsCollected,
            variablesSnapshot: { ...variables },
            listsSnapshot: { ...lists },
            status: 'SUCCESS',
            message: `Ubah ${vName} menjadi ${variables[vName]}`,
          });
          break;
        }

        case 'REPEAT': {
          const count = block.repeatCount || 2;
          for (let i = 0; i < count; i++) {
            if (failed || executionCount >= MAX_STEPS) break;
            if (block.children) {
              executeBlockList(block.children, scope, depth + 1);
            }
          }
          break;
        }

        case 'WHILE_VAR': {
          const vName = block.varName || 'baterai';
          const op = block.varOperator || '>';
          const targetVal = typeof block.varValue === 'number' ? block.varValue : 0;

          let loopLimit = 20; // safety ceiling
          while (checkVarCondition(vName, op, targetVal) && loopLimit > 0) {
            if (failed || executionCount >= MAX_STEPS) break;
            if (block.children) {
              executeBlockList(block.children, scope, depth + 1);
            }
            loopLimit--;
          }
          break;
        }

        case 'IF_VAR': {
          const vName = block.varName || 'baterai';
          const op = block.varOperator || '>';
          const targetVal = typeof block.varValue === 'number' ? block.varValue : 0;

          if (checkVarCondition(vName, op, targetVal) && block.children) {
            executeBlockList(block.children, scope, depth + 1);
          }
          break;
        }

        case 'READ_LIST': {
          const lName = block.listName || 'daftar_rute';
          const items = lists[lName] || [];

          for (const item of items) {
            if (failed || executionCount >= MAX_STEPS) break;

            const normalizedItem = item.toUpperCase().trim();
            if (normalizedItem === 'MAJU') {
              executeBlockList([{ id: block.id + '-mv', type: 'MOVE_FORWARD' }], scope, depth + 1);
            } else if (normalizedItem === 'KIRI' || normalizedItem === 'PUTAR_KIRI') {
              executeBlockList([{ id: block.id + '-tl', type: 'TURN_LEFT' }], scope, depth + 1);
            } else if (normalizedItem === 'KANAN' || normalizedItem === 'PUTAR_KANAN') {
              executeBlockList([{ id: block.id + '-tr', type: 'TURN_RIGHT' }], scope, depth + 1);
            } else if (normalizedItem === 'LOMPAT') {
              executeBlockList([{ id: block.id + '-jp', type: 'JUMP' }], scope, depth + 1);
            } else if (normalizedItem === 'AMBIL') {
              executeBlockList([{ id: block.id + '-cl', type: 'COLLECT' }], scope, depth + 1);
            }
          }
          break;
        }

        case 'IF_COLOR': {
          const tile = tiles[currentPos.y]?.[currentPos.x];
          const targetColor = block.conditionColor || 'BLUE';
          const match =
            (targetColor === 'BLUE' && tile?.type === 'COLOR_BLUE') ||
            (targetColor === 'YELLOW' && tile?.type === 'COLOR_YELLOW');

          if (match && block.children) {
            executeBlockList(block.children, scope, depth + 1);
          }
          break;
        }

        case 'IF_OBSTACLE': {
          if (isObstacleAhead() && block.children) {
            executeBlockList(block.children, scope, depth + 1);
          }
          break;
        }

        case 'CALL_F1': {
          executeBlockList(f1Blocks, 'F1', depth + 1);
          break;
        }

        case 'CALL_F2': {
          executeBlockList(f2Blocks, 'F2', depth + 1);
          break;
        }
      }
    }
  }

  // Execute Main Program
  executeBlockList(mainBlocks, 'MAIN', 0);

  if (executionCount >= MAX_STEPS) {
    failed = true;
    failureReason = 'Batas langkah maksimum tercapai! Kemungkinan terdapat perulangan tanpa henti (infinite loop).';
  }

  const finalTile = tiles[currentPos.y]?.[currentPos.x];
  const reachedGoal = !failed && finalTile?.type === 'GOAL';
  const allCrystalsCollected = crystalsCollected >= totalCrystalsInLevel;

  const success = reachedGoal && allCrystalsCollected;

  if (!failed && !reachedGoal) {
    failureReason = 'Kodi belum sampai di ubin Terminal Emas Tujuan.';
  } else if (!failed && reachedGoal && !allCrystalsCollected) {
    failureReason = `Masih ada ${totalCrystalsInLevel - crystalsCollected} kristal yang belum terkumpul!`;
  }

  // Enrich steps with real computer trace log
  steps.forEach((step, idx) => {
    if (!step.traceLog) {
      const varInfo = step.variablesSnapshot
        ? Object.entries(step.variablesSnapshot)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')
        : '';
      step.traceLog = `#${idx + 1} [${step.scope}] ${step.action} -> Pos: (${step.robotState.x}, ${step.robotState.y}) [${step.robotState.dir}] ${varInfo ? `| ${varInfo}` : ''} | Status: ${step.status}`;
    }
  });

  return {
    steps,
    success,
    totalCrystalsCollected: crystalsCollected,
    totalCrystalsInLevel,
    failureReason,
    reachedGoal,
  };
}
