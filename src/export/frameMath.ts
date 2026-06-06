// ============================================================
//  帧导出规则（手册 §3.2 —— 无缝循环的命脉）
// ============================================================

/** 总帧数 = 时长 × 帧率 */
export function frameCount(duration: number, fps: number): number {
  return Math.round(duration * fps);
}

/**
 * 第 i 帧对应的归一化时间 t。
 *
 * 关键：分母是 n，不是 n-1（手册 §3.2 / §10.4）。
 * 第 n 帧绝不导出，它与第 0 帧重复 —— 写成 i/(n-1) 会让循环点卡一帧。
 */
export function frameTime(i: number, n: number): number {
  return i / n;
}
