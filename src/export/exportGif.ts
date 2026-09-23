// ============================================================
//  GIF 导出（gif.js + Web Worker 编码）
//  满足手册 §9 输出契约：
//    1. GIF89a，无限循环 (repeat = 0)
//    2. 尺寸与配置一致
//    3. 每帧间隔 100/fps 厘秒（写入 GCE；帧率只提供能整除 100 的档位）
//    4. 帧数 = 时长 × 帧率，最后一帧之后无重复（t = i/n）
//    6. 默认 Floyd-Steinberg 抖色
// ============================================================
import GIF from 'gif.js';
// Vite 把 worker 脚本作为资源 URL 引入（现代打包方式，无需手动托管）
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';
import type { DitherMode, ExportScale, RenderState } from '../types';
import { render } from '../render/renderFrame';
import { frameCount, frameTime, gifFrameDelayMs } from './frameMath';

/** 编码阶段多久没有任何进度就判定卡死（Worker 加载失败 / 被 CSP 拦截时不会有任何事件） */
const ENCODE_STALL_MS = 45_000;

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
  /** 所有帧共用首帧调色板：帧间色彩更稳、体积更小，但后出现的海报可能偏色 */
  globalPalette?: boolean;
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
  const delay = gifFrameDelayMs(s.fps);
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

  // globalPalette 是 gif.js 支持但类型声明里漏掉的选项
  const gifOptions: GIF.Options & { globalPalette?: boolean } = {
    workers: 2,
    quality: opts.quality,
    width: s.width,
    height: s.height,
    workerScript: gifWorkerUrl,
    repeat: 0, // 无限循环（手册 §9.1）
    dither: opts.dither === 'false' ? false : opts.dither,
    globalPalette: opts.globalPalette === true,
  };
  const gif = new GIF(gifOptions);

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
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    const fail = (err: Error, abortEncoder = true) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      if (abortEncoder) {
        try {
          gif.abort();
        } catch {
          /* 已停止 */
        }
      }
      reject(err);
    };
    // 每次有进度就重新计时；长时间无进度说明 Worker 没跑起来
    const arm = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(
        () => fail(new Error(`GIF 编码 ${ENCODE_STALL_MS / 1000} 秒无进展，编码 Worker 可能加载失败或被拦截`)),
        ENCODE_STALL_MS,
      );
    };

    gif.on('progress', (p: number) => {
      arm();
      opts.onPhase?.({
        phase: 'encode',
        progress: p,
        message: `GIF 编码 ${Math.round(p * 100)}%`,
      });
    });

    gif.on('abort', () => fail(new Error('GIF 编码被中止'), false));

    gif.on('finished', (blob: Blob) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
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

    try {
      gif.render();
      arm();
      // gif.js 不转发 Worker 的 error 事件：直接挂到它刚创建的 Worker 上
      const internal = gif as unknown as { freeWorkers?: Worker[]; activeWorkers?: Worker[] };
      for (const w of [...(internal.freeWorkers ?? []), ...(internal.activeWorkers ?? [])]) {
        w.onerror = (e) => {
          e.preventDefault();
          fail(new Error(`GIF 编码 Worker 出错：${e.message || '脚本加载失败'}`));
        };
      }
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
