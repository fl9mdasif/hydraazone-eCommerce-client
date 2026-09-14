import type { NextConfig } from "next";

/**
 * `images.domains` is deprecated in Next 16 — `remotePatterns` only.
 *
 * The catalogue stores absolute image URLs, so every host those URLs can
 * point at has to be listed here or `next/image` refuses to optimise them.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Pre-signed S3 uploads from `/uploads/generate-upload-url`.
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      // Sultan Bazar's live images are served from imgbb today and the
      // HydraaZone catalogue may still carry some of those URLs.
      { protocol: "https", hostname: "i.ibb.co" },
      // Development seed imagery only. Remove once the real catalogue lands.
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
