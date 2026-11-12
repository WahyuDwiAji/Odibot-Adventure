import React, { useState } from 'react';
import { LevelDefinition } from '../types/game';
import { sounds } from '../utils/audio';
import { Star, ArrowRight, RotateCcw, ListFilter, Code2, Award, CheckCircle } from 'lucide-react';

interface VictoryModalProps {
  level: LevelDefinition;
  starsEarned: number;
  totalBlocksUsed: number;
  crystalsCollected: number;
  totalCrystals: number;
  pythonCode: string;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  starsEarned,
  totalBlocksUsed,
  crystalsCollected,
  totalCrystals,
  pythonCode,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
}) => {
  const [showPython, setShowPython] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 flex flex-col">
        {/* Glow backdrop behind stars */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Celebration Title */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold mb-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Misi Berhasil Dituntaskan!</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white">{level.title}</h2>
          <p className="text-xs text-slate-400">{level.subtitle}</p>
        </div>

        {/* 3-Star Badges */}
        <div className="flex items-center justify-center gap-4 my-3">
          {[1, 2, 3].map((starIdx) => {
            const hasStar = starIdx <= starsEarned;
            return (
              <div
                key={starIdx}
                className={`relative flex flex-col items-center p-2 rounded-xl border transition-all duration-300 ${
                  hasStar
                    ? 'bg-amber-950/40 border-amber-500/60 scale-105 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950/40 border-slate-800 opacity-40'
                }`}
              >
                <Star
                  className={`w-8 h-8 ${
                    hasStar ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-slate-600'
                  }`}
                  style={{ animationIterationCount: 1, animationDelay: `${starIdx * 150}ms` }}
                />
                <span className="text-[10px] font-medium text-slate-300 mt-1">
                  {starIdx === 1 ? 'Misi Selesai' : starIdx === 2 ? 'Semua Kristal' : 'Efisiensi Blok'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 my-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
          <div>
            <span className="text-slate-400">Kristal Terkumpul:</span>
            <div className="font-mono font-bold text-amber-400 text-sm">
              {crystalsCollected} / {totalCrystals}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Penggunaan Balok:</span>
            <div className="font-mono font-bold text-cyan-400 text-sm">
              {totalBlocksUsed} balok{' '}
              <span className="text-[11px] font-normal text-slate-500">
                (target ≤ {level.maxBlocksFor3Stars})
              </span>
            </div>
          </div>
        </div>

        {/* Educational Takeaway (Pedagogical Reflection) */}
        <div className="p-3.5 my-2 bg-gradient-to-r from-blue-950/40 to-slate-950/60 border border-blue-800/40 rounded-xl text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300 mb-1">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Konsep Koding: {level.conceptTitle}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {level.conceptExplanation}
          </p>
        </div>

        {/* Python Toggle */}
        <div className="my-1">
          <button
            onClick={() => {
              sounds.playClick();
              setShowPython(!showPython);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-1.5 text-amber-300 font-mono">
              <Code2 className="w-4 h-4" />
              Lihat Solusi dalam Bahasa Python
            </span>
            <span className="text-xs text-slate-500">{showPython ? 'Sembunyikan' : 'Buka'}</span>
          </button>

          {showPython && (
            <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 max-h-36 overflow-auto leading-relaxed select-text">
              {pythonCode}
            </pre>
          )}
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              sounds.playClick();
              onReplay();
            }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
            title="Mainkan Lagi"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenLevelSelect();
            }}
            className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <ListFilter className="w-4 h-4 text-cyan-400" />
            <span>Daftar Level</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onNextLevel();
            }}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Misi Berikutnya</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
