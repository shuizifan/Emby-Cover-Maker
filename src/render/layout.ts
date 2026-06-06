// ============================================================
//  布局派生（手册 §4.2「派生」，只读，UI 不允许编辑）
//  唯一锁死关系：海报高 = 海报宽 × 1.5
// ============================================================
import type { RenderParams } from '../types';

export interface Layout {
  /** 海报宽 */
  posterW: number;
  /** 海报高 = 海报宽 × 1.5（2:3 锁定） */
  posterH: number;
  /** 各列横向起点 X */
  colStartXs: number[];
  /** 总槽位数 = Σ(各列海报数) */
  totalSlots: number;
}

/** 列内留白：文字区右侧再留 6px 才开始第一列（与参考实现一致） */
const LAYOUT_INNER_PAD = 6;

export function calcLayout(p: Pick<RenderParams, 'posterWidth' | 'textAreaWidth' | 'colGap' | 'cols' | 'columns'>): Layout {
  const posterW = p.posterWidth;
  const posterH = posterW * 1.5;
  const layoutStartX = p.textAreaWidth + LAYOUT_INNER_PAD;
  const colStartXs: number[] = [];
  for (let i = 0; i < p.cols; i++) {
    colStartXs.push(layoutStartX + i * (posterW + p.colGap));
  }
  let totalSlots = 0;
  for (let c = 0; c < p.cols && c < p.columns.length; c++) totalSlots += p.columns[c].count;
  return { posterW, posterH, colStartXs, totalSlots };
}

/**
 * 该列循环带高度 L = 海报数 × (海报高 + 列内上下间距)（手册 §3.1 / §4.2）
 */
export function stripHeight(count: number, gap: number, posterH: number): number {
  return count * (posterH + gap);
}
