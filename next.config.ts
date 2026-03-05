import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const scriptSrcDirectives = ["'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"])];

const securityHeaders = [
  // Prevent embedding in iframes (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer information sent on navigation
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforce HTTPS for 2 years, include subdomains
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  // Disable browser features not used by the app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy
  // - default-src 'self': only same-origin resources
  // - script-src: Next.js needs 'unsafe-inline' for inline scripts and 'unsafe-eval' for dev HMR
  // - style-src: Tailwind injects styles at runtime
  // - connect-src: Supabase API + Auth endpoints
  // - img-src: allow data: URIs for inline images
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrcDirectives.join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} https://*.supabase.co wss://*.supabase.co`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]
      .filter(Boolean)
      .join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://[::1]",
    "http://[::1]:3000",
  ],
  experimental: {
    serverActions: {
      // Permite uploads PDF de hasta 5MB (con margen por overhead multipart).
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
