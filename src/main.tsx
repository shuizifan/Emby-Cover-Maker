import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerBuiltinFonts } from './fonts/builtin';
import { loadUserFonts } from './fonts/userFonts';
import App from './App';
import './styles.css';

const el = document.getElementById('root');
if (!el) throw new Error('找不到 #root 挂载点');

// 立即挂载：字体只登记不等待，用到哪款加载哪款；预览每帧重画，字体到了自然刷新
registerBuiltinFonts();
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
void loadUserFonts();
