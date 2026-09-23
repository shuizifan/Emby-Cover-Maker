// ============================================================
//  外部数据校验：localStorage 持久化数据、导入的外观 JSON。
//  逐字段按类型与范围收敛，缺失 / 非法字段回落默认值，
//  保证坏数据不会让渲染抛错或让整站白屏。
// ============================================================
import type {
  BgPickerState,
  Column,
  DecoConfig,
  DitherMode,
  ExportScale,
  FillValue,
  LookPreset,
  PosterShadowConfig,
  TabId,
  TitleConfig,
  UiMode,
  UiTheme,
} from '../types';
import {
  DEFAULTS,
  defaultBgFill,
  defaultTextFill,
  makeDefaultBgPicker,
  makeDefaultCN,
  makeDefaultColumn,
  makeDefaultDeco,
  makeDefaultEN,
  makeDefaultPosterShadow,
} from '../defaults';
import { normalizeHex } from '../utils/color';
import { snapFps } from '../export/frameMath';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown, fallback: number, min: number, max: number, step = 0): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  const snapped = step > 0 ? Math.round(v / step) * step : v;
  return Math.max(min, Math.min(max, Number(snapped.toFixed(4))));
}

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

const str = (v: unknown, fallback: string, maxLen = 200): string =>
  typeof v === 'string' ? v.slice(0, maxLen) : fallback;

function oneOf<T>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback;
}

const hex = (v: unknown, fallback: string): string => (typeof v === 'string' && normalizeHex(v)) || fallback;

const angle = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? ((Math.round(v) % 360) + 360) % 360 : fallback;

export function sanitizeFill(v: unknown, fallback: FillValue): FillValue {
  const o = isObj(v) ? v : {};
  return {
    mode: oneOf(o.mode, ['solid', 'gradient'] as const, fallback.mode),
    gradType: oneOf(o.gradType, ['linear', 'radial'] as const, fallback.gradType),
    c1: hex(o.c1, fallback.c1),
    c2: hex(o.c2, fallback.c2),
    angle: angle(o.angle, fallback.angle),
    endPos: num(o.endPos, fallback.endPos, 0, 100),
  };
}

export function sanitizeTitle(v: unknown, fallback: TitleConfig): TitleConfig {
  const o = isObj(v) ? v : {};
  return {
    text: str(o.text, fallback.text),
    fontId: str(o.fontId, fallback.fontId) || fallback.fontId,
    size: num(o.size, fallback.size, 8, 96),
    weight: num(o.weight, fallback.weight, 100, 900, 100),
    trackPct: num(o.trackPct, fallback.trackPct, -30, 150),
    wrap: bool(o.wrap, fallback.wrap),
    wrapWidth: num(o.wrapWidth, fallback.wrapWidth, 40, 300),
    offsetX: num(o.offsetX, fallback.offsetX, -120, 200),
    offsetY: num(o.offsetY, fallback.offsetY, -120, 120),
    upper: bool(o.upper, fallback.upper),
  };
}

export function sanitizeDeco(v: unknown, fallback: DecoConfig): DecoConfig {
  const o = isObj(v) ? v : {};
  return {
    barOn: bool(o.barOn, fallback.barOn),
    barWidth: num(o.barWidth, fallback.barWidth, 1, 12),
    barGap: num(o.barGap, fallback.barGap, 0, 20),
    lineOn: bool(o.lineOn, fallback.lineOn),
    linePos: oneOf(o.linePos, ['above', 'below'] as const, fallback.linePos),
    lineWeight: num(o.lineWeight, fallback.lineWeight, 1, 8),
    color: hex(o.color, fallback.color),
    colorAuto: bool(o.colorAuto, fallback.colorAuto),
  };
}

