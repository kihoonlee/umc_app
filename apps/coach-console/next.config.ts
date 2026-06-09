import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 워크스페이스 TS 패키지를 Next 가 트랜스파일 (source-only 패키지)
  transpilePackages: ["@umc/ui", "@umc/types"],
};

export default nextConfig;
