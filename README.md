# 퓨처셀프 (웹 버전)

직접 보고 읽은 자기계발 영상과 책, SNS 글을 요약해 모은 앱이에요.

- 웹: https://seungjinhan.github.io/futureself-web/
- 토스 미니앱: https://tossminiapp.com/d/future-self

토스 미니앱과 같은 코드예요. 데이터는 Firebase(Cloud Firestore)에 있고, 토스 미니앱·안드로이드 앱과 함께 써요.

```bash
npm ci
npm run dev:web     # 웹 버전 개발 화면
npm run build:web   # dist-web (GitHub Pages)
npm run build       # 토스 미니앱 (.ait)
npm test
```

main에 올리면 GitHub Actions가 GitHub Pages에 배포해요.
