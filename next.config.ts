import type { NextConfig } from "next";

// ─── Security Headers ─────────────────────────────────────────────────────────
// Applied to every response. Tightened for production but safe in dev too.

const securityHeaders = [
  // Prevent clickjacking — disallow embedding in iframes
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME-type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer in cross-origin requests
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Restrict browser features (payment API allowed for Razorpay)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // Force HTTPS for 1 year in production (not strict in dev — no redirect loops)
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Enable React strict mode for catching potential issues early
  reactStrictMode: true,

  // ── Security headers on all routes ────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      // Supabase Storage (charity logos uploaded via admin)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Resend CDN (email template images, if any)
      {
        protocol: "https",
        hostname: "*.resend.dev",
      },
    ],
  },

  // ── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    // Server Actions are stable in Next.js 15 — no flag needed
  },
};

export default nextConfig;
