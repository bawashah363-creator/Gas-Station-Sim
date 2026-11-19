/**
 * Isometric 2.5D projection & Canvas 2D drawing primitives.
 * Matches the ~26.5° (2:1) isometric camera perspective of the reference image.
 */

export const ISO_ORIGIN_X = 1650;
export const ISO_ORIGIN_Y = 520;
export const TILE_W = 84;
export const TILE_H = 42;

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Convert world grid coordinates (wx, wy, wz) into screen isometric pixels.
 * +wx goes bottom-right (SE along the main road/station front).
 * +wy goes bottom-left (SW toward the street).
 * +wz goes straight up.
 */
export function worldToIso(wx: number, wy: number, wz = 0): Vec2 {
  return {
    x: ISO_ORIGIN_X + (wx - wy) * (TILE_W * 0.5),
    y: ISO_ORIGIN_Y + (wx + wy) * (TILE_H * 0.5) - wz,
  };
}

/**
 * Convert screen isometric pixels (at wz = 0) back to world grid coordinates.
 */
export function isoToWorld(sx: number, sy: number): Vec2 {
  const dx = sx - ISO_ORIGIN_X;
  const dy = sy - ISO_ORIGIN_Y;
  const halfW = TILE_W * 0.5;
  const halfH = TILE_H * 0.5;
  const wx = (dx / halfW + dy / halfH) * 0.5;
  const wy = (dy / halfH - dx / halfW) * 0.5;
  return { x: wx, y: wy };
}

/**
 * Local isometric offset helper for drawing standalone object sprites on an offscreen canvas.
 * +x goes SE (down-right), +y goes SW (down-left), +z goes Up.
 */
export function localIso(ox: number, oy: number, x: number, y: number, z = 0): Vec2 {
  return {
    x: ox + (x - y) * 0.8944,
    y: oy + (x + y) * 0.4472 - z,
  };
}

export function drawPoly(
  ctx: CanvasRenderingContext2D,
  pts: Vec2[],
  fill: string | CanvasGradient,
  stroke?: string,
  lineWidth = 1.4
): void {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export interface IsoBoxColors {
  top: string;
  left: string; // SW-facing face (x=0..w, y=d) -> visually bottom-left
  right: string; // SE-facing face (x=w, y=0..d) -> visually bottom-right
  stroke?: string;
}

/**
 * Draw a shaded 3D isometric prism from (x, y, z) with size (w along +x, d along +y, h along +z).
 */
export function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  colors: IsoBoxColors,
  lineWidth = 1.3
): void {
  const stroke = colors.stroke ?? 'rgba(15, 23, 42, 0.45)';

  // Top face (z + h)
  const t0 = localIso(ox, oy, x, y, z + h);
  const t1 = localIso(ox, oy, x + w, y, z + h);
  const t2 = localIso(ox, oy, x + w, y + d, z + h);
  const t3 = localIso(ox, oy, x, y + d, z + h);

  // Bottom visible corners
  const b1 = localIso(ox, oy, x + w, y, z);
  const b2 = localIso(ox, oy, x + w, y + d, z);
  const b3 = localIso(ox, oy, x, y + d, z);

  // Left-front face (y = y + d, facing +y / SW)
  drawPoly(ctx, [t3, t2, b2, b3], colors.left, stroke, lineWidth);
  // Right-front face (x = x + w, facing +x / SE)
  drawPoly(ctx, [t1, t2, b2, b1], colors.right, stroke, lineWidth);
  // Top face
  drawPoly(ctx, [t0, t1, t2, t3], colors.top, stroke, lineWidth);
}

/**
 * Create an offscreen canvas with crisp scaling and register it as a Phaser texture.
 */
export function registerCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): void {
  if (scene.textures.exists(key)) return;
  const canvasTex = scene.textures.createCanvas(key, width, height);
  if (!canvasTex) return;
  const ctx = canvasTex.getContext();
  ctx.clearRect(0, 0, width, height);
  drawFn(ctx, width, height);
  canvasTex.refresh();
}
