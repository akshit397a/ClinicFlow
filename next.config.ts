import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The git repository root sits above this project directory, so Next.js
  // would otherwise infer the wrong workspace root (it finds a stray
  // package-lock.json in the user's home). Pin it to the app directory.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;