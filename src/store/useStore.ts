// ============================================================
//  状态仓库（zustand）V1
//  原则不变：参数互不依赖，无隐式派生（唯一锁死：海报高 = 宽 × 1.5）。
//  文字模型：中文标题(cn) / 英文标题(en) 各自独立 + 英文装饰(deco)。
// ============================================================
import { create } from 'zustand';
import type {
  Column,
  DecoConfig,
  DitherMode,
  DrawableImage,
  ExportScale,
  FillValue,
  LookPreset,
  PosterShadowConfig,
  RenderState,
  RenderTitle,
  TabId,
  TitleConfig,
  UiTheme,
  UiMode,
} from '../types';
import {
  DEFAULTS,
  defaultBgFill,
  defaultTextFill,
  makeDefaultCN,
  makeDefaultColumn,
  makeDefaultColumns,
  makeDefaultDeco,
  makeDefaultEN,
  makeDefaultPosterShadow,
} from '../defaults';
import { fontFamilyOf } from '../fonts/registry';
import { exportGif } from '../export/exportGif';

export type ExportStatusKind = 'idle' | 'working' | 'ok' | 'error';

interface ScalarState {
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
  bgImageOn: boolean;
  showText: boolean;
  shadowBlur: number;
  dragTitles: boolean;
  dither: DitherMode;
  quality: number;
  exportScale: ExportScale;
  activeTab: TabId;
  showPivot: boolean;
  previewNonce: number;
}

interface StoreState extends ScalarState {
  bgFill: FillValue;
  textFill: FillValue;
  posterShadow: PosterShadowConfig;
  cn: TitleConfig;
  en: TitleConfig;
  deco: DecoConfig;
  columns: Column[];
  postersByCol: (DrawableImage | null)[][];
  bgImage: DrawableImage | null;

  exportBusy: boolean;
  exportStatus: string;
  exportStatusKind: ExportStatusKind;

  setField: <K extends keyof ScalarState>(key: K, value: ScalarState[K]) => void;
  setCols: (n: number) => void;
  setColumnField: <K extends keyof Column>(col: number, key: K, value: Column[K]) => void;
  setBgFill: (patch: Partial<FillValue>) => void;
  setTextFill: (patch: Partial<FillValue>) => void;
  setPosterShadow: (patch: Partial<PosterShadowConfig>) => void;
  setTitleField: <K extends keyof TitleConfig>(which: 'cn' | 'en', key: K, value: TitleConfig[K]) => void;
  setDeco: (patch: Partial<DecoConfig>) => void;
  setBgImage: (img: DrawableImage | null) => void;

  uploadToSlot: (globalIndex: number, img: DrawableImage) => void;
  uploadBatch: (imgs: DrawableImage[]) => number;
  removePoster: (globalIndex: number) => void;
  swapPosters: (a: number, b: number) => void;
  shufflePosters: () => void;
  clearAllPosters: () => void;

  restartPreview: () => void;
  resetAll: () => void;
  runExport: () => Promise<void>;

  getLook: () => LookPreset;
  applyLook: (preset: Partial<LookPreset>) => void;

  totalSlots: () => number;
  filledCount: () => number;
  isComplete: () => boolean;
  getRenderState: () => RenderState;
}

type PersistedState = Partial<
  Pick<
    StoreState,
    | 'uiTheme'
    | 'uiMode'
    | 'width'
    | 'height'
    | 'duration'
    | 'fps'
    | 'tiltDeg'
    | 'pivotXPct'
    | 'pivotYPct'
    | 'cols'
    | 'textAreaWidth'
    | 'colGap'
    | 'posterWidth'
    | 'posterRadius'
    | 'bgImageOn'
    | 'showText'
    | 'shadowBlur'
    | 'dragTitles'
    | 'dither'
    | 'quality'
    | 'exportScale'
    | 'activeTab'
    | 'showPivot'
    | 'bgFill'
    | 'textFill'
    | 'posterShadow'
    | 'cn'
    | 'en'
    | 'deco'
    | 'columns'
  >
>;

const STORAGE_KEY = 'dynamic-cover-tool:v1';

function readPersistedState(): PersistedState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : {};
  } catch {
    return {};
  }
}

function persistedSnapshot(s: StoreState): PersistedState {
  return {
    uiTheme: s.uiTheme,
    uiMode: s.uiMode,
    width: s.width,
    height: s.height,
    duration: s.duration,
    fps: s.fps,
    tiltDeg: s.tiltDeg,
    pivotXPct: s.pivotXPct,
    pivotYPct: s.pivotYPct,
    cols: s.cols,
    textAreaWidth: s.textAreaWidth,
    colGap: s.colGap,
    posterWidth: s.posterWidth,
    posterRadius: s.posterRadius,
    bgImageOn: false,
    showText: s.showText,
    shadowBlur: s.shadowBlur,
    dragTitles: s.dragTitles,
    dither: s.dither,
    quality: s.quality,
    exportScale: s.exportScale,
    activeTab: s.activeTab,
    showPivot: s.showPivot,
    bgFill: s.bgFill,
    textFill: s.textFill,
    posterShadow: s.posterShadow,
    cn: s.cn,
    en: s.en,
    deco: s.deco,
    columns: s.columns,
  };
}

