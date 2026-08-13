/* =============================================================
 * js/content.js
 * CMS Published Content Adapter
 * -------------------------------------------------------------
 * 前台只讀 site_content_public。
 * 它完全不知道 CMS 草稿、Auth、GSAP 或 Canvas。
 *
 * 若 Supabase 尚未設定 / 網路錯誤：
 * HTML 內原始文字會保留，網站動畫仍可正常運作。
 * ============================================================= */

(() => {
  "use strict";

  const PAGE_KEY = "p1";

  async function readPublishedContent() {
    const client = window.EverichSupabase;

    if (!client) {
      return {};
    }

    const { data, error } = await client
      .from("site_content_public")
      .select("content_key,value")
      .eq("page_key", PAGE_KEY)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[CMS] 無法讀取已發布內容：", error);
      return {};
    }

    return Object.fromEntries(
      (data || []).map(row => [row.content_key, row.value])
    );
  }

  function applyContent(content = {}) {
    document.querySelectorAll("[data-content-key]").forEach(element => {
      const value = content[element.dataset.contentKey];

      if (typeof value === "string") {
        element.textContent = value;
      }
    });
  }

  function timeout(ms) {
    return new Promise(resolve => {
      window.setTimeout(() => resolve({}), ms);
    });
  }

  /*
    P1 動畫會等待 SiteContent.ready。
    但 CMS 不應該因網路問題阻塞展場，因此最多等待 2 秒，
    之後使用 HTML fallback 文字繼續播放。
  */
  const ready = Promise.race([
    readPublishedContent(),
    timeout(2000)
  ])
    .then(content => {
      applyContent(content);
      return content;
    })
    .catch(error => {
      console.error("[CMS] 初始化失敗，使用 HTML fallback：", error);
      return {};
    });

  window.SiteContent = Object.freeze({
    ready,
    apply: applyContent,
    readPublished: readPublishedContent,
    async refresh() {
      const content = await readPublishedContent();
      applyContent(content);
      return content;
    }
  });
})();
