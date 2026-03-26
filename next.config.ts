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
};

export default nextConfig;
