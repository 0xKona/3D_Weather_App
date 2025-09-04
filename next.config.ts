import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['upload.wikimedia.org', 'commons.wikimedia.org', 'cdn.weatherapi.com'],
  },
  reactStrictMode: false, // Disable React Strict Mode to prevent double mounting in dev
  experimental: {
    webpackBuildWorker: true,
  },
};

export default nextConfig;
