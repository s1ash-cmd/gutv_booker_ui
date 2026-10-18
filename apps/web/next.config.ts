import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.11.32", "192.168.31.184"],
  experimental: {
    useTypeScriptCli: true,
  },
};

export default nextConfig;
