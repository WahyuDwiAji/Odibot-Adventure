import React from 'react';
import { RobotSkinId } from '../types/game';
import { sounds } from '../utils/audio';
import { X, Check, Lock, Palette } from 'lucide-react';

interface SkinSelectorModalProps {
  currentSkin: RobotSkinId;
  totalStars: number;
  onSelectSkin: (skinId: RobotSkinId) => void;
  onClose: () => void;
}

export interface RobotSkinOption {
  id: RobotSkinId;
  name: string;
  theme: string;
  description: string;
  primaryColor: string;
  glowColor: string;
  requiredStars: number;
  visorColor: string;
  badge: string;
}

export const ROBOT_SKINS: RobotSkinOption[] = [
  {
    id: 'CYAN',
    name: 'Odibot Klasik Aurora',
    theme: 'Sian & Biru Antariksa',
    description: 'Chassis titanium standar stasiun Aurora dengan visor cyan terpolarisasi.',
    primaryColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    visorColor: '#22D3EE',
    requiredStars: 0,
    badge: 'Bawaan',
  },
  {
    id: 'NEON_VOLT',
    name: 'Volt Energizer',
    theme: 'Kuning Listrik Neon',
    description: 'Dilengkapi kapasitor tegangan tinggi untuk algoritma kecepatan penuh.',
    primaryColor: '#EAB308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    visorColor: '#FDE047',
    requiredStars: 5,
    badge: '5 ⭐ Bintang',
  },
  {
    id: 'CYBER_PINK',
    name: 'Cyberpunk Synthwave',
    theme: 'Magenta & Violet Neon',
    description: 'Edisi arcade neon cyberpunk dengan emisi gelombang cahaya futuristik.',
    primaryColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    visorColor: '#F472B6',
    requiredStars: 15,
    badge: '15 ⭐ Bintang',
  },
  {
    id: 'EMERALD',
    name: 'Bio-Scout Zamrud',
    theme: 'Hijau Zamrud Alam',
    description: 'Pelindung serat karbon hijau dirancang untuk ekspedisi biosfer asing.',
    primaryColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    visorColor: '#34D399',
    requiredStars: 25,
    badge: '25 ⭐ Bintang',
  },
  {
    id: 'GOLDEN',
    name: 'Master Insinyur Emas',
    theme: 'Emas Berkilau & Obsidian',
    description: 'Gelar tertinggi olimpiade koding, dilapisi emas murni 24 karat tahan laser.',
    primaryColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    visorColor: '#FBBF24',
    requiredStars: 40,
    badge: '40 ⭐ Bintang',
  },
];

export const SkinSelectorModal: React.FC<SkinSelectorModalProps> = ({
  currentSkin,
  totalStars,
  onSelectSkin,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">Bengkel Kostum Robot Odibot</h2>
              <p className="text-xs text-slate-400">Pilih warna dan gaya visual robot kodingmu</p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Stars Badge */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Koleksi Bintangmu Saat Ini:</span>
          <span className="font-bold text-amber-400 font-mono flex items-center gap-1">
            ⭐ {totalStars} Bintang Dikumpulkan
          </span>
        </div>

        {/* Skins Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto max-h-[60vh]">
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
