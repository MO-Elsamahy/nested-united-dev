import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for Electron packaging
  output: "standalone",

  // Disable image optimization (uses sharp which causes build issues)
  images: {
    unoptimized: true,
  },

  // Silence Turbopack vs Webpack warning by providing an empty turbopack config
  turbopack: {},

  // Silence invalid source map warnings coming from some dependencies
  webpack(config, { dev, isServer }) {
    // Ignore noisy sourcemap parse warnings
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push(/Invalid source map/i, /sourceMapURL could not be parsed/i, /Failed to parse source map/i);

    // Disable source maps in dev to suppress these logs (server and client)
    if (dev) {
      config.devtool = false;
    }

    return config;
  },
};

export default nextConfig;
