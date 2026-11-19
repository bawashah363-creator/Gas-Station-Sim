import Phaser from 'phaser';
import { PALETTE } from '../palette';
import { CharacterRole, PlayerOutfitId } from '../types';

interface CharacterDesign {
  skin: string;
  hair: string;
  shirt: string;
  shirtAccent: string;
  pants: string;
  shoes: string;
  hatColor?: string;
  ringColor?: string;
  isFemale?: boolean;
  hasBeard?: boolean;
  isHijab?: boolean;
  isLongTunic?: boolean;
  hasTie?: boolean;
  hasApron?: boolean;
}

const DESIGNS: Record<CharacterRole, CharacterDesign> = {
  player: {
    skin: '#E6A984',
    hair: '#1E1B18',
    shirt: PALETTE.GAS_RED,
    shirtAccent: '#1E293B',
    pants: '#1E293B',
    shoes: '#DC2626',
    hatColor: PALETTE.GAS_RED,
    hasBeard: true,
  },
  worker_pump: {
    skin: '#DEA17C',
    hair: '#292524',
    shirt: '#DC2626',
    shirtAccent: '#FACC15',
    pants: '#334155',
    shoes: '#0F172A',
    hatColor: '#B91C1C',
    hasBeard: true,
  },
  cashier: {
    skin: '#ECBA96',
    hair: '#1C1917',
    shirt: '#DC2626',
    shirtAccent: '#0F172A',
    pants: '#1E293B',
    shoes: '#0F172A',
    hatColor: '#DC2626',
    isFemale: true,
    hasApron: true,
  },
  worker_wash: {
    skin: '#D99B72',
    hair: '#1E293B',
    shirt: '#0284C7',
    shirtAccent: '#38BDF8',
    pants: '#1E3A8A',
    shoes: '#0F172A',
    hatColor: '#0369A1',
  },
  worker_rooms: {
    skin: '#ECC0A0',
    hair: '#2C1D14',
    shirt: '#7C3AED',
    shirtAccent: '#F8FAFC',
    pants: '#312E81',
    shoes: '#1E293B',
    isFemale: true,
    hasApron: true,
  },
  customer_male: {
    skin: '#ECC0A0',
    hair: '#3F2E21',
    shirt: '#2563EB',
    shirtAccent: '#1D4ED8',
    pants: '#1E293B',
    shoes: '#F8FAFC',
  },
  customer_female: {
    skin: '#EDC1A4',
    hair: '#2C1D14',
    shirt: '#DB2777',
    shirtAccent: '#F472B6',
    pants: '#BE185D',
    shoes: '#F8FAFC',
    isFemale: true,
    isLongTunic: true,
  },
  customer_suit: {
    skin: '#E3AC88',
    hair: '#1E1B18',
    shirt: '#1F2937',
    shirtAccent: '#F8FAFC',
    pants: '#111827',
    shoes: '#09090B',
    hasBeard: true,
    hasTie: true,
  },
  guest_male: {
    skin: '#DDA078',
    hair: '#1C1917',
    shirt: '#F8FAFC',
    shirtAccent: '#CBD5E1',
    pants: '#E2E8F0',
    shoes: '#451A03',
    hasBeard: true,
    isLongTunic: true,
  },
  guest_female: {
    skin: '#EBBFA2',
    hair: '#0F172A',
    shirt: '#18181B',
    shirtAccent: '#F59E0B',
    pants: '#09090B',
    shoes: '#18181B',
    isFemale: true,
    isHijab: true,
    isLongTunic: true,
  },
  delivery_driver: {
    skin: '#D6946B',
    hair: '#292524',
    shirt: '#F59E0B',
    shirtAccent: '#1E3A8A',
    pants: '#1E3A8A',
    shoes: '#1E293B',
    hatColor: '#1E3A8A',
  },
};

const PLAYER_OUTFIT_OVERRIDES: Record<PlayerOutfitId, Partial<CharacterDesign>> = {
  default: {
    shirt: PALETTE.GAS_RED,
    shirtAccent: '#1E293B',
    pants: '#1E293B',
    shoes: '#DC2626',
    hatColor: PALETTE.GAS_RED,
    ringColor: '#FACC15',
  },
  royal_gold: {
    shirt: '#F59E0B',
    shirtAccent: '#0F172A',
    pants: '#0F172A',
    shoes: '#B45309',
    hatColor: '#D97706',
    ringColor: '#FDE047',
  },
  cyan_tech: {
    shirt: '#0EA5E9',
    shirtAccent: '#0F172A',
    pants: '#1E293B',
    shoes: '#0284C7',
    hatColor: '#0369A1',
    ringColor: '#38BDF8',
  },
  midnight_vip: {
    shirt: '#1E3A8A',
    shirtAccent: '#FBBF24',
    pants: '#09090B',
    shoes: '#18181B',
    hatColor: '#0F172A',
    hasTie: true,
    ringColor: '#FBBF24',
  },
};