export function sanitizePosterShadow(v: unknown, fallback: PosterShadowConfig): PosterShadowConfig {
  const o = isObj(v) ? v : {};
  return {
    enabled: bool(o.enabled, fallback.enabled),
    opacity: num(o.opacity, fallback.opacity, 0, 100),
    angle: angle(o.angle, fallback.angle),
    distance: num(o.distance, fallback.distance, 0, 30),
    blur: num(o.blur, fallback.blur, 0, 40),
    spread: num(o.spread, fallback.spread, 0, 16),
  };
}

export function sanitizeBgPicker(v: unknown, fallback: BgPickerState): BgPickerState {
  const o = isObj(v) ? v : {};
  return {
    mode: oneOf(o.mode, ['single', 'dual', 'solid', 'image'] as const, fallback.mode),
    hue1: num(o.hue1, fallback.hue1, 0, 360),
    hue2: num(o.hue2, fallback.hue2, 0, 360),
    mood: oneOf(o.mood, ['soft', 'standard', 'rich'] as const, fallback.mood),
    lightnessSpan: num(o.lightnessSpan, fallback.lightnessSpan, 10, 75),
    gradType: oneOf(o.gradType, ['linear', 'radial'] as const, fallback.gradType),
    angle: angle(o.angle, fallback.angle),
    customStart: str(o.customStart, fallback.customStart, 16),
    customEnd: str(o.customEnd, fallback.customEnd, 16),
    smartCorrection: bool(o.smartCorrection, fallback.smartCorrection),
  };
}

/** 列配置：长度补齐 / 截断到 cols，每列逐字段收敛 */
export function sanitizeColumns(v: unknown, cols: number): Column[] {
  const saved = Array.isArray(v) ? v : [];
  const out: Column[] = [];
  for (let i = 0; i < cols; i++) {
    const def = makeDefaultColumn(i);
    const o = isObj(saved[i]) ? saved[i] : {};
    out.push({
      count: num(o.count, def.count, 1, 20, 1),
      gap: num(o.gap, def.gap, 0, 30),
      direction: oneOf(o.direction, [-1, 1] as const, def.direction),
      speed: num(o.speed, def.speed, 0.1, 5, 0.1),
    });
  }
  return out;
}

/** 可持久化的参数（不含图片 / 导出状态） */
export interface PersistedData {
  uiTheme: UiTheme;
  uiMode: UiMode;
  width: number;
  height: number;
  duration: number;
  fps: number;
  tiltDeg: number;
  pivotXPct: number;
  pivotYPct: number;
  cols: number;
  textAreaWidth: number;
  colGap: number;
  posterWidth: number;
  posterRadius: number;
  showText: boolean;
  shadowBlur: number;
  dragTitles: boolean;
  dither: DitherMode;
  quality: number;
  exportScale: ExportScale;
  globalPalette: boolean;
  activeTab: TabId;
  showPivot: boolean;
  bgPicker: BgPickerState;
  bgFill: FillValue;
  textFill: FillValue;
  posterShadow: PosterShadowConfig;
  cn: TitleConfig;
  en: TitleConfig;
  deco: DecoConfig;
  columns: Column[];
}

const TABS: readonly TabId[] = ['background', 'text', 'layout', 'columns', 'posters', 'animation', 'export'];
const DITHERS: readonly DitherMode[] = ['FloydSteinberg', 'FloydSteinberg-serpentine', 'Atkinson', 'false'];

