// ============================================================
//  Tab：布局（手册 §6.2 / §4.2）
//  画布宽高 / 列数 / 文字区宽 / 列间距 / 海报宽。
//  所有参数完全独立，唯一只读派生：海报高 = 海报宽 × 1.5。
// ============================================================
import { useStore } from '../../store/useStore';
import { GroupTitle, HelpText, Slider } from '../controls';

export function LayoutPanel() {
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const cols = useStore((s) => s.cols);
  const textAreaWidth = useStore((s) => s.textAreaWidth);
  const colGap = useStore((s) => s.colGap);
  const posterWidth = useStore((s) => s.posterWidth);
  const columns = useStore((s) => s.columns);

  const setField = useStore((s) => s.setField);
  const setCols = useStore((s) => s.setCols);
  const pro = useStore((s) => s.uiMode === 'pro');

  const posterH = posterWidth * 1.5;
  const avgPosterGap =
    columns.slice(0, cols).reduce((sum, c) => sum + c.gap, 0) / Math.max(1, cols);
  const perColValue = height / (posterH + avgPosterGap);
  const perCol = perColValue.toFixed(2);

  return (
    <div className="panel">
      <GroupTitle>海报区</GroupTitle>
      <Slider label="列数" value={cols} min={1} max={6} onChange={setCols} />
      <Slider label="海报宽度" value={posterWidth} min={20} max={120} onChange={(v) => setField('posterWidth', v)} suffix="px" />

      {pro && (
        <>
          <Slider label="文字区宽" value={textAreaWidth} min={0} max={200} step={2} onChange={(v) => setField('textAreaWidth', v)} suffix="px" />
          <Slider label="列间距" value={colGap} min={0} max={30} onChange={(v) => setField('colGap', v)} suffix="px" />

          <GroupTitle>画布</GroupTitle>
          <Slider label="宽度" value={width} min={160} max={640} step={10} onChange={(v) => setField('width', v)} suffix="px" />
          <Slider label="高度" value={height} min={90} max={360} step={10} onChange={(v) => setField('height', v)} suffix="px" />

          <div className="readonly-row">
            <span>海报高度（只读）</span>
            <b>{posterH.toFixed(1)} px</b>
          </div>
          <div className="readonly-row">
            <span>每列约可见</span>
            <b>{perCol} 张</b>
          </div>
          {perColValue > 2.5 && (
            <div className="warn-text">
              海报偏小：当前每列约可见 {perCol} 张，会削弱“斜播大海报”的质感。建议把海报宽度调大，让可见数量接近 1.7 张。
            </div>
          )}

          <HelpText>
            <b>海报永远是 2:3</b>，高度自动 = 宽 × 1.5。布局总宽超出画布时，溢出部分被自然裁切，旋转后看不到——这是预期行为，不会自动收缩。
          </HelpText>
        </>
      )}
    </div>
  );
}
