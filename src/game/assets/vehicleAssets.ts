import Phaser from 'phaser';
import { PALETTE } from '../palette';
import { VehicleType } from '../types';
import { drawIsoBox, drawPoly, localIso, registerCanvasTexture } from './isoMath';

interface VehicleSpec {
  length: number;
  width: number;
  bodyHeight: number;
  cabinLength: number;
  cabinOffset: number;
  cabinHeight: number;
  isVanOrTruck?: 'van' | 'truck' | 'suv' | 'moto';
}

const VEHICLE_SPECS: Record<VehicleType, VehicleSpec> = {
  sedan_red: { length: 58, width: 28, bodyHeight: 13, cabinLength: 28, cabinOffset: -2, cabinHeight: 11 },
  sedan_white: { length: 58, width: 28, bodyHeight: 13, cabinLength: 28, cabinOffset: -2, cabinHeight: 11 },
  car_blue: { length: 56, width: 27, bodyHeight: 13, cabinLength: 28, cabinOffset: -2, cabinHeight: 11 },
  car_yellow: { length: 54, width: 27, bodyHeight: 13, cabinLength: 26, cabinOffset: -3, cabinHeight: 11 },
  suv_green: { length: 60, width: 30, bodyHeight: 15, cabinLength: 36, cabinOffset: -6, cabinHeight: 14, isVanOrTruck: 'suv' },
  van_white: { length: 66, width: 30, bodyHeight: 16, cabinLength: 48, cabinOffset: -6, cabinHeight: 16, isVanOrTruck: 'van' },
  suv_black: { length: 62, width: 30, bodyHeight: 15, cabinLength: 36, cabinOffset: -6, cabinHeight: 14, isVanOrTruck: 'suv' },
  hatch_orange: { length: 50, width: 26, bodyHeight: 13, cabinLength: 28, cabinOffset: -5, cabinHeight: 11 },
  truck_delivery: { length: 82, width: 32, bodyHeight: 15, cabinLength: 22, cabinOffset: 24, cabinHeight: 18, isVanOrTruck: 'truck' },
  motorcycle: { length: 34, width: 14, bodyHeight: 10, cabinLength: 12, cabinOffset: 2, cabinHeight: 8, isVanOrTruck: 'moto' },
};

/**
 * Generates isometric vehicle sprites in both SE (road/pump lane) and NE (car wash/parking) orientations.
 * Mirroring horizontally gives SW and NW directions cleanly.
 */
