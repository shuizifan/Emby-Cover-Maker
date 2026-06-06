// ============================================================
//  海报绘制 + 无缝滚动（手册 §3.1 / §3.3 / §10.10）
// ============================================================
import type { RenderState } from '../types';
import { PLACEHOLDER_COLORS } from '../themes';
import { ctxScale, drawImageCover, imgReady, roundRect, type Ctx } from './drawUtils';
import { calcLayout, stripHeight } from './layout';

/** 旋转后画布四角会露背景，循环带垂直方向上下各延伸的份数（手册 §10.10） */
const STRIP_COPIES = 3;
const EDGE_INSET = 0.5;

function drawPosterShadow(ctx: Ctx, s: RenderState, x: number, y: number, w: number, h: number, radius: number): void {
  const shadow = s.posterShadow;
  if (!shadow || !shadow.enabled || shadow.opacity <= 0) return;

  const scale = ctxScale(ctx);
  const rad = (shadow.angle * Math.PI) / 180;
  const offsetX = Math.sin(rad) * shadow.distance * scale;
  const offsetY = -Math.cos(rad) * shadow.distance * scale;
  const spread = Math.max(0, shadow.spread);
  const alpha = Math.max(0, Math.min(1, shadow.opacity / 100));

  // 「投影源」与海报同位置、同尺寸，且用不透明黑填充：绘制后会被海报本体
  // 完全盖住，画布上只留下偏移 + 模糊后的投影本身。这样：
  //   · 投影浓淡完全由 shadowColor 的 alpha（= 不透明度）决定，滑块才真正生效；
  //   · 投影源不超出海报范围，不会在四周露出黑边（扩散并入模糊半径实现）。
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = (Math.max(0, shadow.blur) + spread) * scale;
  ctx.shadowOffsetX = offsetX;
  ctx.shadowOffsetY = offsetY;
  ctx.fillStyle = '#000';
  roundRect(ctx, x, y, w, h, Math.max(0, radius));
  ctx.fill();
  ctx.restore();
}

function drawPosterBody(
  ctx: Ctx,
  s: RenderState,
  posterIdx: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const radius = s.posterRadius;

  // 内容裁切到圆角内
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();

  const img = s.posters[posterIdx];
  if (imgReady(img)) {
    drawImageCover(ctx, img as CanvasImageSource, x, y, w, h);
  } else {
    // 占位：彩色渐变 + 序号
    const c = PLACEHOLDER_COLORS[posterIdx % PLACEHOLDER_COLORS.length];
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, c[0]);
    grad.addColorStop(1, c[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    const hl = ctx.createLinearGradient(x, y, x, y + h * 0.4);
    hl.addColorStop(0, 'rgba(255,255,255,0.22)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `bold ${Math.max(14, Math.min(w, h) * 0.32)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(posterIdx + 1), x + w / 2, y + h / 2);
  }
  ctx.restore();

  // 旋转后的硬裁切边在 GIF 量化后容易显得锯齿明显，用细描边压住边缘。
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1;
  roundRect(ctx, x + EDGE_INSET, y + EDGE_INSET, w - EDGE_INSET * 2, h - EDGE_INSET * 2, Math.max(0, radius - EDGE_INSET));
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, x + 0.15, y + 0.15, w - 0.3, h - 0.3, Math.max(0, radius - 0.15));
  ctx.stroke();
  ctx.restore();
}

/** 画单张海报（含投影、圆角裁切、cover 填充；空槽位画占位渐变） */
export function drawPosterAt(
  ctx: Ctx,
  s: RenderState,
  posterIdx: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  drawPosterShadow(ctx, s, x, y, w, h, s.posterRadius);
  drawPosterBody(ctx, s, posterIdx, x, y, w, h);
}

interface PosterPlacement {
  posterIdx: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 绘制整个海报滚动层（已在调用方完成旋转变换）。
 *
 * 单列无缝滚动（手册 §3.1）：
 *   循环带高度 L = N × (海报高 + 列内间距)
 *   y_offset(t) = direction × speed × t × L
 * 多列共同周期（手册 §3.3）：所有列用同一个 t，海报多的列滚得快，
 *   t 走完一圈时各列都回到起点（speed=1 时无缝）。
 */
export function drawPosterLayer(ctx: Ctx, s: RenderState, t: number): void {
  const H = s.height;
  const layout = calcLayout(s);
  const { posterH, posterW, colStartXs } = layout;
  const placements: PosterPlacement[] = [];

  let posterIdxBase = 0;
  for (let col = 0; col < s.cols; col++) {
    const c = s.columns[col];
    const N = c.count;
    const gap = c.gap;
    const L = stripHeight(N, gap, posterH);
    const offset = c.direction * c.speed * t * L;
    const colX = colStartXs[col];

    // 垂直方向上下各复制若干份循环带，保证旋转后边缘也覆盖到
    for (let copy = -STRIP_COPIES; copy <= STRIP_COPIES; copy++) {
      for (let i = 0; i < N; i++) {
        const globalIdx = posterIdxBase + i;
        const y = offset + copy * L + i * (posterH + gap);
        // 视口外的整张海报跳过，省绘制
        if (y > H + posterH * 1.5 || y + posterH < -posterH * 1.5) continue;
        placements.push({ posterIdx: globalIdx, x: colX, y, w: posterW, h: posterH });
      }
    }
    posterIdxBase += N;
  }

  for (const p of placements) {
    drawPosterShadow(ctx, s, p.x, p.y, p.w, p.h, s.posterRadius);
  }
  for (const p of placements) {
    drawPosterBody(ctx, s, p.posterIdx, p.x, p.y, p.w, p.h);
  }
}
