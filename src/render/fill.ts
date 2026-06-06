// ============================================================
//  填充（纯色 / 线性 / 径向）→ Canvas fillStyle，以及对应的 CSS 文本
//  线性渐变采用 CSS 习惯角度（0° 朝上、顺时针），保证预览的 CSS
//  代码读数与画布一致。
// ============================================================
import type { FillValue } from '../types';
import type { Ctx } from './drawUtils';

/** CSS 角度 → 渐变线两端坐标（覆盖 w×h 矩形） */
export function cssLinearCoords(
  angleDeg: number,
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number, number, number] {
  const a = ((angleDeg % 360) + 360) % 360;
  const rad = (a * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2];
}

const clampPos = (p: number) => Math.max(0, Math.min(1, p / 100));

/** 由 FillValue 生成 Canvas fillStyle（覆盖给定矩形） */
export function fillToCanvas(
  ctx: Ctx,
  fill: FillValue,
  x: number,
  y: number,
  w: number,
  h: number,
): string | CanvasGradient {
  if (fill.mode === 'solid') return fill.c1;

  const stop = clampPos(fill.endPos);
  if (fill.gradType === 'radial') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.max(w, h) / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, fill.c1);
    g.addColorStop(stop, fill.c2);
    return g;
  }
  const [x0, y0, x1, y1] = cssLinearCoords(fill.angle, x, y, w, h);
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, fill.c1);
  g.addColorStop(stop, fill.c2);
  return g;
}

/** FillValue → 可显示/复制的 CSS 文本 */
export function fillToCss(fill: FillValue): string {
  if (fill.mode === 'solid') return fill.c1;
  if (fill.gradType === 'radial') {
    return `radial-gradient(circle, ${fill.c1} 0%, ${fill.c2} ${Math.round(fill.endPos)}%)`;
  }
  return `linear-gradient(${Math.round(fill.angle)}deg, ${fill.c1} 0%, ${fill.c2} ${Math.round(fill.endPos)}%)`;
}
