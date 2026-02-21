import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/chat": ["./corpus/**/*"],
  },
};

export default nextConfig;
