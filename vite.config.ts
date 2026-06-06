import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 用相对路径，兼容 GitHub Pages 子路径部署（user.github.io/<repo>/）及各静态托管平台。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
