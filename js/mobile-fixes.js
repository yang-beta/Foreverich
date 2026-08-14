/* =============================================================
 * MOBILE / TABLET RWD PATCH
 * -------------------------------------------------------------
 * 不修改原本 P4 Canvas / P6 送出邏輯 / 洸語牆資料。
 * 只增加：
 * 1. P4 橫向 Carousel + arrows
 * 2. P6 內頁捲動時阻止全站 swipe 換頁誤觸
 * ============================================================= */

(() => {
  "use strict";

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartedInP4 = false;

  function isVisiblePage(page) {
    if (!page) return false;
    const rect = page.getBoundingClientRect();
    return Math.abs(rect.top) < Math.max(4, window.innerHeight * 0.08);
  }

  /* -----------------------------------------------------------
     P4 carousel
     ----------------------------------------------------------- */
  function initP4Carousel() {
    const cards = document.getElementById("p4Cards");
    if (!cards || cards.closest(".p4-carousel")) return;

    const carousel = document.createElement("div");
    carousel.className = "p4-carousel";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "p4-carousel-nav p4-carousel-prev";
    prev.setAttribute("aria-label", "查看前一個感官體驗");
    prev.textContent = "‹";

    const next = document.createElement("button");
    next.type = "button";
    next.className = "p4-carousel-nav p4-carousel-next";
    next.setAttribute("aria-label", "查看下一個感官體驗");
    next.textContent = "›";

    cards.parentNode.insertBefore(carousel, cards);
    carousel.append(prev, cards, next);

    function cardStep() {
      const first = cards.querySelector(".p4-card-item");
      if (!first) return cards.clientWidth * 0.82;

      const gap = parseFloat(
        getComputedStyle(cards).gap
      ) || 0;

      return first.getBoundingClientRect().width + gap;
    }

    function updateNav() {
      const overflow =
        cards.scrollWidth >
        cards.clientWidth + 4;

      prev.hidden = !overflow;
      next.hidden = !overflow;

      if (!overflow) return;

      prev.disabled =
        cards.scrollLeft <= 3;

      next.disabled =
        cards.scrollLeft +
        cards.clientWidth >=
        cards.scrollWidth - 3;
    }

    prev.addEventListener("click", () => {
      cards.scrollBy({
        left: -cardStep(),
        behavior: "smooth"
      });
    });

    next.addEventListener("click", () => {
      cards.scrollBy({
        left: cardStep(),
        behavior: "smooth"
      });
    });

    cards.addEventListener(
      "scroll",
      () => requestAnimationFrame(updateNav),
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => requestAnimationFrame(updateNav),
      { passive: true }
    );

    requestAnimationFrame(updateNav);
  }

  /* -----------------------------------------------------------
     P6 internal scroll guard
     -----------------------------------------------------------
     原站 window.touchend 會用垂直手勢直接換頁。
     P6 手機版現在需要自己垂直捲動，因此：
     - 尚未捲到底：向上滑只捲 P6，不換到下一頁
     - 尚未回到頂端：向下滑只捲 P6，不回上一頁
     - 到底 / 到頂後再滑，仍沿用原本整頁換頁
     ----------------------------------------------------------- */
  window.addEventListener(
    "touchstart",
    event => {
      const touch = event.touches?.[0];
      if (!touch) return;

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      touchStartedInP4 =
        Boolean(
          event.target?.closest?.(
            "#aiReconstructionSection .p4-carousel"
          )
        );
    },
    {
      capture: true,
      passive: true
    }
  );

  window.addEventListener(
    "touchend",
    event => {
      const touch =
        event.changedTouches?.[0];

      if (!touch) return;

      const deltaX =
        touchStartX - touch.clientX;

      const deltaY =
        touchStartY - touch.clientY;

      /* P4：主要是左右滑時，不讓全站誤判成換頁。 */
      if (
        touchStartedInP4 &&
        Math.abs(deltaX) >
          Math.abs(deltaY) + 8
      ) {
        event.stopImmediatePropagation();
        touchStartedInP4 = false;
        return;
      }

      touchStartedInP4 = false;

      const page =
        document.getElementById(
          "messageCardSection"
        );

      if (
        !page ||
        !isVisiblePage(page) ||
        page.scrollHeight <=
          page.clientHeight + 4
      ) {
        return;
      }

      const maxScroll =
        page.scrollHeight -
        page.clientHeight;

      /*
        deltaY > 0 = 手指向上滑，內容往下捲。
        只要還沒到底，就攔截原本 nextPage()。
      */
      if (
        deltaY > 35 &&
        page.scrollTop <
          maxScroll - 3
      ) {
        event.stopImmediatePropagation();
        return;
      }

      /*
        deltaY < 0 = 手指向下滑，內容往上捲。
        只要還沒回到頂端，就攔截原本上一頁。
      */
      if (
        deltaY < -35 &&
        page.scrollTop > 3
      ) {
        event.stopImmediatePropagation();
      }
    },
    {
      capture: true,
      passive: true
    }
  );

  /* 滑鼠 / trackpad 平板模式同樣避免 P6 尚未捲完就換頁。 */
  window.addEventListener(
    "wheel",
    event => {
      const page =
        document.getElementById(
          "messageCardSection"
        );

      if (
        !page ||
        !isVisiblePage(page) ||
        page.scrollHeight <=
          page.clientHeight + 4
      ) {
        return;
      }

      const maxScroll =
        page.scrollHeight -
        page.clientHeight;

      if (
        event.deltaY > 0 &&
        page.scrollTop <
          maxScroll - 3
      ) {
        event.stopImmediatePropagation();
      } else if (
        event.deltaY < 0 &&
        page.scrollTop > 3
      ) {
        event.stopImmediatePropagation();
      }
    },
    {
      capture: true,
      passive: true
    }
  );


  /* -----------------------------------------------------------
     iPhone Safari Dynamic Viewport Fix
     -----------------------------------------------------------
     原站 main.js 使用：
       translateY(-100vh)
       translateY(-200vh)
       ...

     Safari 地址列展開 / 收合時，CSS 100vh 與真正可視高度可能不同，
     因而出現「下一頁露出幾 px」以及 Skip 看起來忽高忽低。

     這裡不改 main.js：
     1. 取得目前真正 viewport 高度
     2. 寫入 --mobile-page-height
     3. 監看 sectionsWrapper 的 transform
     4. 若 main.js 寫入 -Nvh，自動換成 -N * 真實高度 px
     ----------------------------------------------------------- */

  const mobileViewport = {
    currentIndex: 0,
    observer: null,
    rafId: null
  };

  function getMobileViewportHeight() {
    /*
      visualViewport.height 在 iPhone Safari 地址列變動時
      會比單純 100vh 更接近真正可視區域。
    */
    const vvHeight =
      window.visualViewport?.height;

    const innerHeight =
      window.innerHeight;

    return Math.round(
      vvHeight ||
      innerHeight ||
      document.documentElement.clientHeight
    );
  }

  function setMobilePageHeight() {
    if (window.innerWidth > 768) return;

    const height =
      getMobileViewportHeight();

    document.documentElement.style.setProperty(
      "--mobile-page-height",
      `${height}px`
    );

    const wrapper =
      document.getElementById(
        "sectionsWrapper"
      );

    if (!wrapper) return;

    wrapper.style.transform =
      `translateY(-${
        mobileViewport.currentIndex *
        height
      }px)`;
  }

  function readIndexFromTransform(transform) {
    if (!transform) return null;

    /*
      main.js 原始值例如：
      translateY(-300vh)
    */
    const vhMatch =
      transform.match(
        /translateY\(\s*(-?[\d.]+)vh\s*\)/
      );

    if (vhMatch) {
      const vh =
        parseFloat(vhMatch[1]);

      return Math.max(
        0,
        Math.round(
          Math.abs(vh) / 100
        )
      );
    }

    return null;
  }

  function initDynamicViewportSnap() {
    if (window.innerWidth > 768) return;

    const wrapper =
      document.getElementById(
        "sectionsWrapper"
      );

    if (!wrapper) return;

    setMobilePageHeight();

    /*
      main.js 每次 goToPage() 都會修改 inline transform。
      MutationObserver 在瀏覽器繪製下一 frame 前把 vh 改成 px。
    */
    mobileViewport.observer =
      new MutationObserver(() => {

        const index =
          readIndexFromTransform(
            wrapper.style.transform
          );

        if (index === null) return;

        mobileViewport.currentIndex =
          index;

        const height =
          getMobileViewportHeight();

        wrapper.style.transform =
          `translateY(-${
            index * height
          }px)`;
      });

    mobileViewport.observer.observe(
      wrapper,
      {
        attributes: true,
        attributeFilter: ["style"]
      }
    );

    const refresh = () => {
      if (mobileViewport.rafId) {
        cancelAnimationFrame(
          mobileViewport.rafId
        );
      }

      mobileViewport.rafId =
        requestAnimationFrame(() => {
          setMobilePageHeight();
          mobileViewport.rafId = null;
        });
    };

    window.addEventListener(
      "resize",
      refresh,
      { passive: true }
    );

    window.addEventListener(
      "orientationchange",
      refresh,
      { passive: true }
    );

    window.visualViewport
      ?.addEventListener(
        "resize",
        refresh,
        { passive: true }
      );

    window.visualViewport
      ?.addEventListener(
        "scroll",
        refresh,
        { passive: true }
      );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        initP4Carousel();
        initDynamicViewportSnap();
      },
      { once: true }
    );
  } else {
    initP4Carousel();
    initDynamicViewportSnap();
  }
})();
