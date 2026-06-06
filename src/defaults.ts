// ============================================================
//  默认参数（V1，打开即可用）
// ============================================================
import type { Column, DecoConfig, FillValue, PosterShadowConfig, TitleConfig } from './types';

export function makeDefaultColumns(): Column[] {
  return [
    { count: 5, gap: 6, direction: -1, speed: 1 },
    { count: 5, gap: 6, direction: 1, speed: 1 },
    { count: 5, gap: 6, direction: -1, speed: 1 },
  ];
}

export function makeDefaultColumn(index: number): Column {
  return { count: 5, gap: 6, direction: index % 2 === 0 ? -1 : 1, speed: 1 };
}

/** 默认背景填充：单色相 / 海洋蓝 / 标准调子 / 线性向右 */
export function defaultBgFill(): FillValue {
  return { mode: 'gradient', gradType: 'linear', c1: '#253c64', c2: '#78a3eb', angle: 90, endPos: 100 };
}

/** 默认文字填充：纯白 */
export function defaultTextFill(): FillValue {
  return { mode: 'solid', gradType: 'linear', c1: '#ffffff', c2: '#5bdaff', angle: 90, endPos: 100 };
}

/** 默认中文标题：方正风雅宋 */
export function makeDefaultCN(): TitleConfig {
  return {
    text: '电影',
    fontId: 'fz-fengyasong',
    size: 40,
    weight: 400,
    trackPct: 0,
    wrap: false,
    wrapWidth: 160,
    offsetX: 0,
    offsetY: 0,
    upper: false,
  };
}

/** 默认英文标题：Melete UltraLight */
export function makeDefaultEN(): TitleConfig {
  return {
    text: 'MOVIE',
    fontId: 'melete-ultralight',
    size: 10,
    weight: 400,
    trackPct: -10,
    wrap: true,
    wrapWidth: 100,
    offsetX: 0,
    offsetY: 0,
    upper: true,
  };
}

/** 默认装饰：左竖条开、横线关、颜色自动取主题同色相 */
export function makeDefaultDeco(): DecoConfig {
  return {
    barOn: true,
    barWidth: 4,
    barGap: 2,
    lineOn: false,
    linePos: 'below',
    lineWeight: 1,
    color: '#5fb3cf',
    colorAuto: true,
  };
}

/** 默认海报投影：默认关闭，勾选后是轻微向下的层次投影 */
export function makeDefaultPosterShadow(): PosterShadowConfig {
  return {
    enabled: false,
    opacity: 30,
    angle: 180,
    distance: 5,
    blur: 10,
    spread: 0,
  };
}

export const DEFAULTS = {
  uiTheme: 'dark' as const,
  uiMode: 'simple' as const,
  width: 320,
  height: 180,
  duration: 13,
  fps: 20,
  tiltDeg: 15,
  pivotXPct: 40,
  pivotYPct: 90,
  cols: 3,
  textAreaWidth: 100,
  colGap: 8,
  posterWidth: 65,
  posterRadius: 4,
  bgImageOn: false,
  showText: true,
  shadowBlur: 0,
  dragTitles: false,
  dither: 'FloydSteinberg' as const,
  quality: 8,
  exportScale: 2 as const,
  activeTab: 'background' as const,
  showPivot: false,
};
