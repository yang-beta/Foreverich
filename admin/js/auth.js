/* =============================================================
 * admin/js/auth.js
 * Supabase Auth + CMS Admin Membership
 * -------------------------------------------------------------
 * 安全邊界不在這個 JS，而是在 Supabase RLS。
 * 此檔只負責登入畫面與使用者體驗。
 * ============================================================= */

(() => {
  "use strict";

  const client = window.EverichSupabase;

  async function requireAdmin() {
    if (!client) {
      return {
        ok: false,
        reason: "Supabase 尚未設定。請先修改 js/supabase-config.js。"
      };
    }

    const {
      data: { session },
      error: sessionError
    } = await client.auth.getSession();

    if (sessionError || !session?.user) {
      return { ok: false, reason: "not_signed_in" };
    }

    const { data, error } = await client
      .from("cms_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("[CMS Auth] admin check failed:", error);
      return { ok: false, reason: "無法確認管理員權限。" };
    }

    if (!data) {
      await client.auth.signOut();
      return {
        ok: false,
        reason: "此帳號不是 CMS 管理員。"
      };
    }

    return {
      ok: true,
      user: session.user
    };
  }

  async function signIn(email, password) {
    if (!client) {
      throw new Error("Supabase 尚未設定。");
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const admin = await requireAdmin();

    if (!admin.ok) {
      throw new Error(
        admin.reason === "not_signed_in"
          ? "登入失敗。"
          : admin.reason
      );
    }

    return data;
  }

  async function signOut() {
    if (client) {
      await client.auth.signOut();
    }
  }

  window.CmsAuth = Object.freeze({
    requireAdmin,
    signIn,
    signOut
  });
})();

