import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê os arquivos de métrica de fonte (.afm) por caminho relativo em
  // tempo de execução; se o Next empacota o pacote, esse caminho quebra.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
