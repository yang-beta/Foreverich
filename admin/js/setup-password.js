/* =============================================================
 * admin/js/setup-password.js
 * Invite / Password Recovery Change Password Page
 * -------------------------------------------------------------
 * 支援：
 * - Supabase Invite session
 * - PASSWORD_RECOVERY session
 * - 已經接受 Invite、session 還存在的使用者
 *
 * 成功後會 signOut，再回 /admin/ 用新密碼登入。
 * ============================================================= */

(() => {
  "use strict";

  const client = window.EverichSupabase;

  const form = document.getElementById("passwordForm");
  const passwordInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");
  const status = document.getElementById("passwordStatus");
  const submitBtn = document.getElementById("setPasswordBtn");
  const title = document.getElementById("setupTitle");
  const intro = document.getElementById("setupIntro");

  let sessionReady = false;
  let recoveryMode = false;

  function setStatus(message, isError = false) {
    status.textContent = message || "";
    status.classList.toggle("is-error", isError);
  }

  function detectFlowType() {
    const hash = window.location.hash || "";
    const query = new URLSearchParams(window.location.search);
    const source = `${hash}&${window.location.search}`;

    recoveryMode =
      /type=recovery/i.test(source) ||
      query.get("type") === "recovery";

    if (recoveryMode) {
      title.textContent = "重新設定管理密碼";
      intro.textContent =
        "請輸入新的管理密碼。完成後會回到 CMS 登入頁。";
    }
  }

  async function resolveSession() {
    if (!client) {
      setStatus(
        "Supabase 尚未設定，請檢查 js/supabase-config.js。",
        true
      );
      submitBtn.disabled = true;
      return;
    }

    detectFlowType();
    setStatus("正在驗證邀請／重設連結…");

    /*
      createClient({ detectSessionInUrl:true }) 會自動解析：
      - implicit hash token
      - PKCE code
      所以先監聽 Auth event，再讀目前 session。
    */
    const {
      data: authListener
    } = client.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED"
      ) {
        if (event === "PASSWORD_RECOVERY") {
          recoveryMode = true;
          title.textContent = "重新設定管理密碼";
          intro.textContent =
            "請輸入新的管理密碼。完成後會回到 CMS 登入頁。";
        }

        if (session?.user) {
          sessionReady = true;
          submitBtn.disabled = false;
          setStatus(`帳號：${session.user.email || "已驗證使用者"}`);
        }
      }
    });

    const {
      data: { session },
      error
    } = await client.auth.getSession();

    if (error) {
      console.error(error);
    }

    if (session?.user) {
      sessionReady = true;
      submitBtn.disabled = false;
      setStatus(`帳號：${session.user.email || "已驗證使用者"}`);
    }

    // 清除 token/code，避免敏感參數留在網址列與截圖中。
    if (sessionReady) {
      history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    /*
      Supabase SDK 初始化通常很快；若沒有 session，
      再給 redirect parsing 一點時間。
    */
    window.setTimeout(async () => {
      if (sessionReady) return;

      const {
        data: { session: lateSession }
      } = await client.auth.getSession();

      if (lateSession?.user) {
        sessionReady = true;
        submitBtn.disabled = false;
        setStatus(
          `帳號：${lateSession.user.email || "已驗證使用者"}`
        );
        history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        return;
      }

      submitBtn.disabled = true;
      setStatus(
        "這個邀請／重設連結已失效，或目前瀏覽器沒有有效 Session。請回管理登入頁使用「忘記密碼」。",
        true
      );
    }, 1400);

    window.addEventListener("pagehide", () => {
      authListener?.subscription?.unsubscribe?.();
    }, { once: true });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!sessionReady || !client) {
      setStatus("目前沒有可更新密碼的登入 Session。", true);
      return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (password.length < 8) {
      setStatus("密碼至少需要 8 個字元。", true);
      return;
    }

    if (password !== confirmPassword) {
      setStatus("兩次輸入的密碼不一致。", true);
      return;
    }

    submitBtn.disabled = true;
    setStatus("正在設定新密碼…");

    const { error } = await client.auth.updateUser({
      password
    });

    if (error) {
      console.error(error);
      submitBtn.disabled = false;
      setStatus(
        error.message || "密碼更新失敗。",
        true
      );
      return;
    }

    setStatus("密碼設定完成，正在回到 CMS 登入頁…");

    /*
      讓管理者重新以 Email / Password 登入，
      避免 invite/recovery session 直接進後台造成流程混亂。
    */
    await client.auth.signOut();

    window.setTimeout(() => {
      window.location.replace(
        "./index.html?password=updated"
      );
    }, 650);
  });

  resolveSession();
})();
