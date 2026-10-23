import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Laisse passer les fichiers joints au formulaire de demande (4 Mo max, voir lib/site.ts).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
