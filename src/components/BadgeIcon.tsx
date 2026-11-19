import React from 'react';
import {
  Boxes,
  Bug,
  Cpu,
  Crown,
  GitBranch,
  ListOrdered,
  Repeat,
  Rocket,
  Star,
  Zap,
} from 'lucide-react';
import { BadgeColorTheme, BadgeIconName } from '../data/badges';

export const BADGE_THEME_STYLES: Record<
  BadgeColorTheme,
  {
    unlockedCard: string;
    iconBg: string;
    barColor: string;
    pillClass: string;
  }
> = {
  cyan: {
    unlockedCard: 'bg-cyan-950/45 border-cyan-500/60 shadow-cyan-500/10',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950',
    barColor: 'bg-cyan-400',
    pillClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  indigo: {
    unlockedCard: 'bg-indigo-950/45 border-indigo-500/60 shadow-indigo-500/10',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-violet-600 text-white',
    barColor: 'bg-indigo-400',
    pillClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  purple: {
    unlockedCard: 'bg-purple-950/45 border-purple-500/60 shadow-purple-500/10',
    iconBg: 'bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white',
    barColor: 'bg-purple-400',
    pillClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  blue: {
    unlockedCard: 'bg-blue-950/45 border-blue-500/60 shadow-blue-500/10',
    iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white',
    barColor: 'bg-sky-400',
    pillClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  emerald: {
    unlockedCard: 'bg-emerald-950/45 border-emerald-500/60 shadow-emerald-500/10',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950',
    barColor: 'bg-emerald-400',
    pillClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  amber: {
    unlockedCard: 'bg-amber-950/40 border-amber-500/60 shadow-amber-500/10',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950',
    barColor: 'bg-amber-400',
    pillClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  rose: {
    unlockedCard: 'bg-rose-950/45 border-rose-500/60 shadow-rose-500/10',
    iconBg: 'bg-gradient-to-br from-rose-400 to-red-600 text-white',
    barColor: 'bg-rose-400',
    pillClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  gold: {
    unlockedCard: 'bg-amber-950/50 border-yellow-400/70 shadow-yellow-500/15',
    iconBg: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-slate-950',
    barColor: 'bg-yellow-400',
    pillClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50',
  },
};

export const BadgeIcon: React.FC<{ name: BadgeIconName; className?: string }> = ({
  name,
  className = 'w-5 h-5',
}) => {
  switch (name) {
    case 'Rocket':
      return <Rocket className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Repeat':
      return <Repeat className={className} />;
    case 'ListOrdered':
      return <ListOrdered className={className} />;
    case 'Boxes':
      return <Boxes className={className} />;
    case 'GitBranch':
      return <GitBranch className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Bug':
      return <Bug className={className} />;
    case 'Star':
      return <Star className={className} />;
    case 'Crown':
      return <Crown className={className} />;
  }
};
