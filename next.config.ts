import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Fotos de los autos guardadas en Supabase.
    remotePatterns: [
      { protocol: "https", hostname: "exdfkyrvzjyksjgyuiax.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    // Cada foto tiene una URL única que no cambia: se puede guardar optimizada por 31 días.
    minimumCacheTTL: 2678400,
  },
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
