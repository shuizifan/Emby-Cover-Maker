// ============================================================
//  应用外壳：左侧常驻预览 + 工具栏，右侧 Tab 设置区，角落主题切换。
//  UI 明暗主题应用到 <html data-theme>，支持跟随系统。
// ============================================================
import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { PreviewCanvas } from './components/PreviewCanvas';
import { Toolbar } from './components/Toolbar';
import { Tabs } from './components/Tabs';
import { ThemeToggle } from './components/ThemeToggle';
import { ModeToggle } from './components/ModeToggle';

export default function App() {
  const uiTheme = useStore((s) => s.uiTheme);

  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const resolved = uiTheme === 'system' ? (mql.matches ? 'light' : 'dark') : uiTheme;
      root.dataset.theme = resolved;
    };
    apply();
    if (uiTheme === 'system') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [uiTheme]);

  return (
    <div className="app">
      <section className="preview-area">
        <header className="app-header">
          <div>
            <h1>动态封面海报工具</h1>
            <p>主题：海报斜播 · 输出 GIF</p>
          </div>
          <div className="header-toggles">
            <ModeToggle />
            <ThemeToggle />
          </div>
        </header>
        <PreviewCanvas />
        <Toolbar />
      </section>
      <Tabs />
    </div>
  );
}
