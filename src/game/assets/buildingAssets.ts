import Phaser from 'phaser';
import { PALETTE } from '../palette';
import { drawIsoBox, drawPoly, localIso, registerCanvasTexture } from './isoMath';

/**
 * Generates all modular 2.5D isometric building & station equipment textures
 * matching the reference image's exact style, colors, and lighting.
 */
export function registerBuildingTextures(scene: Phaser.Scene): void {
  createFuelPumpTexture(scene);
  createCanopyPillarsTexture(scene);
  createCanopyRoofTexture(scene);
  createShopBuildingTexture(scene);
  createRoomsBuildingTexture(scene);
  createCarWashFrameTexture(scene);
  createCarWashFrontTexture(scene);
  createCarWashBrushSpritesheet(scene);
  createFuelTankTexture(scene);
}

function drawFlameLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.GAS_RED;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = PALETTE.GAS_YELLOW;
  ctx.stroke();

  // Golden droplet inside
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 0.62);
  ctx.bezierCurveTo(
    cx + radius * 0.55,
    cy - radius * 0.05,
    cx + radius * 0.5,
    cy + radius * 0.55,
    cx,
    cy + radius * 0.58
  );
  ctx.bezierCurveTo(
    cx - radius * 0.5,
    cy + radius * 0.55,
    cx - radius * 0.55,
    cy - radius * 0.05,
    cx,
    cy - radius * 0.62
  );
  ctx.fillStyle = PALETTE.GAS_YELLOW;
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(cx - radius * 0.14, cy + radius * 0.12, radius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF7AE';
  ctx.fill();
  ctx.restore();
}

function createFuelPumpTexture(scene: Phaser.Scene): void {
  // Detailed red & white double-sided fuel pump dispenser + green/red hoses
  registerCanvasTexture(scene, 'fuel_pump', 100, 120, (ctx) => {
    const ox = 50;
    const oy = 96;

    // Soft shadow
    ctx.save();
    ctx.fillStyle = PALETTE.SHADOW_COLOR;
    ctx.beginPath();
    ctx.ellipse(ox + 6, oy + 4, 24, 12, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Concrete base plinth
    drawIsoBox(ctx, ox, oy, -14, -10, 0, 28, 20, 5, {
      top: '#E2E8F0',
      left: '#CBD5E1',
      right: '#94A3B8',
    });

    // Lower red cabinet
    drawIsoBox(ctx, ox, oy, -11, -7, 5, 22, 14, 18, {
      top: '#EF4444',
      left: PALETTE.GAS_RED,
      right: PALETTE.GAS_RED_DARK,
    });

    // White upper dispenser frame
    drawIsoBox(ctx, ox, oy, -10, -6, 23, 20, 12, 26, {
      top: '#FFFFFF',
      left: '#F1F5F9',
      right: '#CBD5E1',
    });

    // Red top cap
    drawIsoBox(ctx, ox, oy, -11, -7, 49, 22, 14, 7, {
      top: '#F87171',
      left: PALETTE.GAS_RED,
      right: PALETTE.GAS_RED_DARK,
    });

    // Digital display screen on SW face
    const s0 = localIso(ox, oy, -7, 6.2, 43);
    const s1 = localIso(ox, oy, 7, 6.2, 43);
    const s2 = localIso(ox, oy, 7, 6.2, 31);
    const s3 = localIso(ox, oy, -7, 6.2, 31);
    drawPoly(ctx, [s0, s1, s2, s3], '#0F172A', '#475569', 1);

    // Glowing green LED digits line
    const l0 = localIso(ox, oy, -5, 6.4, 39);
    const l1 = localIso(ox, oy, 4, 6.4, 39);
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l0.x, l0.y);
    ctx.lineTo(l1.x, l1.y);
    ctx.stroke();

    // Curved fuel hose (black) + green nozzle on side
    const hStart = localIso(ox, oy, 10, 0, 40);
    const hCtrl = localIso(ox, oy, 17, 6, 20);
    const hEnd = localIso(ox, oy, 10, 4, 24);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hStart.x, hStart.y);
    ctx.quadraticCurveTo(hCtrl.x, hCtrl.y, hEnd.x, hEnd.y);
    ctx.stroke();

    // Green nozzle handle
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(hStart.x - 2, hStart.y - 3, 5, 7);

    // Small red safety bollard beside pump
    drawIsoBox(ctx, ox, oy, -19, 3, 0, 4, 4, 15, {
      top: '#FCA5A5',
      left: '#EF4444',
      right: '#991B1B',
    });
  });
}

