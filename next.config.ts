// @ts-nocheck
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Dieser leere Block sagt Next.js 16, dass es mit dem PWA-Plugin klarkommen soll
  turbopack: {},
};

export default withPWA(nextConfig);