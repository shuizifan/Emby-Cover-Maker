// ============================================================
//  应用外壳：左侧常驻预览 + 工具栏，右侧 Tab 设置区，角落主题切换。
//  UI 明暗主题应用到 <html data-theme>，支持跟随系统。
// ============================================================
import { useEffect, useSyncExternalStore } from 'react';
import { useStore } from './store/useStore';
import { fontFamilyOf, getFontsVersion, subscribeFonts } from './fonts/registry';
import { requestFont } from './fonts/loadFonts';
import { PreviewCanvas } from './components/PreviewCanvas';
import { Toolbar } from './components/Toolbar';
import { Tabs } from './components/Tabs';
import { ThemeToggle } from './components/ThemeToggle';
import { ModeToggle } from './components/ModeToggle';

/** 按需加载标题当前用到的字体（切换字体 / 字重 / 用户字体清单到达时触发） */
function useTitleFonts() {
  const fontsVersion = useSyncExternalStore(subscribeFonts, getFontsVersion);
  const cnFont = useStore((s) => (s.showText ? `${s.cn.weight} 16px ${fontFamilyOf(s.cn.fontId)}` : ''));
  const enFont = useStore((s) => (s.showText ? `${s.en.weight} 16px ${fontFamilyOf(s.en.fontId)}` : ''));
  useEffect(() => {
    const { cn, en } = useStore.getState();
    if (cnFont) requestFont(cnFont, cn.text);
    if (enFont) requestFont(enFont, en.upper ? en.text.toUpperCase() : en.text);
  }, [cnFont, enFont, fontsVersion]);
}

export default function App() {
  const uiTheme = useStore((s) => s.uiTheme);
  useTitleFonts();

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