function createCanopyPillarsTexture(scene: Phaser.Scene): void {
  // Island raised concrete pads + 4 white/silver structural canopy pillars
  registerCanvasTexture(scene, 'canopy_pillars', 520, 320, (ctx) => {
    const ox = 260;
    const oy = 180;

    // Two parallel concrete pump islands
    const islands = [
      { x: -120, y: -32 },
      { x: -25, y: 52 },
    ];

    for (const isl of islands) {
      drawIsoBox(ctx, ox, oy, isl.x, isl.y, 0, 156, 30, 6, {
        top: '#E2E8F0',
        left: '#CBD5E1',
        right: '#94A3B8',
      });
    }

    // 4 Support Pillars (2 per island)
    const pillarPositions = [
      { x: -102, y: -24 },
      { x: 10, y: -24 },
      { x: -8, y: 60 },
      { x: 104, y: 60 },
    ];

    for (const p of pillarPositions) {
      // Base red/grey bumper collar
      drawIsoBox(ctx, ox, oy, p.x - 2, p.y - 2, 6, 18, 18, 18, {
        top: '#E2E8F0',
        left: '#CBD5E1',
        right: '#94A3B8',
      });
      // Tall white pillar column
      drawIsoBox(ctx, ox, oy, p.x, p.y, 24, 14, 14, 108, {
        top: '#FFFFFF',
        left: PALETTE.CANOPY_PILLAR,
        right: PALETTE.CANOPY_PILLAR_SHADE,
      });
      // Red accent stripe near top
      drawIsoBox(ctx, ox, oy, p.x - 0.5, p.y - 0.5, 112, 15, 15, 8, {
        top: '#EF4444',
        left: PALETTE.GAS_RED,
        right: PALETTE.GAS_RED_DARK,
      });
    }
  });
}

function createCanopyRoofTexture(scene: Phaser.Scene): void {
  // Overhead Gas Station Canopy Roof with "GAS STATION" lettering, yellow trim & teardrop logo
  registerCanvasTexture(scene, 'canopy_roof', 560, 320, (ctx) => {
    const ox = 280;
    const oy = 195;

    // Canopy dimensions in local iso space
    const x = -155;
    const y = -65;
    const w = 290;
    const d = 175;
    const zBase = 122;

    // Yellow bottom trim band
    drawIsoBox(ctx, ox, oy, x, y, zBase, w, d, 10, {
      top: '#FDE047',
      left: PALETTE.GAS_YELLOW,
      right: PALETTE.GAS_YELLOW_DARK,
    });

    // Main bold red fascia
    drawIsoBox(ctx, ox, oy, x - 2, y - 2, zBase + 10, w + 4, d + 4, 28, {
      top: '#CBD5E1',
      left: PALETTE.GAS_RED,
      right: PALETTE.GAS_RED_DARK,
    });

    // Metallic silver-blue skylight roof cap
    drawIsoBox(ctx, ox, oy, x + 8, y + 8, zBase + 38, w - 16, d - 16, 4, {
      top: PALETTE.CANOPY_ROOF,
      left: PALETTE.CANOPY_ROOF_SHADE,
      right: '#64748B',
    });

    // Inner recessed roof panel skylight sheen with architectural crossbars
    const sk0 = localIso(ox, oy, x + 28, y + 26, zBase + 42.5);
    const sk1 = localIso(ox, oy, x + w - 28, y + 26, zBase + 42.5);
    const sk2 = localIso(ox, oy, x + w - 28, y + d - 26, zBase + 42.5);
    const sk3 = localIso(ox, oy, x + 28, y + d - 26, zBase + 42.5);
    drawPoly(ctx, [sk0, sk1, sk2, sk3], '#DCE9F5', '#94A3B8', 1.4);

    for (let rib = 1; rib <= 3; rib++) {
      const rx = x + 28 + ((w - 56) * rib) / 4;
      const rTop = localIso(ox, oy, rx, y + 26, zBase + 43);
      const rBot = localIso(ox, oy, rx, y + d - 26, zBase + 43);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rTop.x, rTop.y);
      ctx.lineTo(rBot.x, rBot.y);
      ctx.stroke();
    }

    // "GAS STATION" bold white lettering projected onto the front-SW fascia (y = y + d)
    const signLeft = localIso(ox, oy, x + 55, y + d + 2.5, zBase + 24);
    const signRight = localIso(ox, oy, x + w - 15, y + d + 2.5, zBase + 24);
    const angle = Math.atan2(signRight.y - signLeft.y, signRight.x - signLeft.x);

    ctx.save();
    ctx.translate((signLeft.x + signRight.x) * 0.5, (signLeft.y + signRight.y) * 0.5);
    ctx.rotate(angle);
    ctx.transform(1, 0, -0.25, 0.92, 0, 0);
    ctx.font = '800 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillText('GAS STATION', 1.5, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('GAS STATION', 0, 0);
    ctx.restore();

    // Circular flame droplet logo on left end of SW fascia
    const logoPos = localIso(ox, oy, x + 32, y + d + 3, zBase + 25);
    drawFlameLogo(ctx, logoPos.x, logoPos.y, 17);
  });
}

