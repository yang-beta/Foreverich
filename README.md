# 洸限展覽網站｜前端拆檔版

## 建議目錄

```text
/
├─ api/
│  └─ generate.js
├─ css/
│  └─ style.css
├─ img/
│  ├─ guang.png
│  ├─ xian.png
│  └─ ...原有 P2 圖片素材
├─ js/
│  ├─ config.js
│  ├─ canvas.js
│  ├─ animations.js
│  └─ main.js
└─ index.html
```

## 四階珊瑚杏色色票

| Level | 用途 | HEX |
|---|---|---|
| 01 Brand | 品牌主色、標題、邊框、主要 icon | `#FFB088` |
| 02 Light | 流光核心、較亮線條 | `#FFC7AB` |
| 03 Glow | 光暈、核心高光 | `#FFE1D1` |
| 04 Deep | 背景低亮度線條、深色裝飾 | `#C07B59` |

### 未來改色
只修改 `css/style.css` 最上方 `:root` 的：
- `--coral-main`
- `--coral-light`
- `--coral-glow`
- `--coral-deep`
- 對應的 `--*-rgb`

`js/config.js` 會在網站載入時讀取 CSS Variables，因此 Canvas / SVG 不需要再逐頁改 RGB。

## JS 分檔理由

### `config.js`
只放全站共用設定與色票 helper。它必須最先載入。

### `canvas.js`
集中 Loading / P1 / P2 / P3 / P4 的 Canvas、粒子、沙畫與 render loop。
Canvas 的 RAF 仍由既有頁面生命週期啟停。

### `animations.js`
放共用箭頭、Skip、Loading、P1 Banner 等 GSAP UI Timeline。
這類程式與 Canvas 繪製分開後，調整文字動畫比較容易找。

### `main.js`
放 Snap Scroll、`pageLifecycle`、頁面切換、P5/P6/P7、留言卡、Modal、API 與洸語牆。

目前不再細拆更多 JS，因為再拆 P5/P6/P7 會產生大量跨檔共享狀態，維護成本反而提高。

## CSS
目前維持單一 `style.css`，但檔案內沿用既有註解分區：
- 全站共用
- Loading Page
- Page 01
- Page 02
- Page 03
- Page 04
- Page 05 / 留言流程
- 洸語牆
- Responsive

因為現階段 CSS Animation 與頁面樣式高度相依，沒有額外拆 `animation.css`。

## 檔案載入順序

```html
<script src="/js/config.js"></script>
<script src="/js/canvas.js"></script>
<script src="/js/animations.js"></script>
<script src="/js/main.js"></script>
```

請不要任意交換順序。


## 預覽與部署路徑

正式 `index.html` 已使用相對路徑：

```html
<link rel="stylesheet" href="./css/style.css">

<script src="./js/config.js"></script>
<script src="./js/canvas.js"></script>
<script src="./js/animations.js"></script>
<script src="./js/main.js"></script>
```

因此：
- Vercel 根目錄部署可正常使用。
- 本機用 HTTP Server 開啟也可正常使用。
- 不依賴 `/css/...`、`/js/...` 這種根目錄絕對路徑。

`/api/generate` 仍保留根目錄 API 路徑，因為這是 Vercel Function endpoint。

### preview.html
`preview.html` 是為單檔預覽額外產生的版本，CSS 與主要 JS 都已 inline。
**不要拿 preview.html 取代正式 index.html。**


## 2026-08-13 珊瑚杏命名整理

前端英文命名已統一由 `gold` 改為 `coral`：

- `--coral-main`
- `--coral-light`
- `--coral-glow`
- `--coral-deep`
- `coralRgba()`
- `coralHex()`

P1 背景流光改用 `--coral-main`（#FFB088），流動速度降低 50%。
喇叭形背景與流光同樣改用 `--coral-main`，原本速度不變。

洸語牆的樹已移除重複平板 media query；各解析度改以完整樹形優先縮放。


## P1 CMS Prototype
測試：
1. 用 Vercel 或 HTTP Server 開啟 `/admin/index.html`
2. 修改 P1 六段文字
3. 儲存草稿：前台不變
4. 發布
5. 切回 `/index.html`
6. 文字更新，但原本動畫不變

Prototype 用 localStorage，正式版下一步換 Supabase。


## Supabase CMS P1 Auth Prototype

正式測試請閱讀：

`SUPABASE_SETUP_GUIDE.md`

重要檔案：

- `js/supabase-config.js`
- `js/supabase-client.js`
- `js/content.js`
- `admin/index.html`
- `admin/js/auth.js`
- `admin/js/admin.js`
- `supabase/01_setup.sql`
- `supabase/02_add_admin.sql`
- `supabase/03_verify.sql`


## Complete CMS Auth

新增：

- `js/auth-entry-redirect.js`
- `admin/setup-password.html`
- `admin/js/setup-password.js`
- Admin「忘記密碼」
- Password Recovery
- P1 CMS ready → GSAP animation ordering

完整測試請看：

`CMS_AUTH_TEST_GUIDE.md`
