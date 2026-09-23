// ============================================================
//  帧导出规则（手册 §3.2 —— 无缝循环的命脉）
// ============================================================

/**
 * 可选帧率。GIF 帧间隔以 1/100 秒为单位写入，只有能整除 100 的帧率
 * 才能精确还原：10 → 10cs、20 → 5cs、25 → 4cs。像 30fps 会被取整成
 * 3cs（实际 33.3fps），成片比设定时长短一截。
 */
export const FPS_OPTIONS = [10, 20, 25] as const;

/** 把任意帧率吸附到最近的可选帧率（旧数据 / 导入数据用） */
export function snapFps(fps: number): number {
  let best: number = FPS_OPTIONS[0];
  for (const f of FPS_OPTIONS) if (Math.abs(f - fps) < Math.abs(best - fps)) best = f;
  return best;
}

/** 总帧数 = 时长 × 帧率 */
export function frameCount(duration: number, fps: number): number {
  return Math.round(duration * fps);
}

/** 写入 GIF 的每帧间隔（ms，已按 GIF 的 10ms 精度取整） */
export function gifFrameDelayMs(fps: number): number {
  return Math.max(1, Math.round(100 / fps)) * 10;
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
