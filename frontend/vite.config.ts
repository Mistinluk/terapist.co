import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
