// ============================================================
//  用户字体加载：读取 public/fonts/manifest.json，注入 @font-face，
//  并登记到字体注册表，供下拉选择与渲染使用（与内置字体同列、统一）。
//  manifest.json 由 `npm run scan-fonts` 扫描 public/fonts 生成。
// ============================================================
import { setUserFonts } from './registry';
import type { FontOption } from '../types';

interface ManifestFace {
  weight: number;
  style: string;
  url: string;
}
interface ManifestFont {
  id: string;
  label: string;
  family: string;
  lang: 'cn' | 'en' | 'both';
  faces: ManifestFace[];
}

const BASE = import.meta.env.BASE_URL || './';

function abs(url: string): string {
  return BASE.replace(/\/?$/, '/') + url.replace(/^\.?\//, '');
}

export async function loadUserFonts(): Promise<void> {
  try {
    const res = await fetch(abs('fonts/manifest.json'), { cache: 'no-cache' });
    if (!res.ok) {
      setUserFonts([]);
      return;
    }
    const data = (await res.json()) as { fonts?: ManifestFont[] };
    const fonts = data.fonts ?? [];
    if (!fonts.length) {
      setUserFonts([]);
      return;
    }

    const css = fonts
      .flatMap((f) =>
        f.faces.map(
          (face) =>
            `@font-face{font-family:"${f.family}";src:url("${abs(face.url)}");font-weight:${face.weight};font-style:${face.style};font-display:swap;}`,
        ),
      )
      .join('\n');
    const style = document.createElement('style');
    style.setAttribute('data-user-fonts', 'true');
    style.textContent = css;
    document.head.appendChild(style);

    // 统一库：用户字体也对中英文都可选；family 只放字体名本身，
    // 通用回退由 registry.fontFamilyOf 统一追加，避免回退抢走字形。
    setUserFonts(
      fonts.map<FontOption>((f) => ({
        id: `user-${f.id}`,
        label: `${f.label}（自定义）`,
        family: `"${f.family}"`,
        lang: 'both',
        source: 'user',
      })),
    );
  } catch {
    setUserFonts([]);
  }
}
