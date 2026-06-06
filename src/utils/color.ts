// 颜色转换小工具
export function normalizeHex(hex: string): string {
  let h = hex.trim();
  if (!h.startsWith('#')) h = '#' + h;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    h = '#' + h.slice(1).split('').map((c) => c + c).join('');
  }
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : '';
}

export function hexToRgbObj(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex) || '#000000';
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

export function rgbObjToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbText(hex: string): string {
  const { r, g, b } = hexToRgbObj(hex);
  return `${r}, ${g}, ${b}`;
}

/** RGB(0–255) → HSL(h:0–360, s/l:0–1) */
export function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** HSL(h:0–360, s/l:0–1) → RGB(0–255) */
export function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(hue(hh + 1 / 3) * 255),
    g: Math.round(hue(hh) * 255),
    b: Math.round(hue(hh - 1 / 3) * 255),
  };
}

/**
 * 从一个基准色推导"同色相、有对比感"的装饰色：
 * 保持色相不变，提高饱和度、把亮度拉到中高，使其在背景上既不突兀也能看清。
 * 例：背景 #253c64→#78a3eb（蓝），推出来约是一支明亮的蓝青色。
 */
export function deriveAccent(baseHex: string): string {
  const { h, s } = rgbToHsl(hexToRgbObj(baseHex));
  // 近乎中性灰：色相不可靠，给一支柔和冷灰，避免凭空冒出红/绿
  if (s < 0.12) return rgbObjToHex(hslToRgb({ h: 215, s: 0.18, l: 0.68 }));
  const s2 = Math.min(0.85, Math.max(0.55, s * 1.2));
  const l2 = 0.62;
  return rgbObjToHex(hslToRgb({ h, s: s2, l: l2 }));
}
