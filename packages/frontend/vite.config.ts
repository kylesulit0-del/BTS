import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { config } from "./src/config/index.ts";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: config.labels.appName,
        short_name: config.theme.groupName,
        description: config.labels.appDescription,
        theme_color: "#0d0d0d",
        background_color: "#0d0d0d",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
    }),
    {
      name: "inject-config-html",
      transformIndexHtml(html) {
        return html
          .replace(/<title>.*<\/title>/, `<title>${config.labels.appTitle}</title>`)
          .replace(/content="BTS"/, `content="${config.theme.groupName}"`);
      },
    },
  ],
  server: {
    host: true,
    allowedHosts: true,
  },
});
