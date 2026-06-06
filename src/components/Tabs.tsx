// ============================================================
//  右侧 Tab 容器（v4：背景 / 文字 / 布局 / 每列 / 海报 / 动画 / 导出）
// ============================================================
import { useStore } from '../store/useStore';
import type { TabId } from '../types';
import { BackgroundPanel } from './panels/BackgroundPanel';
import { TextPanel } from './panels/TextPanel';
import { LayoutPanel } from './panels/LayoutPanel';
import { ColumnsPanel } from './panels/ColumnsPanel';
import { PostersPanel } from './panels/PostersPanel';
import { AnimationPanel } from './panels/AnimationPanel';
import { ExportPanel } from './panels/ExportPanel';

const TABS: { id: TabId; label: string }[] = [
  { id: 'background', label: '背景' },
  { id: 'text', label: '文字' },
  { id: 'layout', label: '布局' },
  { id: 'columns', label: '每列' },
  { id: 'posters', label: '海报' },
  { id: 'animation', label: '动画' },
  { id: 'export', label: '导出' },
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
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setField('activeTab', tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {activeTab === 'background' && <BackgroundPanel />}
        {activeTab === 'text' && <TextPanel />}
        {activeTab === 'layout' && <LayoutPanel />}
        {activeTab === 'columns' && <ColumnsPanel />}
        {activeTab === 'posters' && <PostersPanel />}
        {activeTab === 'animation' && <AnimationPanel />}
        {activeTab === 'export' && <ExportPanel />}
      </div>
    </div>
  );
}
