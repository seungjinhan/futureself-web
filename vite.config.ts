import aitDevtools from "@apps-in-toss/devtools/unplugin";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const WEB_ICON = fileURLToPath(new URL("./web/icon-192.png", import.meta.url));

/** 웹판(GitHub Pages): 토스 SDK를 쓰는 platform.ts를 브라우저용 platform.web.ts로, 토스판 전용 스타일을 빈 파일로 바꾸고, 아이콘과 설명을 넣어요. 아이콘은 웹판에만 넣어요(맨 위 바로가기와 탭 아이콘). */
function webVersion(): Plugin {
  return {
    name: "futureself-web",
    enforce: "pre",
    // 옆에 같은 이름의 .web.ts가 있는 파일(lib/platform.ts, tossStyles.ts)은 웹판에서 .web.ts로 바꿔요.
    async resolveId(source, importer, options) {
      if (!source.startsWith(".")) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const web = resolved?.id.replace(/\.ts$/, ".web.ts");
      return web && web !== resolved?.id && existsSync(web) ? web : null;
    },
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `  <meta name="description" content="직접 보고 읽은 자기계발 영상과 책, SNS 글을 요약해 모은 퓨처셀프 웹 버전이에요." />
    <link rel="icon" type="image/png" href="./icon-192.png" />
    <link rel="apple-touch-icon" href="./icon-192.png" />
  </head>`,
      );
    },
    configureServer(server) {
      server.middlewares.use("/icon-192.png", (_request, response) => {
        response.setHeader("Content-Type", "image/png");
        response.end(readFileSync(WEB_ICON));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "icon-192.png", source: readFileSync(WEB_ICON) });
    },
  };
}

// 토스 미니앱: `vite build` → dist (ait build가 묶어요). 웹판: `vite build --mode web` → dist-web (GitHub Pages).
export default defineConfig(({ mode }) =>
  mode === "web"
    ? {
        // GitHub Pages 하위 경로(/futureself-web/)에서도 열리게 상대 경로로 만들어요. 화면 이동은 주소를 바꾸지 않아요.
        base: "./",
        build: { outDir: "dist-web" },
        plugins: [webVersion(), react()],
      }
    : { plugins: [aitDevtools.vite(), react()] },
);