export function registerVehicleTextures(scene: Phaser.Scene): void {
  (Object.keys(VEHICLE_SPECS) as VehicleType[]).forEach((type) => {
    registerCanvasTexture(scene, `veh_${type}_se`, 128, 92, (ctx) => {
      drawVehicle(ctx, type, 'se');
    });
    registerCanvasTexture(scene, `veh_${type}_ne`, 128, 92, (ctx) => {
      drawVehicle(ctx, type, 'ne');
    });
  });
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  type: VehicleType,
  dir: 'se' | 'ne'
): void {
  const ox = 64;
  const oy = 60;
  const spec = VEHICLE_SPECS[type];
  const colors = PALETTE.VEHICLES[type];

  // Ground drop shadow
  ctx.save();
  ctx.fillStyle = PALETTE.SHADOW_COLOR;
  ctx.beginPath();
  if (dir === 'se') {
    ctx.ellipse(ox + 2, oy + 6, spec.length * 0.52, spec.width * 0.48, 0.42, 0, Math.PI * 2);
  } else {
    ctx.ellipse(ox + 2, oy + 6, spec.length * 0.52, spec.width * 0.48, -0.42, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();

  if (spec.isVanOrTruck === 'moto') {
    drawMotorcycle(ctx, ox, oy, dir, colors);
    return;
  }

  // Oriented box dims: SE travels along +x, NE travels along -y
  const w = dir === 'se' ? spec.length : spec.width;
  const d = dir === 'se' ? spec.width : spec.length;
  const x0 = -w * 0.5;
  const y0 = -d * 0.5;

  // Wheels (drawn slightly proud on visible sides)
  const wheelOffsets =
    dir === 'se'
      ? [
          { x: x0 + 10, y: d * 0.5 },
          { x: x0 + w - 16, y: d * 0.5 },
        ]
      : [
          { x: w * 0.5, y: y0 + 10 },
          { x: w * 0.5, y: y0 + d - 16 },
        ];

  for (const wo of wheelOffsets) {
    const wp = localIso(ox, oy, wo.x + 3, wo.y + 1, 5);
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(wp.x, wp.y, 7, 8.5, dir === 'se' ? -0.3 : 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.ellipse(wp.x, wp.y, 3.4, 4.2, dir === 'se' ? -0.3 : 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lower chassis body
  drawIsoBox(ctx, ox, oy, x0, y0, 5, w, d, spec.bodyHeight, {
    top: colors.highlight,
    left: colors.primary,
    right: colors.secondary,
    stroke: 'rgba(15,23,42,0.55)',
  });

  if (spec.isVanOrTruck === 'truck') {
    // Delivery truck cargo container + front cab
    if (dir === 'se') {
      // Cargo box rear
      drawIsoBox(ctx, ox, oy, x0, y0 - 1, 18, spec.length * 0.65, d + 2, 26, {
        top: '#FFFFFF',
        left: '#E2E8F0',
        right: '#94A3B8',
      });
      // Red/yellow brand stripe on cargo side
      const s0 = localIso(ox, oy, x0 + 4, y0 + d + 1.4, 34);
      const s1 = localIso(ox, oy, x0 + spec.length * 0.6, y0 + d + 1.4, 34);
      const s2 = localIso(ox, oy, x0 + spec.length * 0.6, y0 + d + 1.4, 26);
      const s3 = localIso(ox, oy, x0 + 4, y0 + d + 1.4, 26);
      drawPoly(ctx, [s0, s1, s2, s3], PALETTE.GAS_RED);

      // Front cab
      drawIsoBox(ctx, ox, oy, x0 + spec.length * 0.68, y0 + 1, 18, 22, d - 2, 18, {
        top: '#FDE047',
        left: PALETTE.GAS_YELLOW,
        right: PALETTE.GAS_YELLOW_DARK,
      });
      // Cab windshield
      const ws0 = localIso(ox, oy, x0 + spec.length * 0.68 + 22.4, y0 + 4, 33);
      const ws1 = localIso(ox, oy, x0 + spec.length * 0.68 + 22.4, y0 + d - 4, 33);
      const ws2 = localIso(ox, oy, x0 + spec.length * 0.68 + 22.4, y0 + d - 4, 22);
      const ws3 = localIso(ox, oy, x0 + spec.length * 0.68 + 22.4, y0 + 4, 22);
      drawPoly(ctx, [ws0, ws1, ws2, ws3], '#38BDF8', '#0F172A', 1);
    } else {
      // NE orientation
      drawIsoBox(ctx, ox, oy, x0 - 1, y0 + spec.length * 0.35, 18, w + 2, spec.length * 0.65, 26, {
        top: '#FFFFFF',
        left: '#E2E8F0',
        right: '#94A3B8',
      });
      drawIsoBox(ctx, ox, oy, x0 + 1, y0 + 2, 18, w - 2, 22, 18, {
        top: '#FDE047',
        left: PALETTE.GAS_YELLOW,
        right: PALETTE.GAS_YELLOW_DARK,
      });
    }
    return;
  }

  // Cabin / greenhouse
  const cw = dir === 'se' ? spec.cabinLength : spec.width - 5;
  const cd = dir === 'se' ? spec.width - 5 : spec.cabinLength;
  const cx0 = dir === 'se' ? -cw * 0.5 + spec.cabinOffset : -cw * 0.5;
  const cy0 = dir === 'se' ? -cd * 0.5 : -cd * 0.5 - spec.cabinOffset;

  drawIsoBox(ctx, ox, oy, cx0, cy0, 5 + spec.bodyHeight, cw, cd, spec.cabinHeight, {
    top: colors.highlight,
    left: colors.primary,
    right: colors.secondary,
    stroke: 'rgba(15,23,42,0.5)',
  });

  // Tinted glass windows with sky specular highlights
  if (dir === 'se') {
    // Side window (SW face)
    const sw0 = localIso(ox, oy, cx0 + 4, cy0 + cd + 0.4, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const sw1 = localIso(ox, oy, cx0 + cw - 4, cy0 + cd + 0.4, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const sw2 = localIso(ox, oy, cx0 + cw - 3, cy0 + cd + 0.4, 5 + spec.bodyHeight + 2);
    const sw3 = localIso(ox, oy, cx0 + 3, cy0 + cd + 0.4, 5 + spec.bodyHeight + 2);
    drawPoly(ctx, [sw0, sw1, sw2, sw3], '#38BDF8', '#1E293B', 1);

    // Front windshield (SE face)
    const fw0 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + 2, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const fw1 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + cd - 2, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const fw2 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + cd - 2, 5 + spec.bodyHeight + 2);
    const fw3 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + 2, 5 + spec.bodyHeight + 2);
    drawPoly(ctx, [fw0, fw1, fw2, fw3], '#7DD3FC', '#1E293B', 1);

    // Headlights
    for (const ly of [y0 + 3, y0 + d - 7]) {
      const h0 = localIso(ox, oy, x0 + w + 0.4, ly, 13);
      const h1 = localIso(ox, oy, x0 + w + 0.4, ly + 4, 13);
      const h2 = localIso(ox, oy, x0 + w + 0.4, ly + 4, 9);
      const h3 = localIso(ox, oy, x0 + w + 0.4, ly, 9);
      drawPoly(ctx, [h0, h1, h2, h3], '#FEF08A');
    }
  } else {
    // NE: Side window (SE face) + Rear/Front glass
    const sw0 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + 4, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const sw1 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + cd - 4, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const sw2 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + cd - 3, 5 + spec.bodyHeight + 2);
    const sw3 = localIso(ox, oy, cx0 + cw + 0.4, cy0 + 3, 5 + spec.bodyHeight + 2);
    drawPoly(ctx, [sw0, sw1, sw2, sw3], '#38BDF8', '#1E293B', 1);

    // Tail window (SW face)
    const rw0 = localIso(ox, oy, cx0 + 2, cy0 + cd + 0.4, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const rw1 = localIso(ox, oy, cx0 + cw - 2, cy0 + cd + 0.4, 5 + spec.bodyHeight + spec.cabinHeight - 2);
    const rw2 = localIso(ox, oy, cx0 + cw - 2, cy0 + cd + 0.4, 5 + spec.bodyHeight + 2);
    const rw3 = localIso(ox, oy, cx0 + 2, cy0 + cd + 0.4, 5 + spec.bodyHeight + 2);
    drawPoly(ctx, [rw0, rw1, rw2, rw3], '#7DD3FC', '#1E293B', 1);

    // Taillights
    for (const lx of [x0 + 3, x0 + w - 7]) {
      const t0 = localIso(ox, oy, lx, y0 + d + 0.4, 13);
      const t1 = localIso(ox, oy, lx + 4, y0 + d + 0.4, 13);
      const t2 = localIso(ox, oy, lx + 4, y0 + d + 0.4, 9);
      const t3 = localIso(ox, oy, lx, y0 + d + 0.4, 9);
      drawPoly(ctx, [t0, t1, t2, t3], '#EF4444');
    }
  }
}

function drawMotorcycle(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  dir: 'se' | 'ne',
  colors: { primary: string; secondary: string; highlight: string }
): void {
  const dx = dir === 'se' ? 10 : 10;
  const dy = dir === 'se' ? 5 : -5;

  // Front & rear wheels
  for (const m of [-1, 1]) {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(ox + m * dx, oy + m * dy, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.ellipse(ox + m * dx, oy + m * dy, 2.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sleek fairing body
  drawIsoBox(
    ctx,
    ox,
    oy,
    dir === 'se' ? -12 : -5,
    dir === 'se' ? -5 : -12,
    5,
    dir === 'se' ? 24 : 10,
    dir === 'se' ? 10 : 24,
    9,
    {
      top: colors.highlight,
      left: colors.primary,
      right: colors.secondary,
    }
  );
}
