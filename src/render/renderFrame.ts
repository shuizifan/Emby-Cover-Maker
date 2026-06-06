// ============================================================
//  核心渲染：render(ctx, s, t)，t ∈ [0, 1)
//  图层顺序自底向上（手册 §3.5）：
//    1. 背景层      — 不动、不旋转
//    2. 海报滚动层  — 旋转、滚动
//    3. 文字层      — 不动、不旋转，直接融入背景
// ============================================================
import type { RenderState } from '../types';
import type { Ctx } from './drawUtils';
import { drawBackground } from './background';
import { drawPosterLayer } from './posters';
import { drawTextOverlay } from './textOverlay';

export function render(ctx: Ctx, s: RenderState, t: number): void {
  const W = s.width;
  const H = s.height;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. 背景
  drawBackground(ctx, s);

  // 2. 海报滚动层（绕轴心旋转）
  //    旋转符号在实现层处理（手册 §10.2）：UI 的「倾斜角度」是顶部右倾度，
  //    Canvas Y 轴朝下，正角度即顺时针 = 顶部右倾，故直接用正角度。
  const pivotX = (W * s.pivotXPct) / 100;
  const pivotY = (H * s.pivotYPct) / 100;
  const tiltRad = (s.tiltDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(tiltRad);
  ctx.translate(-pivotX, -pivotY);
  drawPosterLayer(ctx, s, t);
  ctx.restore();

  // 3. 文字层
  drawTextOverlay(ctx, s);
}
