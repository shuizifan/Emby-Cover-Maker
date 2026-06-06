// ============================================================
//  类型定义（V1）
//  文字模型重做：中文标题 / 英文标题各自独立——独立字体、字号、
//  粗细、字间距(%)、换行、XY 位移；英文标题独享装饰（左竖条 + 横线）。
//  背景/文字颜色统一为 FillValue；UI 明暗主题；中英文字体库统一。
// ============================================================

/** UI 界面主题（与封面背景无关） */
export type UiTheme = 'dark' | 'light' | 'system';

/** 列滚动方向：-1 = 向上，+1 = 向下 */
export type Direction = -1 | 1;

/** 每列独立参数 */
export interface Column {
  count: number;
  gap: number;
  direction: Direction;
  speed: number;
}

/** 渐变种类 */
export type GradKind = 'linear' | 'radial';
/** 填充模式 */
export type FillMode = 'solid' | 'gradient';

/** 统一的"填充"模型，背景与文字颜色共用 */
export interface FillValue {
  mode: FillMode;
  gradType: GradKind;
  c1: string;
  c2: string;
  angle: number;
  endPos: number;
}

/** gif.js 抖色模式；'false' 表示关闭 */
export type DitherMode =
  | 'FloydSteinberg'
  | 'FloydSteinberg-serpentine'
  | 'Atkinson'
  | 'false';

/** 导出超采样倍率：最终 GIF 尺寸不变，倍率越高边缘越干净、导出越慢 */
export type ExportScale = 1 | 2 | 3;

/** 海报投影：角度为落影方向，0=上、90=右、180=下、270=左 */
export interface PosterShadowConfig {
  enabled: boolean;
  opacity: number;
  angle: number;
  distance: number;
  blur: number;
  spread: number;
}

export type TabId =
  | 'background'
  | 'text'
  | 'layout'
  | 'columns'
  | 'posters'
  | 'animation'
  | 'export';

/** 界面繁简模式：simple = 只露核心控件；pro = 展开全部高级自定义 */
export type UiMode = 'simple' | 'pro';

/** 字体选项（内置 / 用户文件夹；中英文通用） */
export interface FontOption {
  id: string;
  label: string;
  /** 渲染用 CSS font-family（已加引号，不含回退） */
  family: string;
  lang: 'cn' | 'en' | 'both';
  source: 'system' | 'bundled' | 'user';
}

/** 单个标题（中文 / 英文）的配置（UI / store 用，存字体 id） */
export interface TitleConfig {
  text: string;
  /** 字体 id（统一字体库） */
  fontId: string;
  size: number;
  /** 字重 100–900（默认 400 = 不加粗） */
  weight: number;
  /** 字间距：占字号的百分比，可正(放宽)可负(收紧) */
  trackPct: number;
  /** 是否自动换行 */
  wrap: boolean;
  /** 换行宽度（px） */
  wrapWidth: number;
  /** 相对默认位置的 X / Y 位移（px） */
  offsetX: number;
  offsetY: number;
  /** 是否转大写（主要给英文标题） */
  upper: boolean;
}

/** 横线装饰相对英文标题的位置 */
export type LinePos = 'above' | 'below';

/** 英文标题装饰：左竖条 + 横线，粗细颜色可自定义 */
export interface DecoConfig {
  /** 左竖条 */
  barOn: boolean;
  barWidth: number;
  /** 英文标题与竖条之间的间距（px） */
  barGap: number;
  /** 横线 */
  lineOn: boolean;
  linePos: LinePos;
  lineWeight: number;
  /** 装饰颜色（barOn/lineOn 共用） */
  color: string;
  /** true = 自动取背景主题同色相，忽略 color */
  colorAuto: boolean;
}

/** 渲染所需标题（已把字体 id 解析为实际 font-family） */
export interface RenderTitle extends Omit<TitleConfig, 'fontId'> {
  family: string;
}

/** 渲染所需的纯参数（不认 React/store） */
export interface RenderParams {
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
  posterShadow: PosterShadowConfig;
  columns: Column[];

  // 背景
  bgImageOn: boolean;
  bgFill: FillValue;

  // 文字
  showText: boolean;
  cn: RenderTitle;
  en: RenderTitle;
  /** 文字阴影/发光半径，0 = 关闭（中英文共用） */
  shadowBlur: number;
  deco: DecoConfig;
  textFill: FillValue;
  /** true 时在预览里给标题画可拖动提示框 */
  dragHint: boolean;
}

export type DrawableImage = CanvasImageSource;

/** 渲染引擎完整输入：参数 + 图片 */
export interface RenderState extends RenderParams {
  posters: (DrawableImage | null)[];
  bgImage: DrawableImage | null;
}

/** 导入/导出的配色与外观预设 */
export interface LookPreset {
  version: 1;
  bgImageOn: boolean;
  bgFill: FillValue;
  textFill: FillValue;
  shadowBlur: number;
  posterShadow: PosterShadowConfig;
  cn: TitleConfig;
  en: TitleConfig;
  deco: DecoConfig;
}
