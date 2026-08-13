# 洸限 CMS｜Supabase Auth 完整測試指南

本版新增完整 Auth 流程：

1. Invite 接受後設定初始密碼
2. Invite fallback 到首頁時自動轉送
3. 忘記密碼
4. Password Recovery
5. 密碼更新完成後重新登入 CMS
6. P1 CMS Draft / Publish
7. P1 動畫與 CMS 文字載入隔離

---

# A. 你現在已經點過邀請信，先這樣測

你目前「Accept Invite 後只回首頁」，有兩種可能：

## A1｜Supabase Session 還在同一個瀏覽器

部署本版本後，直接開：

`https://你的網址/admin/setup-password.html`

如果畫面顯示：

`帳號：你的 Email`

代表 Invite session 還存在。

直接設定新密碼即可。

## A2｜畫面顯示連結／Session 已失效

不用重新建立 User。

直接開：

`https://你的網址/admin/`

點：

`忘記密碼？`

輸入同一個管理 Email。

Supabase 會寄 Reset Password Email。

點 Email 後會回：

`/admin/setup-password.html`

設定新密碼即可。

---

# B. Supabase URL Configuration 必須確認

Dashboard：

Authentication
→ URL Configuration

## Site URL

保持網站首頁即可：

`https://你的網址.vercel.app`

## Redirect URLs

至少加入「精確 URL」：

`https://你的網址.vercel.app/admin/setup-password.html`

以及：

`https://你的網址.vercel.app/admin/**`

如果有正式網域，也加入：

`https://正式網域/admin/setup-password.html`

`https://正式網域/admin/**`

Supabase 的 `redirectTo` 不在 allow list 時會被忽略，
並 fallback 到 Site URL。

---

# C. 為什麼現在 Invite 就算回首頁也能處理

新增：

`js/auth-entry-redirect.js`

如果首頁 URL 帶：

- `type=invite`
- `type=recovery`
- `access_token`
- `refresh_token`
- PKCE `code`

會在 Supabase Client 消耗 token 之前，把完整 URL 轉去：

`/admin/setup-password.html`

因此 Dashboard Invite 即使 fallback 到 Site URL，
也能由前台橋接到設定密碼頁。

---

# D. 設定密碼頁

檔案：

`admin/setup-password.html`

JS：

`admin/js/setup-password.js`

它會：

1. 讓 Supabase SDK 解析 Invite / Recovery session
2. 確認有 authenticated session
3. 要求輸入新密碼兩次
4. 呼叫 `supabase.auth.updateUser({ password })`
5. 成功後 signOut
6. 回 `/admin/`
7. 再用 Email + 新密碼登入

---

# E. 忘記密碼

管理登入頁新增：

`忘記密碼？`

實作：

`admin/js/auth.js`

呼叫：

`resetPasswordForEmail(email, { redirectTo })`

redirectTo 固定指向目前網域的：

`/admin/setup-password.html`

因此：
- Vercel Preview
- Production Domain
- 正式 Domain

都能依目前網址自動組合。

但該 URL 仍必須存在 Supabase Redirect URL Allow List。

---

# F. 密碼完成後，才做 cms_admins

Authentication → Users

找到自己的 User UUID。

打開：

`supabase/02_add_admin.sql`

替換 UUID，再 Run。

注意：

「能登入 Supabase Auth」
和
「是 CMS Admin」

是兩層權限。

只有 `cms_admins` 有該 UUID，
RLS 才允許讀寫 `cms_content`。

---

# G. P1 CMS 正式測試

登入：

`/admin/`

## Test 1｜草稿

修改 P1 第一行。

按：

`儲存草稿`

到 Supabase Table Editor：

`cms_content`

確認：

`draft_value`

已改。

此時重新整理前台：

P1 應該仍是「published_value」。

## Test 2｜發布

按：

`發布 P1`

確認：

`cms_content.published_value`

以及：

`site_content_public.value`

都變成新文字。

重新整理前台。

P1 應顯示新文字。

---

# H. 這次特別增加的「動畫不受 CMS 影響」保護

原本前台：

`content.js`

會非同步抓 Supabase。

如果網路慢，
有可能：

P1 Timeline 已經開始
→ 才收到新文字
→ 動畫途中 textContent 改變

本版已修正。

## 現在流程

進 P1：

`main.js`
→ 等 `SiteContent.ready`
→ CMS 文字套用
→ `playBannerBeamAnimation()`

CMS 最多等待 2 秒。

如果 Supabase：
- 無法連線
- RLS 設錯
- 網路失敗

2 秒後仍會使用 HTML 原始 fallback 文字啟動動畫。

所以 CMS 不會永久卡住展覽。

---

# I. P1 動畫回歸測試

發布新文字後，請測：

## 1
正常從 LP → P1。

確認：
- 新文字先就位
- 再依原本時間出現
- 沒有播放中途突然換字

## 2
P1 播完 → 去 P2 → 回 P1。

確認：
- P1 動畫重新播放
- CMS 文字保持新版本

## 3
P1 播放中按 Skip。

確認：
- 文字全部顯示
- CMS 文字不消失
- 箭頭正常

## 4
Supabase 暫時不可讀時。

前台仍應：
- 顯示 HTML fallback
- Canvas 正常
- GSAP 正常

---

# J. 未來動畫修改位置

## Canvas / 線條 / 粒子 / 沙畫

`js/canvas.js`

例如：
- P1 圓圈
- P1 流光
- P2 沙粒
- P3 曼陀羅
- P4 Terrain

## GSAP 時序 / 文字出現

`js/animations.js`

例如：
- P1 第一行第幾秒出現
- duration
- stagger
- Skip

## Page Lifecycle / 頁面互動

`js/main.js`

例如：
- P1 進頁時做什麼
- 離頁停止什麼
- P5 / P6 / 洸語牆

## Layout / 色票 / Hover / RWD

`css/style.css`

## CMS 文字資料

後台 `/admin/`

不要修改 animation code。

---

# K. 整套 P1 線條重製怎麼辦？

可以直接重寫：

`js/canvas.js`

CMS 不會受影響。

只要 HTML 還保留：

`data-content-key="p1.question_01_part_01"`

CMS 仍會填入正確文字。

這個 key 應被視為「內容 API ID」，
未來動畫重構不得任意改名。
