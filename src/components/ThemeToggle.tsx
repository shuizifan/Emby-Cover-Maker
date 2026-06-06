// 界面主题三档切换：深色 / 浅色 / 跟随系统（放在角落）
import { useStore } from '../store/useStore';
import type { UiTheme } from '../types';
import { Segmented } from './controls';

export function ThemeToggle() {
  const uiTheme = useStore((s) => s.uiTheme);
  const setField = useStore((s) => s.setField);
  return (
    <div className="theme-toggle" title="界面明暗">
      <Segmented<UiTheme>
        value={uiTheme}
        onChange={(v) => setField('uiTheme', v)}
        options={[
          { value: 'dark', label: '深' },
          { value: 'light', label: '浅' },
          { value: 'system', label: '自动' },
        ]}
      />
    </div>
  );
}
