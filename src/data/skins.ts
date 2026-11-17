import { RobotSkinId } from '../types/game';

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
