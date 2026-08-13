/* 全站 CMS Published Content Adapter：只處理內容，不控制動畫 */
(() => {
  "use strict";
  let cache = {};
  async function readPublishedContent() {
    const client = window.EverichSupabase;
    if (!client) return {};
    const { data, error } = await client.from("site_content_public")
      .select("content_key,value")
      .order("page_key",{ascending:true})
      .order("display_order",{ascending:true});
    if (error) { console.error("[CMS] 無法讀取已發布內容：",error); return {}; }
    return Object.fromEntries((data||[]).map(row=>[row.content_key,row.value]));
  }
  function applyContent(content={}) {
    cache={...cache,...content};
    document.querySelectorAll("[data-content-key]").forEach(el=>{
      const value=cache[el.dataset.contentKey];
      if(typeof value==="string") el.textContent=value;
    });
    document.querySelectorAll("[data-content-placeholder]").forEach(el=>{
      const value=cache[el.dataset.contentPlaceholder];
      if(typeof value==="string") el.setAttribute("placeholder",value);
    });
  }
  const timeout=ms=>new Promise(resolve=>setTimeout(()=>resolve({}),ms));
  const ready=Promise.race([readPublishedContent(),timeout(2000)])
    .then(content=>{applyContent(content);return content;})
    .catch(error=>{console.error("[CMS] 使用 HTML fallback：",error);return {};});
  window.SiteContent=Object.freeze({
    ready,apply:applyContent,readPublished:readPublishedContent,
    get(key,fallback=""){return typeof cache[key]==="string"?cache[key]:fallback;},
    async refresh(){const c=await readPublishedContent();applyContent(c);return c;}
  });
})();