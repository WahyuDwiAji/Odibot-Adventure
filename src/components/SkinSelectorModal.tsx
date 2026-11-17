import React from 'react';
import { RobotSkinId } from '../types/game';
import { ROBOT_SKINS, RobotSkinOption } from '../data/skins';
import { sounds } from '../utils/audio';
import { X, Check, Lock, Palette } from 'lucide-react';

export { ROBOT_SKINS };
export type { RobotSkinOption };

interface SkinSelectorModalProps {
  currentSkin: RobotSkinId;
  totalStars: number;
  onSelectSkin: (skinId: RobotSkinId) => void;
  onClose: () => void;
}

export const SkinSelectorModal: React.FC<SkinSelectorModalProps> = ({
  currentSkin,
  totalStars,
  onSelectSkin,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92dvh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-md shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold font-display text-white truncate">Bengkel Kostum Odibot</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Pilih warna dan gaya visual robotmu</p>
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

        {/* Current Stars Badge */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400">Koleksi Bintangmu:</span>
          <span className="font-bold text-amber-400 font-mono flex items-center gap-1">
            ⭐ {totalStars} Bintang
          </span>
        </div>

        {/* Skins Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 overflow-y-auto flex-1">
          {ROBOT_SKINS.map((skin) => {
            const isUnlocked = totalStars >= skin.requiredStars;
            const isSelected = currentSkin === skin.id;

            return (
              <button
                key={skin.id}
                disabled={!isUnlocked}
                onClick={() => {
                  sounds.playCollect();
                  onSelectSkin(skin.id);
                }}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-850 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg'
                    : isUnlocked
                    ? 'bg-slate-900/90 border-slate-700 hover:border-slate-500 hover:bg-slate-850'
                    : 'bg-slate-950/50 border-slate-850 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Visual Preview Orb */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-xs"
                      style={{
                        backgroundColor: skin.primaryColor,
                        boxShadow: `0 0 16px ${skin.glowColor}`,
                      }}
                    >
                      🤖
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{skin.name}</h3>
                      <span className="text-[11px] text-slate-400 block">{skin.theme}</span>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Dipakai
                    </span>
                  ) : !isUnlocked ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {skin.badge}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                      Terbuka
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {skin.description}
                </p>

                {/* Color sample bar */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500">Palet:</span>
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: skin.primaryColor }} />
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: skin.visorColor }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
