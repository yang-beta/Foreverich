# 洸限 CMS｜GitHub + Vercel + Supabase Auth 串接指南

> 本版本只啟用 P1 六段文字 CMS。
> 目的：先確認 Auth、RLS、草稿、發布、前台讀取全流程正常。

---

# 一、三個平台各自負責什麼

## GitHub
放：
- 前台 HTML / CSS / JS
- `/admin/` 後台
- Supabase browser config
- SQL 安裝腳本

不要放：
- `sb_secret_...`
- `service_role`
- Database password

## Vercel
目前只是：
- 從 GitHub 自動部署網站
- 提供正式網址
- 原有 `/api/generate.js`

這一版 CMS **不需要 Vercel Secret Environment Variable**。

原因：
Browser 只需要 Supabase Project URL + Publishable key。
Publishable key 本來就是公開 key，權限由 RLS 保護。

未來如果建立 server-side CMS API，
才把 `sb_secret_...` 放到 Vercel Environment Variables。

## Supabase
負責：
- Auth 管理帳號
- PostgreSQL CMS 資料
- Row Level Security
- 前台 Published Content API

---

# 二、Supabase 初始設定

## Step 1｜建立或開啟 Supabase Project

進入你的 Project。

取得：

### Project URL
例如：

`https://abcdefgh.supabase.co`

### Publishable key
格式通常：

`sb_publishable_...`

位置：
Project Dashboard → Connect
或
Settings → API Keys

請勿使用：
- `sb_secret_...`
- `service_role`

---

# 三、建立資料表

Supabase Dashboard：

`SQL Editor → New query`

開啟專案裡：

`/supabase/01_setup.sql`

整份複製到 SQL Editor → Run。

成功後應該有三張表：

- `cms_admins`
- `cms_content`
- `site_content_public`

---

# 四、設定 Supabase Auth

## Step 1｜Email Provider

Dashboard：

`Authentication → Providers → Email`

確認 Email Login 可使用。

## Step 2｜關閉公開 Sign Up

因為這是私人管理後台，建議：

`Authentication → General Configuration`

將：

`Allow new users to sign up`

關閉。

這樣一般訪客不能自己註冊 CMS 帳號。

## Step 3｜設定 Site URL

Authentication → URL Configuration

Site URL：

`https://你的-vercel-domain.vercel.app`

Redirect URLs 至少加入：

`https://你的-vercel-domain.vercel.app/admin/**`

若你有正式網域也加入：

`https://你的正式網域/admin/**`

開發時可以再加入 localhost。

---

# 五、建立第一個管理帳號

Supabase Dashboard：

`Authentication → Users`

點：

`Add user → Send invitation`

輸入你的管理 Email。

完成邀請並設定密碼後，
回到 Authentication → Users。

複製該帳號的：

`User UID`

---

# 六、將 Auth User 設成 CMS Admin

打開：

`/supabase/02_add_admin.sql`

把：

`REPLACE_WITH_YOUR_AUTH_USER_UUID`

換成剛剛複製的 UUID。

例如：

```sql
insert into public.cms_admins (user_id)
values ('12345678-1234-1234-1234-123456789abc'::uuid)
on conflict (user_id) do nothing;
```

放入 SQL Editor → Run。

---

# 七、設定 GitHub 程式

打開：

`/js/supabase-config.js`

改：

```js
window.EVERICH_SUPABASE_CONFIG = Object.freeze({
  url: "https://你的-project-ref.supabase.co",
  publishableKey: "sb_publishable_你的key"
});
```

注意：

Publishable key 放 GitHub 是可以的。

絕對不要放：

`sb_secret_...`

---

# 八、Push 到 GitHub

例如：

```bash
git add .
git commit -m "Add Supabase CMS Auth prototype"
git push
```

如果 GitHub 已與 Vercel Project 連結，
Vercel 會自動產生新的 Deployment。

---

# 九、Vercel 要設定什麼？

## 目前 CMS Prototype

不需要新增 Supabase Secret Env。

只確認：

GitHub Repository
→ Vercel Project
→ 正常 Production Deployment

即可。

