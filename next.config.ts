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
      // Hero placeholder photography (temporary — swap for real shoots).
      { protocol: "https", hostname: "www.morty.com" },
      { protocol: "https", hostname: "www.theatrium.com.mt" },
      // A Google Images cache thumbnail — see the note by its use in
      // content/home.ts. Fragile: Google can expire/rotate this URL without
      // notice, and it serves at thumbnail resolution, not full size.
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
    ],
  },
};

export default nextConfig;
