/* =============================================================
 * js/supabase-client.js
 * 建立全站唯一 Supabase Client
 * -------------------------------------------------------------
 * 依賴：
 * 1. Supabase JS CDN
 * 2. js/supabase-config.js
 * ============================================================= */

(() => {
  "use strict";

  const config = window.EVERICH_SUPABASE_CONFIG;
  const sdk = window.supabase;

  function isConfigured() {
    return Boolean(
      config &&
      config.url &&
      config.publishableKey &&
      !config.url.startsWith("PASTE_") &&
      !config.publishableKey.startsWith("PASTE_")
    );
  }

  if (!sdk?.createClient) {
    console.error("[Supabase] SDK 尚未載入。");
    window.EverichSupabase = null;
    return;
  }

  if (!isConfigured()) {
    console.warn(
      "[Supabase] 尚未設定 Project URL / Publishable key。請修改 js/supabase-config.js"
    );
    window.EverichSupabase = null;
    return;
  }

  window.EverichSupabase = sdk.createClient(
    config.url,
    config.publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
})();
