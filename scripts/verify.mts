// ============================================================
//  验证脚本（node + @napi-rs/canvas，无系统依赖）
//  断言核心算法不变量 + 真实渲染帧 + 像素级无缝证明。
//  运行：npm run verify
// ============================================================
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULTS,
  defaultBgFill,
  defaultTextFill,
  makeDefaultCN,
  makeDefaultColumns,
  makeDefaultDeco,
  makeDefaultEN,
  makeDefaultPosterShadow,
} from '../src/defaults';
import type { DrawableImage, RenderState, RenderTitle, TitleConfig } from '../src/types';
import { calcLayout, stripHeight } from '../src/render/layout';
import { render } from '../src/render/renderFrame';
import { fillToCss } from '../src/render/fill';
import { frameCount, frameTime } from '../src/export/frameMath';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '_verify_out');
mkdirSync(outDir, { recursive: true });

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`  ${cond ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`);
  if (!cond) failures++;
}
const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

// 验证环境无内置字体，统一用 sans-serif 测算（文字静止，不影响无缝性）
function toRT(t: TitleConfig): RenderTitle {
  const { fontId: _fontId, ...rest } = t;
  void _fontId;
  return { ...rest, family: 'sans-serif' };
}

function defaultState(): RenderState {
  const columns = makeDefaultColumns();
  let total = 0;
  for (let c = 0; c < DEFAULTS.cols; c++) total += columns[c].count;
  const posters: (DrawableImage | null)[] = new Array(total).fill(null);
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
    posterShadow: makeDefaultPosterShadow(),
    columns,
    bgImageOn: false,
    bgFill: defaultBgFill(),
    showText: true,
    cn: toRT(makeDefaultCN()),
    en: toRT(makeDefaultEN()),
    shadowBlur: DEFAULTS.shadowBlur,
    deco: makeDefaultDeco(),
    textFill: defaultTextFill(),
    dragHint: false,
    posters,
    bgImage: null,
  };
}

console.log('\n[1] 帧导出规则（t = i/n，不是 i/(n-1)）');
{
  const n = frameCount(DEFAULTS.duration, DEFAULTS.fps);
  check('总帧数 = 13 × 20 = 260', n === 260, `n=${n}`);
  check('第 0 帧 t = 0', frameTime(0, n) === 0);
  check('分母是 n', approx(frameTime(1, n), 1 / n));
  check('第 n 帧对应 t = 1（与第 0 帧相接）', approx(frameTime(n, n), 1));
  check('未写成 i/(n-1)', !approx(frameTime(1, n), 1 / (n - 1)));
}

console.log('\n[2] 每列约 1.7 张海报（视觉灵魂）');
{
  const s = defaultState();
  const layout = calcLayout(s);
  const perCol = s.height / (layout.posterH + s.columns[0].gap);
  check('海报高 = 宽 × 1.5 = 97.5', layout.posterH === 97.5, `posterH=${layout.posterH}`);
  check('每列可见 ≈ 1.7 张', perCol > 1.6 && perCol < 1.85, `perCol=${perCol.toFixed(3)}`);
}

console.log('\n[3] 参数完全解耦');
{
  const base = calcLayout(defaultState());
  const wide = calcLayout({ ...defaultState(), textAreaWidth: 180 });
  check('改文字区宽 → 海报宽不变', base.posterW === wide.posterW);
  const bs = base.colStartXs[1] - base.colStartXs[0];
  const ws = wide.colStartXs[1] - wide.colStartXs[0];
  check('改文字区宽 → 相邻列间隔不变', approx(bs, ws), `${bs} vs ${ws}`);
  check('相邻列间隔 = 65 + 8 = 73', approx(bs, 73), `spacing=${bs}`);
}

console.log('\n[4] 单列无缝 / 多列共同周期');
{
  const s = defaultState();
  const layout = calcLayout(s);
  for (let c = 0; c < s.cols; c++) {
    const col = s.columns[c];
    const L = stripHeight(col.count, col.gap, layout.posterH);
    const off = col.direction * col.speed * 1 * L;
    check(`列 ${c + 1}：t=1 位移 = ±循环带高度`, approx(Math.abs(off), L), `${Math.abs(off)}=${L}`);
  }
}

console.log('\n[5] 填充/CSS 一致性');
{
  const s = defaultState();
  check('默认背景 CSS 为线性渐变', fillToCss(s.bgFill).startsWith('linear-gradient('), fillToCss(s.bgFill));
  const radial = fillToCss({ ...s.bgFill, gradType: 'radial' });
  check('径向渐变 CSS 正确', radial.startsWith('radial-gradient('), radial);
  check('纯色 CSS 为色值本身', fillToCss({ ...s.bgFill, mode: 'solid' }) === s.bgFill.c1);
}

function renderToRaw(s: RenderState, t: number): Buffer {
  const canvas = createCanvas(s.width, s.height);
  const ctx = canvas.getContext('2d') as unknown as SKRSContext2D;
  render(ctx as unknown as CanvasRenderingContext2D, s, t);
  return Buffer.from(ctx.getImageData(0, 0, s.width, s.height).data);
}
function renderToPng(s: RenderState, t: number): Buffer {
  const canvas = createCanvas(s.width, s.height);
  const ctx = canvas.getContext('2d') as unknown as SKRSContext2D;
  render(ctx as unknown as CanvasRenderingContext2D, s, t);
  return canvas.toBuffer('image/png');
}

console.log('\n[6] 像素级无缝：render(t=0) 与 render(t=1) 完全一致');
{
  const s = defaultState();
  const a = renderToRaw(s, 0);
  const b = renderToRaw(s, 1);
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  check('t=0 与 t=1 像素逐字节相同', diff === 0, `不同字节数=${diff}`);
}

console.log('\n[7] 真实渲染帧导出 PNG（默认 + 渐变文字 + 换行 + 横线装饰）');
{
  const base = defaultState();
  const gradText: RenderState = {
    ...base,
    textFill: { mode: 'gradient', gradType: 'linear', c1: '#00C6FF', c2: '#0072FF', angle: 90, endPos: 100 },
  };
  const wrapped: RenderState = {
    ...base,
    cn: { ...base.cn, text: '这是一个很长的中文标题用来测试换行', wrap: true, wrapWidth: 120 },
    en: { ...base.en, text: 'A LONG ENGLISH SUBTITLE FOR WRAP', wrap: true, wrapWidth: 120 },
    deco: { ...base.deco, lineOn: true, linePos: 'below', lineWeight: 2 },
  };
  const shots: [string, RenderState, number][] = [
    ['frame_t0.000', base, 0],
    ['frame_t0.385', base, 0.385],
    ['frame_gradient_text', gradText, 0.2],
    ['frame_wrapped_deco', wrapped, 0.2],
  ];
  for (const [name, st, t] of shots) {
    const buf = renderToPng(st, t);
    writeFileSync(join(outDir, `${name}.png`), buf);
    console.log(`  · 已写出 ${name}.png (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}

console.log(`\n结果：${failures === 0 ? '全部通过 ✓' : `${failures} 项未通过 ✗`}\n`);
process.exit(failures === 0 ? 0 : 1);
