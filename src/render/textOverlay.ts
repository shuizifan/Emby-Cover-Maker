// ============================================================
//  文字层（图层 3：不动、不旋转；文字区不再单独铺底色）
//  V1：中文标题 / 英文标题各自独立——独立字体、字号、字重、字间距(%)、
//  换行、XY 位移；英文标题独享装饰（左竖条做左对齐锚点 + 横线）。
//  关键修复：每个标题直接用自己选的字体（不再共用一个会被通用回退
//  抢走 CJK 字形的字体栈），所以切中文字体能立刻生效。
// ============================================================
import type { DecoConfig, FillValue, RenderState, RenderTitle } from '../types';
import {
  drawTextLetterSpaced,
  measureTextLetterSpaced,
  wrapTextLines,
  ctxScale,
  type Ctx,
} from './drawUtils';
import { fillToCanvas } from './fill';
import { effectiveDecoColor } from '../utils/decoColor';

/** 左边缘锚点：中文左边缘 / 竖条左边缘都从这里起 */
const ANCHOR_X = 14;
/** 横线与英文文字块的间隙 */
const LINE_GAP = 5;
/** 命中框外扩，便于拖动抓取 */
const HIT_PAD = 6;

const CN_LH = 1.22;
const EN_LH = 1.3;
/** 英文标题相对默认间距再上移的基准量（让中英标题更紧凑；
 *  令 en.offsetY=0 对应此前需要手动设 -13px 的位置，中文位置不变） */
const EN_BASELINE_LIFT = 13;

export interface TitleBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 最近一帧的标题包围盒（画布像素坐标），供预览拖动命中测试 */
export const lastTitleBoxes: { cn: TitleBox | null; en: TitleBox | null } = { cn: null, en: null };

interface Laid {
  lines: string[];
  maxW: number;
  lineH: number;
  blockH: number;
  trackPx: number;
}

function layoutTitle(ctx: Ctx, t: RenderTitle, lhFactor: number): Laid {
  ctx.font = `${t.weight} ${t.size}px ${t.family}`;
  const trackPx = (t.trackPct / 100) * t.size;
  const text = t.upper ? t.text.toUpperCase() : t.text;
  const lines = t.wrap ? wrapTextLines(ctx, text, Math.max(8, t.wrapWidth), trackPx) : [text];
  let maxW = 0;
  for (const ln of lines) maxW = Math.max(maxW, measureTextLetterSpaced(ctx, ln, trackPx));
  const lineH = t.size * lhFactor;
  return { lines, maxW, lineH, blockH: lines.length * lineH, trackPx };
}

function drawTitle(
  ctx: Ctx,
  t: RenderTitle,
  laid: Laid,
  x: number,
  top: number,
  fill: FillValue,
  shadowBlur: number,
): void {
  ctx.font = `${t.weight} ${t.size}px ${t.family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const glow = fill.c1;
  ctx.fillStyle = fillToCanvas(ctx, fill, x, top, laid.maxW || 1, laid.blockH || 1);
  laid.lines.forEach((line, i) => {
    const ly = top + i * laid.lineH;
    withShadow(ctx, shadowBlur, glow, () => drawTextLetterSpaced(ctx, line, x, ly, laid.trackPx));
  });
}

export function drawTextOverlay(ctx: Ctx, s: RenderState): void {
  lastTitleBoxes.cn = null;
  lastTitleBoxes.en = null;
  if (!s.showText || s.textAreaWidth <= 0) return;

  const H = s.height;

  const hasCN = !!s.cn.text;
  const hasEN = !!s.en.text;

  const cnLaid = hasCN ? layoutTitle(ctx, s.cn, CN_LH) : null;
  const enLaid = hasEN ? layoutTitle(ctx, s.en, EN_LH) : null;

  // 垂直：把中文块 + 英文块整体在画面里居中
  const cnBlockH = cnLaid ? cnLaid.blockH : 0;
  const enBlockH = enLaid ? enLaid.blockH : 0;
  const between = hasCN && hasEN ? Math.max(6, s.en.size * 0.6) : 0;
  const totalH = cnBlockH + between + enBlockH;
  const groupTop = (H - totalH) / 2;

  const deco: DecoConfig = s.deco;
  const decoColor = effectiveDecoColor(deco, s.bgFill, s.bgImageOn);
  const barOn = hasEN && deco.barOn;
  const enIndent = barOn ? deco.barWidth + deco.barGap : 0;

  // ---- 中文标题（左边缘 = 锚点 + 自身位移） ----
  if (cnLaid) {
    const cnX = ANCHOR_X + s.cn.offsetX;
    const cnTop = groupTop + s.cn.offsetY;
    drawTitle(ctx, s.cn, cnLaid, cnX, cnTop, s.textFill, s.shadowBlur);
    lastTitleBoxes.cn = {
      x: cnX - HIT_PAD,
      y: cnTop - HIT_PAD,
      w: cnLaid.maxW + HIT_PAD * 2,
      h: cnLaid.blockH + HIT_PAD * 2,
    };
  }

  // ---- 英文标题（竖条做左对齐锚点；英文文字缩进到竖条右侧） ----
  if (enLaid) {
    const enX = ANCHOR_X + enIndent + s.en.offsetX;
    const enTop = groupTop + cnBlockH + between - EN_BASELINE_LIFT + s.en.offsetY;

    // 装饰：左竖条（高度 = 英文块，含换行；左边缘 = 锚点 = 中文左对齐）
    if (barOn) {
      const barX = ANCHOR_X + s.en.offsetX;
      ctx.fillStyle = decoColor;
      ctx.fillRect(barX, enTop, deco.barWidth, enLaid.blockH);
    }
    // 装饰：横线（与英文文字左对齐，宽度 = 英文文字宽）
    if (deco.lineOn) {
      ctx.fillStyle = decoColor;
      const lw = enLaid.maxW || 1;
      const ly =
        deco.linePos === 'above'
          ? enTop - LINE_GAP - deco.lineWeight
          : enTop + enLaid.blockH + LINE_GAP;
      ctx.fillRect(enX, ly, lw, deco.lineWeight);
    }

    drawTitle(ctx, s.en, enLaid, enX, enTop, s.textFill, s.shadowBlur);

    const left = barOn ? ANCHOR_X + s.en.offsetX : enX;
    const right = enX + enLaid.maxW;
    lastTitleBoxes.en = {
      x: left - HIT_PAD,
      y: enTop - HIT_PAD,
      w: right - left + HIT_PAD * 2,
      h: enLaid.blockH + HIT_PAD * 2,
    };
  }

  // 预览里的可拖动提示框
  if (s.dragHint) {
    ctx.save();
    ctx.strokeStyle = 'rgba(124,131,240,0.9)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    for (const box of [lastTitleBoxes.cn, lastTitleBoxes.en]) {
      if (box) ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w, box.h);
    }
    ctx.restore();
  }
}

function withShadow(ctx: Ctx, blur: number, color: string, draw: () => void): void {
  if (blur > 0) {
    const scaledBlur = blur * ctxScale(ctx);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = scaledBlur;
    draw();
    ctx.shadowBlur = scaledBlur * 0.5;
    draw();
    ctx.restore();
  } else {
    draw();
  }
}
