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

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initP4Carousel,
      { once: true }
    );
  } else {
    initP4Carousel();
  }
})();
