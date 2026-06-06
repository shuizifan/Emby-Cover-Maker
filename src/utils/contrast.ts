import type { FillValue } from '../types';
import { hexToRgbObj, normalizeHex } from './color';

function linearChannel(v: number): number {
  const n = v / 255;
  return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgbObj(hex);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function fillStops(fill: FillValue): string[] {
  const stops = [normalizeHex(fill.c1)];
  if (fill.mode === 'gradient') stops.push(normalizeHex(fill.c2));
  return stops.filter(Boolean);
}

export function minFillContrast(fg: FillValue, bg: FillValue): number {
  const fgStops = fillStops(fg);
  const bgStops = fillStops(bg);
  let min = Infinity;
  for (const a of fgStops) {
    for (const b of bgStops) min = Math.min(min, contrastRatio(a, b));
  }
  return Number.isFinite(min) ? min : 0;
}
