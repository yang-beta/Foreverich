/* =============================================================
 * admin/js/admin.js
 * P1 CMS｜Supabase Database Version
 * -------------------------------------------------------------
 * 儲存草稿：
 *   cms_content.draft_value
 *
 * 發布：
 *   1. 將 draft_value 寫入 cms_content.published_value
 *   2. upsert 到 site_content_public
 *
 * 未來改成 P2/P3... 時，主要只需要修改 PAGE_KEY，
 * 或將頁面選單做成動態切換。
 * ============================================================= */

(() => {
  "use strict";

  const PAGE_KEY = "p1";
  const client = window.EverichSupabase;

  const loginPanel = document.getElementById("loginPanel");
  const cmsPanel = document.getElementById("cmsPanel");
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const loginStatus = document.getElementById("loginStatus");

  const resetPanel = document.getElementById("resetPanel");
  const resetForm = document.getElementById("resetForm");
  const resetEmailInput = document.getElementById("resetEmail");
  const resetStatus = document.getElementById("resetStatus");

  const fieldsRoot = document.getElementById("fieldsRoot");
  const cmsStatus = document.getElementById("cmsStatus");
  const userLabel = document.getElementById("adminUserLabel");

  let currentUser = null;
  let rows = [];

  function setLoginStatus(message, isError = false) {
    loginStatus.textContent = message || "";
    loginStatus.classList.toggle("is-error", isError);
  }

  function setResetStatus(message, isError = false) {
    resetStatus.textContent = message || "";
    resetStatus.classList.toggle("is-error", isError);
  }

  function setCmsStatus(message, isError = false) {
    cmsStatus.textContent = message || "";
    cmsStatus.classList.toggle("is-error", isError);
  }

  function showLogin() {
    loginPanel.hidden = false;
    resetPanel.hidden = true;
    cmsPanel.hidden = true;
  }

  function showReset() {
    loginPanel.hidden = true;
    resetPanel.hidden = false;
    cmsPanel.hidden = true;

    if (!resetEmailInput.value && emailInput.value) {
      resetEmailInput.value = emailInput.value;
    }
  }

  function showCms() {
    loginPanel.hidden = true;
    resetPanel.hidden = true;
    cmsPanel.hidden = false;
    userLabel.textContent = currentUser?.email || "";
  }

  async function loadPageContent() {
    const { data, error } = await client
      .from("cms_content")
      .select(
        "content_key,page_key,label,content_type,draft_value,published_value,display_order"
      )
      .eq("page_key", PAGE_KEY)
      .order("display_order", { ascending: true });

    if (error) throw error;

    rows = data || [];
    renderFields();
  }

  function renderFields() {
    fieldsRoot.innerHTML = "";

    rows.forEach(row => {
      const wrapper = document.createElement("div");
      wrapper.className = "cms-field";

      const header = document.createElement("div");
      header.className = "cms-field-header";

      const label = document.createElement("label");
      label.textContent = row.label;

      const key = document.createElement("code");
      key.textContent = row.content_key;

      header.append(label, key);

      const textarea = document.createElement(
        row.content_type === "textarea" ? "textarea" : "input"
      );

      if (textarea.tagName === "INPUT") {
        textarea.type = "text";
      }

      textarea.value =
        row.draft_value ??
        row.published_value ??
        "";

      textarea.dataset.contentKey = row.content_key;

      const published = document.createElement("div");
      published.className = "published-preview";
      published.innerHTML =
        `<span>目前已發布</span><p></p>`;
      published.querySelector("p").textContent =
        row.published_value || "（尚未發布）";

      wrapper.append(header, textarea, published);
      fieldsRoot.appendChild(wrapper);
    });
  }

  function collectDraftRows() {
    return [...fieldsRoot.querySelectorAll("[data-content-key]")]
      .map(input => {
        const source = rows.find(
          row => row.content_key === input.dataset.contentKey
        );

        return {
          content_key: input.dataset.contentKey,
          page_key: PAGE_KEY,
          label: source.label,
          content_type: source.content_type,
          draft_value: input.value.trim(),
          published_value: source.published_value,
          display_order: source.display_order,
          updated_by: currentUser.id
        };
      });
  }

  async function saveDraft() {
    const payload = collectDraftRows();

    const { error } = await client
      .from("cms_content")
      .upsert(payload, {
        onConflict: "content_key"
      });

    if (error) throw error;

    setCmsStatus("草稿已儲存。前台仍維持目前已發布版本。");
    await loadPageContent();
  }

  async function publishPage() {
    const drafts = collectDraftRows();

    // 先保存最新草稿。
    const { error: draftError } = await client
      .from("cms_content")
      .upsert(drafts, {
        onConflict: "content_key"
      });

    if (draftError) throw draftError;

    const publicRows = drafts.map(row => ({
      content_key: row.content_key,
      page_key: row.page_key,
      value: row.draft_value,
      display_order: row.display_order,
      updated_by: currentUser.id
    }));

    const { error: publicError } = await client
      .from("site_content_public")
      .upsert(publicRows, {
        onConflict: "content_key"
      });

    if (publicError) throw publicError;

    const publishUpdates = drafts.map(row => ({
      ...row,
      published_value: row.draft_value
    }));

    const { error: cmsError } = await client
      .from("cms_content")
      .upsert(publishUpdates, {
        onConflict: "content_key"
      });

    if (cmsError) throw cmsError;

    setCmsStatus(
      "P1 已發布。開啟或重新整理前台即可看到新文字。"
    );

    await loadPageContent();
  }

  function showAuthReturnMessage() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("password") === "updated") {
      setLoginStatus(
        "密碼已設定完成，請用 Email + 新密碼登入。"
      );

      history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }

  async function boot() {
    if (!client) {
      setLoginStatus(
        "Supabase 尚未設定。請先完成 js/supabase-config.js。",
        true
      );
      showLogin();
      return;
    }

    const admin = await window.CmsAuth.requireAdmin();

    if (!admin.ok) {
      showLogin();

      if (admin.reason !== "not_signed_in") {
        setLoginStatus(admin.reason, true);
      } else {
        showAuthReturnMessage();
      }

      return;
    }

    currentUser = admin.user;
    showCms();

    try {
      await loadPageContent();
    } catch (error) {
      console.error(error);
      setCmsStatus(error.message || "CMS 讀取失敗。", true);
    }
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    setLoginStatus("登入中…");

    try {
      await window.CmsAuth.signIn(email, password);
      setLoginStatus("");
      await boot();
    } catch (error) {
      console.error(error);
      setLoginStatus(
        error.message || "登入失敗，請確認帳號密碼。",
        true
      );
    }
  });

  document.getElementById("showResetBtn")
    .addEventListener("click", () => {
      setResetStatus("");
      showReset();
    });

  document.getElementById("backToLoginBtn")
    .addEventListener("click", () => {
      setResetStatus("");
      showLogin();
    });

  resetForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = resetEmailInput.value.trim();

    if (!email) return;

    setResetStatus("正在寄送重設密碼 Email…");

    try {
      await window.CmsAuth.sendPasswordReset(email);

      setResetStatus(
        "已送出。請到 Email 點擊重設密碼連結，連結會回到 /admin/setup-password.html。"
      );
    } catch (error) {
      console.error(error);
      setResetStatus(
        error.message || "重設密碼 Email 寄送失敗。",
        true
      );
    }
  });

  document.getElementById("saveDraftBtn")
    .addEventListener("click", async () => {
      setCmsStatus("儲存中…");

      try {
        await saveDraft();
      } catch (error) {
        console.error(error);
        setCmsStatus(
          error.message || "草稿儲存失敗。",
          true
        );
      }
    });

  document.getElementById("publishBtn")
    .addEventListener("click", async () => {
      setCmsStatus("發布中…");

      try {
        await publishPage();
      } catch (error) {
        console.error(error);
        setCmsStatus(
          error.message || "發布失敗。",
          true
        );
      }
    });

  document.getElementById("reloadBtn")
    .addEventListener("click", async () => {
      setCmsStatus("重新讀取中…");

      try {
        await loadPageContent();
        setCmsStatus("已重新讀取資料庫內容。");
      } catch (error) {
        setCmsStatus(error.message, true);
      }
    });

  document.getElementById("logoutBtn")
    .addEventListener("click", async () => {
      await window.CmsAuth.signOut();
      currentUser = null;
      showLogin();
      setLoginStatus("已登出。");
    });

  boot();
})();
