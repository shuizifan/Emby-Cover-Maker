import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 单人离线工具：无后端、无云。base 用相对路径，方便直接双击 dist/index.html 打开。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
