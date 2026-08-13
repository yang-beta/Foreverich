# Supabase Auth Email｜洸限 - 拾洸記憶展

Hosted Supabase：Authentication → Email Templates

## Reset Password / Recovery
Subject:
洸限 - 拾洸記憶展｜重設密碼 / Soul Memory Exhibition｜Reset your password

```html
<h2>洸限 - 拾洸記憶展</h2>
<p>Soul Memory Exhibition</p>
<p>我們收到此管理帳號的密碼重設要求。</p>
<p>We received a request to reset the password for this admin account.</p>
<p><a href="{{ .ConfirmationURL }}">重設密碼 / Reset your password</a></p>
<p>如果這不是你的操作，可以忽略此封信。</p>
<p>If you did not request this, you can ignore this email.</p>
```

## Invite User
Subject:
洸限 - 拾洸記憶展｜管理員邀請 / Soul Memory Exhibition｜Admin invitation

```html
<h2>洸限 - 拾洸記憶展</h2>
<p>Soul Memory Exhibition</p>
<p>你已受邀加入網站內容管理後台。</p>
<p>You have been invited to the website CMS.</p>
<p><a href="{{ .ConfirmationURL }}">接受管理員邀請 / Accept invitation</a></p>
```

注意：2026-06-03 後建立的 Supabase Free Tier 新專案，若使用 Supabase 預設寄信服務，可能無法自訂 Auth Email Template；需 Pro 或 Custom SMTP。
