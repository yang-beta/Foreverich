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
  let touchStartedInP6 = false;

  function isVisiblePage(page) {
    if (!page) return false;
    const rect = page.getBoundingClientRect();
    return Math.abs(rect.top) < Math.max(4, window.innerHeight * 0.08);
  }

  /* -----------------------------------------------------------
     P4 carousel
     ----------------------------------------------------------- */
  /*
     P4 Canvas resize helper
     -------------------------------------------------------------
     mobile-fixes.js 是在 main.js 後載入。
     Carousel 會改變卡片寬度，因此原本 Canvas backing size
     可能仍停留在「改成 carousel 之前」的尺寸。

     這裡只觸發原站既有 resize listener，
     讓 canvas.js 自己重新依 getBoundingClientRect() 計算。
  */
  let p4ResizeRefreshTimer = null;

  function refreshP4CanvasSizes() {
    if (p4ResizeRefreshTimer !== null) {
      clearTimeout(p4ResizeRefreshTimer);
    }

    p4ResizeRefreshTimer =
      window.setTimeout(() => {
        window.dispatchEvent(
          new Event("resize")
        );

        p4ResizeRefreshTimer = null;
      }, 60);
  }

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

    requestAnimationFrame(() => {
      updateNav();
      refreshP4CanvasSizes();
    });

    /*
      Safari / responsive layout 可能在字型載入後再改一次 card width。
      ResizeObserver 只觀察 carousel 尺寸；
      尺寸真的改變時才要求原站重算 Canvas。
    */
    if ("ResizeObserver" in window) {
      const p4ResizeObserver =
        new ResizeObserver(() => {
          refreshP4CanvasSizes();
        });

      p4ResizeObserver.observe(
        carousel
      );
    }
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

      /*
        P6 表單有自己的垂直捲動。
        只要手勢從 P6 內開始，就標記為 P6 專用手勢。
        後續 touchend 不交給全站 nextPage / previousPage。
      */
      touchStartedInP6 =
        Boolean(
          event.target?.closest?.(
            "#messageCardSection"
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

      /*
        P6：垂直滑動永遠只負責表單內頁捲動。
        不再使用「捲到底後下一次 swipe 就換頁」的舊邏輯，
        因為 sticky submit / Safari viewport 會讓 scrollTop 判斷提早到 max，
        導致第三步尚未完成就跳去洸語牆。

        P6 前往洸語牆仍由既有表單完成 / 送出流程處理。
      */
      if (
        touchStartedInP6 &&
        Math.abs(deltaY) >
          Math.abs(deltaX) + 6
      ) {
        event.stopImmediatePropagation();
        touchStartedInP6 = false;
        touchStartedInP4 = false;
        return;
      }

      touchStartedInP6 = false;

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

    },
    {
      capture: true,
      passive: true
    }
  );

  /* 滑鼠 / trackpad 平板模式：P6 內的 wheel 也只負責表單捲動。 */
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
     P6 Keyboard / Input Focus
     -------------------------------------------------------------
     不改 viewport 高度。
     鍵盤打開時只讓 P6 自己把輸入欄捲到可見位置。
  */
  function initP6KeyboardAssist() {
    const page =
      document.getElementById(
        "messageCardSection"
      );

    if (!page) return;

    page.addEventListener(
      "focusin",
      event => {
        const target =
          event.target;

        if (
          !target ||
          !target.matches?.(
            "input, textarea, select"
          )
        ) {
          return;
        }

        window.setTimeout(() => {
          target.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth"
          });
        }, 180);
      }
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
        initP6KeyboardAssist();
      },
      { once: true }
    );
  } else {
    initP4Carousel();
    initP6KeyboardAssist();
  }
})();
