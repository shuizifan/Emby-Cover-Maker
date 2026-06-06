// ============================================================
//  Tab：每列（每列独立参数）
//  每列一张卡片：海报数 / 列内上下间距 / 方向 / 速度倍率。
//  卡片随列数动态增减。速度非整数时给黄色警告。
// ============================================================
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Direction } from '../../types';
import { HelpText, Segmented, Slider, Toggle } from '../controls';

export function ColumnsPanel() {
  const cols = useStore((s) => s.cols);
  const columns = useStore((s) => s.columns);
  const setColumnField = useStore((s) => s.setColumnField);
  const pro = useStore((s) => s.uiMode === 'pro');
  const [fineSpeed, setFineSpeed] = useState(false);

  const setFineSpeedMode = (enabled: boolean) => {
    setFineSpeed(enabled);
    if (!enabled) {
      columns.slice(0, cols).forEach((c, col) => {
        if (!Number.isInteger(c.speed)) setColumnField(col, 'speed', Math.max(1, Math.round(c.speed)));
      });
    }
  };

  return (
    <div className="panel">
      <HelpText>共 {cols} 列。各列参数互相独立；海报多的列会滚得快，但所有列同时回到起点。</HelpText>
      {pro && (
        <>
          <Toggle label="精细速度" checked={fineSpeed} onChange={setFineSpeedMode} />
          <HelpText>{fineSpeed ? '已解锁 0.1 步进；非整数倍率可能让 GIF 循环点卡一帧。' : '默认使用整数倍率，循环更稳。需要细调时再打开精细速度。'}</HelpText>
        </>
      )}
      <div className="column-cards">
        {Array.from({ length: cols }).map((_, col) => {
          const c = columns[col];
          if (!c) return null;
          const speedWarn = !Number.isInteger(c.speed);
          return (
            <div key={col} className="column-card">
              <div className="column-card-title">列 {col + 1}</div>
              <Slider label="海报数" value={c.count} min={1} max={20} onChange={(v) => setColumnField(col, 'count', v)} />
              {pro && (
                <>
                  <Slider label="上下间距" value={c.gap} min={0} max={30} onChange={(v) => setColumnField(col, 'gap', v)} suffix="px" />
                  <div className="field-row">
                    <span className="field-label">方向</span>
                    <Segmented<'up' | 'down'>
                      value={c.direction === -1 ? 'up' : 'down'}
                      onChange={(v) => setColumnField(col, 'direction', (v === 'up' ? -1 : 1) as Direction)}
                      options={[
                        { value: 'up', label: '向上' },
                        { value: 'down', label: '向下' },
                      ]}
                    />
                  </div>
                  <Slider
                    label="速度倍率"
                    value={c.speed}
                    min={fineSpeed ? 0.1 : 1}
                    max={5}
                    step={fineSpeed ? 0.1 : 1}
                    onChange={(v) => setColumnField(col, 'speed', fineSpeed ? Math.round(v * 10) / 10 : Math.round(v))}
                    suffix="×"
                    warn={speedWarn}
                  />
                </>
              )}
              {pro && speedWarn && (
                <div className="warn-text">
                  ⚠ 速度为非整数（{c.speed}×）时，该列循环点不再无缝，GIF 会卡一帧。建议用整数倍率。
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
