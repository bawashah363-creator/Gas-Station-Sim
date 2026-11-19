import Phaser from 'phaser';
import { PALETTE } from '../palette';
import { registerCanvasTexture, worldToIso } from './isoMath';

export const MAP_WIDTH = 3400;
export const MAP_HEIGHT = 2100;

/**
 * Renders the expanded isometric ground terrain: vibrant multi-tone lawns, wildflowers,
 * full edge-to-edge asphalt highways & crossroad, forecourt pad, markings, and arrows.
 */
export function registerGroundMapTexture(scene: Phaser.Scene): void {
  registerCanvasTexture(scene, 'ground_map', MAP_WIDTH, MAP_HEIGHT, (ctx) => {
    // 1. Rich 2.5D Sunlit Meadow & Turf Base
    const grassGrad = ctx.createLinearGradient(0, 0, MAP_WIDTH, MAP_HEIGHT);
    grassGrad.addColorStop(0, '#59B73B');
    grassGrad.addColorStop(0.5, PALETTE.GRASS_BASE);
    grassGrad.addColorStop(1, '#3A8724');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Subtle manicured mowing bands across expanded terrain
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.042)';
    for (let i = -42; i < 66; i += 2) {
      const a = worldToIso(i, -40);
      const b = worldToIso(i + 1, -40);
      const c = worldToIso(i + 1, 56);
      const d = worldToIso(i, 56);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const isInsideLotOrRoad = (wx: number, wy: number): boolean => {
      const inStation = wx > -3.0 && wx < 14.0 && wy > -0.4 && wy < 11.7;
      const inHighway = wy >= 11.1 && wy <= 15.6;
      const inSideRoad = wx >= -11.5 && wx <= -3.7 && wy <= 15.6;
      return inStation || inHighway || inSideRoad;
    };

    // Organic 2.5D turf variation patches on outer lawns
    for (let i = 0; i < 165; i++) {
      const px = ((i * 211) % 88) - 34;
      const py = ((i * 149) % 74) - 28;
      if (isInsideLotOrRoad(px, py)) continue;
      const pt = worldToIso(px, py);
      if (pt.x < -80 || pt.x > MAP_WIDTH + 80 || pt.y < -80 || pt.y > MAP_HEIGHT + 80) continue;
      const rx = 30 + (i % 6) * 11;
      const ry = 15 + (i % 5) * 5;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(116, 205, 82, 0.22)' : 'rgba(34, 92, 22, 0.14)';
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stylized 2.5D grass blade tufts & wildflowers on surrounding lawns
    const flowerColors = ['#FEF08A', '#F9A8D4', '#FFFFFF', '#7DD3FC'];
    for (let i = 0; i < 580; i++) {
      const fx = ((i * 173) % 88) - 34;
      const fy = ((i * 113) % 76) - 29;
      if (isInsideLotOrRoad(fx, fy)) continue;
      const pt = worldToIso(fx, fy);
      if (pt.x < -20 || pt.x > MAP_WIDTH + 20 || pt.y < -20 || pt.y > MAP_HEIGHT + 20) continue;

      if (i % 4 === 0) {
        ctx.fillStyle = '#367C20';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 1, 5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flowerColors[i % flowerColors.length];
        ctx.beginPath();
        ctx.arc(pt.x - 1.5, pt.y - 1.5, 2.2, 0, Math.PI * 2);
        ctx.arc(pt.x + 2, pt.y - 0.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(20, 62, 14, 0.22)';
        ctx.beginPath();
        ctx.ellipse(pt.x + 1, pt.y + 1.5, 5.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = i % 2 === 0 ? '#7CE058' : '#459B2C';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pt.x - 2, pt.y + 1);
        ctx.quadraticCurveTo(pt.x - 4, pt.y - 4, pt.x - 5, pt.y - 6);
        ctx.moveTo(pt.x, pt.y + 1);
        ctx.quadraticCurveTo(pt.x, pt.y - 5, pt.x + 0.5, pt.y - 8);
        ctx.moveTo(pt.x + 2, pt.y + 1);
        ctx.quadraticCurveTo(pt.x + 4, pt.y - 4, pt.x + 5, pt.y - 5.5);
        ctx.stroke();
      }
    }

    const drawIsoQuad = (
      wx1: number,
      wy1: number,
      wx2: number,
      wy2: number,
      fill: string,
      stroke?: string,
      lineWidth = 2
    ) => {
      const p0 = worldToIso(wx1, wy1);
      const p1 = worldToIso(wx2, wy1);
      const p2 = worldToIso(wx2, wy2);
      const p3 = worldToIso(wx1, wy2);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const drawIsoLine = (
      wx1: number,
      wy1: number,
      wx2: number,
      wy2: number,
      color: string,
      width: number,
      dashed = false
    ) => {
      const a = worldToIso(wx1, wy1);
      const b = worldToIso(wx2, wy2);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      if (dashed) ctx.setLineDash([16, 14]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    };

    // 2. Full-length Side/Rural Crossroad Avenue (wx: -11.2..-4.0, spanning top to bottom across highway)
    drawIsoQuad(-11.2, -38, -4.0, 50, PALETTE.ASPHALT_DARK);
    drawIsoLine(-11.0, -38, -11.0, 11.4, 'rgba(248, 250, 252, 0.55)', 2.2);
    drawIsoLine(-4.2, -38, -4.2, 11.4, 'rgba(248, 250, 252, 0.55)', 2.2);
    drawIsoLine(-11.0, 15.2, -11.0, 50, 'rgba(248, 250, 252, 0.55)', 2.2);
    drawIsoLine(-4.2, 15.2, -4.2, 50, 'rgba(248, 250, 252, 0.55)', 2.2);
    drawIsoLine(-7.6, -38, -7.6, 11.1, PALETTE.ROAD_YELLOW, 2.2, true);
    drawIsoLine(-7.6, 15.5, -7.6, 50, PALETTE.ROAD_YELLOW, 2.2, true);
    drawIsoLine(-10.8, 11.25, -4.4, 11.25, 'rgba(248, 250, 252, 0.72)', 3);

    // 3. Main Station Forecourt Asphalt Pad with crisp light-concrete border curb
    drawIsoQuad(-2.7, 0.0, 13.7, 11.55, '#B5AD9E');
    drawIsoQuad(-2.5, 0.2, 13.5, 11.4, PALETTE.ASPHALT_BASE, '#E2E8F0', 2.5);

    // Lighter brushed concrete pad under Fuel Pumps (wx: 0.4..4.7, wy: 3.4..8.45)
    drawIsoQuad(0.45, 3.35, 4.7, 8.45, '#606975', 'rgba(241, 245, 249, 0.45)', 2);

    // 4. Full Edge-to-Edge Main Foreground Highway (wx: -36..64, wy: 11.4..15.2)
    drawIsoQuad(-36, 11.4, 64, 15.2, PALETTE.ASPHALT_DARK);
    drawIsoLine(-36, 11.55, 64, 11.55, 'rgba(248, 250, 252, 0.78)', 2.8);
    drawIsoLine(-36, 15.05, 64, 15.05, 'rgba(248, 250, 252, 0.78)', 2.8);
    // Double yellow highway centerline across entire map width (skip crossroad junction)
    drawIsoLine(-36, 13.22, -11.4, 13.22, PALETTE.ROAD_YELLOW, 2.4, true);
    drawIsoLine(-36, 13.38, -11.4, 13.38, PALETTE.ROAD_YELLOW, 2.4, true);
    drawIsoLine(-3.8, 13.22, 64, 13.22, PALETTE.ROAD_YELLOW, 2.4, true);
    drawIsoLine(-3.8, 13.38, 64, 13.38, PALETTE.ROAD_YELLOW, 2.4, true);

    // Separated Entry (left) & Exit (right) Driveway Aprons
    drawIsoQuad(-0.95, 10.5, 0.95, 11.6, '#434A54');
    drawIsoQuad(7.65, 10.5, 9.25, 11.6, '#434A54');

    // Subtle entrance & exit white curb stop/guide lines
    drawIsoLine(-0.75, 10.7, -0.75, 11.5, 'rgba(255,255,255,0.45)', 2);
    drawIsoLine(0.65, 10.7, 0.65, 11.5, 'rgba(255,255,255,0.45)', 2);
    drawIsoLine(7.8, 10.7, 7.8, 11.5, 'rgba(255,255,255,0.45)', 2);
    drawIsoLine(9.05, 10.7, 9.05, 11.5, 'rgba(255,255,255,0.45)', 2);

    // Subtle dashed guide lines for arrival spine & departure exit lane
    drawIsoLine(-0.05, 5.15, -0.05, 10.8, 'rgba(255, 255, 255, 0.22)', 1.8, true);
    drawIsoLine(5.3, 5.15, 5.3, 8.15, 'rgba(255, 255, 255, 0.22)', 1.8, true);
    drawIsoLine(5.3, 8.15, 8.35, 8.15, 'rgba(255, 255, 255, 0.22)', 1.8, true);
    drawIsoLine(8.35, 8.15, 8.35, 11.5, 'rgba(255, 255, 255, 0.22)', 1.8, true);

    // 5. White Parking Stall Markings
    for (let i = 0; i < 4; i++) {
      const px = 4.5 + i * 1.05;
      drawIsoLine(px, 8.7, px, 10.35, PALETTE.ROAD_WHITE, 2.4);
    }
    drawIsoLine(4.5, 8.7, 7.65, 8.7, PALETTE.ROAD_WHITE, 2.4);

    // 6. Car Wash Entrance/Exit Yellow & Black Hazard Stripes
    for (let s = 0; s < 5; s++) {
      const sx = 9.45 + s * 0.45;
      drawIsoQuad(
        sx,
        9.4,
        sx + 0.24,
        10.2,
        s % 2 === 0 ? PALETTE.ROAD_YELLOW : '#1E293B'
      );
    }

    // 7. Directional Road Arrows (Yellow & White)
    const drawLaneArrow = (
      wx: number,
      wy: number,
      dx: number,
      dy: number,
      color: string = PALETTE.ROAD_YELLOW,
      len = 0.42
    ) => {
      const tail = worldToIso(wx - dx * len, wy - dy * len);
      const head = worldToIso(wx + dx * len, wy + dy * len);
      const angle = Math.atan2(head.y - tail.y, head.x - tail.x);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();

      ctx.translate(head.x, head.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Main Highway Arrows across full road width (Upper SE, Lower NW)
    [-22, -13.5, -2.5, 12.2, 22.5, 33.5, 44.5].forEach((ax) => {
      drawLaneArrow(ax, 12.25, 1, 0, 'rgba(248, 250, 252, 0.62)', 0.55);
      drawLaneArrow(ax + 4, 14.15, -1, 0, 'rgba(248, 250, 252, 0.55)', 0.55);
    });

    // Side Road Arrows
    drawLaneArrow(-5.8, 3.5, 0, 1, 'rgba(248, 250, 252, 0.55)', 0.5);
    drawLaneArrow(-9.4, 5.5, 0, -1, 'rgba(248, 250, 252, 0.55)', 0.5);

    // One-Way Station Entrance & Arrival Arrows (Left Side, NE)
    drawLaneArrow(-0.05, 10.9, 0, -1, '#4ADE80', 0.36);
    drawLaneArrow(-0.05, 8.9, 0, -1, PALETTE.ROAD_YELLOW, 0.34);
    drawLaneArrow(-0.05, 6.4, 0, -1, PALETTE.ROAD_YELLOW, 0.32);

    // One-Way Pump Bay Arrows (SE)
    drawLaneArrow(0.75, 5.15, 1, 0, PALETTE.ROAD_YELLOW, 0.28);
    drawLaneArrow(0.75, 7.45, 1, 0, PALETTE.ROAD_YELLOW, 0.28);

    // One-Way Departure Collector & Exit Lane Arrows (Right Side, SE -> SW)
    drawLaneArrow(6.7, 8.15, 1, 0, PALETTE.ROAD_YELLOW, 0.34);
    drawLaneArrow(8.35, 10.8, 0, 1, '#FBBF24', 0.36);

    // Subtle "IN" and "OUT" pavement stencils
    const drawPavementLabel = (wx: number, wy: number, text: string, color: string) => {
      const pt = worldToIso(wx, wy);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.font = '800 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
    drawPavementLabel(-0.52, 11.15, 'IN', 'rgba(134, 239, 172, 0.85)');
    drawPavementLabel(8.85, 11.15, 'OUT', 'rgba(253, 224, 71, 0.85)');

    // 8. Asphalt aggregate texture & subtle tire wear across forecourt & highway
    ctx.save();
    for (let i = 0; i < 460; i++) {
      const rx = ((i * 97) % 86) - 32;
      const ry = i % 3 === 0 ? ((i * 41) % 14) + 0.6 : 11.6 + ((i * 19) % 34) * 0.1;
      const pt = worldToIso(rx, ry);
      if (pt.x < -20 || pt.x > MAP_WIDTH + 20 || pt.y < -20 || pt.y > MAP_HEIGHT + 20) continue;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, 7 + (i % 6), 3.5 + (i % 3), 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}
