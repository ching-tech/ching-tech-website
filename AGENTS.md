# 擎添工業官網（ching-tech.com）

純靜態站，無 build：HTML / CSS / 原生 JS，GSAP、ScrollTrigger、Lenis 放在 `vendor/`。main 一推就上線（GitHub Pages，前面有 Cloudflare）。

## 改網頁文字後必做

字型是只含頁面用字的子集（`fonts/noto-serif-tc.woff2`）。改了 `index.html` 或 `js/main.js` 的文字，**一定要重跑**：

    tools/build-fonts.sh

再把變動的 `fonts/` 一起提交。沒跑的話，新增的字會退回系統字型，標題看起來會走樣。

## 其他約定

- 字型與動畫套件都自帶，不要改回連 Google Fonts / CDN。
- 圖片放 `images/`，先縮小再提交（webp，寬約 1000–1600px，品質約 74）。
- 品牌色與字型規範以 https://github.com/ching-tech/brand 為準。
- 不在頁面上出現客戶名稱與第三方品牌 logo。
