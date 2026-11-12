import React, { useState } from 'react';
import mascotJpg from '../assets/images/kodibot_mascot_hero_1794195289256.jpg';

interface OdibotMascotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  alt?: string;
}

export const OdibotMascot: React.FC<OdibotMascotProps> = ({
  className = '',
  size = 'md',
  showBadge = false,
  alt = 'Odibot Mascot Robot',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32 sm:w-36 sm:h-36',
    xl: 'w-44 h-44 sm:w-52 sm:h-52',
  }[size];

  return (
    <div className={`relative inline-block select-none ${className}`}>
      {/* Glow Aura */}
      <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-amber-400 opacity-60 blur-md pointer-events-none animate-pulse" />

      {/* Main Mascot Container */}
      <div
        className={`relative ${sizeClasses} rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-xl bg-gradient-to-b from-slate-850 to-slate-950 flex items-center justify-center`}
      >
        {!imageFailed ? (
          <img
            src={mascotJpg}
            alt={alt}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
            loading="eager"
          />
        ) : (
          /* SVG Vector Fallback Odibot Mascot */
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full p-2 text-cyan-400 drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background radial highlight */}
            <circle cx="60" cy="60" r="50" fill="url(#bgGlow)" opacity="0.4" />

            <defs>
              <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#0F172A" />
              </radialGradient>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
              <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#082F49" />
                <stop offset="100%" stopColor="#0369A1" />
              </linearGradient>
            </defs>

            {/* Antenna Pole & Glowing Bulb */}
            <line x1="60" y1="26" x2="60" y2="14" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="12" r="5" fill="#38BDF8" />
            <circle cx="60" cy="12" r="7" stroke="#FDE047" strokeWidth="1.5" opacity="0.8" className="animate-ping" />

            {/* Robot Ears / Headphone Bolts */}
            <rect x="22" y="44" width="6" height="16" rx="3" fill="#64748B" />
            <rect x="92" y="44" width="6" height="16" rx="3" fill="#64748B" />

            {/* Robot Head Outer Box */}
            <rect
              x="26"
              y="26"
              width="68"
              height="54"
              rx="16"
              fill="url(#bodyGrad)"
              stroke="#67E8F9"
              strokeWidth="2.5"
            />

            {/* Digital Visor */}
            <rect x="34" y="36" width="52" height="34" rx="10" fill="url(#visorGrad)" stroke="#38BDF8" strokeWidth="1.5" />

            {/* Expressive Friendly Cyan Eyes */}
            <rect x="42" y="46" width="12" height="14" rx="5" fill="#22D3EE" />
            <circle cx="45" cy="49" r="2" fill="#FFFFFF" />

            <rect x="66" y="46" width="12" height="14" rx="5" fill="#22D3EE" />
            <circle cx="69" cy="49" r="2" fill="#FFFFFF" />

            {/* Rosy Blush cheeks */}
            <circle cx="39" cy="62" r="2.5" fill="#F43F5E" opacity="0.7" />
            <circle cx="81" cy="62" r="2.5" fill="#F43F5E" opacity="0.7" />

            {/* Smile / Mouth */}
            <path
              d="M 54 62 Q 60 66 66 62"
              stroke="#FDE047"
              strokeWidth="2"
              strokeLinecap="round"
              fill="transparent"
            />

            {/* Robot Body Shoulders */}
            <path
              d="M 38 84 L 82 84 L 92 108 L 28 108 Z"
              fill="#1E293B"
              stroke="#38BDF8"
              strokeWidth="2"
            />

            {/* Chest Energy Core */}
            <circle cx="60" cy="95" r="5" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
          </svg>
        )}
      </div>

      {showBadge && (
        <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-slate-950 border border-cyan-400 text-[10px] font-black text-cyan-300 shadow-md">
          Odibot
        </div>
      )}
    </div>
  );
};
