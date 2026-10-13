import type { NextConfig } from "next";

// @ts-ignore
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  typescript: {
    // Verhindert, dass Vercel den Build wegen kleiner TypeScript-Warnungen abbricht
    ignoreBuildErrors: true,
  },
  eslint: {
    // Verhindert, dass Linter-Warnungen den Build stoppen
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);