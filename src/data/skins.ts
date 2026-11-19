import { RobotShapeVariant, RobotSkinId } from '../types/game';

export interface RobotSkinOption {
  id: RobotSkinId;
  shape: RobotShapeVariant;
  shapeLabel: string;
  name: string;
  theme: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  shellLightColor: string;
  accentColor: string;
  glowColor: string;
  requiredStars: number;
  visorColor: string;
  thrusterColor: string;
  badge: string;
}

export const ROBOT_SKINS: RobotSkinOption[] = [
  {
    id: 'CYAN',
    shape: 'AERO_POD',
    shapeLabel: 'Bentuk: Chibi Aero-Pod',
    name: 'Aero-Pod Classic',
    theme: 'Putih Mutiara & Visor Sian',
    description: 'Bodi kapsul porselen putih mutiara aerodinamis yang imut dengan visor hitam mengilap dan lengan melayang.',
    primaryColor: '#E0F2FE',
    secondaryColor: '#64748B',
    shellLightColor: '#FFFFFF',
    accentColor: '#22D3EE',
    glowColor: 'rgba(34, 211, 238, 0.5)',
    visorColor: '#38BDF8',
    thrusterColor: '#22D3EE',
    requiredStars: 0,
    badge: 'Bawaan',
  },
  {
    id: 'NEON_VOLT',
    shape: 'PULSE_AUDIO',
    shapeLabel: 'Bentuk: Cyber Headphone',
    name: 'Pulse AudioBot',
    theme: 'Headset Neon & Equalizer',
    description: 'Robot modern bergaya audio-tech dengan headphone melengkung bercahaya di kepala dan bar equalizer di dada.',
    primaryColor: '#FDE047',
    secondaryColor: '#CA8A04',
    shellLightColor: '#FEF9C3',
    accentColor: '#22D3EE',
    glowColor: 'rgba(250, 204, 21, 0.5)',
    visorColor: '#FACC15',
    thrusterColor: '#38BDF8',
    requiredStars: 5,
    badge: '5 Bintang',
  },
  {
    id: 'CYBER_PINK',
    shape: 'HOLODRONE_JET',
    shapeLabel: 'Bentuk: Stealth Jet-Drone',
    name: 'Holodrone Jet',
    theme: 'Sayap Jet & Antena Dual-Fin',
    description: 'Drone penjelajah gesit lengkap dengan sepasang sayap pendorong jet mikro, antena dual-fin, dan inti heksagonal.',
    primaryColor: '#F9A8D4',
    secondaryColor: '#BE185D',
    shellLightColor: '#FCE7F3',
    accentColor: '#22D3EE',
    glowColor: 'rgba(236, 72, 153, 0.52)',
    visorColor: '#F472B6',
    thrusterColor: '#E879F9',
    requiredStars: 15,
    badge: '15 Bintang',
  },
  {
    id: 'EMERALD',
    shape: 'ORBITAL_SAT',
    shapeLabel: 'Bentuk: Satelit Orbit Tech',
    name: 'Orbital Bio-Probe',
    theme: 'Cincin Gyro & Lensa Scanner',
    description: 'Robot riset luar angkasa dengan cincin orbit melayang di atas kepala dan modul lensa pemindai optik.',
    primaryColor: '#6EE7B7',
    secondaryColor: '#047857',
    shellLightColor: '#ECFDF5',
    accentColor: '#A3E635',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    visorColor: '#34D399',
    thrusterColor: '#A3E635',
    requiredStars: 25,
    badge: '25 Bintang',
  },
  {
    id: 'GOLDEN',
    shape: 'QUANTUM_PRIME',
    shapeLabel: 'Bentuk: Exosuit Mecha Prime',
    name: 'Quantum Apex Prime',
    theme: 'V-Fin Kuantum & Bilah Energi',
    description: 'Kostum teknologi tinggi juara dengan crest V-Fin futuristik, bilah sayap energi melayang, dan reaktor kuantum.',
    primaryColor: '#FCD34D',
    secondaryColor: '#B45309',
    shellLightColor: '#FFFBEB',
    accentColor: '#38BDF8',
    glowColor: 'rgba(245, 158, 11, 0.56)',
    visorColor: '#FDE68A',
    thrusterColor: '#FBBF24',
    requiredStars: 40,
    badge: '40 Bintang',
  },
];
