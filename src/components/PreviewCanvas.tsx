// ============================================================
//  预览画布：requestAnimationFrame 循环按 t 渲染，整数倍放大显示，
//  帧指示器 t=，轴心可视化标记可拖动，标题可拖动（手动开启）。
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { render } from '../render/renderFrame';
import { lastTitleBoxes, type TitleBox } from '../render/textOverlay';

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);

  const showPivot = useStore((s) => s.showPivot);
  const dragTitles = useStore((s) => s.dragTitles);
  const previewNonce = useStore((s) => s.previewNonce);
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const pivotXPct = useStore((s) => s.pivotXPct);
  const pivotYPct = useStore((s) => s.pivotYPct);

  // 显示缩放：在容器内尽量放大，整体不超出
  const [scale, setScale] = useState(2);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const recompute = () => {
      const availW = wrap.clientWidth - 8;
      const availH = wrap.clientHeight - 8;
      if (availW <= 0 || availH <= 0) return;
      const s = Math.max(1, Math.min(availW / width, availH / height));
      setScale(s);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [width, height]);

  // 重启预览：重置时间起点
  useEffect(() => {
    startRef.current = null;
  }, [previewNonce]);

  // rAF 渲染循环（读 getState()，不订阅，避免每帧 React 重渲染）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const loop = (ts: number) => {
      const store = useStore.getState();
      const rs = store.getRenderState();

      if (canvas.width !== rs.width) canvas.width = rs.width;
      if (canvas.height !== rs.height) canvas.height = rs.height;

      if (startRef.current == null) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      const t = (elapsed % rs.duration) / rs.duration;

      render(ctx, rs, t);
      if (indicatorRef.current) indicatorRef.current.textContent = `t = ${t.toFixed(3)}`;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- 轴心拖拽 ----
  const pivotDragRef = useRef(false);

  const updatePivotFromEvent = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
    const setField = useStore.getState().setField;
    setField('pivotXPct', clamp(x));
    setField('pivotYPct', clamp(y));
  };

  const onPivotDown = (e: React.PointerEvent) => {
    if (!showPivot) return;
    pivotDragRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePivotFromEvent(e.clientX, e.clientY);
  };
  const onPivotMove = (e: React.PointerEvent) => {
    if (!pivotDragRef.current) return;
    updatePivotFromEvent(e.clientX, e.clientY);
  };
  const onPivotUp = (e: React.PointerEvent) => {
    pivotDragRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  // ---- 标题拖拽（手动开启） ----
  const titleDragRef = useRef<{
    which: 'cn' | 'en';
    startCx: number;
    startCy: number;
    startOX: number;
    startOY: number;
  } | null>(null);

  const toCanvasXY = (el: HTMLElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();
    const sx = rect.width / width || 1;
    const sy = rect.height / height || 1;
    return { cx: (clientX - rect.left) / sx, cy: (clientY - rect.top) / sy };
  };
  const hit = (box: TitleBox | null, cx: number, cy: number) =>
    !!box && cx >= box.x && cx <= box.x + box.w && cy >= box.y && cy <= box.y + box.h;

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragTitles) return;
    const { cx, cy } = toCanvasXY(e.currentTarget, e.clientX, e.clientY);
    // 英文块通常更小、在下方，优先命中
    const which: 'cn' | 'en' | null = hit(lastTitleBoxes.en, cx, cy)
      ? 'en'
      : hit(lastTitleBoxes.cn, cx, cy)
        ? 'cn'
        : null;
    if (!which) return;
    const t = useStore.getState()[which];
    titleDragRef.current = { which, startCx: cx, startCy: cy, startOX: t.offsetX, startOY: t.offsetY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTitleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = titleDragRef.current;
    if (!d) return;
    const { cx, cy } = toCanvasXY(e.currentTarget, e.clientX, e.clientY);
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
    const setTitleField = useStore.getState().setTitleField;
    setTitleField(d.which, 'offsetX', clamp(d.startOX + (cx - d.startCx), -120, 200));
    setTitleField(d.which, 'offsetY', clamp(d.startOY + (cy - d.startCy), -120, 120));
  };
  const onTitleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    titleDragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const dispW = width * scale;
  const dispH = height * scale;

  return (
    <div className="preview-stage" ref={wrapRef}>
      <div className="canvas-frame" style={{ width: dispW, height: dispH }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="preview-canvas"
          style={{ width: dispW, height: dispH }}
        />
        <div className="frame-indicator" ref={indicatorRef}>
          t = 0.000
        </div>
        {dragTitles && (
          <div
            className="title-drag-overlay"
            onPointerDown={onTitleDown}
            onPointerMove={onTitleMove}
            onPointerUp={onTitleUp}
          />
        )}
        {showPivot && (
          <div className="pivot-overlay" onPointerDown={onPivotDown} onPointerMove={onPivotMove} onPointerUp={onPivotUp}>
            <div className="pivot-marker" style={{ left: `${pivotXPct}%`, top: `${pivotYPct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
