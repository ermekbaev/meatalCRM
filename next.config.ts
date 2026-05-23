import type { NextConfig } from "next";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname);

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/webp", "image/avif"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-select", "@radix-ui/react-dialog"],
  },
  // Fix: multiple lockfiles cause Turbopack to pick wrong root
  turbopack: {
    root: PROJECT_ROOT,
  },
  // Fix: same issue for webpack (used in `next build` and CSS processing)
  webpack(config) {
    config.resolve.modules = [
      path.join(PROJECT_ROOT, "node_modules"),
      "node_modules",
    ];
    return config;
  },
  // PWA: sw.js и manifest.json не должны кэшироваться браузером — иначе
  // обновления service worker'а доезжают до клиента только через сутки.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
