import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 워크스페이스 TS 패키지를 Next 가 트랜스파일 (source-only 패키지)
  transpilePackages: ["@umc/ui", "@umc/types", "@umc/db"],
  // Cloudflare Pages 정적 배포 — 콘솔은 전부 클라이언트 렌더링이라 SSR 불필요
  output: "export",
};

export default nextConfig;
