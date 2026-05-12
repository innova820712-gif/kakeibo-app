// Vite 設定
// - /api で始まるリクエストはバックエンド (localhost:3001) に転送する
// - vite-plugin-pwa で PWA 化(ホーム画面追加・Dock 追加が可能)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 開発サーバーでもサービスワーカーを有効化(インストールアイコンを表示するため)
      devOptions: {
        enabled: true,
        type: "module",
      },
      // ブラウザがインストール対象として認識するための manifest
      manifest: {
        name: "領収書スキャナー",
        short_name: "領収書",
        description: "領収書を撮って送るだけで、自動で経費を記録します。",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        lang: "ja",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      // 自動でサービスワーカーを登録
      registerType: "autoUpdate",
      workbox: {
        // バックエンドへの API 呼び出しはキャッシュしない(常に最新を取りに行く)
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
