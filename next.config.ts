import type { NextConfig } from "next";

// --- Supabase (de dónde vienen las fotos y la base de datos) ---
let supabase: URL | null = null;
try {
  supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
} catch {
  supabase = null;
}
const esLocal = !!supabase && ["localhost", "127.0.0.1", "[::1]"].includes(supabase.hostname);
const enVercel = !!process.env.VERCEL;
const enProduccion = process.env.NODE_ENV === "production";
const origenSupabase = supabase ? supabase.origin : "https://*.supabase.co";

// --- Política de seguridad de contenido (CSP) ---
// Estática a propósito: con "nonce" toda la página pasaría a render dinámico y
// perdería el caché, que es lo que la mantiene rápida.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${origenSupabase} https://*.supabase.co`,
  "media-src 'self'",
  "font-src 'self' data:",
  `connect-src 'self' ${origenSupabase} https://*.supabase.co wss://*.supabase.co`,
  "frame-src https://www.google.com https://*.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(enVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecerasSeguridad = [
  ...(enProduccion ? [{ key: "Content-Security-Policy", value: csp }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(enVercel
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const unaSemana = "public, max-age=604800, stale-while-revalidate=86400";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
    // El CSS va dentro del HTML: la página se pinta sin esperar otra descarga.
    inlineCss: true,
  },
  images: {
    remotePatterns: [
      supabase
        ? {
            protocol: supabase.protocol.replace(":", "") as "http" | "https",
            hostname: supabase.hostname,
            port: supabase.port,
            pathname: esLocal ? "/**" : "/storage/v1/object/public/**",
          }
        : { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    qualities: [45, 60, 75],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowLocalIP: esLocal,
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabecerasSeguridad },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      { source: "/admin", headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
      ] },
      { source: "/videos/:path*", headers: [{ key: "Cache-Control", value: unaSemana }] },
      { source: "/:file(.*\\.(?:jpg|jpeg|png|webp|ico|svg))", headers: [{ key: "Cache-Control", value: unaSemana }] },
    ];
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
