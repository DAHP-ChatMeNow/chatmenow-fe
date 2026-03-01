/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // Dòng này giúp xuất ra file tĩnh cho Mobile
  images: {
    unoptimized: true, // App Mobile không có Server Next.js để tối ưu ảnh tự động
  },
};

export default nextConfig;
