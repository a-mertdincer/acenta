const nextConfig = {
  devIndicators: false, // Altta "Rendering" / build göstergesini kapatır
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