如果你修改了 Vercel Environment Variables，
記住 Vercel 的 env 只會套用到新的 deployment，
舊 deployment 不會自動更新。

---

# 十、正式測試流程

## 1
開：

`https://你的網址/admin/`

若 `/admin/` 沒有自動 index，
測：

`https://你的網址/admin/index.html`

## 2
輸入 Supabase Auth Email / Password。

## 3
看到 P1 六段文字。

## 4
改其中一句。

例如：

原本：

`你的生命中，有沒有一個人 ――`

改：

`你的生命裡，有沒有一個一直記得的人 ――`

## 5
按：

`儲存草稿`

結果：

- `cms_content.draft_value` 更新
- 前台不變

## 6
按：

`發布 P1`

結果：

- `cms_content.published_value` 更新
- `site_content_public.value` 更新

## 7
開前台：

`https://你的網址/`

重新進 P1。

應看到新文字。

原本：
- P1 Canvas
- 圓圈
- 流光
- GSAP 時序
- Skip

全部仍使用原本程式。

---

# 十一、Supabase Table Editor 可以怎麼檢查

## cms_content

應看到：

`draft_value`

與：

`published_value`

可能不同。

這張表只有 CMS Admin Auth 才能從 Browser 讀取。

## site_content_public

只存在：

`value`

沒有 draft。

一般網站訪客只能讀這張表。

---

# 十二、未來修改文字要改哪裡？

若只是後台修改：

不用碰 GitHub。

直接：

`/admin/ → 修改 → 發布`

即可。

如果新增新的可編輯文字：

1. HTML 新增穩定的 `data-content-key`
2. Supabase `cms_content` 新增同 key
3. 發布到 `site_content_public`

---

# 十三、未來修改動畫要改哪個檔案？

## Canvas / 線條 / 粒子 / 沙畫 / 背景

主要：

`/js/canvas.js`

例如：
- P1 圓圈幾何
- P1 流光
- P2 沙粒
- P3 曼陀羅
- P4 Terrain
- Canvas RAF

## GSAP / 文字入場 / Skip / 時序

主要：

`/js/animations.js`

例如：
- P1 文字第幾秒出現
- Loading Timeline
- 箭頭出現時間
- Skip Timeline

## 頁面切換 / Lifecycle / P5-P7 互動

主要：

`/js/main.js`

例如：
- Snap Scroll
- pageLifecycle
- P5 表單
- P6 卡片
- 洸語牆

## 顏色 / Layout / Hover / RWD

主要：

`/css/style.css`

例如：
- 珊瑚杏四色
- 字級
- 卡片 layout
- 手機平板
- CSS animation

---

# 十四、整個動畫重製會不會傷到 CMS？

不會，只要保留：

`data-content-key`

例如：

```html
<div
  class="whatever-new-animation-class"
  data-content-key="p1.question_01_part_01"
>
  HTML fallback text
</div>
```

你可以：
- 把 P1 圓圈全部刪掉
- Canvas 全部重畫
- 換成 SVG
- GSAP timeline 重寫
- 修改 element wrapper
- 修改 CSS class

CMS 還是會找到：

`p1.question_01_part_01`

並放入文字。

---

# 十五、哪些事情會讓 CMS 斷掉？

只有幾種：

1. 把 `data-content-key` 刪除
2. 任意重新命名 key
3. 把 DOM 文字改成 Canvas 直接 drawText()
4. 刪掉該文字 element

因此未來工程規範應該加入：

> CMS key 視為資料 API，不得因動畫重構任意改名。

---

# 十六、未來 Animation Settings 怎麼做？

若未來你希望：

後台也可以調：

`P1 流光速度`

不要放到：

`cms_content`

建議建立：

`animation_settings`

例如：

| setting_key | numeric_value |
|---|---:|
| p1.glow.speed | 0.00225 |
| p1.ring.reveal_duration | 1.6 |
| p3.mandala.ring_count | 8 |
| p4.terrain.amplitude | 1.8 |
| p5.horn.drift_duration | 11 |

文字 CMS 與動畫設定仍是兩個獨立資料域。

更大型的「整套線條重製」則仍直接改 code，
不要企圖把演算法全部做成 CMS。
