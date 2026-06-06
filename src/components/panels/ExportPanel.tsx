// ============================================================
//  Tab：导出（手册 §6.2 / §9 输出契约）
//  抖色算法 / 质量 / 导出按钮（状态/进度）。
// ============================================================
import { useStore } from '../../store/useStore';
import type { DitherMode, ExportScale } from '../../types';
import { frameCount } from '../../export/frameMath';
import { GroupTitle, HelpText, Segmented, Slider } from '../controls';

const DITHER_OPTIONS: { value: DitherMode; label: string }[] = [
  { value: 'FloydSteinberg', label: 'Floyd-Steinberg（默认，最佳）' },
  { value: 'FloydSteinberg-serpentine', label: 'Floyd-Steinberg 蛇形' },
  { value: 'Atkinson', label: 'Atkinson' },
  { value: 'false', label: '关闭抖色（色块明显）' },
];

export function ExportPanel() {
  const dither = useStore((s) => s.dither);
  const quality = useStore((s) => s.quality);
  const exportScale = useStore((s) => s.exportScale);
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const duration = useStore((s) => s.duration);
  const fps = useStore((s) => s.fps);

  const setField = useStore((s) => s.setField);
  const pro = useStore((s) => s.uiMode === 'pro');
  const runExport = useStore((s) => s.runExport);
  const busy = useStore((s) => s.exportBusy);
  const status = useStore((s) => s.exportStatus);
  const statusKind = useStore((s) => s.exportStatusKind);
  const frames = frameCount(duration, fps);
  const estimatedKb = Math.max(
    24,
    Math.round((width * height * frames * (0.18 + (21 - quality) * 0.018) * (dither === 'false' ? 0.82 : 1)) / 1024),
  );
  const isComplete = useStore((s) => {
    let total = 0;
    let filled = 0;
    for (let c = 0; c < s.cols; c++) {
      const arr = s.postersByCol[c] ?? [];
      total += s.columns[c]?.count ?? 0;
      for (const p of arr) if (p) filled++;
    }
    return total > 0 && filled === total;
  });

  return (
    <div className="panel">
      <GroupTitle>边缘优化</GroupTitle>
      <div className="field-row">
        <span className="field-label">倍率</span>
        <Segmented<`${ExportScale}`>
          value={String(exportScale) as `${ExportScale}`}
          onChange={(v) => setField('exportScale', Number(v) as ExportScale)}
          options={[
            { value: '1', label: '标准' },
            { value: '2', label: '高清' },
            { value: '3', label: '极致' },
          ]}
        />
      </div>
      <HelpText>导出时先按更大尺寸渲染，再缩回 GIF 尺寸。默认高清 2x，海报斜边会更顺，3x 更慢。</HelpText>

      <div className="readonly-row">
        <span>输出规格</span>
        <b>{width}×{height} · {frames} 帧 · {fps}fps · {exportScale}x</b>
      </div>

      {pro && (
        <>
          <GroupTitle>抖色算法</GroupTitle>
          <div className="field-row">
            <span className="field-label">算法</span>
            <select className="select-input" value={dither} onChange={(e) => setField('dither', e.target.value as DitherMode)}>
              {DITHER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <HelpText>电影海报色彩丰富，GIF 仅 256 色。默认 Floyd-Steinberg 抖色以保留渐变细节（手册 §10.9）。</HelpText>

          <GroupTitle>质量</GroupTitle>
          <Slider label="质量值" value={quality} min={1} max={20} onChange={(v) => setField('quality', v)} />
          <HelpText>数值越小质量越高、编码越慢（gif.js 量化采样间隔）。默认 8。</HelpText>

          <div className="readonly-row">
            <span>体积预估</span>
            <b>约 {estimatedKb} KB</b>
          </div>
        </>
      )}

      <button className="btn btn-primary full big" onClick={runExport} disabled={!isComplete || busy}>
        {busy ? '导出中…' : isComplete ? '立即导出 GIF' : '海报未填满，无法导出'}
      </button>
      <div className={`status-bar status-${statusKind}`}>{status}</div>
    </div>
  );
}
