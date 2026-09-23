// ============================================================
//  状态仓库（zustand）V1
//  原则不变：参数互不依赖，无隐式派生（唯一锁死：海报高 = 宽 × 1.5）。
//  文字模型：中文标题(cn) / 英文标题(en) 各自独立 + 英文装饰(deco)。
// ============================================================
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type {
  BgPickerState,
  Column,
  DecoConfig,
  DitherMode,
  DrawableImage,
  ExportScale,
  FillValue,
  LookPreset,
  PosterAsset,
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
  makeDefaultBgPicker,
  makeDefaultCN,
  makeDefaultColumn,
  makeDefaultColumns,
  makeDefaultDeco,
  makeDefaultEN,
  makeDefaultPosterShadow,
} from '../defaults';
import { fontFamilyOf } from '../fonts/registry';
import { exportGif } from '../export/exportGif';
import { ensureTitleFonts } from '../fonts/loadFonts';
import { notifyFontsChanged } from '../render/textOverlay';
import { fillFor, reconcilePicker } from '../utils/bgPicker';
import { releasePoster } from '../utils/imageLoad';
import { sanitizeLook, sanitizePersisted, type PersistedData } from './sanitize';

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
  globalPalette: boolean;
  activeTab: TabId;
  showPivot: boolean;
  previewNonce: number;
}

interface StoreState extends ScalarState {
  bgPicker: BgPickerState;
  bgFill: FillValue;
  textFill: FillValue;
  posterShadow: PosterShadowConfig;
  cn: TitleConfig;
  en: TitleConfig;
  deco: DecoConfig;
  columns: Column[];
  postersByCol: (PosterAsset | null)[][];
  bgImage: DrawableImage | null;

  exportBusy: boolean;
  exportStatus: string;
  exportStatusKind: ExportStatusKind;

  setField: <K extends keyof ScalarState>(key: K, value: ScalarState[K]) => void;
  setCols: (n: number) => void;
  setColumnField: <K extends keyof Column>(col: number, key: K, value: Column[K]) => void;
  /** 背景面板改动：同步写入面板状态、bgImageOn，非图片模式下按公式生成 bgFill */
  setBgPicker: (next: BgPickerState) => void;
  setTextFill: (patch: Partial<FillValue>) => void;
  setPosterShadow: (patch: Partial<PosterShadowConfig>) => void;
  setTitleField: <K extends keyof TitleConfig>(which: 'cn' | 'en', key: K, value: TitleConfig[K]) => void;
  setDeco: (patch: Partial<DecoConfig>) => void;
  setBgImage: (img: DrawableImage | null) => void;

  uploadToSlot: (globalIndex: number, poster: PosterAsset) => void;
  /** 按顺序填空槽，返回溢出丢弃的张数 */
  uploadBatch: (posters: PosterAsset[]) => number;
  removePoster: (globalIndex: number) => void;
  swapPosters: (a: number, b: number) => void;
  shufflePosters: () => void;
  clearAllPosters: () => void;

  restartPreview: () => void;
  resetAll: () => void;
  runExport: () => Promise<void>;

  getLook: () => LookPreset;
  /** 应用导入的外观（任意 JSON，内部校验）；文件无可用字段时抛错 */
  applyLook: (raw: unknown) => void;

  getRenderState: () => RenderState;
}

export interface FillState {
  total: number;
  filled: number;
  missing: number;
  /** 所有槽位填满才允许导出（手册 §7） */
  complete: boolean;
}

/** 槽位填充统计：工具栏 / 导出面板 / 海报面板共用（对象结果配合 useShallow 订阅） */
export function selectFillState(s: Pick<StoreState, 'cols' | 'columns' | 'postersByCol'>): FillState {
  let total = 0;
  let filled = 0;
  for (let c = 0; c < s.cols; c++) {
    total += s.columns[c]?.count ?? 0;
    for (const p of s.postersByCol[c] ?? []) if (p) filled++;
  }
  return { total, filled, missing: total - filled, complete: total > 0 && filled === total };
}

const STORAGE_KEY = 'dynamic-cover-tool:v1';
/** 持久化格式版本：0 = 旧版直接存参数对象，1 = persist 中间件的 { state, version } */
const STORAGE_VERSION = 1;
/** 写盘节流：拖滑块、导出进度会高频 set，合并成最多每 300ms 一次写入 */
const PERSIST_THROTTLE_MS = 300;

