/* =============================================================
 * js/supabase-config.js
 * Supabase Browser Configuration
 * -------------------------------------------------------------
 * 這兩個值是「公開的 Browser 設定」：
 * - Project URL
 * - Publishable key (sb_publishable_...)
 *
 * Publishable key 可放在 GitHub / Browser。
 * 絕對不要把 sb_secret_... 或 service_role 放在這裡。
 * ============================================================= */

window.EVERICH_SUPABASE_CONFIG = Object.freeze({
  url: "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE",
  publishableKey: "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE"
});
