// ============================================================
//  上传图片 → 可绘制图像。
//  上传时一次性预缩：原图常见 2000×3000，而海报在画布上最宽 120px、
//  导出最多 3x 超采样，每帧从原图大比例缩放既费 CPU 又易出锯齿。
//  预缩结果留作绘制源，另生成一张小缩略图给面板槽位显示。
// ============================================================
import type { PosterAsset } from '../types';

/** 海报绘制源的尺寸上限：海报宽上限 120px × 导出 3x，2:3 */
const POSTER_MAX = { w: 360, h: 540 };
/** 背景图绘制源的尺寸上限：画布上限 640×360 × 导出 3x */
const BG_MAX = { w: 1920, h: 1080 };
/** 槽位缩略图（槽位约 80×120，按 2x 屏生成） */
const THUMB = { w: 160, h: 240 };

type Source = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

function sizeOf(src: Source): { w: number; h: number } {
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

function loadViaElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`图片加载失败：${file.name}`));
    };
    img.src = url;
  });
}

/** 解码：优先 createImageBitmap（不占主线程解码），不支持的格式回退 <img> */
async function decode(file: File): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* SVG 等格式 createImageBitmap 不支持，回退 */
    }
  }
  return loadViaElement(file);
}

function canvasOf(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

/**
 * 等比缩放到刚好铺满 box（cover 语义，只缩不放）。
 * 每步最多缩一半，避免一次大比例缩放丢细节 / 出锯齿。
 */
function downscaleToCover(src: Source, box: { w: number; h: number }): HTMLCanvasElement {
  const { w, h } = sizeOf(src);
  if (!w || !h) throw new Error('图片尺寸为 0');
  const k = Math.min(1, Math.max(box.w / w, box.h / h));
  const tw = Math.max(1, Math.round(w * k));
  const th = Math.max(1, Math.round(h * k));
  let cur: Source = src;
  let cw = w;
  let ch = h;
  // 至少画一次：不需要缩放时也把解码结果转成独立的 canvas
  do {
    cw = Math.max(tw, Math.round(cw / 2));
    ch = Math.max(th, Math.round(ch / 2));
    const { canvas, ctx } = canvasOf(cw, ch);
    ctx.drawImage(cur, 0, 0, cw, ch);
    cur = canvas;
  } while (cw > tw || ch > th);
  return cur as HTMLCanvasElement;
}

function toObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    // webp 带透明通道且体积小；不支持的浏览器会自动回退 png
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL()), 'image/webp', 0.85);
  });
}

function closeSource(src: Source): void {
  if (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap) src.close();
}

/** 上传的海报文件 → 预缩后的绘制源 + 槽位缩略图 URL */
export async function fileToPoster(file: File): Promise<PosterAsset> {
  let src: Source | null = null;
  try {
    src = await decode(file);
    const image = downscaleToCover(src, POSTER_MAX);
    const thumbUrl = await toObjectUrl(downscaleToCover(image, THUMB));
    return { image, thumbUrl, name: file.name };
  } catch (err) {
    throw new Error(`图片加载失败：${file.name}${err instanceof Error && !err.message.includes(file.name) ? `（${err.message}）` : ''}`);
  } finally {
    if (src) closeSource(src);
  }
}

/** 上传的背景图 → 预缩后的绘制源 */
export async function fileToBackground(file: File): Promise<HTMLCanvasElement> {
  let src: Source | null = null;
  try {
    src = await decode(file);
    return downscaleToCover(src, BG_MAX);
  } catch {
    throw new Error(`图片加载失败：${file.name}`);
  } finally {
    if (src) closeSource(src);
  }
}

/** 释放海报占用的缩略图 URL（替换 / 删除 / 清空时调用） */
export function releasePoster(p: PosterAsset | null | undefined): void {
  if (p?.thumbUrl.startsWith('blob:')) URL.revokeObjectURL(p.thumbUrl);
}

export interface BatchLoadResult {
  posters: PosterAsset[];
  /** 读取失败的文件名（格式不支持 / 文件损坏） */
  failed: string[];
  /** 被跳过的非图片文件数 */
  skipped: number;
}

/** 同时解码的张数上限：原图解码后单张可达数十 MB，一次全解会撑爆内存 */
const DECODE_CONCURRENCY = 4;

/** 批量读取：单张失败不影响其它，失败的单独汇报；结果保持选择顺序 */
export async function filesToPosters(files: FileList | File[]): Promise<BatchLoadResult> {
  const all = Array.from(files);
  const list = all.filter((f) => f.type.startsWith('image/'));
  const results: PromiseSettledResult<PosterAsset>[] = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      results[i] = await fileToPoster(list[i]).then(
        (value) => ({ status: 'fulfilled', value }) as const,
        (reason: unknown) => ({ status: 'rejected', reason }) as const,
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(DECODE_CONCURRENCY, list.length) }, worker));
  const posters: PosterAsset[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') posters.push(r.value);
    else failed.push(list[i].name);
  });
  return { posters, failed, skipped: all.length - list.length };
}
