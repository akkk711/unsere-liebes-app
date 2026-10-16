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
  eslint: {
    // Diese Zeile sagt Vercel: Ignoriere fehlendes ESLint
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);