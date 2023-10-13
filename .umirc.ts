import { defineConfig } from "umi";

export default defineConfig({
  routes: [
    { path: "/", component: "index" },
    { path: "/request-cache", component: "request-cache",name: '请求缓存' },
  ],
  npmClient: "pnpm",
});
