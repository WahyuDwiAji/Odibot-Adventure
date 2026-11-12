export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export type TileType = 
  | 'EMPTY' 
  | 'PATH' 
  | 'ELEVATED' 
  | 'GOAL' 
  | 'SWITCH' 
  | 'HAZARD' 
  | 'COLOR_BLUE' 
  | 'COLOR_YELLOW';

export interface TileData {
  type: TileType;
  height: number; // 0 = base, 1 = elevated, 2 = high
  hasCrystal?: boolean;
  isSwitchActive?: boolean;
  isHazardActive?: boolean;
  switchTargetCoords?: { x: number; y: number }[]; // Coordinates affected by this switch
}

export type CommandType =
  | 'MOVE_FORWARD'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'JUMP'
  | 'COLLECT'
  | 'TOGGLE_SWITCH'
  | 'REPEAT'
  | 'WHILE_VAR'
  | 'SET_VAR'
  | 'CHANGE_VAR'
  | 'IF_VAR'
  | 'READ_LIST'
  | 'IF_COLOR'
  | 'IF_OBSTACLE'
  | 'CALL_F1'
  | 'CALL_F2';

export interface BlockCommand {
  id: string;
  type: CommandType;
  repeatCount?: number; // 2, 3, 4, 5, 6
  conditionColor?: 'BLUE' | 'YELLOW';
  conditionType?: 'IS_BLUE' | 'IS_YELLOW' | 'IS_OBSTACLE_AHEAD';
  varName?: string; // e.g. 'baterai', 'kunci', 'langkah'
  varValue?: number | string; // e.g. 5, 1
  varDelta?: number; // e.g. +1, -1
  varOperator?: '>' | '<' | '==' | '>='; // e.g. 'baterai > 0'
  listName?: string; // e.g. 'daftar_rute', 'kunci_pintu'
  children?: BlockCommand[]; // Nested inside repeat, while, if
}

export type DifficultyLevel = 'MUDAH' | 'SEDANG' | 'SULIT' | 'MASTER';
export type RobotSkinId = 'CYAN' | 'NEON_VOLT' | 'CYBER_PINK' | 'EMERALD' | 'GOLDEN';

export interface LevelDefinition {
  id: string;
  zoneId: string;
  zoneName: string;
  levelNumber: number;
  difficulty?: DifficultyLevel;
  title: string;
  subtitle: string;
  storyIntro: string;
  conceptTitle: string;
  conceptExplanation: string;
  realWorldCS?: string; // Real-world Computer Science application (e.g. NASA Mars Rover, Game Engines)
  hint: string;
  gridWidth: number;
  gridHeight: number;
  tiles: TileData[][];
  startPos: { x: number; y: number };
  startDir: Direction;
  maxBlocksFor3Stars: number;
  allowedCommands: CommandType[];
  allowF1?: boolean;
  allowF2?: boolean;
  initialVariables?: Record<string, number>;
  initialLists?: Record<string, string[]>;
  starterBlocks?: {
    main: BlockCommand[];
    f1?: BlockCommand[];
    f2?: BlockCommand[];
  };
  isDebuggingChallenge?: boolean;
  buggySolution?: {
    main: BlockCommand[];
    f1?: BlockCommand[];
    f2?: BlockCommand[];
  };
  debugExplanation?: string;
}

export interface ZoneDefinition {
  id: string;
  title: string;
  description: string;
  color: string;
  iconName: string;
  levelIds: string[];
}

export interface ExecutionStep {
  blockId: string;
  scope: 'MAIN' | 'F1' | 'F2';
  action: CommandType;
  robotState: {
    x: number;
    y: number;
    height: number;
    dir: Direction;
  };
  tileStateChanges?: {
    x: number;
    y: number;
    hasCrystal?: boolean;
    isSwitchActive?: boolean;
    isHazardActive?: boolean;
  }[];
  crystalsCollected: number;
  variablesSnapshot?: Record<string, number>;
  listsSnapshot?: Record<string, string[]>;
  status: 'SUCCESS' | 'BLOCKED' | 'FALLEN' | 'ZAPPED' | 'NOTHING_TO_COLLECT' | 'OUT_OF_ENERGY';
  message?: string;
  traceLog?: string; // Terminal execution line
}

export interface UserProgress {
  completedLevels: Record<string, { stars: number; bestBlockCount: number }>;
  currentLevelId: string;
  unlockedZones: string[];
  userProfile?: {
    email: string;
    displayName: string;
    avatarUrl?: string;
    lastSynced?: string;
  };
  customSkin?: RobotSkinId;
}