function createShopBuildingTexture(scene: Phaser.Scene): void {
  // Convenience Store ("SHOP") with glass windows, visible shelves, rooftop HVAC units
  registerCanvasTexture(scene, 'shop_building', 420, 320, (ctx) => {
    const ox = 205;
    const oy = 225;

    // Ground drop shadow
    ctx.save();
    const sh0 = localIso(ox, oy, -110, -70, 0);
    const sh1 = localIso(ox, oy, 130, -70, 0);
    const sh2 = localIso(ox, oy, 145, 95, 0);
    const sh3 = localIso(ox, oy, -95, 95, 0);
    drawPoly(ctx, [sh0, sh1, sh2, sh3], PALETTE.SHADOW_SOFT);
    ctx.restore();

    // Raised concrete sidewalk apron
    drawIsoBox(ctx, ox, oy, -120, -78, 0, 235, 165, 5, {
      top: PALETTE.SIDEWALK_TOP,
      left: PALETTE.SIDEWALK_SIDE,
      right: '#8C857A',
    });

    // Main store body (cream stucco)
    drawIsoBox(ctx, ox, oy, -102, -64, 5, 198, 126, 86, {
      top: '#E2DDD4',
      left: PALETTE.SHOP_WALL,
      right: PALETTE.SHOP_WALL_SHADE,
    });

    // Large isometric storefront glass window on SW face (y = 62)
    const w0 = localIso(ox, oy, -86, 62.5, 76);
    const w1 = localIso(ox, oy, 22, 62.5, 76);
    const w2 = localIso(ox, oy, 22, 62.5, 16);
    const w3 = localIso(ox, oy, -86, 62.5, 16);

    const glassGrad = ctx.createLinearGradient(w0.x, w0.y, w2.x, w2.y);
    glassGrad.addColorStop(0, '#5B9BD5');
    glassGrad.addColorStop(0.5, '#89C4E8');
    glassGrad.addColorStop(1, '#4682B4');
    drawPoly(ctx, [w0, w1, w2, w3], glassGrad, '#334155', 2);

    // Colorful product shelves visible inside the glass window
    const shelfColors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899'];
    for (let row = 0; row < 3; row++) {
      const sz = 28 + row * 15;
      for (let col = 0; col < 7; col++) {
        const sx = -78 + col * 13;
        const p0 = localIso(ox, oy, sx, 62.7, sz + 8);
        const p1 = localIso(ox, oy, sx + 9, 62.7, sz + 8);
        const p2 = localIso(ox, oy, sx + 9, 62.7, sz);
        const p3 = localIso(ox, oy, sx, 62.7, sz);
        drawPoly(
          ctx,
          [p0, p1, p2, p3],
          shelfColors[(row * 3 + col) % shelfColors.length],
          'rgba(15,23,42,0.3)',
          0.7
        );
      }
    }

    // Diagonal specular window reflections
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const rA = localIso(ox, oy, -72, 62.8, 72);
    const rB = localIso(ox, oy, -44, 62.8, 20);
    ctx.moveTo(rA.x, rA.y);
    ctx.lineTo(rB.x, rB.y);
    ctx.stroke();
    ctx.restore();

    // Double glass entrance door on SW right side
    const d0 = localIso(ox, oy, 36, 62.5, 68);
    const d1 = localIso(ox, oy, 78, 62.5, 68);
    const d2 = localIso(ox, oy, 78, 62.5, 6);
    const d3 = localIso(ox, oy, 36, 62.5, 6);
    drawPoly(ctx, [d0, d1, d2, d3], '#7EC8EE', '#1E293B', 2);

    // Door center mullion
    const dmTop = localIso(ox, oy, 57, 62.8, 68);
    const dmBot = localIso(ox, oy, 57, 62.8, 6);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dmTop.x, dmTop.y);
    ctx.lineTo(dmBot.x, dmBot.y);
    ctx.stroke();

    // Yellow trim + Red Fascia Sign Band
    drawIsoBox(ctx, ox, oy, -106, -68, 88, 206, 134, 5, {
      top: '#FDE047',
      left: PALETTE.GAS_YELLOW,
      right: PALETTE.GAS_YELLOW_DARK,
    });
    drawIsoBox(ctx, ox, oy, -106, -68, 93, 206, 134, 24, {
      top: '#CBD5E1',
      left: PALETTE.GAS_RED,
      right: PALETTE.GAS_RED_DARK,
    });

    // "SHOP" text on SW fascia
    const sL = localIso(ox, oy, -65, 66.5, 105);
    const sR = localIso(ox, oy, 55, 66.5, 105);
    const sAngle = Math.atan2(sR.y - sL.y, sR.x - sL.x);
    ctx.save();
    ctx.translate((sL.x + sR.x) * 0.5, (sL.y + sR.y) * 0.5);
    ctx.rotate(sAngle);
    ctx.font = '800 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SHOP', 0, 0);
    ctx.restore();

    // Side logo on SE fascia
    const sideLogo = localIso(ox, oy, 100.5, 2, 105);
    drawFlameLogo(ctx, sideLogo.x, sideLogo.y, 12);

    // Rooftop HVAC AC units (3 metallic boxes with circular fan vents)
    const hvacOffsets = [-68, -12, 44];
    for (const hx of hvacOffsets) {
      drawIsoBox(ctx, ox, oy, hx, -24, 117, 34, 30, 18, {
        top: '#D1CCC2',
        left: PALETTE.HVAC_METAL,
        right: PALETTE.HVAC_METAL_SHADE,
      });
      // Fan grille circle on SW face
      const fPos = localIso(ox, oy, hx + 17, 6.5, 126);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(fPos.x, fPos.y, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small potted plants beside entrance
    for (const px of [-94, 88]) {
      drawIsoBox(ctx, ox, oy, px, 68, 5, 10, 10, 8, {
        top: '#A855F7',
        left: '#B45309',
        right: '#78350F',
      });
      const bushPos = localIso(ox, oy, px + 5, 73, 18);
      ctx.fillStyle = PALETTE.GRASS_BASE;
      ctx.beginPath();
      ctx.arc(bushPos.x, bushPos.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function createRoomsBuildingTexture(scene: Phaser.Scene): void {
  // "ROOMS FOR RENT" motel building with cobalt blue sign, 3 brown doors & lit windows
  registerCanvasTexture(scene, 'rooms_building', 380, 290, (ctx) => {
    const ox = 185;
    const oy = 210;

    // Raised concrete walkway
    drawIsoBox(ctx, ox, oy, -110, -56, 0, 224, 124, 5, {
      top: PALETTE.SIDEWALK_TOP,
      left: PALETTE.SIDEWALK_SIDE,
      right: '#8C857A',
    });

    // Main beige/cream building
    drawIsoBox(ctx, ox, oy, -98, -46, 5, 198, 92, 68, {
      top: '#EFE8DC',
      left: PALETTE.ROOMS_WALL,
      right: PALETTE.ROOMS_WALL_SHADE,
    });

    // Dark shingled roof
    drawIsoBox(ctx, ox, oy, -104, -52, 73, 210, 104, 10, {
      top: PALETTE.ROOMS_ROOF,
      left: PALETTE.ROOMS_ROOF_SHADE,
      right: '#272421',
    });

    // Cobalt Blue Rooftop Signboard ("ROOMS FOR RENT")
    drawIsoBox(ctx, ox, oy, -72, 22, 83, 128, 12, 34, {
      top: '#3B82F6',
      left: PALETTE.ROOMS_BLUE,
      right: PALETTE.ROOMS_BLUE_DARK,
    });

    const signL = localIso(ox, oy, -54, 34.5, 100);
    const signR = localIso(ox, oy, 50, 34.5, 100);
    const angle = Math.atan2(signR.y - signL.y, signR.x - signL.x);
    ctx.save();
    ctx.translate((signL.x + signR.x) * 0.5, (signL.y + signR.y) * 0.5);
    ctx.rotate(angle);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ROOMS', 6, -6);
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillText('FOR RENT', 6, 7);
    // Small white house icon on left of sign
    ctx.beginPath();
    ctx.moveTo(-42, -2);
    ctx.lineTo(-33, -10);
    ctx.lineTo(-24, -2);
    ctx.lineTo(-24, 9);
    ctx.lineTo(-42, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3 Individual Room Doors + Adjacent Warm Windows along SW facade (y = 46)
    const doorXs = [-82, -14, 54];
    for (let i = 0; i < doorXs.length; i++) {
      const dx = doorXs[i];
      // Wooden door
      const d0 = localIso(ox, oy, dx, 46.5, 50);
      const d1 = localIso(ox, oy, dx + 22, 46.5, 50);
      const d2 = localIso(ox, oy, dx + 22, 46.5, 6);
      const d3 = localIso(ox, oy, dx, 46.5, 6);
      drawPoly(ctx, [d0, d1, d2, d3], PALETTE.DOOR_WOOD, '#3E2723', 1.6);

      // Brass doorknob
      const knob = localIso(ox, oy, dx + 17, 46.8, 26);
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(knob.x, knob.y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Cozy lit window beside each door
      const wx = dx + 28;
      const w0 = localIso(ox, oy, wx, 46.5, 48);
      const w1 = localIso(ox, oy, wx + 26, 46.5, 48);
      const w2 = localIso(ox, oy, wx + 26, 46.5, 22);
      const w3 = localIso(ox, oy, wx, 46.5, 22);
      drawPoly(ctx, [w0, w1, w2, w3], '#FDE68A', '#78350F', 1.6);
    }
  });
}

function createCarWashFrameTexture(scene: Phaser.Scene): void {
  // Back wall & wet soapy floor of the Car Wash bay (drawn UNDER the washing car)
  registerCanvasTexture(scene, 'carwash_back', 280, 240, (ctx) => {
    const ox = 140;
    const oy = 175;

    // Concrete wash bay pad
    drawIsoBox(ctx, ox, oy, -72, -62, 0, 144, 124, 4, {
      top: '#94A3B8',
      left: '#64748B',
      right: '#475569',
    });

    // Soapy foam puddle inside bay
    const f0 = localIso(ox, oy, -54, -42, 4.5);
    const f1 = localIso(ox, oy, 54, -42, 4.5);
    const f2 = localIso(ox, oy, 54, 48, 4.5);
    const f3 = localIso(ox, oy, -54, 48, 4.5);
    drawPoly(ctx, [f0, f1, f2, f3], 'rgba(186, 230, 253, 0.72)');

    // Far back-left wall (y = -60) & back-right wall (x = -70)
    drawIsoBox(ctx, ox, oy, -70, -60, 4, 140, 8, 72, {
      top: '#38BDF8',
      left: PALETTE.CARWASH_TEAL,
      right: PALETTE.CARWASH_BLUE_DARK,
    });
  });
}

function createCarWashFrontTexture(scene: Phaser.Scene): void {
  // Front/top arch & translucent side window of Car Wash (drawn OVER the washing car)
  registerCanvasTexture(scene, 'carwash_front', 280, 240, (ctx) => {
    const ox = 140;
    const oy = 175;

    // Front right pillar & translucent cyan side wall (x = 62)
    drawIsoBox(ctx, ox, oy, 62, -56, 4, 8, 114, 72, {
      top: '#60A5FA',
      left: 'rgba(56, 189, 248, 0.35)',
      right: PALETTE.CARWASH_TEAL,
    });

    // Front left pillar (x = -70, y = 50)
    drawIsoBox(ctx, ox, oy, -70, 48, 4, 12, 12, 72, {
      top: '#60A5FA',
      left: PALETTE.CARWASH_BLUE,
      right: PALETTE.CARWASH_BLUE_DARK,
    });

    // Roof canopy of Car Wash
    drawIsoBox(ctx, ox, oy, -74, -64, 76, 148, 128, 10, {
      top: '#E0F2FE',
      left: '#7DD3FC',
      right: '#0284C7',
    });

    // Bold Blue "CAR WASH" front fascia sign (y = 54)
    drawIsoBox(ctx, ox, oy, -74, 48, 70, 148, 16, 26, {
      top: '#60A5FA',
      left: PALETTE.CARWASH_BLUE,
      right: PALETTE.CARWASH_BLUE_DARK,
    });

    const cL = localIso(ox, oy, -38, 64.5, 83);
    const cR = localIso(ox, oy, 58, 64.5, 83);
    const angle = Math.atan2(cR.y - cL.y, cR.x - cL.x);
    ctx.save();
    ctx.translate((cL.x + cR.x) * 0.5, (cL.y + cR.y) * 0.5);
    ctx.rotate(angle);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CAR WASH', 6, 0);
    // White car droplet icon left of text
    ctx.beginPath();
    ctx.arc(-44, 0, 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });
}

function createCarWashBrushSpritesheet(scene: Phaser.Scene): void {
  // 4-frame animated spinning vertical blue roller brush
  const fw = 48;
  const fh = 76;
  const key = 'carwash_brush';
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, fw * 4, fh);
  if (!tex) return;
  const ctx = tex.getContext();

  for (let frame = 0; frame < 4; frame++) {
    const cx = frame * fw + fw / 2;
    const phase = (frame / 4) * Math.PI * 0.5;

    // Vertical axle
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(cx - 2, 4, 4, fh - 8);

    // Dense cobalt & sky-blue bristle rings
    for (let y = 10; y < fh - 10; y += 5) {
      const bristleW = 14 + Math.sin(y * 0.4 + phase * 4) * 3;
      ctx.fillStyle = y % 10 === 0 ? '#1D4ED8' : '#2563EB';
      ctx.beginPath();
      ctx.ellipse(cx, y, bristleW, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highlight tips rotating across frames
      const tipX = cx + Math.cos(phase + y * 0.3) * (bristleW * 0.7);
      ctx.fillStyle = '#93C5FD';
      ctx.fillRect(tipX - 2, y - 1.5, 4, 3);
    }
  }
  tex.refresh();

  // Slice spritesheet frames manually
  for (let i = 0; i < 4; i++) {
    tex.add(i, 0, i * fw, 0, fw, fh);
  }
}

function createFuelTankTexture(scene: Phaser.Scene): void {
  // Underground fuel storage manifold + cylindrical reserve tank & safety cones
  registerCanvasTexture(scene, 'fuel_tank', 140, 110, (ctx) => {
    const ox = 70;
    const oy = 84;

    drawIsoBox(ctx, ox, oy, -38, -24, 0, 76, 48, 5, {
      top: '#CBD5E1',
      left: '#94A3B8',
      right: '#64748B',
    });

    // Reserve tank drum
    drawIsoBox(ctx, ox, oy, -28, -16, 5, 52, 26, 24, {
      top: '#F87171',
      left: PALETTE.GAS_RED,
      right: PALETTE.GAS_RED_DARK,
    });

    // Yellow hazard band & pressure gauge pipes
    drawIsoBox(ctx, ox, oy, -12, -16, 5, 16, 26, 25, {
      top: '#FDE047',
      left: PALETTE.GAS_YELLOW,
      right: PALETTE.GAS_YELLOW_DARK,
    });

    // Vertical fill pipe
    drawIsoBox(ctx, ox, oy, 16, 2, 29, 6, 6, 16, {
      top: '#E2E8F0',
      left: '#94A3B8',
      right: '#475569',
    });
  });
}
