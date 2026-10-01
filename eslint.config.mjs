import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const eslintConfig = [...nextVitals, ...nextTs, { ignores: [".next-production/**", ".runtime/**", "artifacts/**", "data/**", ".npm-cache/**"] }];
export default eslintConfig;
