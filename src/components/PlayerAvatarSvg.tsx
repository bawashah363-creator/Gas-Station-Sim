import { PlayerOutfitId } from '../game/types';

interface PlayerAvatarSvgProps {
  outfit?: PlayerOutfitId;
}

const OUTFIT_COLORS: Record<
  PlayerOutfitId,
  { shirt: string; collar: string; cap: string; capBrim: string; badge: string }
> = {
  default: {
    shirt: '#D92323',
    collar: '#1E293B',
    cap: '#D92323',
    capBrim: '#B91C1C',
    badge: '#FFC815',
  },
  royal_gold: {
    shirt: '#F59E0B',
    collar: '#0F172A',
    cap: '#D97706',
    capBrim: '#92400E',
    badge: '#FDE047',
  },
  cyan_tech: {
    shirt: '#0EA5E9',
    collar: '#0F172A',
    cap: '#0284C7',
    capBrim: '#0369A1',
    badge: '#7DD3FC',
  },
  midnight_vip: {
    shirt: '#1E3A8A',
    collar: '#FBBF24',
    cap: '#0F172A',
    capBrim: '#020617',
    badge: '#FBBF24',
  },
};

export function PlayerAvatarSvg({ outfit = 'default' }: PlayerAvatarSvgProps) {
  const colors = OUTFIT_COLORS[outfit] ?? OUTFIT_COLORS.default;
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="avatarBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#avatarBg)" />
      <path d="M10 64 C10 47, 54 47, 54 64 Z" fill={colors.shirt} />
      <path d="M24 50 L32 58 L40 50" fill={colors.collar} />
      <rect x="27" y="40" width="10" height="10" rx="4" fill="#DDA078" />
      <ellipse cx="32" cy="30" rx="13" ry="15" fill="#E6A984" />
      <path d="M19 26 C19 16, 45 16, 45 26 C45 22, 19 22, 19 26 Z" fill="#1E1B18" />
      <path d="M20 33 C20 44, 44 44, 44 33 C41 37, 23 37, 20 33 Z" fill="#292524" />
      <circle cx="27" cy="29" r="1.8" fill="#0F172A" />
      <circle cx="37" cy="29" r="1.8" fill="#0F172A" />
      <path d="M28 36 Q32 39 36 36" stroke="#F8FAFC" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M18 23 C18 11, 46 11, 46 23 Z" fill={colors.cap} stroke={colors.capBrim} strokeWidth="1.2" />
      <path d="M17 22 Q32 26 49 22 Q45 19 17 22 Z" fill={colors.capBrim} />
      <circle cx="32" cy="17" r="2.6" fill={colors.badge} />
    </svg>
  );
}