/** 持久化数据 → 完整、合法的参数（任何字段坏了都只影响它自己） */
export function sanitizePersisted(raw: unknown): PersistedData {
  const o = isObj(raw) ? raw : {};
  const cols = num(o.cols, DEFAULTS.cols, 1, 6, 1);
  return {
    uiTheme: oneOf(o.uiTheme, ['dark', 'light', 'system'] as const, DEFAULTS.uiTheme),
    uiMode: oneOf(o.uiMode, ['simple', 'pro'] as const, DEFAULTS.uiMode),
    width: num(o.width, DEFAULTS.width, 160, 640),
    height: num(o.height, DEFAULTS.height, 90, 360),
    duration: num(o.duration, DEFAULTS.duration, 3, 25),
    fps: typeof o.fps === 'number' && Number.isFinite(o.fps) ? snapFps(o.fps) : DEFAULTS.fps,
    tiltDeg: num(o.tiltDeg, DEFAULTS.tiltDeg, 0, 30),
    pivotXPct: num(o.pivotXPct, DEFAULTS.pivotXPct, 0, 100),
    pivotYPct: num(o.pivotYPct, DEFAULTS.pivotYPct, 0, 100),
    cols,
    textAreaWidth: num(o.textAreaWidth, DEFAULTS.textAreaWidth, 0, 200),
    colGap: num(o.colGap, DEFAULTS.colGap, 0, 30),
    posterWidth: num(o.posterWidth, DEFAULTS.posterWidth, 20, 120),
    posterRadius: num(o.posterRadius, DEFAULTS.posterRadius, 0, 60),
    showText: bool(o.showText, DEFAULTS.showText),
    shadowBlur: num(o.shadowBlur, DEFAULTS.shadowBlur, 0, 24),
    dragTitles: bool(o.dragTitles, DEFAULTS.dragTitles),
    dither: oneOf(o.dither, DITHERS, DEFAULTS.dither),
    quality: num(o.quality, DEFAULTS.quality, 1, 20, 1),
    exportScale: oneOf(o.exportScale, [1, 2, 3] as const, DEFAULTS.exportScale),
    globalPalette: bool(o.globalPalette, DEFAULTS.globalPalette),
    activeTab: oneOf(o.activeTab, TABS, DEFAULTS.activeTab),
    showPivot: bool(o.showPivot, DEFAULTS.showPivot),
    bgPicker: sanitizeBgPicker(o.bgPicker, makeDefaultBgPicker()),
    bgFill: sanitizeFill(o.bgFill, defaultBgFill()),
    textFill: sanitizeFill(o.textFill, defaultTextFill()),
    posterShadow: sanitizePosterShadow(o.posterShadow, makeDefaultPosterShadow()),
    cn: sanitizeTitle(o.cn, makeDefaultCN()),
    en: sanitizeTitle(o.en, makeDefaultEN()),
    deco: sanitizeDeco(o.deco, makeDefaultDeco()),
    columns: sanitizeColumns(o.columns, cols),
  };
}

/**
 * 导入的外观 JSON → 只含合法字段的补丁。
 * 文件里有的字段逐项收敛（缺的子字段用默认补齐），没有的字段不动当前值。
 */
export function sanitizeLook(raw: unknown): Partial<LookPreset> {
  if (!isObj(raw)) throw new Error('外观文件不是 JSON 对象');
  const out: Partial<LookPreset> = {};
  if (typeof raw.bgImageOn === 'boolean') out.bgImageOn = raw.bgImageOn;
  if (isObj(raw.bgFill)) out.bgFill = sanitizeFill(raw.bgFill, defaultBgFill());
  if (isObj(raw.bgPicker)) out.bgPicker = sanitizeBgPicker(raw.bgPicker, makeDefaultBgPicker());
  if (isObj(raw.textFill)) out.textFill = sanitizeFill(raw.textFill, defaultTextFill());
  if (raw.shadowBlur !== undefined) out.shadowBlur = num(raw.shadowBlur, DEFAULTS.shadowBlur, 0, 24);
  if (isObj(raw.posterShadow)) out.posterShadow = sanitizePosterShadow(raw.posterShadow, makeDefaultPosterShadow());
  if (isObj(raw.cn)) out.cn = sanitizeTitle(raw.cn, makeDefaultCN());
  if (isObj(raw.en)) out.en = sanitizeTitle(raw.en, makeDefaultEN());
  if (isObj(raw.deco)) out.deco = sanitizeDeco(raw.deco, makeDefaultDeco());
  if (Object.keys(out).length === 0) throw new Error('外观文件里没有可用的字段');
  return out;
}
