// ============================================================
//  背景层（图层 1：不动、不旋转）
//  支持纯色 / 线性渐变 / 径向渐变 / 上传图片(cover)
// ============================================================
import type { RenderState } from '../types';
import { drawImageCover, imgReady, type Ctx } from './drawUtils';
import { fillToCanvas } from './fill';

export function drawBackground(ctx: Ctx, s: RenderState): void {
  const W = s.width;
  const H = s.height;

  if (s.bgImageOn) {
    if (imgReady(s.bgImage)) {
      drawImageCover(ctx, s.bgImage as CanvasImageSource, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
    return;
  }

  ctx.fillStyle = fillToCanvas(ctx, s.bgFill, 0, 0, W, H);
  ctx.fillRect(0, 0, W, H);
}
