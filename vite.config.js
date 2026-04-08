import { defineConfig } from 'vite';

/** 相对路径，便于 GitHub Pages 子目录或任意静态托管直接打开 */
export default defineConfig({
  base: './',
  publicDir: 'public',
});
