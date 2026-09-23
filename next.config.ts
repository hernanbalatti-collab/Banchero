import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay un package-lock.json en la carpeta del usuario: fijamos la raíz del proyecto
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
