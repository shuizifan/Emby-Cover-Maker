// ============================================================
//  右侧 Tab 容器（v4：背景 / 文字 / 布局 / 每列 / 海报 / 动画 / 导出）
//  面板常驻、只用 hidden 切换：折叠区、精细速度、上传提示等面板内
//  状态在切 Tab 时不丢。
// ============================================================
import type { ComponentType } from 'react';
import { useStore } from '../store/useStore';
import type { TabId } from '../types';
import { BackgroundPanel } from './panels/BackgroundPanel';
import { TextPanel } from './panels/TextPanel';
import { LayoutPanel } from './panels/LayoutPanel';
import { ColumnsPanel } from './panels/ColumnsPanel';
import { PostersPanel } from './panels/PostersPanel';
import { AnimationPanel } from './panels/AnimationPanel';
import { ExportPanel } from './panels/ExportPanel';

const TABS: { id: TabId; label: string; Panel: ComponentType }[] = [
  { id: 'background', label: '背景', Panel: BackgroundPanel },
  { id: 'text', label: '文字', Panel: TextPanel },
  { id: 'layout', label: '布局', Panel: LayoutPanel },
  { id: 'columns', label: '每列', Panel: ColumnsPanel },
  { id: 'posters', label: '海报', Panel: PostersPanel },
  { id: 'animation', label: '动画', Panel: AnimationPanel },
  { id: 'export', label: '导出', Panel: ExportPanel },
];

export function Tabs() {
  const activeTab = useStore((s) => s.activeTab);
  const setField = useStore((s) => s.setField);

  return (
    <div className="settings">
      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-controls={`tabpanel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setField('activeTab', tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {TABS.map(({ id, Panel }) => (
          <div key={id} id={`tabpanel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={activeTab !== id}>
            <Panel />
          </div>
        ))}
      </div>
    </div>
  );
}
