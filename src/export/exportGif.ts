// ============================================================
//  GIF 导出（gif.js + Web Worker 编码）
//  满足手册 §9 输出契约：
//    1. GIF89a，无限循环 (repeat = 0)
//    2. 尺寸与配置一致
//    3. 每帧间隔 1000/fps ms（写入 GCE）
//    4. 帧数 = 时长 × 帧率，最后一帧之后无重复（t = i/n）
//    6. 默认 Floyd-Steinberg 抖色
// ============================================================
import GIF from 'gif.js';
// Vite 把 worker 脚本作为资源 URL 引入（现代打包方式，无需手动托管）
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';
import type { DitherMode, ExportScale, RenderState } from '../types';
import { render } from '../render/renderFrame';
import { frameCount, frameTime } from './frameMath';

export interface ExportPhase {
  phase: 'render' | 'encode';
  /** 0..1 */
  progress: number;
  /** 人类可读状态文案 */
  message: string;
}

export interface ExportResult {
  blob: Blob;
  frames: number;
  bytes: number;
}

export interface ExportOptions {
  dither: DitherMode;
  quality: number;
  exportScale: ExportScale;
  onPhase?: (p: ExportPhase) => void;
  /** 自定义文件名（不含扩展名）；默认 cover_WxH_时间戳 */
  fileName?: string;
  /** 是否自动触发浏览器下载，默认 true */
  download?: boolean;
}

/**
 * 渲染所有帧并编码为 GIF。
 * 帧渲染在主线程进行，但每隔几帧 yield 一次让出 UI；
 * 真正耗时的颜色量化/抖色/编码由 gif.js 的 Web Worker 承担，不阻塞界面。
 */
export async function exportGif(s: RenderState, opts: ExportOptions): Promise<ExportResult> {
  const total = frameCount(s.duration, s.fps);
  const delay = 1000 / s.fps;
  const scale = opts.exportScale;

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = s.width * scale;
  renderCanvas.height = s.height * scale;
  const renderCtx = renderCanvas.getContext('2d');
  if (!renderCtx) throw new Error('无法创建离屏 Canvas 上下文');

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = s.width;
  finalCanvas.height = s.height;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('无法创建离屏 Canvas 上下文');

  const gif = new GIF({
    workers: 2,
    quality: opts.quality,
    width: s.width,
    height: s.height,
    workerScript: gifWorkerUrl,
    repeat: 0, // 无限循环（手册 §9.1）
    dither: opts.dither === 'false' ? false : opts.dither,
  });

  // ---- 逐帧渲染（t = i/n，第 n 帧不导出） ----
  for (let i = 0; i < total; i++) {
    const t = frameTime(i, total);
    if (scale === 1) {
      render(finalCtx, s, t);
    } else {
      renderCtx.setTransform(scale, 0, 0, scale, 0, 0);
      renderCtx.clearRect(0, 0, s.width, s.height);
      render(renderCtx, s, t);

      finalCtx.setTransform(1, 0, 0, 1, 0, 0);
      finalCtx.imageSmoothingEnabled = true;
      finalCtx.imageSmoothingQuality = 'high';
      finalCtx.clearRect(0, 0, s.width, s.height);
      finalCtx.drawImage(renderCanvas, 0, 0, s.width, s.height);
    }
    gif.addFrame(finalCtx, { copy: true, delay });
    if (i % 4 === 0 || i === total - 1) {
      opts.onPhase?.({
        phase: 'render',
        progress: (i + 1) / total,
        message: `渲染帧 ${i + 1} / ${total}${scale > 1 ? ` · ${scale}x 边缘优化` : ''}`,
      });
      // 让出主线程，保持 UI 响应
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // ---- 编码（Web Worker） ----
  return new Promise<ExportResult>((resolve, reject) => {
    gif.on('progress', (p: number) => {
      opts.onPhase?.({
        phase: 'encode',
        progress: p,
        message: `GIF 编码 ${Math.round(p * 100)}%`,
      });
    });

    gif.on('finished', (blob: Blob) => {
      if (opts.download !== false) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${opts.fileName ?? `cover_${s.width}x${s.height}_${Date.now()}`}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      resolve({ blob, frames: total, bytes: blob.size });
    });

    // gif.js 没有标准的 error 事件，用 try/catch 兜底渲染调用
    try {
      gif.render();
    } catch (err) {
      reject(err);
    }
  });
}
