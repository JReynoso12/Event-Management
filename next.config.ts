import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

// Avoid wrong workspace root when a parent directory also has package-lock.json.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["pg"],
};

export default nextConfig;
