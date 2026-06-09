// Expo + pnpm 모노레포 Metro 설정 — 워크스페이스 패키지(@umc/*) 해석.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 모노레포 루트까지 watch + node_modules 탐색 경로.
// pnpm(node-linker=hoisted) 은 transitive 의존성을 node_modules/.pnpm/node_modules 에 둔다 →
// 그 경로를 추가해야 Metro 가 expo-modules-core / @react-native/* 등 모든 transitive 를 해석한다.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules/.pnpm/node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
