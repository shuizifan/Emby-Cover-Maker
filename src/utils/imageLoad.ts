// 把上传的文件读成可绘制的 HTMLImageElement（用 object URL，cover 绘制时再裁切）
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`图片加载失败：${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

export async function filesToImages(files: FileList | File[]): Promise<HTMLImageElement[]> {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
  return Promise.all(list.map(fileToImage));
}