export const CHAR_FRAME_W = 56;
export const CHAR_FRAME_H = 82;
const TOTAL_FRAMES = 12;

export function getPlayerOutfitTextureKey(outfit: PlayerOutfitId): string {
  return outfit === 'default' ? 'char_player' : `char_player_${outfit}`;
}

export function getPlayerOutfitAnimPrefix(outfit: PlayerOutfitId): string {
  return outfit === 'default' ? 'player' : `player_${outfit}`;
}

/**
 * Registers animated multi-frame sprite sheets for all 11 character roles
 * plus unlockable player outfit skins.
 */
export function registerCharacterTextures(scene: Phaser.Scene): void {
  const registerSheet = (key: string, animPrefix: string, design: CharacterDesign, isPlayer: boolean) => {
    if (scene.textures.exists(key)) return;

    const tex = scene.textures.createCanvas(key, CHAR_FRAME_W * TOTAL_FRAMES, CHAR_FRAME_H);
    if (!tex) return;
    const ctx = tex.getContext();

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      drawCharacterFrame(ctx, f * CHAR_FRAME_W, 0, design, isPlayer, f);
    }
    tex.refresh();

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      tex.add(i, 0, i * CHAR_FRAME_W, 0, CHAR_FRAME_W, CHAR_FRAME_H);
    }

    const safeAnim = (animKey: string, frames: number[], frameRate: number) => {
      if (scene.anims.exists(animKey)) return;
      scene.anims.create({
        key: animKey,
        frames: frames.map((frame) => ({ key, frame })),
        frameRate,
        repeat: -1,
      });
    };

    safeAnim(`${animPrefix}_idle`, [0, 1], 3);
    safeAnim(`${animPrefix}_walk`, [2, 3, 4, 5], 9);
    safeAnim(`${animPrefix}_run`, [2, 3, 4, 5], 15);
    safeAnim(`${animPrefix}_work`, [6, 7], 6);
    safeAnim(`${animPrefix}_carry`, [8, 9], 7);
    safeAnim(`${animPrefix}_interact`, [10, 11], 5);
    safeAnim(`${animPrefix}_wait`, [0, 11], 2);
  };

  (Object.keys(DESIGNS) as CharacterRole[]).forEach((role) => {
    registerSheet(`char_${role}`, role, DESIGNS[role], role === 'player');
  });

  (Object.keys(PLAYER_OUTFIT_OVERRIDES) as PlayerOutfitId[]).forEach((outfit) => {
    if (outfit === 'default') return;
    const merged: CharacterDesign = {
      ...DESIGNS.player,
      ...PLAYER_OUTFIT_OVERRIDES[outfit],
    };
    registerSheet(getPlayerOutfitTextureKey(outfit), getPlayerOutfitAnimPrefix(outfit), merged, true);
  });
}

function drawCharacterFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  d: CharacterDesign,
  isPlayer: boolean,
  frame: number
): void {
  const cx = ox + CHAR_FRAME_W * 0.5;
  const footY = oy + CHAR_FRAME_H - 10;

  let bobY = 0;
  let leftLegOffset = 0;
  let rightLegOffset = 0;
  let leftArmAngle = 0.08;
  let rightArmAngle = -0.08;
  let isCarrying = false;
  let isWorking = false;
  let isWaving = false;

  if (frame === 1) {
    bobY = -1.2;
  } else if (frame >= 2 && frame <= 5) {
    const phase = ((frame - 2) / 4) * Math.PI * 2;
    bobY = -Math.abs(Math.sin(phase)) * 2.5;
    leftLegOffset = Math.sin(phase) * 5.5;
    rightLegOffset = -Math.sin(phase) * 5.5;
    leftArmAngle = -Math.sin(phase) * 0.5;
    rightArmAngle = Math.sin(phase) * 0.5;
  } else if (frame === 6 || frame === 7) {
    isWorking = true;
    bobY = frame === 7 ? 1 : -1;
    rightArmAngle = frame === 7 ? -1.12 : -0.78;
    leftArmAngle = 0.28;
  } else if (frame === 8 || frame === 9) {
    isCarrying = true;
    const step = frame === 8 ? 1 : -1;
    leftLegOffset = step * 3;
    rightLegOffset = -step * 3;
    bobY = -1.5;
    leftArmAngle = -0.7;
    rightArmAngle = -0.7;
  } else if (frame === 10 || frame === 11) {
    isWaving = true;
    rightArmAngle = frame === 10 ? -2.15 : -1.75;
    bobY = frame === 10 ? -1 : 0;
  }

  // Ground shadow / Hero ring
  ctx.fillStyle = isPlayer ? 'rgba(255, 200, 21, 0.38)' : PALETTE.SHADOW_COLOR;
  ctx.beginPath();
  ctx.ellipse(cx, footY + 3, 13.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isPlayer) {
    ctx.strokeStyle = d.ringColor ?? '#FACC15';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  const outline = '#1E293B';

  const drawLeg = (lx: number, yShift: number) => {
    ctx.fillStyle = d.pants;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(lx - 3.5, footY - 22 + yShift * 0.5, 7, 19, 2.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = d.shoes;
    ctx.beginPath();
    ctx.ellipse(lx + 0.5, footY - 2 + yShift * 0.5, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  drawLeg(cx - 5, leftLegOffset);
  drawLeg(cx + 5, rightLegOffset);

  const torsoY = footY - 43 + bobY;

  const drawArm = (ax: number, ay: number, angle: number, sleeve: string) => {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.fillStyle = sleeve;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-3, 0, 6, 12, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = d.skin;
    ctx.beginPath();
    ctx.roundRect(-2.6, 10, 5.2, 8, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  drawArm(cx - 10, torsoY + 3, leftArmAngle, d.shirt);

  ctx.fillStyle = d.shirt;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  const torsoH = d.isLongTunic ? 30 : 23;
  ctx.beginPath();
  ctx.roundRect(cx - 9.5, torsoY, 19, torsoH, 5);
  ctx.fill();
  ctx.stroke();

  if (d.hasTie) {
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(cx - 3.5, torsoY);
    ctx.lineTo(cx + 3.5, torsoY);
    ctx.lineTo(cx, torsoY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(cx - 1, torsoY + 2, 2, 11);
  } else if (d.hasApron) {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(cx - 7, torsoY + 6, 14, 17);
  } else {
    ctx.fillStyle = d.shirtAccent;
    ctx.fillRect(cx - 9, torsoY + 1, 18, 4.5);
  }

  const headY = torsoY - 11;
  ctx.fillStyle = d.skin;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, headY, 9, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (d.isHijab) {
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 1, 10.5, 11.5, 0, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = d.hair;
    ctx.beginPath();
    ctx.arc(cx, headY - 3, 9.2, Math.PI, 0);
    ctx.fill();
    if (d.isFemale) {
      ctx.fillRect(cx - 9.5, headY - 3, 3.5, 12);
      ctx.fillRect(cx + 6, headY - 3, 3.5, 12);
    }
  }

  if (d.hasBeard) {
    ctx.fillStyle = d.hair;
    ctx.beginPath();
    ctx.arc(cx, headY + 3.5, 7.5, 0.15, Math.PI - 0.15);
    ctx.fill();
  }

  // Expressive eyes & brow
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - 3, headY - 1, 1.8, 0, Math.PI * 2);
  ctx.arc(cx + 3, headY - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(cx - 3, headY - 1, 1.1, 0, Math.PI * 2);
  ctx.arc(cx + 3, headY - 1, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#9A3412';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, headY + 2.5, 2.5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  if (d.hatColor) {
    ctx.fillStyle = d.hatColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, headY - 5, 9.6, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + 2, headY - 5, 9, 3, 0, -Math.PI * 0.2, Math.PI);
    ctx.fill();
    ctx.stroke();
    if (isPlayer) {
      ctx.fillStyle = d.ringColor ?? PALETTE.GAS_YELLOW;
      ctx.beginPath();
      ctx.arc(cx, headY - 9, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawArm(cx + 10, torsoY + 3, rightArmAngle, d.shirt);

  if (isCarrying) {
    ctx.fillStyle = PALETTE.GAS_RED;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(cx + 3, torsoY + 6, 12, 14, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.GAS_YELLOW;
    ctx.fillRect(cx + 5, torsoY + 8, 8, 3);
  } else if (isWorking) {
    ctx.fillStyle = d.shirt === '#0284C7' ? '#38BDF8' : d.shirt === '#7C3AED' ? '#C084FC' : '#16A34A';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx + 10, torsoY + 4, 9, 7, 2);
    ctx.fill();
    ctx.stroke();
  } else if (isWaving) {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(cx + 18, headY - 10, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