function resizeSlots(arr: (DrawableImage | null)[], len: number): (DrawableImage | null)[] {
  const next = arr.slice(0, len);
  while (next.length < len) next.push(null);
  return next;
}

function totalSlotsOf(columns: Column[], cols: number): number {
  let n = 0;
  for (let c = 0; c < cols && c < columns.length; c++) n += columns[c].count;
  return n;
}

function locate(globalIndex: number, columns: Column[], cols: number): { col: number; i: number } | null {
  if (globalIndex < 0) return null;
  let base = 0;
  for (let c = 0; c < cols && c < columns.length; c++) {
    const n = columns[c].count;
    if (globalIndex < base + n) return { col: c, i: globalIndex - base };
    base += n;
  }
  return null;
}

function toRenderTitle(t: TitleConfig): RenderTitle {
  const { fontId, ...rest } = t;
  return { ...rest, family: fontFamilyOf(fontId) };
}

const persisted = readPersistedState();
const initialColumns = (() => {
  const cols = Math.max(1, Math.min(6, Math.round(persisted.cols ?? DEFAULTS.cols)));
  const saved = Array.isArray(persisted.columns) ? persisted.columns : [];
  const next = saved.slice(0, cols).map((c, i) => ({ ...makeDefaultColumn(i), ...c }));
  while (next.length < cols) next.push(makeDefaultColumn(next.length));
  return next;
})();

