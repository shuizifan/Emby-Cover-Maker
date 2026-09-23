// ============================================================
//  背景取色公式（中立，无 React 依赖）：
//  由色相 / 调子 / 明暗层次生成安全渐变；store 与背景面板共用，
//  保证面板显示的状态与画布实际用的 bgFill 始终一致。
// ============================================================
import type { BgMood, BgPickerMode, BgPickerState, FillValue } from '../types';
import { hexToRgbObj, hslToRgb, normalizeHex, rgbObjToHex } from './color';

export const MOOD: Record<BgMood, { sd: number; sl: number }> = {
  soft: { sd: 30, sl: 55 },
  standard: { sd: 46, sl: 73 },
  rich: { sd: 60, sl: 85 },
};

export const LIGHTNESS_CENTER = 48.5;

export function hslToHex(h: number, s: number, l: number): string {
  return rgbObjToHex(hslToRgb({ h, s: s / 100, l: l / 100 }));
}

export function lightnessPair(span: number): { dark: number; light: number } {
  const safeSpan = Math.max(10, Math.min(75, span));
  return {
    dark: Math.max(12, LIGHTNESS_CENTER - safeSpan / 2),
    light: Math.min(88, LIGHTNESS_CENTER + safeSpan / 2),
  };
}

export function colorsFor(state: BgPickerState): { start: string; end: string | null } {
  const customStart = normalizeHex(state.customStart);
  const customEnd = normalizeHex(state.customEnd);
  const m = MOOD[state.mood];
  const l = lightnessPair(state.lightnessSpan);

  if (state.mode === 'solid') {
    if (customStart) return { start: customStart, end: null };
    return { start: hslToHex(state.hue1, m.sl, LIGHTNESS_CENTER), end: null };
  }

  if (customStart && customEnd) return { start: customStart, end: customEnd };
  const endHue = state.mode === 'dual' ? state.hue2 : state.hue1;
  return {
    start: hslToHex(state.hue1, m.sd, l.dark),
    end: hslToHex(endHue, m.sl, l.light),
  };
}

export function fillFor(state: BgPickerState): FillValue {
  const { start, end } = colorsFor(state);
  return {
    mode: state.mode === 'solid' ? 'solid' : 'gradient',
    gradType: state.gradType,
    c1: start,
    c2: end ?? start,
    angle: state.angle,
    endPos: 100,
  };
}

/** 两个颜色是否只差舍入误差（每通道 ≤ 3） */
function closeColor(a: string, b: string): boolean {
  const x = hexToRgbObj(a);
  const y = hexToRgbObj(b);
  return Math.abs(x.r - y.r) <= 3 && Math.abs(x.g - y.g) <= 3 && Math.abs(x.b - y.b) <= 3;
}

function sameFill(a: FillValue, b: FillValue): boolean {
  if (a.mode !== b.mode || !closeColor(a.c1, b.c1)) return false;
  if (a.mode === 'solid') return true;
  if (a.gradType !== b.gradType || !closeColor(a.c2, b.c2) || a.endPos !== b.endPos) return false;
  return a.gradType === 'radial' || ((a.angle - b.angle) % 360 + 360) % 360 === 0;
}

/**
 * 让面板状态与实际填充对齐（刷新恢复、导入外观时用）：
 * 能用当前公式参数复现 fill 就保留公式；复现不了（导入的任意配色）
 * 就把实际颜色放进「完全自定义」，面板显示与画布保持一致。
 */
export function reconcilePicker(picker: BgPickerState, fill: FillValue, bgImageOn: boolean): BgPickerState {
  if (bgImageOn) return { ...picker, mode: 'image' };
  const geometry = fill.mode === 'gradient' ? { gradType: fill.gradType, angle: fill.angle } : {};
  const candidates: BgPickerMode[] =
    fill.mode === 'solid' ? ['solid'] : picker.mode === 'dual' ? ['dual', 'single'] : ['single', 'dual'];
  for (const mode of candidates) {
    const next: BgPickerState = { ...picker, ...geometry, mode };
    if (sameFill(fillFor(next), fill)) return next;
  }
  return {
    ...picker,
    ...geometry,
    mode: candidates[0],
    customStart: fill.c1,
    customEnd: fill.mode === 'solid' ? '' : fill.c2,
  };
}
