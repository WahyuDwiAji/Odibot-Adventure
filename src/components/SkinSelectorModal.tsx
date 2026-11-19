import React, { useState } from 'react';
import { RobotSkinId } from '../types/game';
import { ROBOT_SKINS, RobotSkinOption } from '../data/skins';
import { OdibotMascot } from './OdibotMascot';
import { sounds } from '../utils/audio';
import { X, Check, Lock, Sparkles } from 'lucide-react';

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
  const [previewId, setPreviewId] = useState<RobotSkinId>(currentSkin);
  const previewSkin = ROBOT_SKINS.find((s) => s.id === previewId) || ROBOT_SKINS[0];
  const isPreviewUnlocked = totalStars >= previewSkin.requiredStars;
  const isPreviewEquipped = currentSkin === previewSkin.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/92 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92dvh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold font-display text-white truncate">
              Bengkel Kostum & Bentuk Odibot
            </h2>
            <p className="text-xs text-slate-400 truncate">
              Setiap kostum mengubah bentuk tubuh, aksesori, dan warna robotmu · ⭐ {totalStars} Bintang
            </p>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            aria-label="Tutup bengkel kostum"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
          {/* Interactive Large Preview Spotlight */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <OdibotMascot
              size="lg"
              skinId={previewSkin.id}
              mood={isPreviewUnlocked ? 'happy' : 'idle'}
              animated={true}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="text-xs font-semibold text-cyan-400 mb-1">
                {previewSkin.shapeLabel} · {previewSkin.theme}
              </div>
              <h3 className="text-lg font-bold font-display text-white">
                {previewSkin.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1 mb-3">
                {previewSkin.description}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {isPreviewUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playRobotCheer();
                      onSelectSkin(previewSkin.id);
                    }}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                      isPreviewEquipped
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md'
                    }`}
                  >
                    {isPreviewEquipped ? (
                      <>
                        <Check className="w-4 h-4" /> Sedang Dipakai
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Pakai Bentuk Ini
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Kumpulkan {previewSkin.requiredStars} bintang untuk membuka bentuk ini
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full border border-white/25" style={{ backgroundColor: previewSkin.shellLightColor }} title="Kilau Cangkang" />
                  <div className="w-4 h-4 rounded-full border border-white/25" style={{ backgroundColor: previewSkin.primaryColor }} title="Warna Utama" />
                  <div className="w-4 h-4 rounded-full border border-white/25" style={{ backgroundColor: previewSkin.secondaryColor }} title="Warna Sekunder" />
                  <div className="w-4 h-4 rounded-full border border-white/25" style={{ backgroundColor: previewSkin.accentColor }} title="Aksen Cahaya" />
                </div>
              </div>
            </div>
          </div>

          {/* Costume Shape Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROBOT_SKINS.map((skin) => {
              const isUnlocked = totalStars >= skin.requiredStars;
              const isSelected = currentSkin === skin.id;
              const isPreviewed = previewSkin.id === skin.id;

              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => {
                    setPreviewId(skin.id);
                    if (isUnlocked) {
                      sounds.playRobotGreet();
                      onSelectSkin(skin.id);
                    } else {
                      sounds.playClick();
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex items-center gap-3.5 min-h-[104px] ${
                    isSelected
                      ? 'bg-slate-800/80 border-cyan-400 ring-2 ring-cyan-500/25 shadow-lg'
                      : isPreviewed
                      ? 'bg-slate-800/60 border-amber-400/60'
                      : isUnlocked
                      ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/60'
                      : 'bg-slate-950/60 border-slate-800/90 opacity-75 hover:opacity-100'
                  }`}
                >
                  <OdibotMascot
                    size="md"
                    skinId={skin.id}
                    mood={isSelected || isPreviewed ? 'happy' : 'idle'}
                    animated={isUnlocked || isPreviewed}
                    className="shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="font-bold text-sm text-white truncate">{skin.name}</h4>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : !isUnlocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : null}
                    </div>

                    <div className="text-[11px] font-semibold text-cyan-300 truncate">
                      {skin.shapeLabel}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>{isSelected ? 'Sedang Dipakai' : isUnlocked ? 'Siap Dipakai' : `Butuh ${skin.badge}`}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{skin.theme}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
