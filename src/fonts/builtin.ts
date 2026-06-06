// ============================================================
//  内置字体（V1）：项目自带的 10 款字体，中英文通用，不再区分语种。
//  每个字体文件通过 Vite 资源导入拿到打包后 URL，再用 FontFace API
//  以一个干净的 font-family 名注册到 document.fonts，渲染时直接用该名。
//  这样字体名完全由我们掌控，不依赖字体文件内部那串杂乱的家族名。
// ============================================================
import type { FontOption } from '../types';

import fzFengYaSong from './files/FZFengYaSong.ttf';
import youSheYuan from './files/YouSheBiaoTiYuan.otf';
import dingTalkJinBuTi from './files/DingTalkJinBuTi.ttf';
import douyinSans from './files/DouyinSans.ttf';
import cormorant from './files/CormorantGaramond-Light.ttf';
import meleteUltraLight from './files/Melete-UltraLight.otf';
import meleteLight from './files/Melete-Light.otf';
import meleteRegular from './files/Melete-Regular.otf';
import meleteMedium from './files/Melete-Medium.otf';
import meleteBold from './files/Melete-Bold.otf';

interface BuiltinDef {
  id: string;
  /** 展示名 = CSS font-family（保持规范、易读） */
  label: string;
  url: string;
}

/** 收录顺序即下拉显示顺序：中文在前，英文在后 */
const DEFS: BuiltinDef[] = [
  { id: 'fz-fengyasong', label: '方正风雅宋', url: fzFengYaSong },
  { id: 'youshe-yuan', label: '优设标题圆', url: youSheYuan },
  { id: 'dingtalk-jinbuti', label: '钉钉进步体', url: dingTalkJinBuTi },
  { id: 'douyin-meihao', label: '抖音美好体', url: douyinSans },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', url: cormorant },
  { id: 'melete-ultralight', label: 'Melete UltraLight', url: meleteUltraLight },
  { id: 'melete-light', label: 'Melete Light', url: meleteLight },
  { id: 'melete-regular', label: 'Melete Regular', url: meleteRegular },
  { id: 'melete-medium', label: 'Melete Medium', url: meleteMedium },
  { id: 'melete-bold', label: 'Melete Bold', url: meleteBold },
];

/** 数据清单（无 DOM 依赖，可被注册表安全引用） */
export const BUILTIN_FONTS: FontOption[] = DEFS.map((d) => ({
  id: d.id,
  label: d.label,
  family: `"${d.label}"`,
  lang: 'both',
  source: 'bundled',
}));

let injected = false;

/** 在浏览器里把内置字体注册进 document.fonts（main.tsx 调用一次） */
export function ensureBuiltinFonts(): Promise<void> {
  if (injected || typeof document === 'undefined' || !('fonts' in document)) {
    return Promise.resolve();
  }
  injected = true;
  const loads = DEFS.map((d) => {
    try {
      const face = new FontFace(d.label, `url("${d.url}")`, {
        weight: '400',
        style: 'normal',
        display: 'swap',
      });
      (document as Document).fonts.add(face);
      return face.load().then(
        () => undefined,
        () => undefined,
      );
    } catch {
      return Promise.resolve();
    }
  });
  return Promise.all(loads).then(() => undefined);
}
