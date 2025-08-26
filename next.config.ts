import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['upload.wikimedia.org', 'commons.wikimedia.org', 'cdn.weatherapi.com'],
  },
};

export default nextConfig;
