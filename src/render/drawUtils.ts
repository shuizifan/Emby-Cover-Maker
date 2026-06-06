// ============================================================
//  绘制工具函数（环境无关：浏览器 / node-canvas 通用）
// ============================================================
import type { DrawableImage } from '../types';

/** 渲染上下文。浏览器为 CanvasRenderingContext2D，node 验证时结构兼容。 */
export type Ctx = CanvasRenderingContext2D;

/** 图片是否已就绪可绘制 */
export function imgReady(img: DrawableImage | null | undefined): boolean {
  if (!img) return false;
  const a = img as unknown as { complete?: boolean; naturalWidth?: number; width?: number };
  const w = a.naturalWidth ?? a.width ?? 0;
  if (a.complete !== undefined) return a.complete && w > 0;
  return w > 0;
}

/** 取图片的自然尺寸（兼容 naturalWidth / width） */
export function imgSize(img: DrawableImage): { w: number; h: number } {
  const a = img as unknown as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  return {
    w: a.naturalWidth || a.width || 0,
    h: a.naturalHeight || a.height || 0,
  };
}

/**
 * 当前变换矩阵的等比缩放系数（对旋转不敏感，取变换后 x 轴长度）。
 * Canvas 的 shadowBlur / shadowOffsetX/Y 按设备像素计，不受 CTM 缩放影响，
 * 因此导出超采样(2x/3x)时阴影会相对缩水。需要据此手动放大，保证成片与预览一致。
 */
export function ctxScale(ctx: Ctx): number {
  const getT = (ctx as unknown as { getTransform?: () => DOMMatrix }).getTransform;
  if (typeof getT !== 'function') return 1;
  const m = getT.call(ctx);
  const k = Math.hypot(m.a, m.b);
  return k > 0 ? k : 1;
}

/** 圆角矩形路径 */
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 以 cover 模式绘制图片到目标矩形（铺满，可能裁掉边）。
 * 手册 §7.3：海报永远 cover，不允许 contain。
 */
export function drawImageCover(
  ctx: Ctx,
  img: DrawableImage,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  if (!imgReady(img)) return;
  const { w: nw, h: nh } = imgSize(img);
  if (!nw || !nh) return;
  const ia = nw / nh;
  const da = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = nw;
  let sh = nh;
  if (ia > da) {
    sw = nh * da;
    sx = (nw - sw) / 2;
  } else {
    sh = nw / da;
    sy = (nh - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** #rrggbb → "r, g, b"（用于 rgba()） */
export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

/** 带字间距绘制文本 */
export function drawTextLetterSpaced(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  spacing: number,
): void {
  if (!spacing) {
    ctx.fillText(text, x, y);
    return;
  }
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

/** 测量带字间距文本的总宽 */
export function measureTextLetterSpaced(ctx: Ctx, text: string, spacing: number): number {
  if (!spacing) return ctx.measureText(text).width;
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

/** 把文本切成排版用 token：拉丁词整体、CJK 单字、空格作为可断点 */
function splitTokens(text: string): string[] {
  const tokens: string[] = [];
  let buf = '';
  const isCJK = (c: string) => /[\u2E80-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/.test(c);
  for (const ch of text) {
    if (ch === ' ') {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(' ');
    } else if (isCJK(ch)) {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

/** 按最大宽度贪心换行（带字间距测量），中文按字断、英文按词断 */
export function wrapTextLines(ctx: Ctx, text: string, maxWidth: number, spacing: number): string[] {
  if (!text) return [''];
  const w = (s: string) => measureTextLetterSpaced(ctx, s, spacing);
  const tokens = splitTokens(text);
  const lines: string[] = [];
  let cur = '';
  for (const tk of tokens) {
    const trial = cur + tk;
    if (cur.trim() !== '' && w(trial.replace(/\s+$/, '')) > maxWidth) {
      lines.push(cur.replace(/\s+$/, ''));
      cur = tk === ' ' ? '' : tk;
    } else {
      cur = trial;
    }
  }
  const last = cur.replace(/\s+$/, '');
  if (last) lines.push(last);
  return lines.length ? lines : [''];
}
