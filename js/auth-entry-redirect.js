/* =============================================================
 * js/auth-entry-redirect.js
 * Supabase Auth Redirect Bridge
 * -------------------------------------------------------------
 * 問題：
 * Supabase Dashboard 的 Invite 若沒有有效 redirectTo，
 * 會 fallback 到 Site URL（通常是首頁）。
 *
 * 解法：
 * 如果首頁 URL 帶有 invite / recovery token 或 PKCE code，
 * 在 Supabase Client 消耗 token 之前，先原封不動轉送到
 * /admin/setup-password.html。
 *
 * 這個檔案不建立 Supabase client、不碰 CMS、不碰動畫。
 * ============================================================= */

(() => {
  "use strict";

  const path = window.location.pathname;
  const isAdminPasswordPage =
    /\/admin\/setup-password\.html$/i.test(path);

  if (isAdminPasswordPage) return;

  const hash = window.location.hash || "";
  const params = new URLSearchParams(window.location.search);

  const hashLooksLikeAuth =
    /(?:^|[&#])type=(invite|recovery|signup|magiclink)(?:&|$)/i.test(hash) ||
    /(?:^|[&#])access_token=/i.test(hash) ||
    /(?:^|[&#])refresh_token=/i.test(hash);

  const queryLooksLikeAuth =
    params.has("code") ||
    ["invite", "recovery"].includes(params.get("type"));

  if (!hashLooksLikeAuth && !queryLooksLikeAuth) return;

  const target = new URL(
    "./admin/setup-password.html",
    window.location.href
  );

  target.search = window.location.search;
  target.hash = window.location.hash;

  window.location.replace(target.href);
})();
