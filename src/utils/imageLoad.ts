// 把上传的文件读成可绘制的 HTMLImageElement（用 object URL，cover 绘制时再裁切）
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`图片加载失败：${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

export interface BatchLoadResult {
  images: HTMLImageElement[];
  /** 读取失败的文件名（格式不支持 / 文件损坏） */
  failed: string[];
  /** 被跳过的非图片文件数 */
  skipped: number;
}

/** 批量读取：单张失败不影响其它，失败的单独汇报 */
export async function filesToImages(files: FileList | File[]): Promise<BatchLoadResult> {
  const all = Array.from(files);
  const list = all.filter((f) => f.type.startsWith('image/'));
  const results = await Promise.allSettled(list.map(fileToImage));
  const images: HTMLImageElement[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') images.push(r.value);
    else failed.push(list[i].name);
  });
  return { images, failed, skipped: all.length - list.length };
}
