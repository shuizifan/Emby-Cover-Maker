// ============================================================
//  字体注册表（V1）：内置字体 + 用户字体（public/fonts）。
//  中英文字体库统一，不再按语种区分；每个标题直接用自己选的字体，
//  渲染时把所选字体放在字体栈最前，后面只跟通用回退（修复了旧版
//  「英文字体栈以 sans-serif 收尾、抢走 CJK 字形」导致切中文字体无效的 bug）。
// ============================================================
import type { FontOption } from '../types';
import { BUILTIN_FONTS } from './builtin';

/** 通用回退：所选字体缺字时才会用到 */
const FALLBACK = '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

/** 用户字体（运行时从 public/fonts/manifest.json 注入） */
let userFonts: FontOption[] = [];

export function setUserFonts(fonts: FontOption[]): void {
  userFonts = fonts;
}

export function getAllFonts(): FontOption[] {
  return [...BUILTIN_FONTS, ...userFonts];
}

/** 统一字体库：中英文都用同一份清单 */
export function allFontOptions(): FontOption[] {
  return getAllFonts();
}

export function findFont(id: string): FontOption | undefined {
  return getAllFonts().find((f) => f.id === id);
}

/** 由字体 id 解析出渲染用的 font-family（所选字体在前，仅跟通用回退） */
export function fontFamilyOf(id: string): string {
  const fam = findFont(id)?.family;
  return fam ? `${fam}, ${FALLBACK}` : FALLBACK;
}
