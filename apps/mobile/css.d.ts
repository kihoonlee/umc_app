// Expo web 의 CSS / CSS Module import 에 대한 tsc 앰비언트 선언.
// (expo-env.d.ts 는 `expo start` 최초 실행 시 생성되므로, 그 전 typecheck 통과용)
declare module "*.css";
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
