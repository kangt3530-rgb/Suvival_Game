import { defineConfig } from 'vite';

/** 相对路径，便于 GitHub Pages 子目录或任意静态托管直接打开 */
export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [
    {
      name: 'inject-vite-html-flag',
      transformIndexHtml(html) {
        // 仅经 Vite 提供的 HTML 会有此标记；Live Server 直接读磁盘文件则没有
        return html.replace(
          '<head>',
          '<head><script>window.__SERVED_BY_VITE__=1;window.GAME_ASSET_PREFIX="";</script>'
        );
      },
    },
  ],
});
