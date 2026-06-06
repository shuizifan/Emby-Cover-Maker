// ============================================================
//  扫描 public/fonts/ 生成 manifest.json
//  约定：public/fonts/<字体名>/<字体文件>.(woff2|woff|ttf|otf)
//    · 字体名（文件夹名）= 显示名 = CSS font-family
//    · 文件名含 300/400/500/700/900 视为字重，含 italic 视为斜体
//    · 语言默认 both（中英文下拉都会出现）；可在 <字体名>/meta.json 写 {"lang":"cn"} 指定
//  运行：npm run scan-fonts（dev/build 会自动先跑一次）
// ============================================================
import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, '..', 'public', 'fonts');
const FONT_EXT = /\.(woff2|woff|ttf|otf)$/i;

function weightOf(name: string): number {
  const m = name.match(/(?:^|[^0-9])([1-9]00)(?:[^0-9]|$)/);
  return m ? Number(m[1]) : 400;
}

interface Face { weight: number; style: string; url: string }
interface Font { id: string; label: string; family: string; lang: 'cn' | 'en' | 'both'; faces: Face[] }

const fonts: Font[] = [];

if (existsSync(fontsDir)) {
  for (const entry of readdirSync(fontsDir)) {
    const dir = join(fontsDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    const files = readdirSync(dir).filter((f) => FONT_EXT.test(f));
    if (!files.length) continue;

    let lang: 'cn' | 'en' | 'both' = 'both';
    const metaPath = join(dir, 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        if (meta.lang === 'cn' || meta.lang === 'en' || meta.lang === 'both') lang = meta.lang;
      } catch {
        /* ignore bad meta */
      }
    }

    const faces: Face[] = files.map((file) => ({
      weight: weightOf(file),
      style: /italic/i.test(file) ? 'italic' : 'normal',
      url: `fonts/${entry}/${file}`,
    }));

    fonts.push({ id: entry.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: entry, family: entry, lang, faces });
  }
}

const out = join(fontsDir, 'manifest.json');
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), fonts }, null, 2));
console.log(`[scan-fonts] 收录 ${fonts.length} 款用户字体 → public/fonts/manifest.json`);
