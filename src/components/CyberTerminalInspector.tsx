import React, { useState } from 'react';
import { ExecutionStep, LevelDefinition } from '../types/game';
import { sounds } from '../utils/audio';
import {
  Terminal,
  Cpu,
  Table,
  Radio,
  Minimize2,
  Maximize2,
  Battery,
  Sparkles,
  Compass,
} from 'lucide-react';

interface CyberTerminalInspectorProps {
  level: LevelDefinition;
  robotState: { x: number; y: number; height: number; dir: string };
  variables: Record<string, number>;
  lists: Record<string, string[]>;
  crystalsCollected: number;
  totalCrystals: number;
  activeAction?: string;
  isSimulating: boolean;
  historySteps: ExecutionStep[];
}

export const CyberTerminalInspector: React.FC<CyberTerminalInspectorProps> = ({
  level,
  robotState,
  variables,
  lists,
  crystalsCollected,
  totalCrystals,
  activeAction,
  isSimulating,
  historySteps,
}) => {
  const [activeTab, setActiveTab] = useState<'MEMORY' | 'TRACE' | 'TERMINAL'>('MEMORY');
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Calculate battery percentage relative to level's initial battery capacity
  const batteryVal = variables['baterai'] !== undefined ? variables['baterai'] : null;
  const maxBattery = Math.max(1, level.initialVariables?.baterai ?? 8);
  const batteryPct = batteryVal !== null ? Math.min(100, Math.max(0, (batteryVal / maxBattery) * 100)) : 0;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
      {/* Top Header of Inspector */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-900/90 border-b border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono font-bold text-cyan-400 tracking-wide truncate text-[11px] sm:text-xs">
            <span className="sm:hidden">INSPEKTOR RAM</span>
            <span className="hidden sm:inline">INSPEKTOR MEMORI &amp; TRACE</span>
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Tabs */}
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('MEMORY');
              setIsCollapsed(false);
            }}
            className={`px-2 py-1 min-h-[30px] rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'MEMORY' && !isCollapsed
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span className="hidden sm:inline">Memori RAM</span>
            <span className="sm:hidden">RAM</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('TRACE');
              setIsCollapsed(false);
            }}
            className={`px-2 py-1 min-h-[30px] rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'TRACE' && !isCollapsed
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3 h-3" />
            <span className="hidden sm:inline">Tabel Trace</span>
            <span className="sm:hidden">Trace</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('TERMINAL');
              setIsCollapsed(false);
            }}
            className={`px-2 py-1 min-h-[30px] rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'TERMINAL' && !isCollapsed
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span className="hidden sm:inline">Log Konsol</span>
            <span className="sm:hidden">Log</span>
          </button>

          {/* Minimize / Maximize */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsCollapsed(!isCollapsed);
            }}
            className="min-h-[30px] min-w-[30px] flex items-center justify-center hover:text-white text-slate-400 transition-colors ml-0.5"
            title={isCollapsed ? 'Perluas Inspektor' : 'Kecilkan Inspektor'}
          >
            {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body when expanded */}
      {!isCollapsed && (
        <div className="p-3 max-h-44 overflow-y-auto font-mono text-xs text-slate-300">
          {/* TAB 1: RAM & HARDWARE REGISTERS */}
          {activeTab === 'MEMORY' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Register 1: Baterai & Energi */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reg. Baterai:</span>
                  </span>
                  <span className="text-cyan-300 font-bold">
                    {batteryVal !== null ? `${batteryVal} / ${maxBattery}` : 'N/A'}
                  </span>
                </div>
                {batteryVal !== null ? (
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        batteryPct > 40 ? 'bg-cyan-400' : batteryPct > 20 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${batteryVal > 0 ? Math.max(5, batteryPct) : 0}%` }}
                    />
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 italic">Level tanpa batas baterai</div>
                )}
                <div className="text-[10px] text-slate-500 mt-1">Variabel Alokasi RAM</div>
              </div>

              {/* Register 2: Akumulator Kristal & Skor */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Akumulator:</span>
                  </span>
                  <span className="text-amber-300 font-bold">
                    {crystalsCollected} / {totalCrystals}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {Object.entries(variables)
                    .filter(([k]) => k !== 'baterai')
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ') || 'kristal = ' + crystalsCollected}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Register Pencacah (Counter)</div>
              </div>

              {/* Register 3: Program Counter & Arah Mata Angin */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Posisi Lidar:</span>
                  </span>
                  <span className="text-emerald-300 font-bold">
                    ({robotState.x}, {robotState.y})
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Arah: <strong className="text-white">{robotState.dir}</strong> · Elevasi: {robotState.height}m
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Koordinat Pointer Robot</div>
              </div>

              {/* List Data Structures if present */}
              {Object.keys(lists).length > 0 && (
                <div className="sm:col-span-3 p-2.5 bg-blue-950/30 border border-blue-900/40 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-bold">Struktur Data List:</span>
                    {Object.entries(lists).map(([k, items]) => (
                      <span key={k} className="text-white bg-blue-900/40 px-2 py-0.5 rounded border border-blue-700/50">
                        {k} = [{items.map((it) => `"${it}"`).join(', ')}]
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-blue-300 font-sans hidden sm:inline">
                    Struktur antrean berurutan (Index: 0 s/d {Object.values(lists)[0]?.length - 1})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRACE TABLE (Tabel Penelusuran Langkah demi Langkah) */}
          {activeTab === 'TRACE' && (
            <div className="overflow-x-auto">
              {historySteps.length === 0 ? (
                <div className="text-center py-4 text-slate-500 italic">
                  Klik &ldquo;Jalankan Program&rdquo; atau &ldquo;Langkah Demi Langkah&rdquo; untuk merekam tabel penelusuran variabel.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                      <th className="py-1 px-2">#</th>
                      <th className="py-1 px-2">Instruksi</th>
                      <th className="py-1 px-2">Posisi (X,Y)</th>
                      <th className="py-1 px-2">Baterai</th>
                      <th className="py-1 px-2">Kristal</th>
                      <th className="py-1 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historySteps.slice(-8).map((st, i) => {
                      const stepNumber = Math.max(0, historySteps.length - 8) + i + 1;
                      return (
                      <tr
                        key={stepNumber}
                        className={`border-b border-slate-900 hover:bg-slate-900/40 ${
                          st.status !== 'SUCCESS' ? 'text-rose-400 bg-rose-950/20' : 'text-slate-300'
                        }`}
                      >
                        <td className="py-1 px-2 font-mono text-slate-500">{stepNumber}</td>
                        <td className="py-1 px-2 font-bold text-white">{st.action}</td>
                        <td className="py-1 px-2 font-mono text-cyan-300">
                          ({st.robotState.x}, {st.robotState.y}) {st.robotState.dir}
                        </td>
                        <td className="py-1 px-2 font-mono text-amber-300">
                          {st.variablesSnapshot?.['baterai'] ?? '-'}
                        </td>
                        <td className="py-1 px-2 font-mono text-emerald-300">
                          {st.crystalsCollected}
                        </td>
                        <td className="py-1 px-2">
                          {st.status === 'SUCCESS' ? (
                            <span className="text-emerald-400">OK</span>
                          ) : (
                            <span className="text-rose-400 font-bold">{st.status}</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM CONSOLE LOGS */}
          {activeTab === 'TERMINAL' && (
            <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-900 font-mono text-[11px] leading-relaxed">
              <div className="text-emerald-400">
                [KODIBOT-OS v4.2] Inisialisasi Misi: {level.title}...
              </div>
              <div className="text-cyan-400">
                [MEMORY] Alokasi Register: {JSON.stringify(variables)}
              </div>
              {historySteps.length > 0 ? (
                historySteps.slice(-6).map((st, idx) => (
                  <div
                    key={idx}
                    className={st.status === 'SUCCESS' ? 'text-slate-300' : 'text-rose-400 font-bold'}
                  >
                    {st.traceLog || `> [${st.scope}] ${st.action} -> Status: ${st.status}`}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">
                  &gt; Menunggu eksekusi instruksi program...
                </div>
              )}
              {isSimulating && (
                <div className="text-amber-300 animate-pulse">
                  &gt; [CPU] Eksekusi instruksi: {activeAction || 'RUNNING'}...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
