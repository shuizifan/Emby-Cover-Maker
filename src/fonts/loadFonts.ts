// ============================================================
//  按需加载字体：只加载标题实际用到的字体。
//  预览每帧重画，字体到了自然刷新；导出是一次性快照，
//  必须先等字体加载完，否则成片会用回退字体。
// ============================================================
import type { RenderTitle } from '../types';

const hasFontApi = () => typeof document !== 'undefined' && 'fonts' in document;

/** 标题对应的 CSS font 简写（与 textOverlay 渲染时一致） */
export function titleFont(t: Pick<RenderTitle, 'weight' | 'size' | 'family'>): string {
  return `${t.weight} ${t.size}px ${t.family}`;
}

/** 触发加载（不等待）：切换字体时调用，预览下一帧就能用上 */
export function requestFont(font: string, text = ''): void {
  if (!hasFontApi()) return;
  document.fonts.load(font, text || ' ').catch(() => undefined);
}

/** 等这些标题的字体全部就绪；超时后放行，避免单个字体卡住导出 */
export async function ensureTitleFonts(titles: RenderTitle[], timeoutMs = 10_000): Promise<void> {
  if (!hasFontApi()) return;
  const work = Promise.all(
    titles
      .filter((t) => t.text)
      .map((t) => document.fonts.load(titleFont(t), t.upper ? t.text.toUpperCase() : t.text).catch(() => [])),
  ).then(() => document.fonts.ready);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((r) => {
    timer = setTimeout(r, timeoutMs);
  });
  await Promise.race([work, timeout]);
  clearTimeout(timer);
}
