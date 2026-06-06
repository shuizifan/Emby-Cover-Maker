// ============================================================
//  装饰色解析（中立，无 React 依赖）：
//  colorAuto 时取背景主题的同色相、有对比感的色值；否则用用户选的色。
// ============================================================
import type { DecoConfig, FillValue } from '../types';
import { deriveAccent } from './color';

/** 图片背景时无法取主题色相，用一支温和的蓝青作兜底 */
const IMAGE_BG_ACCENT = '#5fb3cf';

export function effectiveDecoColor(deco: DecoConfig, bgFill: FillValue, bgImageOn: boolean): string {
  if (!deco.colorAuto) return deco.color;
  if (bgImageOn) return IMAGE_BG_ACCENT;
  const base = bgFill.mode === 'gradient' ? bgFill.c2 : bgFill.c1;
  return deriveAccent(base);
}
