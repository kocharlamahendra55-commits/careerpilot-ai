import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
    "@prisma/adapter-libsql",
    "@prisma/client",
    "pdf-parse",
  ],
};

export default nextConfig;
