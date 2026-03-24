import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure environment variables are available
  env: {
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    KREA_API_KEY: process.env.KREA_API_KEY,
  },
};

export default nextConfig;
