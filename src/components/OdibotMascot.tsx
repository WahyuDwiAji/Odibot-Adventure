import React, { useId } from 'react';
import { RobotSkinId } from '../types/game';
import { ROBOT_SKINS } from '../data/skins';

export type OdibotMood = 'idle' | 'happy' | 'thinking' | 'moving' | 'jumping' | 'processing';

interface OdibotMascotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showBadge?: boolean;
  alt?: string;
  skinId?: RobotSkinId;
  mood?: OdibotMood;
  animated?: boolean;
}

export const OdibotMascot: React.FC<OdibotMascotProps> = React.memo(({
  className = '',
  size = 'md',
  showBadge = false,
  alt = 'Odibot Mascot Robot',
  skinId = 'CYAN',
  mood = 'idle',
  animated: animatedProp,
}) => {
  const uid = useId().replace(/:/g, '');
  const skin = ROBOT_SKINS.find((s) => s.id === skinId) || ROBOT_SKINS[0];
  const shape = skin.shape;

  const sizeClasses = {
    sm: 'w-11 h-11',
    md: 'w-20 h-20',
    lg: 'w-32 h-32 sm:w-36 sm:h-36',
    xl: 'w-44 h-44 sm:w-52 sm:h-52',
    hero: 'w-28 h-28 sm:w-36 sm:h-36',
  }[size];

  const isCompact = size === 'sm';
  const animated = animatedProp ?? !isCompact;
  const isHappy = mood === 'happy';
  const isThinking = mood === 'thinking';
  const isJumping = mood === 'jumping';
  const isProcessing = mood === 'processing' || mood === 'moving' || mood === 'thinking';

  const eyeColor = isThinking ? '#E879F9' : isHappy ? '#FDE047' : skin.visorColor;
  const blushColor = shape === 'HOLODRONE_JET' ? '#F472B6' : '#FB7185';

  return (
    <div
      className={`relative inline-block select-none transform-gpu [contain:layout_style_paint] ${className}`}
      role="img"
      aria-label={alt}
    >
      <div
        className={`relative ${sizeClasses} rounded-2xl overflow-hidden border-2 bg-slate-950 flex items-center justify-center`}
        style={{
          borderColor: isProcessing ? skin.accentColor : skin.visorColor,
          boxShadow: isCompact
            ? `0 0 10px ${skin.glowColor}`
            : `0 0 22px ${skin.glowColor}`,
        }}
      >
        <svg
          viewBox="0 0 140 140"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id={`halo-${uid}`} cx="50%" cy="48%" r="54%">
              <stop offset="0%" stopColor={skin.primaryColor} stopOpacity="0.35" />
              <stop offset="55%" stopColor={skin.secondaryColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`chassis-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor={skin.shellLightColor} />
              <stop offset="55%" stopColor={skin.primaryColor} />
              <stop offset="100%" stopColor={skin.secondaryColor} />
            </linearGradient>
            <linearGradient id={`torso-${uid}`} x1="20%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor={skin.shellLightColor} />
              <stop offset="52%" stopColor={skin.primaryColor} />
              <stop offset="100%" stopColor={skin.secondaryColor} />
            </linearGradient>
            <linearGradient id={`visor-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B1222" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <linearGradient id={`flame-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor={skin.thrusterColor} />
              <stop offset="100%" stopColor={skin.visorColor} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`techmetal-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <pattern id={`eye-scan-${uid}`} width="4" height="2.4" patternUnits="userSpaceOnUse">
              <rect width="4" height="1.3" fill="#FFFFFF" fillOpacity="0.85" />
              <rect y="1.3" width="4" height="1.1" fill="#FFFFFF" fillOpacity="0.18" />
            </pattern>
            <clipPath id={`visor-clip-${uid}`}>
              <path d="M38 56 C38 41, 50 38, 70 38 C90 38, 102 41, 102 56 C102 68, 90 73, 70 73 C50 73, 38 68, 38 56 Z" />
            </clipPath>
          </defs>

          {/* Cosmic Ambient Backdrop & Subtle Grid Dots */}
          <rect width="140" height="140" fill="#050914" />
          <circle cx="70" cy="68" r="64" fill={`url(#halo-${uid})`} />
          <circle cx="18" cy="24" r="1.4" fill="#E2E8F0" opacity="0.6" />
          <circle cx="122" cy="26" r="1.6" fill={skin.visorColor} opacity="0.75" />
          <circle cx="24" cy="112" r="1.3" fill={skin.accentColor} opacity="0.65" />
          <circle cx="117" cy="102" r="1.3" fill="#E2E8F0" opacity="0.55" />

          {/* Hover Shadow Ellipse */}
          <ellipse
            cx="70"
            cy="128"
            rx="22"
            ry="4.5"
            fill={isProcessing ? skin.accentColor : skin.visorColor}
            className={animated ? 'odibot-shadow' : ''}
            opacity="0.34"
          />

          {/* Floating Chibi Modern-Tech Character Group */}
          <g className={animated ? (isProcessing ? 'odibot-process-float' : 'odibot-float') : ''}>
            {/* Subtle Anti-Gravity Hover Glow beneath chubby pod */}
            <g className={animated ? 'odibot-thruster' : ''}>
              <ellipse cx="70" cy="120" rx="11" ry="2.5" fill={skin.thrusterColor} opacity="0.38" />
              <path d="M64 117 L76 117 L70 126 Z" fill={`url(#flame-${uid})`} opacity="0.7" />
            </g>

            {/* --- MODERN-TECH BACK LAYER (Jet Wings / Quantum Blades / Back Orbital Ring) --- */}
            {shape === 'HOLODRONE_JET' && (
              <g>
                {/* Swept Micro-Thruster Jet Wings */}
                <path
                  d="M47 84 L22 73 C18 76, 20 87, 30 94 L46 92 Z"
                  fill={`url(#techmetal-${uid})`}
                  stroke={skin.accentColor}
                  strokeWidth="1.2"
                />
                <path
                  d="M93 84 L118 73 C122 76, 120 87, 110 94 L94 92 Z"
                  fill={`url(#techmetal-${uid})`}
                  stroke={skin.accentColor}
                  strokeWidth="1.2"
                />
                <circle cx="26" cy="83" r="2.6" fill={skin.accentColor} />
                <circle cx="114" cy="83" r="2.6" fill={skin.accentColor} />
              </g>
            )}

            {shape === 'QUANTUM_PRIME' && (
              <g>
                {/* Floating Quantum Energy Wing-Blades */}
                <path
                  d="M44 82 L20 68 L26 88 L43 93 Z"
                  fill={`url(#chassis-${uid})`}
                  stroke={skin.accentColor}
                  strokeWidth="1.3"
                />
                <path
                  d="M96 82 L120 68 L114 88 L97 93 Z"
                  fill={`url(#chassis-${uid})`}
                  stroke={skin.accentColor}
                  strokeWidth="1.3"
                />
                <path d="M25 74 L39 85" stroke={skin.accentColor} strokeWidth="2" strokeLinecap="round" />
                <path d="M115 74 L101 85" stroke={skin.accentColor} strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {shape === 'ORBITAL_SAT' && (
              <g>
                {/* Back half of Orbital Gyro Ring */}
                <path
                  d="M27 32 C38 14, 102 14, 113 32"
                  stroke={skin.accentColor}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.55"
                />
              </g>
            )}

            {/* Cute Stubby Floating Left Mitten Arm */}
            <g className={animated ? 'odibot-arm-left' : ''}>
              <path
                d="M41 85 C35 87, 33 95, 36 102 C38 106, 43 106, 44 101 C45 95, 44 88, 41 85 Z"
                fill={`url(#torso-${uid})`}
                stroke={skin.visorColor}
                strokeOpacity="0.55"
                strokeWidth="1.1"
              />
              <path
                d="M38.5 89 C36.5 93, 36.5 98, 38 101"
                stroke="#FFFFFF"
                strokeOpacity="0.65"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Cute Stubby Floating Right Mitten Arm (Waves cheerfully!) */}
            <g className={animated ? 'odibot-arm-wave' : ''}>
              {isHappy || isJumping || size === 'hero' ? (
                <>
                  <path
                    d="M99 87 C106 83, 112 75, 110 67 C108 63, 104 64, 102 69 C99 75, 96 81, 96 86 C96 88, 98 88, 99 87 Z"
                    fill={`url(#torso-${uid})`}
                    stroke={skin.visorColor}
                    strokeOpacity="0.55"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M107.5 69 C106.5 74, 103.5 79, 99.5 84"
                    stroke="#FFFFFF"
                    strokeOpacity="0.65"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M99 85 C105 87, 107 95, 104 102 C102 106, 97 106, 96 101 C95 95, 96 88, 99 85 Z"
                    fill={`url(#torso-${uid})`}
                    stroke={skin.visorColor}
                    strokeOpacity="0.55"
                    strokeWidth="1.1"
                  />
                  <path
                    d="M101.5 89 C103.5 93, 103.5 98, 102 101"
                    stroke="#FFFFFF"
                    strokeOpacity="0.65"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
            </g>

            {/* Chubby Mini Egg-Bean Torso */}
            <path
              d="M47 84 C47 78, 93 78, 93 84 C93 103, 83 117, 70 118 C57 117, 47 103, 47 84 Z"
              fill={`url(#torso-${uid})`}
              stroke={skin.shellLightColor}
              strokeOpacity="0.95"
              strokeWidth="1.4"
            />
            {/* Porcelain Specular Gloss Highlight on Left Torso */}
            <path
              d="M52.5 85 C52.5 95, 56 106, 62.5 112"
              stroke="#FFFFFF"
              strokeOpacity="0.7"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Chest Directive / Modern-Tech Module Core */}
            {isProcessing ? (
              <g>
                <rect
                  x="60"
                  y="92"
                  width="20"
                  height="6.2"
                  rx="3.1"
                  fill="#091124"
                  stroke={skin.accentColor}
                  strokeWidth="1"
                />
                <circle cx="65" cy="95.1" r="1.6" fill={skin.visorColor} className={animated ? 'odibot-led-1' : ''} />
                <circle cx="70" cy="95.1" r="1.6" fill={isThinking ? '#E879F9' : skin.accentColor} className={animated ? 'odibot-led-2' : ''} />
                <circle cx="75" cy="95.1" r="1.6" fill="#34D399" className={animated ? 'odibot-led-3' : ''} />
              </g>
            ) : shape === 'PULSE_AUDIO' ? (
              /* 3-Bar Neon Audio Equalizer */
              <g>
                <rect x="61" y="90" width="18" height="10" rx="3" fill="#091124" stroke={skin.accentColor} strokeWidth="0.9" />
                <rect x="64" y="94" width="2.4" height="4" rx="1" fill={skin.accentColor} className={animated ? 'odibot-led-1' : ''} />
                <rect x="68.8" y="91.8" width="2.4" height="6.2" rx="1" fill={skin.visorColor} className={animated ? 'odibot-led-2' : ''} />
                <rect x="73.6" y="93" width="2.4" height="5" rx="1" fill="#34D399" className={animated ? 'odibot-led-3' : ''} />
              </g>
            ) : shape === 'HOLODRONE_JET' ? (
              /* Hexagonal Stealth Drone Core */
              <g>
                <polygon
                  points="70,89 75.5,92.2 75.5,98.6 70,101.8 64.5,98.6 64.5,92.2"
                  fill="#091124"
                  stroke={skin.accentColor}
                  strokeWidth="1.2"
                />
                <circle cx="70" cy="95.4" r="2.4" fill={skin.accentColor} />
              </g>
            ) : shape === 'ORBITAL_SAT' ? (
              /* Circular Biosphere Radar Target Core */
              <g>
                <circle cx="70" cy="95.5" r="5.5" fill="#091124" stroke={skin.accentColor} strokeWidth="1.1" />
                <circle cx="70" cy="95.5" r="2.6" fill={skin.accentColor} />
              </g>
            ) : shape === 'QUANTUM_PRIME' ? (
              /* Diamond Quantum Prism Reactor */
              <g>
                <polygon
                  points="70,88 76,95.5 70,103 64,95.5"
                  fill="#091124"
                  stroke={skin.accentColor}
                  strokeWidth="1.2"
                />
                <polygon points="70,91 73.5,95.5 70,100 66.5,95.5" fill={skin.accentColor} />
              </g>
            ) : (
              /* Classic Chibi EVE Directive Core */
              <g>
                <circle
                  cx="70"
                  cy="95"
                  r="4.5"
                  fill={isHappy ? '#10B981' : skin.accentColor}
                  opacity="0.25"
                />
                <path
                  d="M70 91 Q74 93.2 70 99 Q66 93.2 70 91 Z"
                  fill={isHappy ? '#34D399' : skin.accentColor}
                />
              </g>
            )}

            {/* --- MODERN-TECH HEADGEAR BEFORE/BEHIND MAIN DOME --- */}
            {shape === 'HOLODRONE_JET' && (
              <g>
                {/* Dual Swept Stealth Cyber Radar Fins */}
                <path
                  d="M39 45 L33 19 L49 33 Z"
                  fill={`url(#techmetal-${uid})`}
                  stroke={skin.accentColor}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M101 45 L107 19 L91 33 Z"
                  fill={`url(#techmetal-${uid})`}
                  stroke={skin.accentColor}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <circle cx="34.5" cy="22" r="1.8" fill={skin.accentColor} />
                <circle cx="105.5" cy="22" r="1.8" fill={skin.accentColor} />
              </g>
            )}

            {shape === 'PULSE_AUDIO' && (
              <g>
                {/* Sleek Curved Cyber Headphone Arch over Dome */}
                <path
                  d="M29 56 C29 21, 111 21, 111 56"
                  stroke={`url(#techmetal-${uid})`}
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M36 33 C52 24, 88 24, 104 33"
                  stroke={skin.accentColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            )}

            {/* Wireless Command Signal Waves above Head when processing */}
            {isProcessing && animated && (
              <g>
                <path
                  d="M58 13 Q70 6 82 13"
                  stroke={isThinking ? '#E879F9' : skin.accentColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                  className="odibot-signal-wave"
                />
                <path
                  d="M53 9 Q70 1 87 9"
                  stroke={skin.visorColor}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  fill="none"
                  className="odibot-signal-wave"
                  style={{ animationDelay: '0.4s' }}
                />
              </g>
            )}

            {/* Big Round Kawaii Chibi Dome Head */}
            <path
              d="M32 56 C32 34, 48 31, 70 31 C92 31, 108 34, 108 56 C108 73, 93 78, 70 78 C47 78, 32 73, 32 56 Z"
              fill={`url(#chassis-${uid})`}
              stroke={skin.shellLightColor}
              strokeOpacity="0.98"
              strokeWidth="1.5"
            />
            {/* Porcelain Crown Highlight */}
            <path
              d="M44 37 C54 33, 66 32.5, 80 34"
              stroke="#FFFFFF"
              strokeOpacity="0.78"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* --- MODERN-TECH HEADGEAR ON/OVER DOME --- */}
            {shape === 'PULSE_AUDIO' && (
              <g>
                {/* Neon Ear-Cup Speakers on Left & Right Temples */}
                <rect x="25" y="47" width="9" height="19" rx="4.5" fill="#0F172A" stroke={skin.accentColor} strokeWidth="1.5" />
                <circle cx="29.5" cy="56.5" r="2.6" fill={skin.accentColor} />
                <rect x="106" y="47" width="9" height="19" rx="4.5" fill="#0F172A" stroke={skin.accentColor} strokeWidth="1.5" />
                <circle cx="110.5" cy="56.5" r="2.6" fill={skin.accentColor} />
              </g>
            )}

            {shape === 'ORBITAL_SAT' && (
              <g>
                {/* Front Orbital Gyro Ring + Micro Satellite & Temple Optic Scanner */}
                <path
                  d="M27 32 C38 43, 102 43, 113 32"
                  stroke={skin.accentColor}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="109" cy="34" r="3.4" fill="#0F172A" stroke={skin.accentColor} strokeWidth="1.3" />
                <circle cx="109" cy="34" r="1.5" fill="#FFFFFF" />
                {/* Right temple optical camera pod */}
                <circle cx="107" cy="55" r="5" fill="#0F172A" stroke={skin.accentColor} strokeWidth="1.3" />
                <circle cx="107" cy="55" r="2.2" fill={skin.accentColor} />
              </g>
            )}

            {shape === 'QUANTUM_PRIME' && (
              <g>
                {/* Sleek Futuristic Mecha V-Fin Forehead Crest */}
                <path
                  d="M70 33 L42 15 L52 30 L70 36 L88 30 L98 15 Z"
                  fill={`url(#chassis-${uid})`}
                  stroke="#FEF08A"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <polygon
                  points="70,26 75,33 70,38 65,33"
                  fill={skin.accentColor}
                  stroke="#FFFFFF"
                  strokeWidth="0.9"
                />
              </g>
            )}

            {/* Glossy Obsidian Kawaii Visor */}
            <path
              d="M38 56 C38 41, 50 38, 70 38 C90 38, 102 41, 102 56 C102 68, 90 73, 70 73 C50 73, 38 68, 38 56 Z"
              fill={`url(#visor-${uid})`}
              stroke={isProcessing ? skin.accentColor : skin.secondaryColor}
              strokeOpacity="0.65"
              strokeWidth="1.3"
            />

            {/* Visor Telemetry Scan Beam during Code Processing */}
            {isProcessing && animated && (
              <g clipPath={`url(#visor-clip-${uid})`}>
                <rect
                  x="64"
                  y="38"
                  width="12"
                  height="38"
                  fill={isThinking ? '#E879F9' : skin.visorColor}
                  opacity="0.22"
                  className="odibot-scanline"
                />
              </g>
            )}

            {/* Curved Glass Sheen Reflection */}
            <path
              d="M44 43 Q52 40 59 41 L50 67 L42 63 Z"
              fill="#FFFFFF"
              opacity="0.09"
            />

            {/* Cute Rosy Cheek Blushes inside Visor */}
            <g clipPath={`url(#visor-clip-${uid})`}>
              <ellipse cx="46" cy="63" rx="5.8" ry="2.7" fill={blushColor} opacity={isHappy ? '0.72' : '0.48'} />
              <ellipse cx="94" cy="63" rx="5.8" ry="2.7" fill={blushColor} opacity={isHappy ? '0.72' : '0.48'} />
            </g>

            {/* Big Expressive Kawaii Digital Eyes */}
            <g className={animated && !isHappy ? 'odibot-eye-blink' : ''}>
              {isHappy ? (
                <>
                  <path
                    d="M47 57 C49 48, 60 48, 62 57 C59 52.5, 50 52.5, 47 57 Z"
                    fill={eyeColor}
                    stroke={eyeColor}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M78 57 C80 48, 91 48, 93 57 C90 52.5, 81 52.5, 78 57 Z"
                    fill={eyeColor}
                    stroke={eyeColor}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : isThinking ? (
                <>
                  <ellipse cx="54" cy="54.5" rx="7.6" ry="5.6" transform="rotate(-6 54 54.5)" fill={eyeColor} />
                  <ellipse cx="86" cy="54.5" rx="7.6" ry="6.8" transform="rotate(6 86 54.5)" fill={eyeColor} />
                  <ellipse cx="54" cy="54.5" rx="7.2" ry="5.0" transform="rotate(-6 54 54.5)" fill={`url(#eye-scan-${uid})`} opacity="0.35" />
                  <ellipse cx="86" cy="54.5" rx="7.2" ry="6.2" transform="rotate(6 86 54.5)" fill={`url(#eye-scan-${uid})`} opacity="0.35" />
                  <circle cx="51.5" cy="52" r="2.1" fill="#FFFFFF" opacity="0.92" />
                  <circle cx="83.5" cy="51.5" r="2.3" fill="#FFFFFF" opacity="0.92" />
                </>
              ) : (
                <>
                  <ellipse
                    cx="54"
                    cy="55"
                    rx="7.8"
                    ry={isJumping ? '8' : '7.2'}
                    transform="rotate(-5 54 55)"
                    fill={eyeColor}
                  />
                  <ellipse
                    cx="86"
                    cy="55"
                    rx="7.8"
                    ry={isJumping ? '8' : '7.2'}
                    transform="rotate(5 86 55)"
                    fill={eyeColor}
                  />
                  <ellipse
                    cx="54"
                    cy="55"
                    rx="7.3"
                    ry={isJumping ? '7.5' : '6.7'}
                    transform="rotate(-5 54 55)"
                    fill={`url(#eye-scan-${uid})`}
                    opacity="0.3"
                  />
                  <ellipse
                    cx="86"
                    cy="55"
                    rx="7.3"
                    ry={isJumping ? '7.5' : '6.7'}
                    transform="rotate(5 86 55)"
                    fill={`url(#eye-scan-${uid})`}
                    opacity="0.3"
                  />
                  <circle cx="51.2" cy="52" r="2.3" fill="#FFFFFF" opacity="0.92" />
                  <circle cx="83.2" cy="52" r="2.3" fill="#FFFFFF" opacity="0.92" />
                  <circle cx="56.4" cy="57.8" r="1" fill="#FFFFFF" opacity="0.78" />
                  <circle cx="88.4" cy="57.8" r="1" fill="#FFFFFF" opacity="0.78" />
                </>
              )}
            </g>
          </g>
        </svg>
      </div>

      {showBadge && (
        <div
          className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-slate-950 border text-[10px] font-black shadow-md"
          style={{ borderColor: skin.visorColor, color: skin.visorColor }}
        >
          Odibot
        </div>
      )}
    </div>
  );
});
