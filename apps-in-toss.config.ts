import { defineConfig } from "@apps-in-toss/web-framework/config";

// appName은 콘솔 등록 후 바꿀 수 없어요. 등록 전에 콘솔에서 쓸 수 있는지 확인해요(PLAN.md 12장 9번).
export default defineConfig({
  appName: "future-self",
  brand: {
    primaryColor: "#0E5A4E",
  },
  webView: {},
  permissions: [],
  webBundleDir: "dist",
});
