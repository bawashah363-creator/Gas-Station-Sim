import Phaser from 'phaser';
import { PALETTE } from '../palette';
import { drawIsoBox, drawPoly, localIso, registerCanvasTexture } from './isoMath';

/**
 * Generates reusable outdoor props, vegetation, signage, fences, flower beds, night light halos, and barriers.
 */
export function registerEnvironmentTextures(scene: Phaser.Scene): void {
  createPriceSignTexture(scene);
  createDeciduousTreeTexture(scene);
  createPalmTreeTexture(scene);
  createHedgePillarTexture(scene);
  createFlowerBedTexture(scene);
  createStreetlightTexture(scene);
  createPatioUmbrellaTexture(scene);
  createAirKioskTexture(scene);
  createWoodenBenchTexture(scene);
  createAFrameSignTexture(scene);
  createLockedBarrierTexture(scene);
  createNightGlowTexture(scene);
  createFoamParticleTexture(scene);
  createDestRingTexture(scene);
}

function createPriceSignTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'price_sign', 110, 175, (ctx) => {
    const ox = 55;
    const oy = 150;

    ctx.fillStyle = PALETTE.SHADOW_COLOR;
    ctx.beginPath();
    ctx.ellipse(ox + 8, oy + 4, 24, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();

    drawIsoBox(ctx, ox, oy, -14, -10, 0, 28, 20, 8, {
      top: '#CBD5E1',
      left: '#94A3B8',
      right: '#64748B',
    });

    drawIsoBox(ctx, ox, oy, -12, -8, 8, 24, 16, 108, {
      top: '#334155',
      left: '#1E293B',
      right: '#0F172A',
    });

    drawIsoBox(ctx, ox, oy, -13, -9, 114, 26, 18, 5, {
      top: '#FDE047',
      left: PALETTE.GAS_YELLOW,
      right: PALETTE.GAS_YELLOW_DARK,
    });

    const logoPt = localIso(ox, oy, 0, 8.5, 96);
    ctx.beginPath();
    ctx.arc(logoPt.x, logoPt.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.GAS_RED;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.GAS_YELLOW;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(logoPt.x, logoPt.y - 7);
    ctx.bezierCurveTo(logoPt.x + 6, logoPt.y, logoPt.x + 5, logoPt.y + 6, logoPt.x, logoPt.y + 7);
    ctx.bezierCurveTo(logoPt.x - 5, logoPt.y + 6, logoPt.x - 6, logoPt.y, logoPt.x, logoPt.y - 7);
    ctx.fillStyle = PALETTE.GAS_YELLOW;
    ctx.fill();

    const rows = [
      { label: '95', price: '258' },
      { label: '92', price: '245' },
      { label: 'DSL', price: '230' },
    ];
    rows.forEach((row, idx) => {
      const pz = 64 - idx * 17;
      const p0 = localIso(ox, oy, -9, 8.4, pz + 6);
      const p1 = localIso(ox, oy, 9, 8.4, pz + 6);
      const p2 = localIso(ox, oy, 9, 8.4, pz - 5);
      const p3 = localIso(ox, oy, -9, 8.4, pz - 5);
      drawPoly(ctx, [p0, p1, p2, p3], '#090D16', '#475569', 0.8);

      const mid = localIso(ox, oy, 0, 8.6, pz);
      ctx.save();
      ctx.translate(mid.x, mid.y);
      ctx.font = '700 8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4ADE80';
      ctx.fillText(`${row.label} ${row.price}`, 0, 0);
      ctx.restore();
    });
  });
}

function createDeciduousTreeTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'tree_deciduous', 148, 176, (ctx) => {
    const cx = 74;
    const baseY = 150;

    // Soft ambient ground shadow ellipse
    ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
    ctx.beginPath();
    ctx.ellipse(cx + 12, baseY + 5, 40, 17, 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Textured 2.5D trunk with flared roots & bark shading
    ctx.fillStyle = '#4E2F18';
    ctx.beginPath();
    ctx.moveTo(cx - 12, baseY + 2);
    ctx.quadraticCurveTo(cx - 7, baseY - 18, cx - 6, baseY - 56);
    ctx.lineTo(cx + 6, baseY - 56);
    ctx.quadraticCurveTo(cx + 7, baseY - 18, cx + 13, baseY + 2);
    ctx.closePath();
    ctx.fill();

    // Sunlit left bark highlight & branch forks
    ctx.fillStyle = '#7C4D2B';
    ctx.beginPath();
    ctx.moveTo(cx - 8, baseY);
    ctx.lineTo(cx - 4, baseY - 52);
    ctx.lineTo(cx, baseY - 52);
    ctx.lineTo(cx - 2, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 2, baseY - 38);
    ctx.lineTo(cx - 18, baseY - 56);
    ctx.moveTo(cx + 2, baseY - 40);
    ctx.lineTo(cx + 18, baseY - 55);
    ctx.stroke();

    // Deep canopy underside shadow ring
    const underBlobs = [
      { x: cx - 23, y: baseY - 54, r: 24, c: '#235A16' },
      { x: cx + 23, y: baseY - 52, r: 22, c: '#235A16' },
      { x: cx, y: baseY - 52, r: 28, c: '#2B6B1B' },
    ];
    for (const b of underBlobs) {
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Layered 2.5D foliage lobes (dark -> mid -> sunlit crown)
    const canopyBlobs = [
      { x: cx - 22, y: baseY - 62, r: 24, c: PALETTE.GRASS_DARK },
      { x: cx + 22, y: baseY - 60, r: 22, c: PALETTE.GRASS_DARK },
      { x: cx, y: baseY - 70, r: 32, c: PALETTE.GRASS_BASE },
      { x: cx - 16, y: baseY - 72, r: 23, c: PALETTE.GRASS_BASE },
      { x: cx + 16, y: baseY - 69, r: 21, c: PALETTE.GRASS_BASE },
      { x: cx - 8, y: baseY - 87, r: 24, c: PALETTE.GRASS_LIGHT },
      { x: cx + 10, y: baseY - 82, r: 18, c: PALETTE.GRASS_LIGHT },
      { x: cx - 13, y: baseY - 93, r: 12, c: '#A3E635' },
      { x: cx + 4, y: baseY - 91, r: 9, c: '#BEF264' },
    ];
    for (const b of canopyBlobs) {
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp individual leaf-cluster texture accents
    const leafSpecks = [
      { x: cx - 26, y: baseY - 68, c: '#74CD52' },
      { x: cx - 12, y: baseY - 76, c: '#A3E635' },
      { x: cx + 14, y: baseY - 74, c: '#84CC16' },
      { x: cx + 24, y: baseY - 63, c: '#367C20' },
      { x: cx - 4, y: baseY - 60, c: '#3E8C25' },
      { x: cx - 19, y: baseY - 88, c: '#D9F99D' },
    ];
    for (const s of leafSpecks) {
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 5.5, 3.5, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function createPalmTreeTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'tree_palm', 148, 178, (ctx) => {
    const cx = 74;
    const baseY = 154;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
    ctx.beginPath();
    ctx.ellipse(cx + 13, baseY + 5, 35, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Segmented 2.5D curved palm trunk
    const segCount = 11;
    for (let s = 0; s < segCount; s++) {
      const t = s / (segCount - 1);
      const px = cx - Math.sin(t * Math.PI) * 7 + t * 3;
      const py = baseY - t * 90;
      const w = 8 - t * 3.5;

      ctx.fillStyle = s % 2 === 0 ? '#7C5131' : '#653F23';
      ctx.beginPath();
      ctx.ellipse(px, py, w, 6.2, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#9C6B46';
      ctx.beginPath();
      ctx.ellipse(px - w * 0.35, py - 1, w * 0.4, 3.5, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    const topX = cx + 3;
    const topY = baseY - 94;

    // Coconuts cluster under crown
    for (const [dx, dy] of [[-4, 4], [4, 5], [0, 7]]) {
      ctx.fillStyle = '#4A2B13';
      ctx.beginPath();
      ctx.arc(topX + dx, topY + dy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Back shaded fronds then front sunlit fronds with midrib lines
    const angles = [-2.65, -2.05, -1.3, -0.45, 0.25, 0.85, 2.25, 2.85];
    angles.forEach((ang, i) => {
      const len = 50 + (i % 2) * 8;
      const ex = topX + Math.cos(ang) * len;
      const ey = topY + Math.sin(ang) * len * 0.65 + 14;
      const ctrlX = topX + Math.cos(ang) * (len * 0.55);
      const ctrlY = topY + Math.sin(ang) * (len * 0.3) - 18;

      // Shaded lower frond half
      ctx.fillStyle = i % 2 === 0 ? '#2F701C' : '#3E8C25';
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(ctrlX, ctrlY - 7, ex, ey);
      ctx.quadraticCurveTo(ctrlX, ctrlY + 11, topX, topY);
      ctx.fill();

      // Sunlit upper frond blade highlight
      ctx.fillStyle = i % 2 === 0 ? PALETTE.GRASS_BASE : PALETTE.GRASS_LIGHT;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(ctrlX, ctrlY - 9, ex, ey);
      ctx.quadraticCurveTo(ctrlX, ctrlY + 2, topX, topY);
      ctx.fill();

      // Central spine vein
      ctx.strokeStyle = '#BEF264';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(ctrlX, ctrlY - 3, ex, ey);
      ctx.stroke();
    });
  });
}

function createHedgePillarTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'hedge_pillar', 68, 64, (ctx) => {
    const ox = 34;
    const oy = 48;
    drawIsoBox(ctx, ox, oy, -8, -8, 0, 16, 16, 26, {
      top: '#E7E0D3',
      left: PALETTE.FENCE_STONE,
      right: PALETTE.FENCE_STONE_SHADE,
    });
    drawIsoBox(ctx, ox, oy, -10, -10, 26, 20, 20, 4, {
      top: '#F3EEE4',
      left: '#D5CBB8',
      right: '#A89B84',
    });
  });

  registerCanvasTexture(scene, 'hedge_block', 90, 64, (ctx) => {
    const ox = 45;
    const oy = 46;
    drawIsoBox(ctx, ox, oy, -24, -10, 0, 48, 20, 16, {
      top: PALETTE.GRASS_LIGHT,
      left: PALETTE.HEDGE_LIGHT,
      right: PALETTE.HEDGE_DARK,
      stroke: 'rgba(20, 83, 45, 0.45)',
    });
    // Leafy 2.5D top highlight puffs
    for (let i = -16; i <= 16; i += 8) {
      const pt = localIso(ox, oy, i, 0, 17);
      ctx.fillStyle = i % 16 === 0 ? '#84CC16' : PALETTE.GRASS_BASE;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function createFlowerBedTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'flower_bed', 72, 54, (ctx) => {
    const ox = 36;
    const oy = 40;
    drawIsoBox(ctx, ox, oy, -18, -9, 0, 36, 18, 8, {
      top: '#78350F',
      left: '#D97706',
      right: '#92400E',
    });
    const colors = ['#F43F5E', '#FACC15', '#FB923C', '#EC4899', '#A855F7'];
    for (let i = 0; i < 7; i++) {
      const fx = ox - 14 + i * 5;
      const fy = oy - 10 + (i % 2) * 3;
      ctx.fillStyle = PALETTE.GRASS_BASE;
      ctx.beginPath();
      ctx.arc(fx, fy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(fx, fy - 2, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function createStreetlightTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'streetlight', 64, 150, (ctx) => {
    const ox = 32;
    const oy = 132;

    ctx.fillStyle = PALETTE.SHADOW_SOFT;
    ctx.beginPath();
    ctx.ellipse(ox + 8, oy + 2, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    drawIsoBox(ctx, ox, oy, -4, -4, 0, 8, 8, 8, {
      top: '#64748B',
      left: '#475569',
      right: '#334155',
    });
    ctx.fillStyle = '#334155';
    ctx.fillRect(ox - 2.5, oy - 104, 5, 100);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ox, oy - 102);
    ctx.lineTo(ox + 16, oy - 110);
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.ellipse(ox + 18, oy - 107, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function createPatioUmbrellaTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'patio_umbrella', 110, 120, (ctx) => {
    const cx = 55;
    const oy = 96;

    ctx.fillStyle = PALETTE.SHADOW_COLOR;
    ctx.beginPath();
    ctx.ellipse(cx + 8, oy + 4, 30, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();

    for (const dx of [-18, 18]) {
      ctx.fillStyle = PALETTE.WOOD_WARM;
      ctx.fillRect(cx + dx - 5, oy - 12, 10, 10);
    }

    ctx.fillStyle = '#6B4423';
    ctx.fillRect(cx - 2, oy - 22, 4, 22);
    ctx.fillStyle = '#A46E43';
    ctx.beginPath();
    ctx.ellipse(cx, oy - 20, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(cx - 1.5, oy - 68, 3, 48);

    const topY = oy - 78;
    const rimY = oy - 50;
    const slices = 6;
    for (let i = 0; i < slices; i++) {
      const a0 = (i / slices) * Math.PI;
      const a1 = ((i + 1) / slices) * Math.PI;
      const x0 = cx - Math.cos(a0) * 32;
      const y0 = rimY + Math.sin(a0) * 10;
      const x1 = cx - Math.cos(a1) * 32;
      const y1 = rimY + Math.sin(a1) * 10;
      drawPoly(
        ctx,
        [{ x: cx, y: topY }, { x: x0, y: y0 }, { x: x1, y: y1 }],
        i % 2 === 0 ? PALETTE.GAS_RED : '#FFFFFF',
        'rgba(15,23,42,0.28)',
        1
      );
    }
  });
}

function createAirKioskTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'air_kiosk', 56, 80, (ctx) => {
    const ox = 28;
    const oy = 64;
    drawIsoBox(ctx, ox, oy, -8, -6, 0, 16, 12, 34, {
      top: '#64748B',
      left: '#334155',
      right: '#1E293B',
    });
    const g0 = localIso(ox, oy, -5, 6.3, 28);
    const g1 = localIso(ox, oy, 5, 6.3, 28);
    const g2 = localIso(ox, oy, 5, 6.3, 18);
    const g3 = localIso(ox, oy, -5, 6.3, 18);
    drawPoly(ctx, [g0, g1, g2, g3], '#38BDF8', '#0F172A', 1);
  });
}

function createWoodenBenchTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'wooden_bench', 68, 56, (ctx) => {
    const ox = 34;
    const oy = 42;
    drawIsoBox(ctx, ox, oy, -18, -7, 4, 36, 14, 5, {
      top: '#C08552',
      left: PALETTE.WOOD_WARM,
      right: PALETTE.WOOD_DARK,
    });
    drawIsoBox(ctx, ox, oy, -18, -7, 9, 36, 3, 10, {
      top: '#C08552',
      left: PALETTE.WOOD_WARM,
      right: PALETTE.WOOD_DARK,
    });
  });
}

function createAFrameSignTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'aframe_sign', 40, 48, (ctx) => {
    const cx = 20;
    const by = 40;
    drawPoly(
      ctx,
      [{ x: cx - 10, y: by }, { x: cx - 4, y: by - 22 }, { x: cx + 8, y: by - 20 }, { x: cx + 2, y: by + 2 }],
      '#1E293B',
      '#B45309',
      1.8
    );
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(cx - 4, by - 16, 8, 3);
  });
}

function createLockedBarrierTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'locked_barrier', 92, 56, (ctx) => {
    const ox = 46;
    const oy = 44;
    drawIsoBox(ctx, ox, oy, -24, -4, 8, 48, 8, 12, {
      top: '#FDE047',
      left: '#F59E0B',
      right: '#1E293B',
    });
    // Hazard stripes
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(ox - 12, oy - 14, 6, 9);
    ctx.fillRect(ox + 2, oy - 11, 6, 9);
  });
}

function createNightGlowTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'night_glow', 160, 120, (ctx) => {
    const grad = ctx.createRadialGradient(80, 60, 8, 80, 60, 74);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
    grad.addColorStop(0.5, 'rgba(253, 224, 71, 0.18)');
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 160, 120);
  });
}

function createFoamParticleTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'foam_bubble', 24, 24, (ctx) => {
    const grad = ctx.createRadialGradient(9, 9, 2, 12, 12, 11);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.6, 'rgba(186, 230, 253, 0.7)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, Math.PI * 2);
    ctx.fill();
  });
}

function createDestRingTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'dest_ring', 64, 36, (ctx) => {
    ctx.strokeStyle = '#FFC815';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(32, 18, 24, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 200, 21, 0.22)';
    ctx.fill();
  });
}