/**
 * localStorage 适配：节流写入、内容不变不写、页面隐藏时立即落盘；
 * 读到旧版（无 state/version 包装）的数据时当作 version 0 交给 migrate。
 */
function createThrottledStorage(): PersistStorage<PersistedData> | undefined {
  if (typeof window === 'undefined') return undefined;
  let pending: { name: string; value: StorageValue<PersistedData> } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastWritten = '';

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const { name, value } = pending;
    pending = null;
    try {
      const text = JSON.stringify(value);
      if (text !== lastWritten) {
        window.localStorage.setItem(name, text);
        lastWritten = text;
      }
    } catch {
      // 配额满 / 隐私模式写入失败：忽略，外观仍可手动导出
    }
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  return {
    getItem: (name) => {
      try {
        const text = window.localStorage.getItem(name);
        if (!text) return null;
        lastWritten = text;
        const parsed: unknown = JSON.parse(text);
        const wrapped = typeof parsed === 'object' && parsed !== null && 'state' in parsed && 'version' in parsed;
        return wrapped ? (parsed as StorageValue<PersistedData>) : { state: parsed as PersistedData, version: 0 };
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (timer === undefined) timer = setTimeout(flush, PERSIST_THROTTLE_MS);
    },
    removeItem: (name) => {
      pending = null;
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

function persistedSnapshot(s: StoreState): PersistedData {
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
    showText: s.showText,
    shadowBlur: s.shadowBlur,
    dragTitles: s.dragTitles,
    dither: s.dither,
    quality: s.quality,
    exportScale: s.exportScale,
    globalPalette: s.globalPalette,
    activeTab: s.activeTab,
    showPivot: s.showPivot,
    bgPicker: s.bgPicker,
    bgFill: s.bgFill,
    textFill: s.textFill,
    posterShadow: s.posterShadow,
    cn: s.cn,
    en: s.en,
    deco: s.deco,
    columns: s.columns,
  };
}

/** 全部默认参数（恢复默认与首次打开共用） */
function defaultData(): Omit<PersistedData, 'uiTheme' | 'uiMode' | 'activeTab'> {
  return {
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
    showText: DEFAULTS.showText,
    shadowBlur: DEFAULTS.shadowBlur,
    dragTitles: DEFAULTS.dragTitles,
    dither: DEFAULTS.dither,
    quality: DEFAULTS.quality,
    exportScale: DEFAULTS.exportScale,
    globalPalette: DEFAULTS.globalPalette,
    showPivot: DEFAULTS.showPivot,
    bgPicker: makeDefaultBgPicker(),
    bgFill: defaultBgFill(),
    textFill: defaultTextFill(),
    posterShadow: makeDefaultPosterShadow(),
    cn: makeDefaultCN(),
    en: makeDefaultEN(),
    deco: makeDefaultDeco(),
    columns: makeDefaultColumns(),
  };
}

type Slots = (PosterAsset | null)[];

const emptySlots = (columns: Column[]): Slots[] => columns.map((c) => new Array<PosterAsset | null>(c.count).fill(null));

/** 调整槽位数；被截掉的海报释放缩略图 */
function resizeSlots(arr: Slots, len: number): Slots {
  arr.slice(len).forEach(releasePoster);
  const next = arr.slice(0, len);
  while (next.length < len) next.push(null);
  return next;
}

const releaseAll = (postersByCol: Slots[]) => postersByCol.forEach((arr) => arr.forEach(releasePoster));

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

const initialData = defaultData();

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialData,
      uiTheme: DEFAULTS.uiTheme,
      uiMode: DEFAULTS.uiMode,
      activeTab: DEFAULTS.activeTab,
      bgImageOn: false,
      previewNonce: 0,
      postersByCol: emptySlots(initialData.columns),
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
          posters.push(new Array<PosterAsset | null>(def.count).fill(null));
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

      setBgPicker: (next) =>
        set(next.mode === 'image' ? { bgPicker: next, bgImageOn: true } : { bgPicker: next, bgImageOn: false, bgFill: fillFor(next) }),
      setTextFill: (patch) => set((st) => ({ textFill: { ...st.textFill, ...patch } })),
      setPosterShadow: (patch) => set((st) => ({ posterShadow: { ...st.posterShadow, ...patch } })),
      setTitleField: (which, key, value) =>
        set((st) => ({ [which]: { ...st[which], [key]: value } } as Partial<StoreState>)),
      setDeco: (patch) => set((st) => ({ deco: { ...st.deco, ...patch } })),
      setBgImage: (img) => set({ bgImage: img }),

      uploadToSlot: (globalIndex, poster) => {
        const { columns, postersByCol, cols } = get();
        const loc = locate(globalIndex, columns, cols);
        if (!loc) {
          releasePoster(poster);
          return;
        }
        releasePoster(postersByCol[loc.col][loc.i]);
        set({
          postersByCol: postersByCol.map((arr, i) =>
            i === loc.col ? arr.map((p, j) => (j === loc.i ? poster : p)) : arr,
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
          if (!placed) {
            overflow++;
            releasePoster(img);
          }
        }
        set({ postersByCol: posters });
        return overflow;
      },

      removePoster: (globalIndex) => {
        const { columns, postersByCol, cols } = get();
        const loc = locate(globalIndex, columns, cols);
        if (!loc) return;
        releasePoster(postersByCol[loc.col][loc.i]);
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
        const filled = postersByCol.slice(0, cols).flatMap((arr) => arr.filter(Boolean)) as PosterAsset[];
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
        releaseAll(postersByCol);
        set({ postersByCol: postersByCol.map((arr) => arr.map(() => null)) });
      },

      restartPreview: () => set((st) => ({ previewNonce: st.previewNonce + 1 })),

      runExport: async () => {
        const s = get();
        if (s.exportBusy || !selectFillState(s).complete) return;
        set({ exportBusy: true, exportStatusKind: 'working', exportStatus: '准备导出…' });
        try {
          const rs = s.getRenderState();
          if (rs.showText) {
            set({ exportStatus: '等待字体加载…' });
            await ensureTitleFonts([rs.cn, rs.en]);
            notifyFontsChanged();
          }
          const res = await exportGif(rs, {
            dither: s.dither,
            quality: s.quality,
            exportScale: s.exportScale,
            globalPalette: s.globalPalette,
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

      // 恢复默认：清空所有改过的样式与图片（保留 UI 主题、繁简模式与当前标签页）
      resetAll: () => {
        const data = defaultData();
        releaseAll(get().postersByCol);
        set({ ...data, bgImageOn: false, postersByCol: emptySlots(data.columns), bgImage: null });
        get().restartPreview();
      },

      getLook: () => {
        const s = get();
        return {
          version: 1,
          bgImageOn: s.bgImageOn,
          bgFill: s.bgFill,
          bgPicker: s.bgPicker,
          textFill: s.textFill,
          shadowBlur: s.shadowBlur,
          posterShadow: s.posterShadow,
          cn: s.cn,
          en: s.en,
          deco: s.deco,
        };
      },

      applyLook: (raw) => {
        const p = sanitizeLook(raw);
        const s = get();
        const bgImageOn = p.bgImageOn ?? s.bgImageOn;
        const bgFill = p.bgFill ?? s.bgFill;
        set({
          ...p,
          bgImageOn,
          bgFill,
          bgPicker: reconcilePicker(p.bgPicker ?? s.bgPicker, bgFill, bgImageOn),
        });
      },

      getRenderState: () => {
        const s = get();
        const posters: (DrawableImage | null)[] = [];
        for (let c = 0; c < s.cols; c++) for (const p of s.postersByCol[c] ?? []) posters.push(p?.image ?? null);
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
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createThrottledStorage(),
      // 只存参数；图片、导出状态不入库（手册 §10.12.4）
      partialize: persistedSnapshot,
      // v0 → v1 字段结构相同，只是多了 { state, version } 包装；逐字段校验统一在 merge 里做
      migrate: (state) => state as PersistedData,
      // 读出的数据一律校验、补齐；首次打开（无存档）也走这里，得到默认值
      merge: (stored, current) => {
        const data = sanitizePersisted(stored);
        return {
          ...current,
          ...data,
          // 图片不持久化：刷新后背景总是回到填充模式，面板状态按实际填充对齐
          bgPicker: reconcilePicker(data.bgPicker, data.bgFill, false),
          postersByCol: emptySlots(data.columns),
        };
      },
    },
  ),
);
