import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET?.trim();

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@hypofit/contracts": new URL("../../packages/contracts/src/index.ts", import.meta.url).pathname,
      },
    },
    server: apiProxyTarget
      ? {
          proxy: {
            "/api": {
              changeOrigin: true,
              target: apiProxyTarget,
            },
          },
        }
      : undefined,
    test: {
      coverage: {
        exclude: [
          "src/**/*.test.{ts,tsx}",
          "src/**/*.d.ts",
          "src/test/**",
        ],
        include: ["src/**/*.{ts,tsx}"],
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        thresholds: {
          branches: 65,
          functions: 60,
          lines: 55,
          statements: 55,
        },
      },
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
