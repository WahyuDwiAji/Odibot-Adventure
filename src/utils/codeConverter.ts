import { BlockCommand } from '../types/game';

/**
 * Converts visual block structures to formatted Python code for Indonesian SD Kelas 6 students
 */
export function blocksToPython(
  mainBlocks: BlockCommand[],
  f1Blocks?: BlockCommand[],
  f2Blocks?: BlockCommand[],
  initialVars?: Record<string, number>,
  initialLists?: Record<string, string[]>
): string {
  const lines: string[] = [
    '# Program Misi Koding Robot Kodi (Python 3)',
    '# Kurikulum Informatika SD Kelas 6 - Fase C',
    '',
  ];

  // Global variables & lists initialization
  if (initialVars && Object.keys(initialVars).length > 0) {
    lines.push('# === Inisialisasi Variabel ===');
    for (const [key, val] of Object.entries(initialVars)) {
      lines.push(`${key} = ${val}`);
    }
    lines.push('');
  }

  if (initialLists && Object.keys(initialLists).length > 0) {
    lines.push('# === Inisialisasi Struktur Data (Daftar / List) ===');
    for (const [key, list] of Object.entries(initialLists)) {
      lines.push(`${key} = [${list.map((item) => `"${item}"`).join(', ')}]`);
    }
    lines.push('');
  }

  function indent(level: number): string {
    return '    '.repeat(level);
  }

  function serializeBlock(block: BlockCommand, depth: number): string[] {
    const res: string[] = [];
    const ind = indent(depth);

    switch (block.type) {
      case 'MOVE_FORWARD':
        res.push(`${ind}robot.maju()`);
        break;
      case 'TURN_LEFT':
        res.push(`${ind}robot.putar_kiri()`);
        break;
      case 'TURN_RIGHT':
        res.push(`${ind}robot.putar_kanan()`);
        break;
      case 'JUMP':
        res.push(`${ind}robot.lompat()`);
        break;
      case 'COLLECT':
        res.push(`${ind}robot.ambil_kristal()`);
        break;
      case 'TOGGLE_SWITCH':
        res.push(`${ind}robot.tekan_saklar()`);
        break;
      case 'CALL_F1':
        res.push(`${ind}fungsi_f1()`);
        break;
      case 'CALL_F2':
        res.push(`${ind}fungsi_f2()`);
        break;
      case 'SET_VAR': {
        const vName = block.varName || 'baterai';
        const vVal = block.varValue ?? 5;
        res.push(`${ind}${vName} = ${vVal}`);
        break;
      }
      case 'CHANGE_VAR': {
        const vName = block.varName || 'baterai';
        const delta = block.varDelta ?? -1;
        if (delta >= 0) {
          res.push(`${ind}${vName} += ${delta}`);
        } else {
          res.push(`${ind}${vName} -= ${Math.abs(delta)}`);
        }
        break;
      }
      case 'WHILE_VAR': {
        const vName = block.varName || 'baterai';
        const op = block.varOperator || '>';
        const vVal = block.varValue ?? 0;
        res.push(`${ind}while ${vName} ${op} ${vVal}:`);
        if (block.children && block.children.length > 0) {
          block.children.forEach((child) => {
            res.push(...serializeBlock(child, depth + 1));
          });
        } else {
          res.push(`${indent(depth + 1)}pass`);
        }
        break;
      }
      case 'IF_VAR': {
        const vName = block.varName || 'baterai';
        const op = block.varOperator || '>';
        const vVal = block.varValue ?? 0;
        res.push(`${ind}if ${vName} ${op} ${vVal}:`);
        if (block.children && block.children.length > 0) {
          block.children.forEach((child) => {
            res.push(...serializeBlock(child, depth + 1));
          });
        } else {
          res.push(`${indent(depth + 1)}pass`);
        }
        break;
      }
      case 'READ_LIST': {
        const lName = block.listName || 'daftar_rute';
        res.push(`${ind}for perintah in ${lName}:`);
        res.push(`${indent(depth + 1)}robot.lakukan(perintah)`);
        break;
      }
      case 'REPEAT': {
        const count = block.repeatCount || 2;
        res.push(`${ind}for langkah in range(${count}):`);
        if (block.children && block.children.length > 0) {
          block.children.forEach((child) => {
            res.push(...serializeBlock(child, depth + 1));
          });
        } else {
          res.push(`${indent(depth + 1)}pass`);
        }
        break;
      }
      case 'IF_COLOR': {
        const color = block.conditionColor || 'BLUE';
        const colorName = color === 'BLUE' ? '"BIRU"' : '"KUNING"';
        res.push(`${ind}if robot.sensor_ubin() == ${colorName}:`);
        if (block.children && block.children.length > 0) {
          block.children.forEach((child) => {
            res.push(...serializeBlock(child, depth + 1));
          });
        } else {
          res.push(`${indent(depth + 1)}pass`);
        }
        break;
      }
      case 'IF_OBSTACLE': {
        res.push(`${ind}if robot.sensor_depan_terhalang():`);
        if (block.children && block.children.length > 0) {
          block.children.forEach((child) => {
            res.push(...serializeBlock(child, depth + 1));
          });
        } else {
          res.push(`${indent(depth + 1)}pass`);
        }
        break;
      }
    }
    return res;
  }

  // F1 Function if present
  if (f1Blocks && f1Blocks.length > 0) {
    lines.push('def fungsi_f1():');
    f1Blocks.forEach((b) => {
      lines.push(...serializeBlock(b, 1));
    });
    lines.push('');
  }

  // F2 Function if present
  if (f2Blocks && f2Blocks.length > 0) {
    lines.push('def fungsi_f2():');
    f2Blocks.forEach((b) => {
      lines.push(...serializeBlock(b, 1));
    });
    lines.push('');
  }

  // Main Program
  lines.push('def main():');
  if (mainBlocks.length === 0) {
    lines.push('    # Tambahkan balok koding di panel kanan untuk menjalankan Kodi!');
    lines.push('    pass');
  } else {
    mainBlocks.forEach((b) => {
      lines.push(...serializeBlock(b, 1));
    });
  }

  lines.push('');
  lines.push('# Mulai eksekusi');
  lines.push('if __name__ == "__main__":');
  lines.push('    main()');

  return lines.join('\n');
}

/**
 * Counts total command blocks including nested children
 */
export function countTotalBlocks(
  mainBlocks: BlockCommand[],
  f1Blocks?: BlockCommand[],
  f2Blocks?: BlockCommand[]
): number {
  function countList(list: BlockCommand[]): number {
    let count = 0;
    for (const item of list) {
      count += 1;
      if (item.children) {
        count += countList(item.children);
      }
    }
    return count;
  }

  return (
    countList(mainBlocks) +
    (f1Blocks ? countList(f1Blocks) : 0) +
    (f2Blocks ? countList(f2Blocks) : 0)
  );
}
