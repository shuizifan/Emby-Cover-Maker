import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ensureBuiltinFonts } from './fonts/builtin'; // 注册内置字体到 document.fonts
import { loadUserFonts } from './fonts/userFonts';
import App from './App';
import './styles.css';

const el = document.getElementById('root');
if (!el) throw new Error('找不到 #root 挂载点');

// 先把内置字体登记好、用户字体清单读完，再挂载（保证字体一开始就完整）
Promise.all([ensureBuiltinFonts(), loadUserFonts()]).finally(() => {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
