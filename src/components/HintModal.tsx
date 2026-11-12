import React from 'react';
import { LevelDefinition } from '../types/game';
import { sounds } from '../utils/audio';
import { Lightbulb, X, HelpCircle, CheckCircle2 } from 'lucide-react';
import { OdibotMascot } from './OdibotMascot';

interface HintModalProps {
  level: LevelDefinition;
  onClose: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({ level, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <Lightbulb className="w-5 h-5 fill-amber-400/20" />
            <h3 className="text-base font-bold font-display text-white">Petunjuk Misi dari Kodi</h3>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mascot Speech Bubble */}
        <div className="flex items-start gap-3 my-4">
          <OdibotMascot size="sm" className="shrink-0" />
          <div className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl rounded-tl-none text-xs text-slate-300 leading-relaxed shadow-sm">
            <p className="font-semibold text-cyan-300 mb-1">Hai Kapten! Ini tips untuk menyelesaikan misi ini:</p>
            <p>{level.hint}</p>
          </div>
        </div>

        {/* Pedagogical Principle */}
        <div className="p-3 bg-blue-950/40 border border-blue-900/50 rounded-xl text-xs space-y-1">
          <div className="font-bold text-blue-300 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>Konsep: {level.conceptTitle}</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">{level.conceptExplanation}</p>
        </div>

        {/* Debug Challenge specific explanation */}
        {level.isDebuggingChallenge && level.debugExplanation && (
          <div className="mt-2.5 p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs space-y-1">
            <div className="font-bold text-rose-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Petunjuk Kutu / Bug:</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{level.debugExplanation}</p>
          </div>
        )}

        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="mt-4 w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
        >
          Siap, Saya Paham!
        </button>
      </div>
    </div>
  );
};
