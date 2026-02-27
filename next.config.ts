import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
  experimental: {
    serverActions: {
      // Permite uploads PDF de hasta 5MB (con margen por overhead multipart).
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
