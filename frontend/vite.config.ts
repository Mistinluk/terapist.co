import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const reservedPaths = [
  "api",
  "assets",
  "aydinlatma",
  "badge",
  "basvuru",
  "cozumler",
  "davet",
  "favicon",
  "giris",
  "karsilastirma",
  "kesfet",
  "panel",
  "passport",
  "passport-assets",
  "r",
  "rehber",
  "uzman",
  "yonetim",
  "admin",
].join("|");
const publicProfilePath = `^/(?!(${reservedPaths})(?:\\?|$))[a-z][a-z0-9-]{1,38}[a-z0-9](?:\\?.*)?$`;

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        assetFileNames: (asset) =>
          asset.name?.endsWith(".css")
            ? "assets/app.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [
    react(),
    {
      name: "yerel-adresi-eslestir",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const address = server.httpServer?.address();
          const port =
            address && typeof address === "object"
              ? address.port
              : server.config.server.port;
          const localAliases = [`127.0.0.1:${port}`, `[::1]:${port}`];
          if (
            request.method === "GET" &&
            request.headers.accept?.includes("text/html") &&
            !request.url?.startsWith("/api/") &&
            localAliases.includes(request.headers.host ?? "")
          ) {
            // Yalnızca sayfa gezintisi yönlendirilir; API Origin'i korunur.
            response.writeHead(302, {
              Location: `http://localhost:${port}${request.url ?? "/"}`,
              "Cache-Control": "no-store",
            });
            response.end();
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    // Tarayıcı adresi backend UYGULAMA_ADRESI ile aynı olmalıdır.
    host: "localhost",
    port: 5173,
    strictPort: true,
    proxy: {
      [publicProfilePath]: "http://127.0.0.1:8000",
      "/api": "http://127.0.0.1:8000",
      "/badge": "http://127.0.0.1:8000",
      "/passport": "http://127.0.0.1:8000",
      "/uzman/": "http://127.0.0.1:8000",
      "/robots.txt": "http://127.0.0.1:8000",
      "/sitemap.xml": "http://127.0.0.1:8000",
    },
  },
});