export const useStore = create<StoreState>((set, get) => ({
  uiTheme: persisted.uiTheme ?? DEFAULTS.uiTheme,
  uiMode: persisted.uiMode ?? DEFAULTS.uiMode,
  width: persisted.width ?? DEFAULTS.width,
  height: persisted.height ?? DEFAULTS.height,
  duration: persisted.duration ?? DEFAULTS.duration,
  fps: persisted.fps ?? DEFAULTS.fps,
  tiltDeg: persisted.tiltDeg ?? DEFAULTS.tiltDeg,
  pivotXPct: persisted.pivotXPct ?? DEFAULTS.pivotXPct,
  pivotYPct: persisted.pivotYPct ?? DEFAULTS.pivotYPct,
  cols: Math.max(1, Math.min(6, Math.round(persisted.cols ?? DEFAULTS.cols))),
  textAreaWidth: persisted.textAreaWidth ?? DEFAULTS.textAreaWidth,
  colGap: persisted.colGap ?? DEFAULTS.colGap,
  posterWidth: persisted.posterWidth ?? DEFAULTS.posterWidth,
  posterRadius: persisted.posterRadius ?? DEFAULTS.posterRadius,
  bgImageOn: persisted.bgImageOn ?? DEFAULTS.bgImageOn,
  showText: persisted.showText ?? DEFAULTS.showText,
  shadowBlur: persisted.shadowBlur ?? DEFAULTS.shadowBlur,
  dragTitles: persisted.dragTitles ?? DEFAULTS.dragTitles,
  dither: persisted.dither ?? DEFAULTS.dither,
  quality: persisted.quality ?? DEFAULTS.quality,
  exportScale: persisted.exportScale ?? DEFAULTS.exportScale,
  activeTab: persisted.activeTab ?? DEFAULTS.activeTab,
  showPivot: persisted.showPivot ?? DEFAULTS.showPivot,
  previewNonce: 0,

  bgFill: persisted.bgFill ?? defaultBgFill(),
  textFill: persisted.textFill ?? defaultTextFill(),
  posterShadow: persisted.posterShadow ? { ...makeDefaultPosterShadow(), ...persisted.posterShadow } : makeDefaultPosterShadow(),
  cn: persisted.cn ? { ...makeDefaultCN(), ...persisted.cn } : makeDefaultCN(),
  en: persisted.en ? { ...makeDefaultEN(), ...persisted.en } : makeDefaultEN(),
  deco: persisted.deco ? { ...makeDefaultDeco(), ...persisted.deco } : makeDefaultDeco(),
  columns: initialColumns,
  postersByCol: initialColumns.map((c) => new Array<DrawableImage | null>(c.count).fill(null)),
  bgImage: null,

  exportBusy: false,
  exportStatus: '预览循环中…',
  exportStatusKind: 'idle',

  setField: (key, value) => set({ [key]: value } as Partial<ScalarState>),

  setCols: (n) => {
    const next = Math.max(1, Math.min(6, Math.round(n)));
    const { columns, postersByCol } = get();
    const cols = columns.slice();
    const posters = postersByCol.slice();
    while (cols.length < next) {
      const idx = cols.length;
      const def = makeDefaultColumn(idx);
      cols.push(def);
      posters.push(new Array<DrawableImage | null>(def.count).fill(null));
    }
    set({ cols: next, columns: cols, postersByCol: posters });
  },

  setColumnField: (col, key, value) => {
    const { columns, postersByCol } = get();
    if (col < 0 || col >= columns.length) return;
    const cols = columns.slice();
    cols[col] = { ...cols[col], [key]: value };
    let posters = postersByCol;
    if (key === 'count') {
      posters = postersByCol.slice();
      posters[col] = resizeSlots(posters[col] ?? [], value as number);
    }
    set({ columns: cols, postersByCol: posters });
  },

  setBgFill: (patch) => set((st) => ({ bgFill: { ...st.bgFill, ...patch } })),
  setTextFill: (patch) => set((st) => ({ textFill: { ...st.textFill, ...patch } })),
  setPosterShadow: (patch) => set((st) => ({ posterShadow: { ...st.posterShadow, ...patch } })),
  setTitleField: (which, key, value) =>
    set((st) => ({ [which]: { ...st[which], [key]: value } } as Partial<StoreState>)),
  setDeco: (patch) => set((st) => ({ deco: { ...st.deco, ...patch } })),
  setBgImage: (img) => set({ bgImage: img }),

  uploadToSlot: (globalIndex, img) => {
    const { columns, postersByCol, cols } = get();
    const loc = locate(globalIndex, columns, cols);
    if (!loc) return;
    set({
      postersByCol: postersByCol.map((arr, i) =>
        i === loc.col ? arr.map((p, j) => (j === loc.i ? img : p)) : arr,
      ),
    });
  },

  uploadBatch: (imgs) => {
    const { columns, postersByCol, cols } = get();
    const posters = postersByCol.map((arr) => arr.slice());
    let cursor = 0;
    let overflow = 0;
    const total = totalSlotsOf(columns, cols);
    for (const img of imgs) {
      let placed = false;
      while (cursor < total) {
        const loc = locate(cursor, columns, cols);
        cursor++;
        if (loc && posters[loc.col][loc.i] == null) {
          posters[loc.col][loc.i] = img;
          placed = true;
          break;
        }
      }
      if (!placed) overflow++;
    }
    set({ postersByCol: posters });
    return overflow;
  },

  removePoster: (globalIndex) => {
    const { columns, postersByCol, cols } = get();
    const loc = locate(globalIndex, columns, cols);
    if (!loc) return;
    set({
      postersByCol: postersByCol.map((arr, i) =>
        i === loc.col ? arr.map((p, j) => (j === loc.i ? null : p)) : arr,
      ),
    });
  },

  swapPosters: (a, b) => {
    const { columns, postersByCol, cols } = get();
    const la = locate(a, columns, cols);
    const lb = locate(b, columns, cols);
    if (!la || !lb) return;
    const posters = postersByCol.map((arr) => arr.slice());
    const tmp = posters[la.col][la.i];
    posters[la.col][la.i] = posters[lb.col][lb.i];
    posters[lb.col][lb.i] = tmp;
    set({ postersByCol: posters });
  },

  shufflePosters: () => {
    const { postersByCol, cols } = get();
    const filled = postersByCol.slice(0, cols).flatMap((arr) => arr.filter(Boolean)) as DrawableImage[];
    for (let i = filled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filled[i], filled[j]] = [filled[j], filled[i]];
    }
    let cursor = 0;
    set({
      postersByCol: postersByCol.map((arr, col) =>
        col >= cols ? arr : arr.map((p) => (p ? filled[cursor++] : null)),
      ),
    });
  },

  clearAllPosters: () => {
    const { postersByCol } = get();
    set({ postersByCol: postersByCol.map((arr) => arr.map(() => null)) });
  },

  restartPreview: () => set((st) => ({ previewNonce: st.previewNonce + 1 })),

  runExport: async () => {
    const s = get();
    if (s.exportBusy || !s.isComplete()) return;
    set({ exportBusy: true, exportStatusKind: 'working', exportStatus: '准备导出…' });
    try {
      const res = await exportGif(s.getRenderState(), {
        dither: s.dither,
        quality: s.quality,
        exportScale: s.exportScale,
        onPhase: (p) => set({ exportStatus: p.message, exportStatusKind: 'working' }),
      });
      set({
        exportStatusKind: 'ok',
        exportStatus: `✓ 已导出 ${(res.bytes / 1024).toFixed(1)} KB · ${res.frames} 帧`,
      });
    } catch (err) {
      set({
        exportStatusKind: 'error',
        exportStatus: `✗ 导出失败：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      set({ exportBusy: false });
    }
  },

  // 恢复默认：清空所有改过的样式与图片（保留 UI 主题与当前标签页）
  resetAll: () => {
    const cols = makeDefaultColumns();
    set({
      width: DEFAULTS.width,
      height: DEFAULTS.height,
      duration: DEFAULTS.duration,
      fps: DEFAULTS.fps,
      tiltDeg: DEFAULTS.tiltDeg,
      pivotXPct: DEFAULTS.pivotXPct,
      pivotYPct: DEFAULTS.pivotYPct,
      cols: DEFAULTS.cols,
      textAreaWidth: DEFAULTS.textAreaWidth,
      colGap: DEFAULTS.colGap,
      posterWidth: DEFAULTS.posterWidth,
      posterRadius: DEFAULTS.posterRadius,
      bgImageOn: DEFAULTS.bgImageOn,
      showText: DEFAULTS.showText,
      shadowBlur: DEFAULTS.shadowBlur,
      dragTitles: DEFAULTS.dragTitles,
      dither: DEFAULTS.dither,
      quality: DEFAULTS.quality,
      exportScale: DEFAULTS.exportScale,
      showPivot: DEFAULTS.showPivot,
      bgFill: defaultBgFill(),
      textFill: defaultTextFill(),
      posterShadow: makeDefaultPosterShadow(),
      cn: makeDefaultCN(),
      en: makeDefaultEN(),
      deco: makeDefaultDeco(),
      columns: cols,
      postersByCol: cols.map((c) => new Array<DrawableImage | null>(c.count).fill(null)),
      bgImage: null,
    });
    get().restartPreview();
  },

  getLook: () => {
    const s = get();
    return {
      version: 1,
      bgImageOn: s.bgImageOn,
      bgFill: s.bgFill,
      textFill: s.textFill,
      shadowBlur: s.shadowBlur,
      posterShadow: s.posterShadow,
      cn: s.cn,
      en: s.en,
      deco: s.deco,
    };
  },

  applyLook: (p) => {
    const patch: Partial<StoreState> = {};
    if (p.bgImageOn !== undefined) patch.bgImageOn = p.bgImageOn;
    if (p.bgFill) patch.bgFill = p.bgFill;
    if (p.textFill) patch.textFill = p.textFill;
    if (p.shadowBlur !== undefined) patch.shadowBlur = p.shadowBlur;
    if (p.posterShadow) patch.posterShadow = { ...makeDefaultPosterShadow(), ...p.posterShadow };
    if (p.cn) patch.cn = { ...makeDefaultCN(), ...p.cn };
    if (p.en) patch.en = { ...makeDefaultEN(), ...p.en };
    if (p.deco) patch.deco = { ...makeDefaultDeco(), ...p.deco };
    set(patch);
  },

  totalSlots: () => {
    const { columns, cols } = get();
    return totalSlotsOf(columns, cols);
  },

  filledCount: () => {
    const { postersByCol, cols } = get();
    let n = 0;
    for (let c = 0; c < cols; c++) for (const p of postersByCol[c] ?? []) if (p) n++;
    return n;
  },

  isComplete: () => {
    const s = get();
    return s.totalSlots() > 0 && s.filledCount() === s.totalSlots();
  },

  getRenderState: () => {
    const s = get();
    const posters: (DrawableImage | null)[] = [];
    for (let c = 0; c < s.cols; c++) for (const p of s.postersByCol[c] ?? []) posters.push(p);
    return {
      width: s.width,
      height: s.height,
      duration: s.duration,
      fps: s.fps,
      tiltDeg: s.tiltDeg,
      pivotXPct: s.pivotXPct,
      pivotYPct: s.pivotYPct,
      cols: s.cols,
      textAreaWidth: s.textAreaWidth,
      colGap: s.colGap,
      posterWidth: s.posterWidth,
      posterRadius: s.posterRadius,
      posterShadow: s.posterShadow,
      columns: s.columns,
      bgImageOn: s.bgImageOn,
      bgFill: s.bgFill,
      showText: s.showText,
      cn: toRenderTitle(s.cn),
      en: toRenderTitle(s.en),
      shadowBlur: s.shadowBlur,
      deco: s.deco,
      textFill: s.textFill,
      dragHint: s.dragTitles,
      posters,
      bgImage: s.bgImage,
    };
  },
}));

if (typeof window !== 'undefined') {
  useStore.subscribe((s) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedSnapshot(s)));
    } catch {
      // Ignore quota/private-mode failures; exporting the look remains available.
    }
  });
}
