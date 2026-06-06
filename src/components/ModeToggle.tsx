// ============================================================
//  界面繁简切换（简易 / 专业）——右上角分段控件。
//  · 简易：每个面板只展示最核心的几个控件，快速出片不被干扰。
//  · 专业：展开全部高级自定义参数。
// ============================================================
import { useStore } from '../store/useStore';
import { Segmented } from './controls';
import type { UiMode } from '../types';

export function ModeToggle() {
  const uiMode = useStore((s) => s.uiMode);
  const setField = useStore((s) => s.setField);
  return (
    <Segmented<UiMode>
      value={uiMode}
      onChange={(v) => setField('uiMode', v)}
      options={[
        { value: 'simple', label: '简易' },
        { value: 'pro', label: '专业' },
      ]}
    />
  );
}
