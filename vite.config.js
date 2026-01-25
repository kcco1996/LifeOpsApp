import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // 🔴 REQUIRED for GitHub Pages
  base: "/LifeOpsApp/",

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png"
      ],

      manifest: {
        name: "Life Ops",
        short_name: "Life Ops",
        description: "Daily check-in, coping, planning, and tracking",

        theme_color: "#6D28D9",
        background_color: "#0B0B12",
        display: "standalone",

        // 🔴 MUST match base
        start_url: "/LifeOpsApp/",
        scope: "/LifeOpsApp/",

        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
