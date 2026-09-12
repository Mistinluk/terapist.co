import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";

let vite: ViteDevServer;
let port: number;
const api = createHttpServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ origin: request.headers.origin }));
});

beforeAll(async () => {
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const apiPort = (api.address() as AddressInfo).port;
  vite = await createServer({
    logLevel: "silent",
    plugins: [
      {
        name: "sinama-sayfasi",
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            if (request.url === "/__sinama") {
              response.end("Yerel sayfa");
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      watch: null,
      proxy: { "/api": `http://127.0.0.1:${apiPort}` },
    },
  });
  await vite.listen();
  port = (vite.httpServer!.address() as AddressInfo).port;
});

afterAll(async () => {
  await vite?.close();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

it("yerel IP ile açılan sayfayı yolu koruyarak localhost'a yönlendirir", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/basvuru?adim=1`, {
    headers: { Accept: "text/html" },
    redirect: "manual",
  });
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(
    `http://localhost:${port}/basvuru?adim=1`,
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("localhost sayfasını tekrar yönlendirmez", async () => {
  const response = await fetch(`http://localhost:${port}/__sinama`, {
    headers: { Accept: "text/html" },
    redirect: "manual",
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
});

it("API isteğini yönlendirmez ve tarayıcının Origin değerini korur", async () => {
  const origin = `http://127.0.0.1:${port}`;
  const response = await fetch(`${origin}/api/oturum/basvuru`, {
    method: "POST",
    headers: {
      Accept: "text/html",
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: "{}",
    redirect: "manual",
  });
  expect(response.headers.get("location")).toBeNull();
  expect(await response.json()).toEqual({ origin });
});
